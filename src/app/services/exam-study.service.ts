import { Injectable, inject, signal, computed } from '@angular/core';
import { GraphQLService } from './graphql.service';
import { ExamAchievementsService, EXAM_ACHIEVEMENT_THRESHOLD } from './exam-achievements.service';
import { ExamQuestion } from '../models/exam-question.models';
import { catchError, of } from 'rxjs';

export type ExamStudyView = 'start' | 'quiz' | 'review' | 'result';

export const QUESTIONS_PER_ROUND = 2;
const QUESTIONS_PER_SESSION = 10;

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
export class ExamStudyService {
  private graphql = inject(GraphQLService);
  private achievementsService = inject(ExamAchievementsService);

  readonly isLoading = signal(false);
  readonly errorMessage = signal('');

  readonly view = signal<ExamStudyView>('start');
  readonly sessionQuestions = signal<ExamQuestion[]>([]);
  readonly round = signal(0);
  readonly answers = signal<(number[] | undefined)[]>([]);
  readonly results = signal<(boolean | undefined)[]>([]);

  readonly totalRounds = computed(() =>
    Math.ceil(this.sessionQuestions().length / QUESTIONS_PER_ROUND) || 1
  );

  readonly isLastRound = computed(() => this.round() === this.totalRounds() - 1);

  readonly roundStartIndex = computed(() => this.round() * QUESTIONS_PER_ROUND);

  readonly roundQuestions = computed(() => {
    const start = this.roundStartIndex();
    return this.sessionQuestions().slice(start, start + QUESTIONS_PER_ROUND);
  });

  readonly answeredCount = computed(() =>
    Math.min(this.roundStartIndex(), this.sessionQuestions().length)
  );

  readonly progressPercent = computed(() => {
    const total = this.sessionQuestions().length;
    return total === 0 ? 0 : Math.round((this.answeredCount() / total) * 100);
  });

  readonly correctCount = computed(() => this.results().filter(Boolean).length);

  startSession(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    const query = `
      query GetExamQuestions {
        examQuestions {
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

    this.graphql.query<{ examQuestions: ExamQuestion[] }>(query).pipe(
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

      const size = Math.min(QUESTIONS_PER_SESSION, pool.length);
      this.sessionQuestions.set(shuffle(pool).slice(0, size));
      this.round.set(0);
      this.answers.set(new Array(size));
      this.results.set(new Array(size));
      this.view.set('quiz');
    });
  }

  submitRound(roundAnswers: number[][]): void {
    const globalStart = this.roundStartIndex();
    const questions = this.roundQuestions();

    const answers = [...this.answers()];
    const results = [...this.results()];

    questions.forEach((q, i) => {
      const answer = roundAnswers[i] ?? [];
      answers[globalStart + i] = answer;
      results[globalStart + i] = isCorrectAnswer(q, answer);
    });

    this.answers.set(answers);
    this.results.set(results);
    this.view.set('review');
  }

  goToNextRound(): void {
    if (this.isLastRound()) {
      this.view.set('result');
      this.recordAchievementIfQualified();
      return;
    }
    this.round.update((r) => r + 1);
    this.view.set('quiz');
  }

  // 10問中7問(EXAM_ACHIEVEMENT_THRESHOLD)以上正解した場合のみ実績として記録する。
  // 記録の成否は学習結果の表示に影響しないため、エラーはログのみに留める。
  private recordAchievementIfQualified(): void {
    const totalCount = this.sessionQuestions().length;
    const correctCount = this.correctCount();
    if (correctCount < EXAM_ACHIEVEMENT_THRESHOLD) return;

    this.achievementsService.recordCompletion(correctCount, totalCount).pipe(
      catchError((err) => {
        console.error('Failed to record exam achievement:', err);
        return of(null);
      })
    ).subscribe();
  }

  isCorrect(question: ExamQuestion, answer: number[] | undefined): boolean {
    return isCorrectAnswer(question, answer ?? []);
  }
}
