import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ExamSubject } from '../config/exam-subjects';
import { ExamQuestion } from '../models/exam-question.models';
import { AccountService } from './account.service';
import { ExamAchievementsService } from './exam-achievements.service';
import { ExamStudyService } from './exam-study.service';
import { GraphQLService } from './graphql.service';

function question(id: number, correct: number[]): ExamQuestion {
  return {
    id, category: 'テクノロジ', subCategory: 'ネットワーク', type: correct.length > 1 ? 'multi' : 'single',
    question: `問${id}`, choices: ['ア', 'イ', 'ウ', 'エ'], correct, explanation: ''
  };
}

// 1回10問・2問ごとに正誤を確認・1問10ptの練習
function subject(questionsPerSession = 10): ExamSubject {
  return {
    key: 'kihonjoho', name: '基本情報', description: '', path: '', pointsPerCorrectAnswer: 10,
    practice: { questionsPerSession, questionsPerRound: 2 }
  };
}

describe('ExamStudyService', () => {
  let service: ExamStudyService;
  let pool: ExamQuestion[];
  let recordCompletion: ReturnType<typeof vi.fn>;
  let addPoints: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // 正解は ア〜ウ のどれか(複数選択を含む)。テストでは エ([3])を間違いの答えに使う
    pool = Array.from({ length: 12 }, (_, i) => question(i + 1, i % 3 === 0 ? [0, 1] : [i % 3]));
    recordCompletion = vi.fn(() => of({}));
    addPoints = vi.fn(() => of(undefined));

    TestBed.configureTestingModule({
      providers: [
        { provide: GraphQLService, useValue: { query: vi.fn(() => of({ examQuestions: pool })) } },
        { provide: ExamAchievementsService, useValue: { recordCompletion } },
        { provide: AccountService, useValue: { addPoints } }
      ]
    });
    service = TestBed.inject(ExamStudyService);
  });

  // 最後のラウンドまで解く。先頭から correctCount 問に正解し、残りは間違える
  function solveAll(correctCount: number): void {
    while (service.view() !== 'result') {
      const start = service.roundStartIndex();
      service.submitRound(service.roundQuestions().map((q, i) => (start + i < correctCount ? q.correct : [3])));
      service.goToNextRound();
    }
  }

  it('開始すると、1回分の問題数だけ出題する(問題が足りなければあるだけ)', () => {
    service.startSession(subject());
    expect(service.sessionQuestions()).toHaveLength(10);
    expect(service.totalRounds()).toBe(5);
    expect(service.view()).toBe('quiz');

    service.startSession(subject(20));
    expect(service.sessionQuestions()).toHaveLength(12);
  });

  it('ラウンドを提出すると、そのラウンドの問題だけを採点して正誤の確認に進む', () => {
    service.startSession(subject());
    const [first, second] = service.roundQuestions();

    service.submitRound([first.correct, [3]]);

    expect(service.view()).toBe('review');
    expect(service.results().slice(0, 3)).toEqual([true, false, undefined]);
    expect(service.answers()[1]).toEqual([3]);
    expect(service.isCorrect(second, service.answers()[1])).toBe(false);
  });

  it('未回答の問題は不正解にする', () => {
    service.startSession(subject());

    service.submitRound([]);

    expect(service.results().slice(0, 2)).toEqual([false, false]);
  });

  it('最後のラウンドの確認の後に結果を出し、それまでは次のラウンドに進む', () => {
    service.startSession(subject());
    service.submitRound([[0], [0]]);
    service.goToNextRound();

    expect(service.view()).toBe('quiz');
    expect(service.round()).toBe(1);
    expect(service.progressPercent()).toBe(20);

    solveAll(0);
    expect(service.view()).toBe('result');
    expect(service.isLastRound()).toBe(true);
  });

  it('正解数 × 1問あたりのポイントを付与し、0問正解なら付与しない', () => {
    service.startSession(subject());
    solveAll(4);
    expect(service.correctCount()).toBe(4);
    expect(addPoints).toHaveBeenCalledWith(40, expect.stringContaining('4問正解'));

    addPoints.mockClear();
    service.startSession(subject());
    solveAll(0);
    expect(addPoints).not.toHaveBeenCalled();
  });

  it('正解が7割以上(10問なら7問)のときだけ実績として記録する', () => {
    service.startSession(subject());
    solveAll(7);
    expect(service.achievementBorder()).toBe(7);
    expect(recordCompletion).toHaveBeenCalledWith('kihonjoho', 7, 10);

    recordCompletion.mockClear();
    service.startSession(subject());
    solveAll(6);
    expect(recordCompletion).not.toHaveBeenCalled();
  });

  it('7割の境界は切り上げにする(5問なら4問)', () => {
    service.startSession(subject(5));
    solveAll(3);
    expect(service.achievementBorder()).toBe(4);
    expect(recordCompletion).not.toHaveBeenCalled();

    service.startSession(subject(5));
    solveAll(4);
    expect(recordCompletion).toHaveBeenCalledWith('kihonjoho', 4, 5);
  });

  it('実績の記録に失敗しても結果は表示する', () => {
    recordCompletion.mockReturnValue(throwError(() => new Error('network')));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    service.startSession(subject());
    solveAll(10);

    expect(service.view()).toBe('result');
    expect(service.correctCount()).toBe(10);
  });
});
