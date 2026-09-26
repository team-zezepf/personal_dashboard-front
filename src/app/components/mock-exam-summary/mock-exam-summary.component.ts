import { Component, ElementRef, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { catchError, of } from 'rxjs';
import { ExamAchievementsService } from '../../services/exam-achievements.service';
import { ExamQuestionService } from '../../services/exam-question.service';
import { ExamRecord } from '../../models/exam-record.models';
import { ExamQuestion } from '../../models/exam-question.models';
import { EXAM_SUBJECTS, MockExamSubject, hasMockExam } from '../../config/exam-subjects';
import {
  GenreRate,
  MIN_GENRE_ANSWERS,
  RECENT_ATTEMPT_COUNT,
  WEAK_GENRE_RATE,
  formatTakenAt,
  genreRates,
  recentAttempts,
  scorePercent,
  scoreSeries,
  summarize
} from '../../utils/mock-exam-stats';
import { TrendChartComponent, TrendPoint } from '../trend-chart/trend-chart.component';

const ALL_GENRES = '全体';

/**
 * 実績ページの「模擬試験」タブに表示する、科目ごとの模擬試験の記録。
 * 各行の「詳細」で、その科目の直近の正答率の推移と分野別の正答率をモーダルで表示する。
 */
@Component({
  selector: 'app-mock-exam-summary',
  standalone: true,
  imports: [TrendChartComponent],
  templateUrl: './mock-exam-summary.component.html',
  styleUrl: './mock-exam-summary.component.css'
})
export class MockExamSummaryComponent implements OnInit {
  private readonly achievementsService = inject(ExamAchievementsService);
  private readonly questionService = inject(ExamQuestionService);
  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('detailDialog');

  readonly recentCount = RECENT_ATTEMPT_COUNT;
  readonly allGenres = ALL_GENRES;
  readonly weakRate = WEAK_GENRE_RATE;
  readonly minAnswers = MIN_GENRE_ANSWERS;

  readonly records = signal<ExamRecord[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');

  readonly rows = computed(() => {
    const records = this.records();
    return EXAM_SUBJECTS.filter(hasMockExam).map((subject) => ({
      subject,
      summary: summarize(records.filter((r) => r.examType === subject.key))
    }));
  });

  // ---- 科目の詳細モーダル ----
  readonly selectedSubject = signal<MockExamSubject | null>(null);
  readonly questions = signal<ExamQuestion[]>([]);
  readonly isQuestionsLoading = signal(false);
  readonly selectedGenre = signal(ALL_GENRES);

  readonly subjectAttempts = computed(() => {
    const subject = this.selectedSubject();
    if (!subject) return [];
    return recentAttempts(this.records().filter((r) => r.examType === subject.key));
  });

  readonly genres = computed(() => genreRates(this.subjectAttempts(), this.questions()));

  readonly genreOptions = computed(() => [ALL_GENRES, ...[...this.genres()].map((g) => g.genre).sort()]);

  readonly trendPoints = computed<TrendPoint[]>(() => {
    const attempts = this.subjectAttempts();
    const genre = this.selectedGenre() === ALL_GENRES ? null : this.selectedGenre();
    const series = scoreSeries(attempts, this.questions(), genre);
    return attempts.map((a, i) => ({
      label: formatTakenAt(a),
      value: series[i],
      detail: genre === null ? `${a.correctCount}/${a.totalCount}問・${a.passed ? '合格' : '不合格'}` : undefined
    }));
  });

  readonly trendStats = computed(() => {
    const attempts = this.subjectAttempts();
    const values = this.trendPoints().map((p) => p.value).filter((v): v is number => v !== null);
    if (values.length === 0) return null;
    return {
      average: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
      best: Math.round(Math.max(...values)),
      covered: values.length,
      total: attempts.length
    };
  });

  readonly selectedSummary = computed(() => {
    const subject = this.selectedSubject();
    return subject ? this.rows().find((r) => r.subject.key === subject.key)?.summary ?? null : null;
  });

  ngOnInit(): void {
    this.achievementsService.getMockExamRecords().pipe(
      catchError((err) => {
        console.error('Failed to load mock exam records:', err);
        this.errorMessage.set('模擬試験の記録の取得に失敗しました。');
        return of([] as ExamRecord[]);
      })
    ).subscribe((records) => {
      this.records.set(records);
      this.isLoading.set(false);
    });
  }

  openDetail(subject: MockExamSubject): void {
    this.selectedSubject.set(subject);
    this.selectedGenre.set(ALL_GENRES);
    this.questions.set([]);
    this.isQuestionsLoading.set(true);
    this.questionService.getQuestions(subject.key).pipe(
      catchError((err) => {
        console.error('Failed to load exam questions:', err);
        return of([] as ExamQuestion[]);
      })
    ).subscribe((questions) => {
      this.questions.set(questions);
      this.isQuestionsLoading.set(false);
    });
    this.dialog()?.nativeElement.showModal();
  }

  closeDetail(): void {
    this.dialog()?.nativeElement.close();
  }

  // ダイアログの外側(背景)をクリックしたら閉じる
  onDialogClick(event: MouseEvent): void {
    if (event.target === this.dialog()?.nativeElement) this.closeDetail();
  }

  selectGenre(genre: string): void {
    this.selectedGenre.set(genre);
  }

  percent(record: ExamRecord | null): string {
    return record ? `${record.correctCount}/${record.totalCount} (${Math.round(scorePercent(record))}%)` : '—';
  }

  round(value: number | null): string {
    return value === null ? '—' : `${Math.round(value)}%`;
  }

  genreTitle(g: GenreRate): string {
    return `${g.genre}: ${g.correct}/${g.total}問正解${g.isFew ? '(解答数が少ないため参考値)' : ''}`;
  }

}
