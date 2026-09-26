import { Component, ElementRef, OnDestroy, OnInit, computed, inject, input, signal } from '@angular/core';

export interface TrendPoint {
  label: string;
  // 正答率(%)。null の回は点を打たず、線をつながない
  value: number | null;
  // マウスを乗せたときに表示する補足(例: "13/20問・合格")
  detail?: string;
}

const HEIGHT = 240;
const PAD = { left: 44, right: 18, top: 18, bottom: 34 };
const Y_TICKS = [0, 25, 50, 75, 100];

/**
 * 正答率(0〜100%)の推移を表す1系列の折れ線グラフ。合格ラインを点線で重ねる。
 * 縮小表示で文字が小さくならないよう、表示幅に合わせて座標を計算し直す(狭いときは日付ラベルを間引く)。
 */
@Component({
  selector: 'app-trend-chart',
  standalone: true,
  templateUrl: './trend-chart.component.html',
  styleUrl: './trend-chart.component.css'
})
export class TrendChartComponent implements OnInit, OnDestroy {
  readonly points = input.required<TrendPoint[]>();
  readonly passLine = input<number | null>(null);
  readonly ariaLabel = input('正答率の推移');

  private readonly host = inject(ElementRef<HTMLElement>);
  private resizeObserver?: ResizeObserver;

  readonly width = signal(640);
  readonly height = HEIGHT;
  readonly pad = PAD;
  readonly hovered = signal<number | null>(null);

  readonly yTicks = computed(() => Y_TICKS.map((v) => ({ value: v, y: this.y(v) })));

  readonly geometry = computed(() => {
    const pts = this.points();
    const w = this.width();
    const step = pts.length > 1 ? (w - PAD.left - PAD.right) / (pts.length - 1) : 0;
    const narrow = w < 480;
    const items = pts.map((p, i) => ({
      ...p,
      index: i,
      x: pts.length > 1 ? PAD.left + i * step : (PAD.left + w - PAD.right) / 2,
      y: p.value === null ? null : this.y(p.value),
      showLabel: !narrow || i % 2 === 0 || i === pts.length - 1
    }));
    // null で線を区切る
    const segments: string[] = [];
    let current: string[] = [];
    for (const it of items) {
      if (it.y === null) {
        if (current.length > 1) segments.push(current.join(' '));
        current = [];
      } else {
        current.push(`${it.x},${it.y}`);
      }
    }
    if (current.length > 1) segments.push(current.join(' '));
    const last = [...items].reverse().find((it) => it.y !== null) ?? null;
    return { items, segments, last, hitWidth: Math.max(24, Math.min(48, step || 48)) };
  });

  readonly passLineY = computed(() => {
    const line = this.passLine();
    return line === null ? null : this.y(line);
  });

  readonly tooltip = computed(() => {
    const i = this.hovered();
    if (i === null) return null;
    const it = this.geometry().items[i];
    if (!it || it.y === null || it.value === null) return null;
    return {
      left: (it.x / this.width()) * 100,
      top: it.y,
      value: Math.round(it.value),
      label: it.label,
      detail: it.detail
    };
  });

  ngOnInit(): void {
    const el = this.host.nativeElement;
    this.width.set(Math.max(300, Math.round(el.clientWidth || 640)));
    this.resizeObserver = new ResizeObserver((entries) => {
      const w = Math.round(entries[0].contentRect.width);
      if (w > 0) this.width.set(Math.max(300, w));
    });
    this.resizeObserver.observe(el);
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  round(value: number): number {
    return Math.round(value);
  }

  private y(value: number): number {
    return PAD.top + ((100 - value) * (HEIGHT - PAD.top - PAD.bottom)) / 100;
  }
}
