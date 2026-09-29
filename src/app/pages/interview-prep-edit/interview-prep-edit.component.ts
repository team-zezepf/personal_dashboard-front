import { Component, HostListener, OnDestroy, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HeaderComponent } from '../../components/header/header.component';
import { InterviewPrepService } from '../../services/interview-prep.service';
import { InterviewPrepAnswer } from '../../models/interview-prep.models';
import {
  INTERVIEW_PREP_TEMPLATE,
  TemplateItem,
  answerMap,
  filledCount,
  isFilled
} from '../../config/interview-prep-template';

type SaveStatus = 'saved' | 'pending' | 'saving' | 'error';

interface ItemView {
  item: TemplateItem;
  // 章の中で小見出しが切り替わる最初の項目だけ true
  showGroup: boolean;
}

@Component({
  selector: 'app-interview-prep-edit-page',
  standalone: true,
  imports: [RouterLink, HeaderComponent],
  templateUrl: './interview-prep-edit.component.html',
  styleUrl: './interview-prep-edit.component.css'
})
export class InterviewPrepEditPageComponent implements OnDestroy {
  private readonly interviewPrepService = inject(InterviewPrepService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  // 最後の入力からこの時間(ms)たったら自動保存する
  private static readonly AUTO_SAVE_DEBOUNCE_MS = 1500;

  private readonly id = this.route.snapshot.paramMap.get('id') ?? '';

  readonly isLoading = signal(true);
  readonly loadError = signal('');
  readonly saveStatus = signal<SaveStatus>('saved');

  readonly companyName = signal('');
  // テンプレートから消した項目の回答も含めて持ち、保存時にそのまま送る(消さない)
  readonly answers = signal<ReadonlyMap<string, string>>(new Map());

  readonly sections = INTERVIEW_PREP_TEMPLATE.map((section) => ({
    ...section,
    id: `section-${INTERVIEW_PREP_TEMPLATE.indexOf(section) + 1}`,
    itemViews: section.items.map<ItemView>((item, i) => ({
      item,
      showGroup: !!item.group && item.group !== section.items[i - 1]?.group
    }))
  }));

  readonly sectionCounts = computed(() => {
    const answers = this.answers();
    return this.sections.map((s) => filledCount(answers, s.items));
  });

  readonly companyNameMissing = computed(() => !this.companyName().trim());

  private autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
  // 保存中に入力があったら、保存が終わってからもう一度保存する
  private changedWhileSaving = false;

  constructor() {
    this.interviewPrepService.get(this.id).subscribe({
      next: (prep) => {
        this.companyName.set(prep.companyName);
        this.answers.set(answerMap(prep.answers));
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load interview prep:', err);
        this.loadError.set('シートが見つかりませんでした。削除されたか、URLが間違っている可能性があります。');
        this.isLoading.set(false);
      }
    });
  }

  ngOnDestroy(): void {
    // 自動保存を待っている入力があれば、画面を離れる前に保存する
    if (this.autoSaveTimer !== null) {
      this.cancelAutoSave();
      this.save();
    }
  }

  // 保存していない入力があるままタブを閉じようとしたら、ブラウザの確認を出す
  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.saveStatus() !== 'saved') {
      event.preventDefault();
    }
  }

  // 目次から章へ移動する(URLの # はルーターと衝突するので使わない)
  scrollTo(sectionId: string): void {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  valueOf(key: string): string {
    return this.answers().get(key) ?? '';
  }

  isEmpty(key: string): boolean {
    return !isFilled(this.answers().get(key));
  }

  onCompanyNameInput(value: string): void {
    this.companyName.set(value);
    this.markChanged();
  }

  onAnswerInput(key: string, value: string): void {
    const next = new Map(this.answers());
    next.set(key, value);
    this.answers.set(next);
    this.markChanged();
  }

  deleteSheet(): void {
    if (!window.confirm(`「${this.companyName() || 'このシート'}」の面接準備シートを削除しますか？\nこの操作は取り消せません。`)) return;
    this.cancelAutoSave();
    this.interviewPrepService.delete(this.id).subscribe({
      next: () => {
        // 削除したシートを画面離脱時に保存し直さないよう、保存済み扱いにしてから戻る
        this.saveStatus.set('saved');
        this.router.navigateByUrl('/interview-prep');
      },
      error: (err) => {
        console.error('Failed to delete interview prep:', err);
        window.alert('削除できませんでした。しばらくしてから再度お試しください。');
      }
    });
  }

  private markChanged(): void {
    if (this.saveStatus() === 'saving') {
      this.changedWhileSaving = true;
      return;
    }
    this.saveStatus.set('pending');
    this.scheduleAutoSave();
  }

  private scheduleAutoSave(): void {
    this.cancelAutoSave();
    this.autoSaveTimer = setTimeout(() => {
      this.autoSaveTimer = null;
      this.save();
    }, InterviewPrepEditPageComponent.AUTO_SAVE_DEBOUNCE_MS);
  }

  private cancelAutoSave(): void {
    if (this.autoSaveTimer !== null) {
      clearTimeout(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }

  private save(): void {
    // 企業名が空のままでは保存できない(入力欄に案内を出し、入力されるまで待つ)
    if (this.companyNameMissing()) {
      this.saveStatus.set('pending');
      return;
    }
    const answers: InterviewPrepAnswer[] = [...this.answers()]
      .filter(([, value]) => isFilled(value))
      .map(([key, value]) => ({ key, value }));

    this.saveStatus.set('saving');
    this.changedWhileSaving = false;
    this.interviewPrepService.update(this.id, this.companyName().trim(), answers).subscribe({
      next: () => this.afterSave('saved'),
      error: (err) => {
        console.error('Failed to save interview prep:', err);
        this.afterSave('error');
      }
    });
  }

  private afterSave(status: 'saved' | 'error'): void {
    if (this.changedWhileSaving) {
      this.changedWhileSaving = false;
      this.saveStatus.set('pending');
      this.scheduleAutoSave();
      return;
    }
    this.saveStatus.set(status);
  }

  // 保存に失敗したときの「もう一度保存」
  retrySave(): void {
    this.cancelAutoSave();
    this.save();
  }
}
