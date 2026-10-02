import { Component, DestroyRef, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, catchError, concatMap, debounceTime, distinctUntilChanged, finalize, from, of, switchMap } from 'rxjs';
import { LinkCardComponent } from '../link-card/link-card.component';
import { LinkPreview, PostInput } from '../../models/timeline.models';
import { TimelineService } from '../../services/timeline.service';
import { MAX_POST_IMAGES, MAX_POST_IMAGE_SIZE_BYTES, MAX_POST_LENGTH, firstUrl, postImageUrl, postLength } from '../../utils/timeline';

const PREVIEW_DEBOUNCE_MS = 600;

/**
 * つぶやきの入力欄。新規投稿・返信・編集で共通に使う。
 * 投稿そのもの(API呼び出し)は親が行い、成功したら reset() で空に戻す。
 */
@Component({
  selector: 'app-post-composer',
  standalone: true,
  imports: [FormsModule, LinkCardComponent],
  templateUrl: './post-composer.component.html',
  styleUrl: './post-composer.component.css'
})
export class PostComposerComponent implements OnInit {
  private readonly timelineService = inject(TimelineService);
  private readonly destroyRef = inject(DestroyRef);

  readonly placeholder = input('いまどうしてる？');
  readonly submitLabel = input('投稿する');
  readonly initialBody = input('');
  readonly initialImages = input<string[]>([]);
  // 編集のときはキャンセルボタンを出す
  readonly cancellable = input(false);
  // 親がAPIを呼んでいる間は投稿ボタンを押せなくする
  readonly busy = input(false);
  readonly compact = input(false);

  readonly submitted = output<PostInput>();
  readonly cancelled = output<void>();

  readonly maxLength = MAX_POST_LENGTH;
  readonly maxImages = MAX_POST_IMAGES;
  readonly postImageUrl = postImageUrl;

  readonly body = signal('');
  readonly images = signal<string[]>([]);
  readonly uploadingCount = signal(0);
  readonly errorMessage = signal('');
  private readonly fetchedPreview = signal<LinkPreview | null>(null);

  readonly length = computed(() => postLength(this.body()));
  // アップロード中の画像の数だけ「アップロード中…」の枠を出す
  readonly uploadingSlots = computed(() => Array.from({ length: this.uploadingCount() }));
  readonly canAttach = computed(() => this.images().length + this.uploadingCount() < MAX_POST_IMAGES);
  readonly canSubmit = computed(() =>
    !this.busy() &&
    this.uploadingCount() === 0 &&
    this.length() <= MAX_POST_LENGTH &&
    (this.body().trim() !== '' || this.images().length > 0)
  );
  // 画像を添付した投稿ではプレビューを出さない(APIの保存内容と揃える)
  readonly preview = computed(() => {
    const preview = this.fetchedPreview();
    if (!preview || this.images().length > 0) return null;
    return preview.url === firstUrl(this.body()) ? preview : null;
  });

  private readonly urlChanges = new Subject<string | null>();

  ngOnInit(): void {
    this.body.set(this.initialBody());
    this.images.set([...this.initialImages()]);

    this.urlChanges.pipe(
      debounceTime(PREVIEW_DEBOUNCE_MS),
      distinctUntilChanged(),
      switchMap((url) => url
        ? this.timelineService.previewUrl(url).pipe(catchError(() => of(null)))
        : of(null)
      ),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((preview) => this.fetchedPreview.set(preview));
    this.urlChanges.next(firstUrl(this.body()));
  }

  onBodyChange(value: string): void {
    this.body.set(value);
    this.urlChanges.next(firstUrl(value));
  }

  onKeydown(event: KeyboardEvent): void {
    // Ctrl+Enter(Macは⌘+Enter)で投稿する
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      this.submit();
    }
  }

  onFilesSelected(event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    const files = Array.from(inputEl.files ?? []);
    inputEl.value = '';
    if (files.length === 0) return;
    this.errorMessage.set('');

    const room = MAX_POST_IMAGES - this.images().length - this.uploadingCount();
    if (files.length > room) {
      this.errorMessage.set(`画像は${MAX_POST_IMAGES}枚までです`);
    }
    const accepted = files.slice(0, Math.max(room, 0)).filter((file) => {
      if (file.size <= MAX_POST_IMAGE_SIZE_BYTES) return true;
      this.errorMessage.set('画像ファイルは1枚5MB以下にしてください');
      return false;
    });
    if (accepted.length === 0) return;

    // 選んだ順に並ぶよう、1枚ずつ順番にアップロードする
    this.uploadingCount.update((n) => n + accepted.length);
    from(accepted).pipe(
      concatMap((file) => this.timelineService.uploadImage(file).pipe(
        catchError((err: unknown) => {
          console.error('Failed to upload post image:', err);
          const message = err instanceof HttpErrorResponse ? err.error?.message : null;
          this.errorMessage.set(message || '画像のアップロードに失敗しました');
          return of(null);
        }),
        finalize(() => this.uploadingCount.update((n) => n - 1))
      )),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((filename) => {
      if (filename) this.images.update((images) => [...images, filename]);
    });
  }

  removeImage(index: number): void {
    this.images.update((images) => images.filter((_, i) => i !== index));
  }

  submit(): void {
    if (!this.canSubmit()) return;
    this.errorMessage.set('');
    this.submitted.emit({ body: this.body().trim(), imageFilenames: this.images() });
  }

  reset(): void {
    this.body.set('');
    this.images.set([]);
    this.errorMessage.set('');
    this.urlChanges.next(null);
  }
}
