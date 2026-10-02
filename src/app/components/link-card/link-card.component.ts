import { Component, input, signal } from '@angular/core';
import { LinkPreview } from '../../models/timeline.models';

// つぶやきのURLプレビュー(サイトのタイトル・説明・サムネイル)
@Component({
  selector: 'app-link-card',
  standalone: true,
  template: `
    <a class="link-card" [href]="preview().url" target="_blank" rel="noopener noreferrer">
      @if (preview().imageUrl && !imageFailed()) {
        <img class="thumb" [src]="preview().imageUrl" alt="" loading="lazy" referrerpolicy="no-referrer" (error)="imageFailed.set(true)">
      }
      <span class="info">
        <span class="domain">{{ preview().domain }}</span>
        <span class="title">{{ preview().title }}</span>
        @if (preview().description) {
          <span class="desc">{{ preview().description }}</span>
        }
      </span>
    </a>
  `,
  styles: `
    .link-card {
      display: flex;
      border: 1px solid var(--line);
      border-radius: 14px;
      overflow: hidden;
      text-decoration: none;
      color: var(--text);
      background: var(--card);
    }
    .link-card:hover {
      background: var(--surface);
    }
    .thumb {
      width: 120px;
      min-height: 84px;
      flex-shrink: 0;
      object-fit: cover;
      background: var(--line);
    }
    .info {
      display: flex;
      flex-direction: column;
      padding: 10px 14px;
      min-width: 0;
      line-height: 1.5;
    }
    .domain {
      font-size: 12px;
      color: var(--muted);
    }
    .title {
      font-weight: 700;
      font-size: 0.92rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .desc {
      font-size: 12.5px;
      color: var(--muted);
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    @media (max-width: 480px) {
      .thumb {
        width: 88px;
      }
    }
  `
})
export class LinkCardComponent {
  readonly preview = input.required<LinkPreview>();
  // サムネイルが読めない(リンク切れなど)ときは、画像なしのカードにする
  readonly imageFailed = signal(false);
}
