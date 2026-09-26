import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { catchError, of, tap } from 'rxjs';
import { HeaderComponent } from '../../components/header/header.component';
import { QaService } from '../../services/qa.service';
import { NotificationService } from '../../services/notification.service';
import { QaEntry, QaImage } from '../../models/qa.models';
import { qaImageUrl } from '../../utils/qa-image';

const MAX_QA_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const LOAD_ERROR_MESSAGE = 'Q&Aの取得に失敗しました';

type Mode = 'list' | 'edit';

@Component({
  selector: 'app-developer-qa-page',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent],
  templateUrl: './developer-qa.component.html',
  styleUrl: './developer-qa.component.css'
})
export class DeveloperQaPageComponent {
  private qaService = inject(QaService);
  private notificationService = inject(NotificationService);

  readonly qaImageUrl = qaImageUrl;

  readonly entries = signal<QaEntry[]>([]);
  readonly isLoading = signal(false);
  readonly keyword = signal('');
  readonly tagFilter = signal('');

  readonly mode = signal<Mode>('list');
  readonly editingId = signal<string | number | null>(null);

  // 編集フォームの入力値
  formTitle = '';
  formQuestion = '';
  formAnswer = '';
  formTagsText = '';
  readonly formImages = signal<QaImage[]>([]);

  readonly isSubmitting = signal(false);
  readonly isUploadingImage = signal(false);
  readonly errorMessage = signal('');

  readonly availableTags = computed(() => {
    const tags = new Set<string>();
    for (const entry of this.entries()) {
      for (const tag of entry.tags) tags.add(tag);
    }
    return Array.from(tags).sort();
  });

  readonly filteredEntries = computed(() => {
    const keyword = this.keyword().trim().toLowerCase();
    const tag = this.tagFilter();
    return this.entries().filter((entry) => {
      const matchesKeyword = !keyword ||
        entry.title.toLowerCase().includes(keyword) ||
        entry.question.toLowerCase().includes(keyword) ||
        entry.answer.toLowerCase().includes(keyword);
      const matchesTag = !tag || entry.tags.includes(tag);
      return matchesKeyword && matchesTag;
    });
  });

  constructor() {
    this.loadEntries();
  }

  private loadEntries(): void {
    this.isLoading.set(true);
    this.qaService.getEntries().pipe(
      // 以前の取得失敗で出したエラーが残っていれば、取得できた時点で消す
      tap(() => this.notificationService.dismiss(LOAD_ERROR_MESSAGE)),
      catchError((err) => {
        console.error('Failed to load Q&A entries:', err);
        this.notificationService.showResult(LOAD_ERROR_MESSAGE, 'error', null);
        return of([] as QaEntry[]);
      })
    ).subscribe((entries) => {
      this.isLoading.set(false);
      this.entries.set(entries);
    });
  }

  openNew(): void {
    this.editingId.set(null);
    this.formTitle = '';
    this.formQuestion = '';
    this.formAnswer = '';
    this.formTagsText = '';
    this.formImages.set([]);
    this.errorMessage.set('');
    this.mode.set('edit');
  }

  openEdit(entry: QaEntry): void {
    this.editingId.set(entry.id);
    this.formTitle = entry.title;
    this.formQuestion = entry.question;
    this.formAnswer = entry.answer;
    this.formTagsText = entry.tags.join(', ');
    this.formImages.set(entry.images.map((image) => ({ ...image })));
    this.errorMessage.set('');
    this.mode.set('edit');
  }

  cancelEdit(): void {
    this.mode.set('list');
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = '';
    if (!file) return;

    if (file.size > MAX_QA_IMAGE_SIZE_BYTES) {
      this.errorMessage.set('画像ファイルは5MB以下にしてください');
      return;
    }

    this.isUploadingImage.set(true);
    this.qaService.uploadImage(file).pipe(
      catchError((err) => {
        console.error('Failed to upload Q&A image:', err);
        this.errorMessage.set('画像のアップロードに失敗しました');
        return of(null);
      })
    ).subscribe((filename) => {
      this.isUploadingImage.set(false);
      if (!filename) return;
      const nextIndex = this.formImages().length + 1;
      this.formImages.update((images) => [...images, { filename, label: `図${nextIndex}`, caption: '' }]);
    });
  }

  removeImage(index: number): void {
    this.formImages.update((images) => images.filter((_, i) => i !== index));
  }

  save(): void {
    const title = this.formTitle.trim();
    const question = this.formQuestion.trim();
    const answer = this.formAnswer.trim();

    if (!title || !question || !answer) {
      this.errorMessage.set('タイトル・質問・回答は必須です');
      return;
    }

    const tags = this.formTagsText
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    const input = {
      title,
      question,
      answer,
      images: this.formImages(),
      tags
    };

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    const editingId = this.editingId();
    const request = editingId !== null
      ? this.qaService.updateEntry(editingId, input)
      : this.qaService.createEntry(input);

    request.pipe(
      catchError((err) => {
        console.error('Failed to save Q&A entry:', err);
        this.errorMessage.set('保存に失敗しました。しばらくしてから再度お試しください');
        return of(null);
      })
    ).subscribe((saved) => {
      this.isSubmitting.set(false);
      if (!saved) return;
      this.notificationService.showResult('保存しました', 'success');
      this.mode.set('list');
      this.loadEntries();
    });
  }

  deleteEntry(): void {
    const editingId = this.editingId();
    if (editingId === null) return;
    if (!window.confirm(`「${this.formTitle}」を削除しますか？`)) return;

    this.isSubmitting.set(true);
    this.qaService.deleteEntry(editingId).pipe(
      catchError((err) => {
        console.error('Failed to delete Q&A entry:', err);
        this.errorMessage.set('削除に失敗しました。しばらくしてから再度お試しください');
        return of(false);
      })
    ).subscribe((success) => {
      this.isSubmitting.set(false);
      if (!success) return;
      this.notificationService.showResult('削除しました', 'success');
      this.mode.set('list');
      this.loadEntries();
    });
  }
}
