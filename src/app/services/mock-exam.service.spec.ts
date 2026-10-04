import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { MockExamSubject } from '../config/exam-subjects';
import { ExamQuestion } from '../models/exam-question.models';
import { AccountService } from './account.service';
import { ExamAchievementsService } from './exam-achievements.service';
import { GraphQLService } from './graphql.service';
import { MockExamService } from './mock-exam.service';

function question(id: number, correct: number[], fields: Partial<ExamQuestion> = {}): ExamQuestion {
  return {
    id, category: 'テクノロジ', subCategory: 'ネットワーク', type: correct.length > 1 ? 'multi' : 'single',
    question: `問${id}`, choices: ['ア', 'イ', 'ウ', 'エ'], correct, explanation: '', ...fields
  };
}

// 4問・合格率0.6(合格ラインは ceil(2.4) = 3問)・1問10pt・制限時間30分の科目
function subject(fields: Partial<MockExamSubject['mockExam']> = {}): MockExamSubject {
  return {
    key: 'kihonjoho', name: '基本情報', description: '', path: '', pointsPerCorrectAnswer: 10,
    practice: { questionsPerSession: 10, questionsPerRound: 2 },
    mockExam: { durationMinutes: 30, questionCount: 4, passRatio: 0.6, questionsPerPage: 2, ...fields }
  };
}

