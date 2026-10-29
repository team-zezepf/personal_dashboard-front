import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { HeaderComponent } from '../../components/header/header.component';
import { CodeBlockComponent } from '../../components/code-block/code-block.component';
import { JournalInputComponent } from '../../components/journal-input/journal-input.component';
import { JournalTableComponent } from '../../components/journal-table/journal-table.component';
import { MistakeReviewService, ReviewItem } from '../../services/mistake-review.service';
import { ExamQuestion, Journal, QuestionAnswer } from '../../models/exam-question.models';
import { isAnswered } from '../../utils/exam-answer';
import { isJournal } from '../../utils/journal';
import { findExamSubject, hasMockExam } from '../../config/exam-subjects';
import { RECENT_ATTEMPT_COUNT, formatTakenAt } from '../../utils/mock-exam-stats';

@Component({
  selector: 'app-mistake-review-page',
  standalone: true,
  imports: [CommonModule, RouterLink, HeaderComponent, CodeBlockComponent, JournalInputComponent, JournalTableComponent],
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

  // 出題画面での回答(問題id → 選択済み選択肢indexの配列、または入力した仕訳)。ラウンドが変わるたびリセットする。
  private readonly selections = signal<Map<string | number, QuestionAnswer>>(new Map());

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
    return items.length > 0 && items.every((item) => isAnswered(selections.get(item.question.id)));
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
    const answer = this.selections().get(question.id);
    return Array.isArray(answer) && answer.includes(choiceIndex);
  }

  setJournal(question: ExamQuestion, journal: Journal): void {
    const current = new Map(this.selections());
    current.set(question.id, journal);
    this.selections.set(current);
  }

  toggleChoice(question: ExamQuestion, choiceIndex: number): void {
    const current = new Map(this.selections());
    const saved = current.get(question.id);
    const existing = Array.isArray(saved) ? saved : [];
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

  // 4択の問題で選んだ選択肢(仕訳入力の問題では空)
  answerFor(globalIndex: number): number[] {
    const answer = this.review.answers()[globalIndex];
    return Array.isArray(answer) ? answer : [];
  }

  // 仕訳入力の問題で入力した仕訳(未回答なら null)
  journalAnswerFor(globalIndex: number): Journal | null {
    const answer = this.review.answers()[globalIndex];
    return isJournal(answer) ? answer : null;
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
