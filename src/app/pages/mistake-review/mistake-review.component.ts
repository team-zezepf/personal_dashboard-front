import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { HeaderComponent } from '../../components/header/header.component';
import { CodeBlockComponent } from '../../components/code-block/code-block.component';
import { MistakeReviewService, ReviewItem } from '../../services/mistake-review.service';
import { ExamQuestion } from '../../models/exam-question.models';
import { findExamSubject, hasMockExam } from '../../config/exam-subjects';
import { RECENT_ATTEMPT_COUNT, formatTakenAt } from '../../utils/mock-exam-stats';

@Component({
  selector: 'app-mistake-review-page',
  standalone: true,
  imports: [CommonModule, RouterLink, HeaderComponent, CodeBlockComponent],
  templateUrl: './mistake-review.component.html',
  styleUrl: './mistake-review.component.css'
})
export class MistakeReviewPageComponent {
  readonly review = inject(MistakeReviewService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  // 模擬試験を提供していない科目や未知のキーは、科目一覧へ戻す
  private readonly foundSubject = findExamSubject(this.route.snapshot.paramMap.get('examType'));
  readonly subject = hasMockExam(this.foundSubject) ? this.foundSubject : undefined;

  readonly recentCount = RECENT_ATTEMPT_COUNT;

  // 出題画面での選択状態(問題id → 選択済み選択肢indexの配列)。ラウンドが変わるたびリセットする。
  private readonly selections = signal<Map<string | number, number[]>>(new Map());

  constructor() {
    if (!this.subject) {
      this.router.navigateByUrl('/study');
      return;
    }
    this.review.load(this.subject);
  }

  // 問題データのimageは自前のexam_questions.json由来のSVGのため、サニタイズをバイパスする(練習の画面と同じ)
  trustedImage(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  readonly canSubmitRound = computed(() => {
    const items = this.review.roundItems();
    const selections = this.selections();
    return items.length > 0 && items.every((item) => (selections.get(item.question.id)?.length ?? 0) > 0);
  });

  start(): void {
    this.selections.set(new Map());
    this.review.start();
  }

  retryWrong(): void {
    this.selections.set(new Map());
    this.review.retryWrong();
  }

  backToStart(): void {
    this.selections.set(new Map());
    this.review.backToStart();
  }

  isSelected(question: ExamQuestion, choiceIndex: number): boolean {
    return this.selections().get(question.id)?.includes(choiceIndex) ?? false;
  }

  toggleChoice(question: ExamQuestion, choiceIndex: number): void {
    const current = new Map(this.selections());
    const existing = current.get(question.id) ?? [];
    const next = question.type === 'multi'
      ? (existing.includes(choiceIndex) ? existing.filter((i) => i !== choiceIndex) : [...existing, choiceIndex])
      : [choiceIndex];
    current.set(question.id, next);
    this.selections.set(current);
  }

  submitRound(): void {
    const roundAnswers = this.review.roundItems().map((item) => this.selections().get(item.question.id) ?? []);
    this.review.submitRound(roundAnswers);
  }

  nextRound(): void {
    this.selections.set(new Map());
    this.review.goToNextRound();
  }

  globalIndex(indexInRound: number): number {
    return this.review.roundStartIndex() + indexInRound;
  }

  answerFor(globalIndex: number): number[] {
    return this.review.answers()[globalIndex] ?? [];
  }

  resultFor(globalIndex: number): boolean {
    return this.review.results()[globalIndex] ?? false;
  }

  isCorrectChoice(question: ExamQuestion, choiceIndex: number): boolean {
    return question.correct.includes(choiceIndex);
  }

  // 例: 「9/20・9/26 の模擬試験で不正解」
  missedText(item: ReviewItem): string {
    return `${item.missedAttempts.map((a) => formatTakenAt(a)).join('・')} の模擬試験で不正解`;
  }
}
