import { Injectable, inject, signal, computed } from '@angular/core';
import { GraphQLService } from './graphql.service';
import { ExamAchievementsService } from './exam-achievements.service';
import { AccountService } from './account.service';
import { ExamQuestion } from '../models/exam-question.models';
import { ExamAnswer } from '../models/exam-record.models';
import { MockExamSubject } from '../config/exam-subjects';
import { pickByComposition, shuffle } from '../utils/mock-exam-composition';
import { reviewTargets } from '../utils/mistake-review';
import { isCorrectAnswer } from '../utils/exam-answer';
import { catchError, of, switchMap } from 'rxjs';

export type MockExamView = 'start' | 'quiz' | 'result';

// 前回選んだ分野を次回の初期値にするためのブラウザ保存のキー(科目ごと)
const electivesStorageKey = (examType: string) => `mockExam.electives.${examType}`;

@Injectable({
  providedIn: 'root'
})
export class MockExamService {
  private graphql = inject(GraphQLService);
  private achievementsService = inject(ExamAchievementsService);
  private accountService = inject(AccountService);

  readonly isLoading = signal(false);
  readonly errorMessage = signal('');

  readonly subject = signal<MockExamSubject | null>(null);
  readonly view = signal<MockExamView>('start');
  readonly sessionQuestions = signal<ExamQuestion[]>([]);
  readonly answers = signal<(number[] | undefined)[]>([]);
  readonly round = signal(0);

  // 残り時間(秒)。0になったら強制終了する。
  readonly remainingSeconds = signal(0);
  private timerHandle: ReturnType<typeof setInterval> | null = null;

  readonly result = signal<{ correctCount: number; totalCount: number; passBorder: number; passed: boolean; pointsEarned: number } | null>(null);
  // 結果画面に表示する、間違えた問題の復習の対象数(今回の回を記録した後の、直近の回全体での数)
  readonly reviewCount = signal(0);

  // 1ページに表示する問題数(科目ごとの設定)
  readonly questionsPerPage = computed(() => this.subject()?.mockExam.questionsPerPage ?? 2);
  readonly totalRounds = computed(() => Math.ceil(this.sessionQuestions().length / this.questionsPerPage()) || 1);
  readonly roundStartIndex = computed(() => this.round() * this.questionsPerPage());
  readonly roundQuestions = computed(() => {
    const start = this.roundStartIndex();
    return this.sessionQuestions().slice(start, start + this.questionsPerPage());
  });
  readonly answeredCount = computed(() => this.answers().filter((a) => a && a.length > 0).length);

  // 出題構成に選択分野がある科目(応用情報 午後)で、開始画面で選んだ分野
  readonly selectedGenres = signal<string[]>([]);
  readonly composition = computed(() => this.subject()?.mockExam.composition);
  // 選択分野がある科目は、決められた数の分野を選ぶまで開始できない
  readonly canStart = computed(() => {
    const composition = this.composition();
    return !composition || this.selectedGenres().length === composition.elective.pickCount;
  });

  prepare(examType: string, subject: MockExamSubject): void {
    this.subject.set(subject);
    this.view.set('start');
    this.isLoading.set(false);
    this.errorMessage.set('');
    this.sessionQuestions.set([]);
    this.answers.set([]);
    this.round.set(0);
    this.result.set(null);
    this.reviewCount.set(0);
    this.remainingSeconds.set(subject.mockExam.durationMinutes * 60);
    this.selectedGenres.set(this.loadSelectedGenres(subject));
  }

  isGenreSelected(genre: string): boolean {
    return this.selectedGenres().includes(genre);
  }

  // 選べる数に達しているときは、選択中の分野を外すことだけできる
  toggleGenre(genre: string): void {
    const composition = this.composition();
    if (!composition) return;
    const current = this.selectedGenres();
    if (current.includes(genre)) {
      this.selectedGenres.set(current.filter((g) => g !== genre));
    } else if (current.length < composition.elective.pickCount) {
      this.selectedGenres.set([...current, genre]);
    }
  }