describe('MockExamService', () => {
  let service: MockExamService;
  let pool: ExamQuestion[];
  let recordCompletion: ReturnType<typeof vi.fn>;
  let getMockExamRecords: ReturnType<typeof vi.fn>;
  let addPoints: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    // 正解は ア〜ウ のどれか(複数選択を含む)。テストでは エ([3])を間違いの答えに使う
    pool = [question(1, [0]), question(2, [1]), question(3, [2]), question(4, [0, 2])];
    recordCompletion = vi.fn(() => of({}));
    getMockExamRecords = vi.fn(() => of([]));
    addPoints = vi.fn(() => of(undefined));

    TestBed.configureTestingModule({
      providers: [
        { provide: GraphQLService, useValue: { query: vi.fn(() => of({ examQuestions: pool })) } },
        { provide: ExamAchievementsService, useValue: { recordCompletion, getMockExamRecords } },
        { provide: AccountService, useValue: { addPoints } }
      ]
    });
    service = TestBed.inject(MockExamService);
  });

  afterEach(() => {
    service.destroy();
    vi.useRealTimers();
  });

  function startExam(s: MockExamSubject = subject()): void {
    service.prepare(s.key, s);
    service.start();
  }

  // 出題された問題のうち、先頭から correctCount 問に正解し、残りは間違える
  function answerCorrectly(correctCount: number): void {
    service.sessionQuestions().forEach((q, i) => {
      const choices = i < correctCount ? q.correct : [3];
      choices.forEach((c) => service.selectAnswer(i, c));
    });
  }

  it('開始すると、制限時間を設定し、出題数だけ問題を出す', () => {
    pool.push(question(5, [0]), question(6, [0]));
    startExam();

    expect(service.remainingSeconds()).toBe(30 * 60);
    expect(service.view()).toBe('quiz');
    expect(service.sessionQuestions()).toHaveLength(4);
    expect(service.totalRounds()).toBe(2);
  });

  it('問題が出題数に足りなければ、あるだけ出す', () => {
    startExam(subject({ questionCount: 10 }));

    expect(service.sessionQuestions()).toHaveLength(4);
  });

  it('問題がなければ開始せず、メッセージを出す', () => {
    pool = [];
    startExam();

    expect(service.view()).toBe('start');
    expect(service.errorMessage()).toBe('出題できる問題がありません。');
  });

  it('単一選択は選び直すと置き換え、複数選択は選ぶたびに付け外しする', () => {
    startExam();
    const single = service.sessionQuestions().findIndex((q) => q.type === 'single');
    const multi = service.sessionQuestions().findIndex((q) => q.type === 'multi');

    service.selectAnswer(single, 0);
    service.selectAnswer(single, 1);
    service.selectAnswer(multi, 0);
    service.selectAnswer(multi, 2);
    service.selectAnswer(multi, 0);

    expect(service.answers()[single]).toEqual([1]);
    expect(service.answers()[multi]).toEqual([2]);
    expect(service.answeredCount()).toBe(2);
  });

  it('複数選択は、選んだ順番に関係なく、正解の組み合わせと完全に一致したときだけ正解にする', () => {
    const multi = question(9, [0, 2]);

    expect(service.isCorrect(multi, [2, 0])).toBe(true);
    expect(service.isCorrect(multi, [0, 2, 2])).toBe(true);
    expect(service.isCorrect(multi, [0])).toBe(false);
    expect(service.isCorrect(multi, [0, 1, 2])).toBe(false);
    expect(service.isCorrect(multi, undefined)).toBe(false);
  });

  it('合格ライン(出題数 × 合格率の切り上げ)ちょうどの正解数なら合格にする', () => {
    startExam();
    answerCorrectly(3);
    service.finish(false);

    expect(service.view()).toBe('result');
    expect(service.result()).toEqual({ correctCount: 3, totalCount: 4, passBorder: 3, passed: true, pointsEarned: 30 });
  });

  it('合格ラインに1問足りなければ不合格にする', () => {
    startExam();
    answerCorrectly(2);
    service.finish(false);

    expect(service.result()).toMatchObject({ correctCount: 2, passBorder: 3, passed: false });
  });

  it('正解数 × 1問あたりのポイントを付与し、0問正解なら付与しない', () => {
    startExam();
    answerCorrectly(2);
    service.finish(false);
    expect(addPoints).toHaveBeenCalledWith(20, '模擬試験 基本情報 2問正解');

    addPoints.mockClear();
    startExam();
    service.finish(false);
    expect(addPoints).not.toHaveBeenCalled();
  });

  it('不合格の回も、問題ごとの選択と正誤とともに記録する(未回答は選択なし)', () => {
    startExam();
    answerCorrectly(1);
    // 2問目以降は未回答にする
    service.answers.update((answers) => answers.map((a, i) => (i === 0 ? a : undefined)));
    service.finish(false);

    const questions = service.sessionQuestions();
    expect(recordCompletion).toHaveBeenCalledTimes(1);
    const [examType, correctCount, totalCount, mode, passed, answers] = recordCompletion.mock.calls[0];
    expect([examType, correctCount, totalCount, mode, passed]).toEqual(['kihonjoho', 1, 4, 'MOCK_EXAM', false]);
    expect(answers).toEqual(questions.map((q, i) => ({
      questionId: q.id, selected: i === 0 ? q.correct : [], correct: i === 0
    })));
  });

  it('記録できたら、記録し直した後の間違えた問題の数を結果画面に出す', () => {
    getMockExamRecords.mockReturnValue(of([
      {
        id: 1, userId: 1, examType: 'kihonjoho', mode: 'MOCK_EXAM', date: '2026-10-04', createdAt: '2026-10-04T10:00:00',
        correctCount: 0, totalCount: 2, passed: false,
        answers: [{ questionId: 1, selected: [3], correct: false }, { questionId: 2, selected: [3], correct: false }]
      }
    ]));
    startExam();
    service.finish(false);

    expect(service.reviewCount()).toBe(2);
  });

  it('記録に失敗しても結果は表示する', () => {
    recordCompletion.mockReturnValue(throwError(() => new Error('network')));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    startExam();
    answerCorrectly(4);
    service.finish(false);

    expect(service.result()).toMatchObject({ correctCount: 4, passed: true });
    expect(service.reviewCount()).toBe(0);
  });

  it('終了は1回だけ扱い、二重に記録しない', () => {
    startExam();
    service.finish(false);
    service.finish(false);

    expect(recordCompletion).toHaveBeenCalledTimes(1);
  });

  it('棄権した回は記録せず、ポイントも付与しない', () => {
    startExam();
    answerCorrectly(4);
    service.abandon();
    service.finish(false);

    expect(service.view()).toBe('start');
    expect(recordCompletion).not.toHaveBeenCalled();
    expect(addPoints).not.toHaveBeenCalled();
  });

  it('時間切れになると、そこまでの解答で自動的に終了する', () => {
    startExam(subject({ durationMinutes: 1 }));
    answerCorrectly(3);

    vi.advanceTimersByTime(59_000);
    expect(service.view()).toBe('quiz');
    expect(service.remainingSeconds()).toBe(1);

    vi.advanceTimersByTime(1_000);
    expect(service.view()).toBe('result');
    expect(service.remainingSeconds()).toBe(0);
    expect(service.result()).toMatchObject({ correctCount: 3, passed: true });
  });

  describe('選択分野がある科目', () => {
    const composition = {
      required: [{ genre: '必須', count: 1 }],
      elective: { genres: ['分野A', '分野B', '分野C'], pickCount: 2, countPerGenre: 1 }
    };
    const electiveSubject = () => subject({ questionCount: 3, composition });

    beforeEach(() => {
      pool = [
        question(1, [0], { subCategory: '必須' }),
        question(2, [0], { subCategory: '分野A' }),
        question(3, [0], { subCategory: '分野B' }),
        question(4, [0], { subCategory: '分野C' })
      ];
    });

    it('決められた数の分野を選ぶまで開始できず、それより多くは選べない', () => {
      service.prepare('kihonjoho', electiveSubject());
      service.toggleGenre('分野A');
      expect(service.canStart()).toBe(false);

      service.toggleGenre('分野C');
      service.toggleGenre('分野B');
      expect(service.selectedGenres()).toEqual(['分野A', '分野C']);
      expect(service.canStart()).toBe(true);

      service.toggleGenre('分野A');
      expect(service.selectedGenres()).toEqual(['分野C']);
    });

    it('必須の分野と選んだ分野から出題し、選んだ分野を次回の初期値にする', () => {
      service.prepare('kihonjoho', electiveSubject());
      service.toggleGenre('分野C');
      service.toggleGenre('分野A');
      service.start();

      expect(service.sessionQuestions().map((q) => q.subCategory)).toEqual(['必須', '分野A', '分野C']);

      service.prepare('kihonjoho', electiveSubject());
      expect(service.selectedGenres()).toEqual(['分野A', '分野C']);
    });

    it('前回選んだ分野のうち、今はない分野は使わない', () => {
      localStorage.setItem('mockExam.electives.kihonjoho', JSON.stringify(['なくなった分野', '分野B']));
      service.prepare('kihonjoho', electiveSubject());

      expect(service.selectedGenres()).toEqual(['分野B']);
    });

    it('保存した内容が壊れていれば、選び直しにする', () => {
      localStorage.setItem('mockExam.electives.kihonjoho', '{not json');
      service.prepare('kihonjoho', electiveSubject());

      expect(service.selectedGenres()).toEqual([]);
    });
  });
});
