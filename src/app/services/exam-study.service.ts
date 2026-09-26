import { Injectable, inject, signal, computed } from '@angular/core';
import { GraphQLService } from './graphql.service';
import { ExamAchievementsService, EXAM_ACHIEVEMENT_RATIO } from './exam-achievements.service';
import { AccountService } from './account.service';
import { ExamQuestion } from '../models/exam-question.models';
import { ExamSubjectPracticeConfig } from '../config/exam-subjects';
import { catchError, of } from 'rxjs';

export type ExamStudyView = 'start' | 'quiz' | 'review' | 'result';

export const POINTS_PER_CORRECT_ANSWER = 10;

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
  private accountService = inject(AccountService);

  readonly isLoading = signal(false);
  readonly errorMessage = signal('');

  // 現在学習中の科目(examType)。startSession()を呼ぶたびに更新される。
  readonly examType = signal<string | null>(null);

  // 何問ごとに正誤・解説のページを挟むか。科目ごとの設定をstartSession()で受け取る。
  readonly questionsPerRound = signal(2);

  readonly view = signal<ExamStudyView>('start');
  readonly sessionQuestions = signal<ExamQuestion[]>([]);
  readonly round = signal(0);
  readonly answers = signal<(number[] | undefined)[]>([]);
  readonly results = signal<(boolean | undefined)[]>([]);

  readonly totalRounds = computed(() =>
    Math.ceil(this.sessionQuestions().length / this.questionsPerRound()) || 1
  );

  readonly isLastRound = computed(() => this.round() === this.totalRounds() - 1);

  readonly roundStartIndex = computed(() => this.round() * this.questionsPerRound());

  readonly roundQuestions = computed(() => {
    const start = this.roundStartIndex();
    return this.sessionQuestions().slice(start, start + this.questionsPerRound());
  });

  readonly answeredCount = computed(() =>
    Math.min(this.roundStartIndex(), this.sessionQuestions().length)
  );

  readonly progressPercent = computed(() => {
    const total = this.sessionQuestions().length;
    return total === 0 ? 0 : Math.round((this.answeredCount() / total) * 100);
  });

  readonly correctCount = computed(() => this.results().filter(Boolean).length);

  startSession(examType: string, practice: ExamSubjectPracticeConfig): void {
    this.examType.set(examType);
    this.questionsPerRound.set(practice.questionsPerRound);
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

    this.graphql.query<{ examQuestions: ExamQuestion[] }>(query, { examType }).pipe(
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

      const size = Math.min(practice.questionsPerSession, pool.length);
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
      this.awardPoints();
      this.recordAchievementIfQualified();
      return;
    }
    this.round.update((r) => r + 1);
    this.view.set('quiz');
  }

  // 正解数にかかわらず、正解した問題数だけポイントを付与する(実績記録のしきい値とは無関係)。
  readonly pointsEarned = computed(() => this.correctCount() * POINTS_PER_CORRECT_ANSWER);

  private awardPoints(): void {
    const amount = this.pointsEarned();
    if (amount <= 0) return;
    this.accountService.addPoints(amount).subscribe();
  }

  // 実績として記録するのに必要な正解数(出題数の7割以上。10問なら7問、5問なら4問)
  readonly achievementBorder = computed(() =>
    Math.ceil(this.sessionQuestions().length * EXAM_ACHIEVEMENT_RATIO)
  );

  // 正解数がachievementBorder以上の場合のみ実績として記録する。
  // 記録の成否は学習結果の表示に影響しないため、エラーはログのみに留める。
  private recordAchievementIfQualified(): void {
    const totalCount = this.sessionQuestions().length;
    const correctCount = this.correctCount();
    if (totalCount === 0 || correctCount < this.achievementBorder()) return;

    const examType = this.examType();
    if (!examType) return;

    this.achievementsService.recordCompletion(examType, correctCount, totalCount).pipe(
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
