import { Component, ElementRef, OnDestroy, afterNextRender, input, output, signal, viewChild } from '@angular/core';
import { RpgLook } from '../../models/rpg.models';
import {
  ACCENT_COLORS,
  BROWS,
  CLOTHES,
  CLOTHES_COLORS,
  EYES,
  EYE_COLORS,
  HAIRS,
  HAIR_COLORS,
  MOUTHS,
  SKINS,
  drawLook,
  randomLook
} from '../../rpg/rpg-look';

type PartKey = 'hair' | 'brows' | 'eyes' | 'mouth' | 'clothes';
type ColorKey = 'hairColor' | 'browColor' | 'skin' | 'eyeColor' | 'clothesColor' | 'accentColor';

// 色の欄。cols は一覧を何列で並べるか(2段にして、上下が同じ系統の色になるようにする)
interface ColorDef {
  key: ColorKey;
  label: string;
  list: string[];
  cols: number;
  // 一覧にない色を自由に選べる
  custom?: boolean;
  // 「髪の色に合わせる」を選べる(値は null)
  auto?: boolean;
}

// 1行分。key が null の行は色だけ(肌)
interface Row {
  key: PartKey | null;
  label: string;
  list: [string, string][];
  colors: ColorDef[];
}

/**
 * キャラクターの見た目を選ぶ欄(front#224)。マップ作成画面の村人と、ゲーム画面のプレイヤーで使う。
 * 部品ごとに1行(名前・< > で切り替え・色)にまとめ、見た目は左のプレビューで確かめる(front#362)。
 * 部品・色を選ぶたびに lookChange で新しい見た目を知らせる(保存は呼ぶ側で行う)。
 */
@Component({
  selector: 'app-rpg-look-editor',
  standalone: true,
  templateUrl: './rpg-look-editor.component.html',
  styleUrls: ['./rpg-look-editor.component.css']
})
export class RpgLookEditorComponent implements OnDestroy {
  readonly look = input.required<RpgLook>();
  // narrow: マップ作成画面の右側の欄(縦に並べる) / wide: プレビューと選ぶ欄を横に並べる
  readonly layout = input<'narrow' | 'wide'>('wide');
  // プレビューで剣を持たせる(プレイヤー)
  readonly swordColor = input<string | null>(null);
  readonly lookChange = output<RpgLook>();

  readonly rows: Row[] = [
    { key: 'hair', label: '髪型', list: HAIRS, colors: [{ key: 'hairColor', label: '髪の色', list: HAIR_COLORS, cols: 7, custom: true }] },
    { key: 'brows', label: '眉', list: BROWS, colors: [{ key: 'browColor', label: '眉の色', list: HAIR_COLORS, cols: 7, custom: true, auto: true }] },
    { key: 'eyes', label: '目', list: EYES, colors: [{ key: 'eyeColor', label: '目の色', list: EYE_COLORS, cols: 6, custom: true }] },
    { key: 'mouth', label: '口', list: MOUTHS, colors: [] },
    {
      key: 'clothes', label: '服', list: CLOTHES, colors: [
        { key: 'clothesColor', label: '服の色', list: CLOTHES_COLORS, cols: 7, custom: true },
        { key: 'accentColor', label: '差し色', list: ACCENT_COLORS, cols: 7, custom: true }
      ]
    },
    { key: null, label: '肌', list: [], colors: [{ key: 'skin', label: '肌の色', list: SKINS, cols: 5 }] }
  ];

  readonly dir = signal(1);
  readonly walking = signal(true);
  // 開いている色の欄
  readonly openColor = signal<ColorKey | null>(null);

  private readonly preview = viewChild<ElementRef<HTMLCanvasElement>>('preview');
  private frame = 0;
  private start = performance.now();

  constructor() {
    afterNextRender(() => this.loop());
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.frame);
  }

  private loop(): void {
    const cv = this.preview()?.nativeElement;
    const c = cv?.getContext('2d');
    if (cv && c) {
      const time = (performance.now() - this.start) / 1000;
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, cv.width, cv.height);
      c.translate(cv.width / 2, cv.height * 0.8);
      c.scale(cv.width / 100, cv.width / 100);
      const sword = this.swordColor();
      drawLook(c, this.look(), { dir: this.dir(), time, moving: this.walking(), sword: !!sword, swordColor: sword ?? undefined });
    }
    this.frame = requestAnimationFrame(() => this.loop());
  }

  // 部品の今の値(眉は、選ぶ前のデータなら ふつう)
  private partValue(key: PartKey): string {
    return key === 'brows' ? (this.look().brows ?? 'normal') : this.look()[key];
  }

  // 今選んでいる部品の、一覧の中での位置(知らない部品なら最初)
  index(row: Row): number {
    if (!row.key) return 0;
    const value = this.partValue(row.key);
    return Math.max(0, row.list.findIndex(([id]) => id === value));
  }

  partName(row: Row): string {
    return row.list[this.index(row)]?.[1] ?? '';
  }

  // < > で前・次の部品にする(端まで行ったら反対の端へ)
  step(row: Row, k: number): void {
    if (!row.key) return;
    const n = row.list.length;
    this.set(row.key, row.list[(this.index(row) + k + n) % n][0]);
  }

  color(key: ColorKey): string | null {
    return this.look()[key] ?? null;
  }

  // 今の色が一覧にない(カスタムで選んだ)か
  isCustom(col: ColorDef): boolean {
    const v = this.color(col.key);
    return !!v && !col.list.includes(v.toLowerCase());
  }

  isActive(col: ColorDef, c: string): boolean {
    return this.color(col.key)?.toLowerCase() === c;
  }

  toggleColor(key: ColorKey): void {
    this.openColor.update((k) => (k === key ? null : key));
  }

  openDef(row: Row): ColorDef | undefined {
    return row.colors.find((c) => c.key === this.openColor());
  }

  set(key: PartKey | ColorKey, value: string | null): void {
    if ((this.look()[key] ?? null) === value) return;
    this.lookChange.emit({ ...this.look(), [key]: value });
  }

  turn(): void {
    this.dir.update((d) => -d);
  }

  toggleWalk(): void {
    this.walking.update((w) => !w);
  }

  random(): void {
    this.lookChange.emit(randomLook());
  }
}