  private loadSelectedGenres(subject: MockExamSubject): string[] {
    const composition = subject.mockExam.composition;
    if (!composition) return [];
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(electivesStorageKey(subject.key)) ?? '[]');
      if (!Array.isArray(saved)) return [];
      // 分野の構成が変わっていても壊れないよう、今の候補にある分野だけを、選べる数まで使う
      return composition.elective.genres.filter((g) => saved.includes(g)).slice(0, composition.elective.pickCount);
    } catch {
      return [];
    }
  }

  private saveSelectedGenres(subject: MockExamSubject): void {
    try {
      localStorage.setItem(electivesStorageKey(subject.key), JSON.stringify(this.selectedGenres()));
    } catch {
      // 保存できなくても模擬試験は受けられる(次回は選び直すだけ)
    }
  }

  start(): void {
    const subject = this.subject();
    if (!subject || !this.canStart()) return;

    this.isLoading.set(true);
    this.errorMessage.set('');

    const query = `
      query GetExamQuestions($examType: String!) {
        examQuestions(examType: $examType) {
          id
          category
          subCategory
          type
          question
          choices
          correct
          explanation
          image
          code
        }
      }
    `;

    this.graphql.query<{ examQuestions: ExamQuestion[] }>(query, { examType: subject.key }).pipe(
      catchError((err) => {
        this.errorMessage.set('問題データの取得に失敗しました。しばらくしてから再度お試しください。');
        console.error('Failed to load exam questions:', err);
        return of(null);
      })
    ).subscribe((res) => {
      this.isLoading.set(false);
      if (!res) return;

      const pool = res.examQuestions;
      if (pool.length === 0) {
        this.errorMessage.set('出題できる問題がありません。');
        return;
      }

      const composition = subject.mockExam.composition;
      const questions = composition
        ? pickByComposition(pool, composition, this.selectedGenres())
        : shuffle(pool).slice(0, Math.min(subject.mockExam.questionCount, pool.length));
      if (composition) this.saveSelectedGenres(subject);
      this.sessionQuestions.set(questions);
      this.answers.set(new Array(questions.length));
      this.round.set(0);
      this.view.set('quiz');
      this.startTimer();
    });
  }

  private startTimer(): void {
    this.stopTimer();
    this.timerHandle = setInterval(() => {
      const next = this.remainingSeconds() - 1;
      this.remainingSeconds.set(Math.max(next, 0));
      if (next <= 0) {
        this.stopTimer();
        this.finish(true);
      }
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timerHandle !== null) {
      clearInterval(this.timerHandle);
      this.timerHandle = null;
    }
  }

  selectAnswer(globalIndex: number, choiceIndex: number): void {
    const question = this.sessionQuestions()[globalIndex];
    if (!question) return;

    const current = [...this.answers()];
    const existing = current[globalIndex] ?? [];
    const next = question.type === 'multi'
      ? (existing.includes(choiceIndex) ? existing.filter((i) => i !== choiceIndex) : [...existing, choiceIndex])
      : [choiceIndex];

    current[globalIndex] = next;
    this.answers.set(current);
  }

  isSelected(globalIndex: number, choiceIndex: number): boolean {
    return this.answers()[globalIndex]?.includes(choiceIndex) ?? false;
  }

  goToRound(roundIndex: number): void {
    this.round.set(Math.min(Math.max(roundIndex, 0), this.totalRounds() - 1));
  }

  // 棄権: 記録を残さず状態を破棄するだけ(サーバーへの送信は行わない)
  abandon(): void {
    this.stopTimer();
    this.view.set('start');
    this.sessionQuestions.set([]);
    this.answers.set([]);
  }

  finish(forced: boolean): void {
    if (this.view() !== 'quiz') return;
    this.stopTimer();

    const subject = this.subject();
    const questions = this.sessionQuestions();
    const answers = this.answers();
    if (!subject || questions.length === 0) return;

    const correctCount = questions.reduce((count, q, i) => count + (isCorrectAnswer(q, answers[i] ?? []) ? 1 : 0), 0);
    const totalCount = questions.length;
    const passBorder = Math.ceil(totalCount * subject.mockExam.passRatio);
    const passed = correctCount >= passBorder;
    const pointsEarned = correctCount * subject.pointsPerCorrectAnswer;

    this.result.set({ correctCount, totalCount, passBorder, passed, pointsEarned });
    this.view.set('result');

    if (pointsEarned > 0) {
      this.accountService.addPoints(pointsEarned, `模擬試験 ${subject.name} ${correctCount}問正解`).subscribe();
    }

    // 正答率の推移・分野別の正答率・称号の判定に使うため、不合格の回も含めて全ての回を、
    // 問題ごとの選択と正誤とともに記録する(実績カレンダーは passed で絞り込んで合格した日だけを表示する)。
    // 棄権した回は finish() を通らないので記録されない。
    const examAnswers: ExamAnswer[] = questions.map((q, i) => ({
      questionId: q.id,
      selected: answers[i] ?? [],
      correct: isCorrectAnswer(q, answers[i] ?? [])
    }));
    // 記録できたら、今回の回を含めた復習の対象数を取り直して結果画面の復習ボタンに表示する
    this.achievementsService.recordCompletion(subject.key, correctCount, totalCount, 'MOCK_EXAM', passed, examAnswers).pipe(
      switchMap(() => this.achievementsService.getMockExamRecords()),
      catchError((err) => {
        console.error('Failed to record mock exam or reload records:', err);
        return of(null);
      })
    ).subscribe((records) => {
      if (records) this.reviewCount.set(reviewTargets(records, subject.key).length);
    });
  }

  isCorrect(question: ExamQuestion, answer: number[] | undefined): boolean {
    return isCorrectAnswer(question, answer ?? []);
  }

  destroy(): void {
    this.stopTimer();
  }
}
