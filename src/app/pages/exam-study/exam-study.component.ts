import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { HeaderComponent } from '../../components/header/header.component';
import { CodeBlockComponent } from '../../components/code-block/code-block.component';
import { ExamStudyService } from '../../services/exam-study.service';
import { EXAM_ACHIEVEMENT_RATIO } from '../../services/exam-achievements.service';
import { ExamQuestion } from '../../models/exam-question.models';
import { findExamSubject } from '../../config/exam-subjects';

@Component({
  selector: 'app-exam-study-page',
  standalone: true,
  imports: [CommonModule, RouterLink, HeaderComponent, CodeBlockComponent],
  templateUrl: './exam-study.component.html',
  styleUrl: './exam-study.component.css'
})
export class ExamStudyPageComponent {
  readonly examStudy = inject(ExamStudyService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  // ルートパラメータ(:examType)で指定された科目。未知のキーの場合は科目選択画面へ戻す。
  private readonly examTypeParam = this.route.snapshot.paramMap.get('examType') ?? '';
  readonly subject = findExamSubject(this.examTypeParam);

  // スタート画面で案内する、実績の記録に必要な正解数(出題数の7割以上)
  readonly achievementBorder = Math.ceil((this.subject?.practice.questionsPerSession ?? 0) * EXAM_ACHIEVEMENT_RATIO);

  // 出題画面での選択状態(質問id → 選択済み選択肢indexの配列)。ラウンドが変わるたびリセットする。
  private readonly selections = signal<Map<string | number, number[]>>(new Map());

  constructor() {
    if (!this.subject) {
      this.router.navigateByUrl('/study');
    }
  }

  // 問題データのimageはバックエンド(自前のexam_questions.json)由来のSVGであり、ユーザー入力では
  // ないため、デフォルトのサニタイズ([innerHTML]は<svg>を許可しない)を明示的にバイパスする。
  trustedImage(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  readonly canSubmitRound = computed(() => {
    const questions = this.examStudy.roundQuestions();
    const selections = this.selections();
    return questions.length > 0 && questions.every((q) => (selections.get(q.id)?.length ?? 0) > 0);
  });

  start(): void {
    if (!this.subject) return;
    this.selections.set(new Map());
    this.examStudy.startSession(this.subject);
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
    const roundAnswers = this.examStudy.roundQuestions().map((q) => this.selections().get(q.id) ?? []);
    this.examStudy.submitRound(roundAnswers);
  }

  nextRound(): void {
    this.selections.set(new Map());
    this.examStudy.goToNextRound();
  }

  retry(): void {
    if (!this.subject) return;
    this.selections.set(new Map());
    this.examStudy.startSession(this.subject);
  }

  globalIndex(indexInRound: number): number {
    return this.examStudy.roundStartIndex() + indexInRound;
  }

  answerFor(globalIndex: number): number[] | undefined {
    return this.examStudy.answers()[globalIndex];
  }

  resultFor(globalIndex: number): boolean | undefined {
    return this.examStudy.results()[globalIndex];
  }

  answerText(question: ExamQuestion, answer: number[] | undefined): string {
    if (!answer || answer.length === 0) return '（未回答）';
    return answer.map((i) => question.choices[i]).join(' / ');
  }

  correctText(question: ExamQuestion): string {
    return question.correct.map((i) => question.choices[i]).join(' / ');
  }
}
