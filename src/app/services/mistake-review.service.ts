import { Injectable, inject, signal, computed } from '@angular/core';
import { ExamAchievementsService } from './exam-achievements.service';
import { ExamQuestionService } from './exam-question.service';
import { ExamQuestion } from '../models/exam-question.models';
import { ExamRecord } from '../models/exam-record.models';
import { MockExamSubject } from '../config/exam-subjects';
import { reviewTargets } from '../utils/mistake-review';
import { shuffle } from '../utils/mock-exam-composition';
import { isCorrectAnswer } from '../utils/exam-answer';
import { catchError, forkJoin, of } from 'rxjs';

export type MistakeReviewView = 'start' | 'quiz' | 'review' | 'result';

export interface ReviewItem {
  question: ExamQuestion;
  // 最後に解いた模擬試験での回答(未回答なら空)
  lastSelected: number[];
  // 直近の模擬試験のうち、この問題を間違えた回(古い順)
  missedAttempts: ExamRecord[];
}

export interface ReviewGenre {
  genre: string;
  count: number;
}

/**
 * 模擬試験で間違えた問題の復習。練習と同じく数問ずつ答えて正誤・解説を確認する。
 * 同じ問題の繰り返しでポイントを稼げないよう、ポイントの付与や実績の記録はしない。
 */
@Injectable({
  providedIn: 'root'
})
export class MistakeReviewService {
  private achievementsService = inject(ExamAchievementsService);
  private questionService = inject(ExamQuestionService);

  readonly isLoading = signal(false);
  readonly errorMessage = signal('');

  readonly view = signal<MistakeReviewView>('start');
  readonly questionsPerRound = signal(2);

  // 復習の対象の全問題と、開始画面で選んだ分野
  readonly items = signal<ReviewItem[]>([]);
  readonly selectedGenres = signal<string[]>([]);

  readonly sessionItems = signal<ReviewItem[]>([]);
  readonly round = signal(0);
  readonly answers = signal<(number[] | undefined)[]>([]);
  readonly results = signal<(boolean | undefined)[]>([]);

  // 間違えた問題がある分野と問題数(多い順)
  readonly genres = computed<ReviewGenre[]>(() => {
    const counts = new Map<string, number>();
    for (const item of this.items()) {
      counts.set(item.question.subCategory, (counts.get(item.question.subCategory) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([genre, count]) => ({ genre, count }))
      .sort((a, b) => b.count - a.count || a.genre.localeCompare(b.genre));
  });

  readonly selectedItems = computed(() => {
    const selected = this.selectedGenres();
    return this.items().filter((item) => selected.includes(item.question.subCategory));
  });

  readonly totalRounds = computed(() => Math.ceil(this.sessionItems().length / this.questionsPerRound()) || 1);
  readonly isLastRound = computed(() => this.round() === this.totalRounds() - 1);
  readonly roundStartIndex = computed(() => this.round() * this.questionsPerRound());
  readonly roundItems = computed(() => {
    const start = this.roundStartIndex();
    return this.sessionItems().slice(start, start + this.questionsPerRound());
  });
  readonly progressPercent = computed(() => {
    const total = this.sessionItems().length;
    return total === 0 ? 0 : Math.round((Math.min(this.roundStartIndex(), total) / total) * 100);
  });
  readonly correctCount = computed(() => this.results().filter(Boolean).length);
  readonly answeredCount = computed(() => this.results().filter((r) => r !== undefined).length);
  readonly wrongItems = computed(() => this.sessionItems().filter((_, i) => this.results()[i] === false));

  load(subject: MockExamSubject): void {
    this.view.set('start');
    this.questionsPerRound.set(subject.practice.questionsPerRound);
    this.items.set([]);
    this.selectedGenres.set([]);
    this.resetSession([]);
    this.isLoading.set(true);
    this.errorMessage.set('');

    forkJoin({
      records: this.achievementsService.getMockExamRecords(),
      questions: this.questionService.getQuestions(subject.key)
    }).pipe(
      catchError((err) => {
        this.errorMessage.set('復習する問題の取得に失敗しました。しばらくしてから再度お試しください。');
        console.error('Failed to load mistake review:', err);
        return of(null);
      })
    ).subscribe((res) => {
      this.isLoading.set(false);
      if (!res) return;

      const byId = new Map(res.questions.map((q) => [String(q.id), q]));
      // 問題データから消えた問題は出題できないので除く
      const items = reviewTargets(res.records, subject.key).flatMap((t) => {
        const question = byId.get(t.questionId);
        return question ? [{ question, lastSelected: t.lastSelected, missedAttempts: t.missedAttempts }] : [];
      });
      this.items.set(items);
      this.selectedGenres.set(this.genres().map((g) => g.genre));
    });
  }

  isGenreSelected(genre: string): boolean {
    return this.selectedGenres().includes(genre);
  }

  toggleGenre(genre: string): void {
    const current = this.selectedGenres();
    this.selectedGenres.set(current.includes(genre) ? current.filter((g) => g !== genre) : [...current, genre]);
  }

  start(): void {
    const items = this.selectedItems();
    if (items.length === 0) return;
    this.resetSession(shuffle(items));
    this.view.set('quiz');
  }

  // 今回の復習で間違えた問題だけを、もう一度出題する
  retryWrong(): void {
    const items = this.wrongItems();
    if (items.length === 0) return;
    this.resetSession(shuffle(items));
    this.view.set('quiz');
  }

  backToStart(): void {
    this.resetSession([]);
    this.view.set('start');
  }

  submitRound(roundAnswers: number[][]): void {
    const globalStart = this.roundStartIndex();
    const answers = [...this.answers()];
    const results = [...this.results()];

    this.roundItems().forEach((item, i) => {
      const answer = roundAnswers[i] ?? [];
      answers[globalStart + i] = answer;
      results[globalStart + i] = isCorrectAnswer(item.question, answer);
    });

    this.answers.set(answers);
    this.results.set(results);
    this.view.set('review');
  }

  goToNextRound(): void {
    if (this.isLastRound()) {
      this.view.set('result');
      return;
    }
    this.round.update((r) => r + 1);
    this.view.set('quiz');
  }

  private resetSession(items: ReviewItem[]): void {
    this.sessionItems.set(items);
    this.round.set(0);
    this.answers.set(new Array(items.length));
    this.results.set(new Array(items.length));
  }
}
