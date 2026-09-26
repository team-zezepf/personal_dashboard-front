import { Component, ElementRef, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { catchError, of } from 'rxjs';
import { ExamAchievementsService } from '../../services/exam-achievements.service';
import { ExamQuestionService } from '../../services/exam-question.service';
import { ExamRecord } from '../../models/exam-record.models';
import { ExamQuestion } from '../../models/exam-question.models';
import { findExamSubject } from '../../config/exam-subjects';
import { RECENT_ATTEMPT_COUNT, formatTakenAt, recentAttempts, scorePercent } from '../../utils/mock-exam-stats';
import { CodeBlockComponent } from '../code-block/code-block.component';

interface AnswerRow {
  index: number;
  selected: number[];
  correct: boolean;
  // 問題データから消えた問題は undefined
  question: ExamQuestion | undefined;
}

/**
 * 資格学習の科目一覧の画面に表示する、全科目の直近の模擬試験の記録(新しい順)。
 * 各行の「詳細」で、その回の問題ごとの正誤をモーダルで表示する。
 */
@Component({
  selector: 'app-recent-mock-exams',
  standalone: true,
  imports: [CodeBlockComponent],
  templateUrl: './recent-mock-exams.component.html',
  styleUrl: './recent-mock-exams.component.css'
})
export class RecentMockExamsComponent implements OnInit {
  private readonly achievementsService = inject(ExamAchievementsService);
  private readonly questionService = inject(ExamQuestionService);
  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('attemptDialog');

  readonly recentCount = RECENT_ATTEMPT_COUNT;
  readonly records = signal<ExamRecord[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');

  readonly recent = computed(() => [...recentAttempts(this.records())].reverse());

  // ---- 受験の詳細モーダル ----
  readonly selected = signal<ExamRecord | null>(null);
  readonly questions = signal<ExamQuestion[]>([]);
  readonly isQuestionsLoading = signal(false);
  readonly openedIndex = signal<number | null>(null);

  readonly answerRows = computed<AnswerRow[]>(() => {
    const record = this.selected();
    if (!record) return [];
    const byId = new Map(this.questions().map((q) => [String(q.id), q]));
    return (record.answers ?? []).map((a, i) => ({
      index: i,
      selected: a.selected,
      correct: a.correct,
      question: byId.get(String(a.questionId))
    }));
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

  subjectName(record: ExamRecord): string {
    return findExamSubject(record.examType)?.name ?? record.examType;
  }

  passBorder(record: ExamRecord): number | null {
    const ratio = findExamSubject(record.examType)?.mockExam?.passRatio;
    return ratio === undefined ? null : Math.ceil(record.totalCount * ratio);
  }

  score(record: ExamRecord): string {
    return `${record.correctCount}/${record.totalCount} (${Math.round(scorePercent(record))}%)`;
  }

  percentText(record: ExamRecord): string {
    return `${Math.round(scorePercent(record))}%`;
  }

  takenAt(record: ExamRecord): string {
    return formatTakenAt(record, true);
  }

  openDetail(record: ExamRecord): void {
    this.selected.set(record);
    this.openedIndex.set(null);
    this.questions.set([]);
    if ((record.answers ?? []).length > 0) {
      this.isQuestionsLoading.set(true);
      this.questionService.getQuestions(record.examType).pipe(
        catchError((err) => {
          console.error('Failed to load exam questions:', err);
          return of([] as ExamQuestion[]);
        })
      ).subscribe((questions) => {
        this.questions.set(questions);
        this.isQuestionsLoading.set(false);
      });
    }
    this.dialog()?.nativeElement.showModal();
  }

  closeDetail(): void {
    this.dialog()?.nativeElement.close();
  }

  onDialogClick(event: MouseEvent): void {
    if (event.target === this.dialog()?.nativeElement) this.closeDetail();
  }

  toggleRow(index: number): void {
    this.openedIndex.update((current) => (current === index ? null : index));
  }

  isCorrectChoice(question: ExamQuestion, choiceIndex: number): boolean {
    return question.correct.includes(choiceIndex);
  }
}
