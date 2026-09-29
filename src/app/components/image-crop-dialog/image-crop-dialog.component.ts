import { Component, DestroyRef, computed, effect, inject, input, output, signal } from '@angular/core';

// 切り抜き枠の長い辺の長さ(px)。狭い画面では枠が画面からはみ出さないよう、画面幅に合わせて小さくする
const FRAME_LONG_SIDE = 360;
const FRAME_MARGIN = 32;
// 拡大は、枠いっぱいに収まる大きさの何倍までできるか
const MAX_ZOOM = 4;

/**
 * 画像を決まった縦横比で切り抜き、決まった大きさに縮めた画像ファイルを返すダイアログ。
 * 枠の中で画像をドラッグして位置を、スライダー(またはホイール)で拡大率を合わせる。
 * 画像は常に枠を埋める(余白ができない)範囲でしか動かせない。
 */
@Component({
  selector: 'app-image-crop-dialog',
  standalone: true,
  templateUrl: './image-crop-dialog.component.html',
  styleUrl: './image-crop-dialog.component.css'
})
export class ImageCropDialogComponent {
  readonly file = input.required<File>();
  readonly outputWidth = input.required<number>();
  readonly outputHeight = input.required<number>();
  readonly title = input('画像を切り抜く');

  readonly cropped = output<File>();
  readonly cancelled = output<void>();

  readonly imageUrl = signal<string | null>(null);
  readonly loadError = signal(false);
  readonly isSaving = signal(false);
  private image: HTMLImageElement | null = null;
  private readonly naturalSize = signal({ width: 0, height: 0 });

  // 枠に対する画像の表示位置(枠の左上からの画像の左上の位置)と、元画像1pxあたりの表示px
  readonly offset = signal({ x: 0, y: 0 });
  readonly zoom = signal(1);
  private drag: { pointerX: number; pointerY: number; x: number; y: number } | null = null;

  readonly frameSize = computed(() => {
    const ratio = this.outputWidth() / this.outputHeight();
    const available = Math.max(160, Math.min(FRAME_LONG_SIDE, window.innerWidth - FRAME_MARGIN * 2 - 32));
    return ratio >= 1
      ? { width: available, height: available / ratio }
      : { width: available * ratio, height: available };
  });

  // 画像が枠をちょうど埋める拡大率(これより小さくはできない)
  private readonly minScale = computed(() => {
    const { width, height } = this.naturalSize();
    if (!width || !height) return 1;
    const frame = this.frameSize();
    return Math.max(frame.width / width, frame.height / height);
  });

  readonly scale = computed(() => this.minScale() * this.zoom());
  readonly maxZoom = MAX_ZOOM;
  readonly frameMargin = FRAME_MARGIN;

  constructor() {
    const destroyRef = inject(DestroyRef);
    effect((onCleanup) => {
      const url = URL.createObjectURL(this.file());
      const image = new Image();
      image.onload = () => {
        this.image = image;
        this.naturalSize.set({ width: image.naturalWidth, height: image.naturalHeight });
        this.zoom.set(1);
        this.centerImage();
        this.imageUrl.set(url);
      };
      image.onerror = () => this.loadError.set(true);
      image.src = url;
      onCleanup(() => URL.revokeObjectURL(url));
    });
    destroyRef.onDestroy(() => (this.image = null));
  }

  onPointerDown(event: PointerEvent): void {
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    const { x, y } = this.offset();
    this.drag = { pointerX: event.clientX, pointerY: event.clientY, x, y };
  }

  onPointerMove(event: PointerEvent): void {
    if (!this.drag) return;
    this.setOffset(
      this.drag.x + event.clientX - this.drag.pointerX,
      this.drag.y + event.clientY - this.drag.pointerY
    );
  }

  onPointerUp(): void {
    this.drag = null;
  }

  onZoomInput(event: Event): void {
    this.zoomTo(Number((event.target as HTMLInputElement).value));
  }

  onWheel(event: WheelEvent): void {
    event.preventDefault();
    this.zoomTo(this.zoom() * (event.deltaY < 0 ? 1.1 : 1 / 1.1));
  }

  // 枠の中心を基準に拡大縮小する(中心に写っているものが中心に残るように位置を合わせる)
  private zoomTo(nextZoom: number): void {
    const zoom = Math.min(MAX_ZOOM, Math.max(1, nextZoom));
    const before = this.scale();
    const after = this.minScale() * zoom;
    const frame = this.frameSize();
    const { x, y } = this.offset();
    const centerX = (frame.width / 2 - x) / before;
    const centerY = (frame.height / 2 - y) / before;
    this.zoom.set(zoom);
    this.setOffset(frame.width / 2 - centerX * after, frame.height / 2 - centerY * after);
  }

  private centerImage(): void {
    const frame = this.frameSize();
    const { width, height } = this.naturalSize();
    const scale = this.scale();
    this.setOffset((frame.width - width * scale) / 2, (frame.height - height * scale) / 2);
  }

  // 画像が枠からずれて余白ができないよう、動かせる範囲に収める
  private setOffset(x: number, y: number): void {
    const frame = this.frameSize();
    const { width, height } = this.naturalSize();
    const scale = this.scale();
    const minX = frame.width - width * scale;
    const minY = frame.height - height * scale;
    this.offset.set({
      x: Math.min(0, Math.max(minX, x)),
      y: Math.min(0, Math.max(minY, y))
    });
  }

  confirm(): void {
    const image = this.image;
    if (!image || this.isSaving()) return;
    this.isSaving.set(true);

    const canvas = document.createElement('canvas');
    canvas.width = this.outputWidth();
    canvas.height = this.outputHeight();
    const context = canvas.getContext('2d');
    if (!context) {
      this.isSaving.set(false);
      return;
    }
    const scale = this.scale();
    const frame = this.frameSize();
    const { x, y } = this.offset();
    context.imageSmoothingQuality = 'high';
    context.drawImage(image, -x / scale, -y / scale, frame.width / scale, frame.height / scale, 0, 0, canvas.width, canvas.height);

    // WebP で保存できないブラウザ(Safari など)では PNG になるので、実際の形式で拡張子を決める
    canvas.toBlob((blob) => {
      this.isSaving.set(false);
      if (!blob) return;
      const ext = blob.type === 'image/webp' ? 'webp' : blob.type === 'image/jpeg' ? 'jpg' : 'png';
      const baseName = this.file().name.replace(/\.[^.]+$/, '') || 'image';
      this.cropped.emit(new File([blob], `${baseName}.${ext}`, { type: blob.type }));
    }, 'image/webp', 0.92);
  }

  cancel(): void {
    this.cancelled.emit();
  }
}
