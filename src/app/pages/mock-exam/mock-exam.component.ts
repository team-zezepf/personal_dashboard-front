import { Component, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { HeaderComponent } from '../../components/header/header.component';
import { MockExamService } from '../../services/mock-exam.service';
import { findExamSubject, hasMockExam } from '../../config/exam-subjects';

@Component({
  selector: 'app-mock-exam-page',
  standalone: true,
  imports: [CommonModule, RouterLink, HeaderComponent],
  templateUrl: './mock-exam.component.html',
  styleUrl: './mock-exam.component.css'
})
export class MockExamPageComponent implements OnDestroy {
  readonly mockExam = inject(MockExamService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly examTypeParam = this.route.snapshot.paramMap.get('examType') ?? '';
  // 模擬試験を提供していない科目(科目Bなど)のURLを直接開いた場合も、未知のキーと同様に科目選択画面へ戻す
  private readonly foundSubject = findExamSubject(this.examTypeParam);
  readonly subject = hasMockExam(this.foundSubject) ? this.foundSubject : undefined;

  readonly showAbandonModal = signal(false);
  readonly showFinishModal = signal(false);

  constructor() {
    if (!this.subject) {
      this.router.navigateByUrl('/study');
      return;
    }
    this.mockExam.prepare(this.examTypeParam, this.subject);
  }

  ngOnDestroy(): void {
    this.mockExam.destroy();
  }

  trustedImage(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  readonly timerLabel = computed(() => {
    const total = this.mockExam.remainingSeconds();
    const m = Math.floor(total / 60).toString().padStart(2, '0');
    const s = (total % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  });

  // 円形タイマーの残量比率(0〜1)。SVGのstroke-dashoffset計算に使う。
  readonly timerRatio = computed(() => {
    if (!this.subject) return 0;
    const durationSec = this.subject.mockExam.durationMinutes * 60;
    if (durationSec === 0) return 0;
    return Math.max(this.mockExam.remainingSeconds(), 0) / durationSec;
  });

  readonly timerLevel = computed<'normal' | 'warning' | 'danger'>(() => {
    const ratio = this.timerRatio();
    if (ratio <= 0.2) return 'danger';
    if (ratio <= 0.5) return 'warning';
    return 'normal';
  });

  start(): void {
    this.mockExam.start();
  }

  globalIndex(indexInRound: number): number {
    return this.mockExam.roundStartIndex() + indexInRound;
  }

  isAnswered(globalIndex: number): boolean {
    return (this.mockExam.answers()[globalIndex]?.length ?? 0) > 0;
  }

  roundOf(globalIndex: number): number {
    return Math.floor(globalIndex / 2);
  }

  openAbandonModal(): void {
    this.showAbandonModal.set(true);
  }

  closeAbandonModal(): void {
    this.showAbandonModal.set(false);
  }

  confirmAbandon(): void {
    this.showAbandonModal.set(false);
    this.mockExam.abandon();
    this.router.navigateByUrl('/study');
  }

  openFinishModal(): void {
    this.showFinishModal.set(true);
  }

  closeFinishModal(): void {
    this.showFinishModal.set(false);
  }

  confirmFinish(): void {
    this.showFinishModal.set(false);
    this.mockExam.finish(false);
  }

  unansweredCount(): number {
    return this.mockExam.sessionQuestions().length - this.mockExam.answeredCount();
  }

  answerText(question: { choices: string[] }, answer: number[] | undefined): string {
    if (!answer || answer.length === 0) return '（未回答）';
    return answer.map((i) => question.choices[i]).join(' / ');
  }

  correctText(question: { choices: string[]; correct: number[] }): string {
    return question.correct.map((i) => question.choices[i]).join(' / ');
  }

  backToSubjects(): void {
    this.router.navigateByUrl('/study');
  }
}
