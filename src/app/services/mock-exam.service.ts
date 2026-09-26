import { Injectable, inject, signal, computed } from '@angular/core';
import { GraphQLService } from './graphql.service';
import { ExamAchievementsService } from './exam-achievements.service';
import { AccountService } from './account.service';
import { ExamQuestion } from '../models/exam-question.models';
import { MockExamSubject } from '../config/exam-subjects';
import { catchError, of } from 'rxjs';

export type MockExamView = 'start' | 'quiz' | 'result';
export const QUESTIONS_PER_ROUND = 2;

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function sortedUnique(values: number[]): number[] {
  return [...new Set(values)].sort((a, b) => a - b);
}

function isCorrectAnswer(question: ExamQuestion, answer: number[]): boolean {
  const correct = sortedUnique(question.correct);
  const given = sortedUnique(answer);
  return correct.length === given.length && correct.every((v, i) => v === given[i]);
}

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

  readonly totalRounds = computed(() => Math.ceil(this.sessionQuestions().length / QUESTIONS_PER_ROUND) || 1);
  readonly roundStartIndex = computed(() => this.round() * QUESTIONS_PER_ROUND);
  readonly roundQuestions = computed(() => {
    const start = this.roundStartIndex();
    return this.sessionQuestions().slice(start, start + QUESTIONS_PER_ROUND);
  });
  readonly answeredCount = computed(() => this.answers().filter((a) => a && a.length > 0).length);

  prepare(examType: string, subject: MockExamSubject): void {
    this.subject.set(subject);
    this.view.set('start');
    this.isLoading.set(false);
    this.errorMessage.set('');
    this.sessionQuestions.set([]);
    this.answers.set([]);
    this.round.set(0);
    this.result.set(null);
    this.remainingSeconds.set(subject.mockExam.durationMinutes * 60);
  }

  start(): void {
    const subject = this.subject();
    if (!subject) return;

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

      const size = Math.min(subject.mockExam.questionCount, pool.length);
      this.sessionQuestions.set(shuffle(pool).slice(0, size));
      this.answers.set(new Array(size));
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
      this.accountService.addPoints(pointsEarned).subscribe();
    }

    // 実績カレンダーには合格した受験のみ記録する(不合格の受験は記録を残さない)
    if (passed) {
      this.achievementsService.recordCompletion(subject.key, correctCount, totalCount, 'MOCK_EXAM').pipe(
        catchError((err) => {
          console.error('Failed to record mock exam achievement:', err);
          return of(null);
        })
      ).subscribe();
    }
  }

  isCorrect(question: ExamQuestion, answer: number[] | undefined): boolean {
    return isCorrectAnswer(question, answer ?? []);
  }

  destroy(): void {
    this.stopTimer();
  }
}
