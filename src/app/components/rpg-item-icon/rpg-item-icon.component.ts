import { Component, effect, input, signal } from '@angular/core';

/**
 * RPGのアイテム・装備のアイコン(front#345)。画像があれば画像、なければ(読めなければ)絵文字を出す。
 * 大きさはまわりの文字の大きさ(1em)に合わせるので、今まで絵文字を置いていた所にそのまま置ける
 */
@Component({
  selector: 'app-rpg-item-icon',
  standalone: true,
  template: `
    @if (image() && !failed()) {
      <img [src]="image()" alt="" (error)="failed.set(true)" />
    } @else {
      {{ icon() }}
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
    }
    img {
      width: 1em;
      height: 1em;
      object-fit: contain;
    }
  `
})
export class RpgItemIconComponent {
  readonly icon = input<string>('');
  readonly image = input<string | null | undefined>(null);
  // 画像が読めなかった(消された・通信できない)ときは絵文字に戻す
  readonly failed = signal(false);

  constructor() {
    // 画像を差し替えたら、もう一度読んでみる
    effect(() => {
      this.image();
      this.failed.set(false);
    });
  }
}
