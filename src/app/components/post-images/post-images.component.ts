import { Component, HostListener, computed, input, signal } from '@angular/core';
import { postImageUrl } from '../../utils/timeline';

// つぶやきの添付画像(1〜4枚を並べて表示し、クリックで拡大表示する)
@Component({
  selector: 'app-post-images',
  standalone: true,
  templateUrl: './post-images.component.html',
  styleUrl: './post-images.component.css'
})
export class PostImagesComponent {
  readonly filenames = input.required<string[]>();

  readonly urls = computed(() => this.filenames().map(postImageUrl));
  // 拡大表示している画像の位置(閉じているときは null)
  readonly openIndex = signal<number | null>(null);

  open(index: number): void {
    this.openIndex.set(index);
  }

  close(): void {
    this.openIndex.set(null);
  }

  move(step: number, event?: Event): void {
    event?.stopPropagation();
    const index = this.openIndex();
    if (index === null) return;
    const count = this.urls().length;
    this.openIndex.set((index + step + count) % count);
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (this.openIndex() === null) return;
    if (event.key === 'Escape') this.close();
    else if (event.key === 'ArrowLeft') this.move(-1);
    else if (event.key === 'ArrowRight') this.move(1);
  }
}
