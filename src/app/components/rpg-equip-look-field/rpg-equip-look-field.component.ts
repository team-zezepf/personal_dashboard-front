import { Component, ElementRef, OnDestroy, afterNextRender, computed, input, output, signal, viewChild } from '@angular/core';
import { CLOTHES, DEFAULT_LOOK, EquipLook, WEAPON_SHAPES, drawLook, wearArmor, weaponPose } from '../../rpg/rpg-look';

/** 見た目の欄で選んだ値。形がなければ(見た目なし)色もない */
export interface EquipLookValue {
  lookShape: string | null;
  lookColor: string | null;
  lookAccent: string | null;
}

// 色の一覧(刃・杖・服の色と、つば・先の飾り・服の飾りの色で同じものを使う)
export const EQUIP_COLORS = [
  '#c08a52', '#d08a4e', '#cbd5e1', '#e2e8f0', '#a5f3fc', '#fde047', '#8b5a2b', '#94a3b8', '#3b82f6', '#1e3a8a',
  '#8b5cf6', '#ef4444', '#10b981', '#1f2937', '#f8fafc', '#facc15', '#a16207', '#60a5fa', '#f472b6', '#334155'
];

// 形を選んだとき、色がまだなければ入れる色
const START_COLORS: Record<string, [string, string]> = {
  sword: ['#cbd5e1', '#a16207'],
  greatsword: ['#e2e8f0', '#1f2937'],
  staff: ['#8b5a2b', '#60a5fa'],
  moonstaff: ['#e2e8f0', '#fde047']
};

// プレビューの人(見た目を変えるで「シャツ・青」を選んでいる人)と、持たせる・着せるもの
const PREVIEW_LOOK = { ...DEFAULT_LOOK, clothes: 'shirt', clothesColor: '#3b82f6', accentColor: '#f8fafc' };
const PREVIEW_SWORD = '#cbd5e1';

/**
 * 武器・防具の見た目の欄(front#431)。マップ作成画面の「アイテム」「合成」で使う。
 * 形(武器: 片手剣・大剣・玉の杖・三日月の杖、防具: 服の形)と、2つの色を選ぶ。右のプレビューで装備したときの姿を確かめる
 */
@Component({
  selector: 'app-rpg-equip-look-field',
  standalone: true,
  templateUrl: './rpg-equip-look-field.component.html',
  styleUrls: ['./rpg-equip-look-field.component.css']
})
export class RpgEquipLookFieldComponent implements OnDestroy {
  readonly type = input.required<'weapon' | 'armor'>();
  readonly shape = input<string | null | undefined>(null);
  readonly color = input<string | null | undefined>(null);
  readonly accent = input<string | null | undefined>(null);
  readonly disabled = input(false);
  readonly lookChange = output<EquipLookValue>();

  readonly colors = EQUIP_COLORS;
  readonly walking = signal(false);

  // 形の一覧。最初は「見た目なし」(今までどおり)
  readonly shapes = computed<[string | null, string][]>(() =>
    this.type() === 'weapon' ? [[null, '見た目なし'], ...WEAPON_SHAPES] : [[null, '見た目なし'], ...CLOTHES]
  );

  readonly isStaff = computed(() => this.shape() === 'staff' || this.shape() === 'moonstaff');
  readonly colorLabel = computed(() => (this.type() === 'armor' ? '服の色' : this.isStaff() ? '杖の色' : '刃の色'));
  readonly accentLabel = computed(() => {
    if (this.type() === 'armor') return '飾りの色';
    return this.shape() === 'staff' ? '先の玉の色' : this.shape() === 'moonstaff' ? '三日月の色' : 'つばの色';
  });

  private readonly preview = viewChild<ElementRef<HTMLCanvasElement>>('preview');
  private frame = 0;
  private readonly start = performance.now();

  constructor() {
    afterNextRender(() => this.loop());
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.frame);
  }

  /** 今の見た目(形・色がそろっていなければ null = 見た目なし) */
  private current(): EquipLook | null {
    const [shape, color, accent] = [this.shape(), this.color(), this.accent()];
    return shape && color && accent ? { shape, color, accent } : null;
  }

  setShape(shape: string | null): void {
    if (shape === null) {
      this.lookChange.emit({ lookShape: null, lookColor: null, lookAccent: null });
      return;
    }
    const [c, a] = START_COLORS[shape] ?? ['#3b82f6', '#f8fafc'];
    // 形を変えても、選んでいた色はそのまま使う
    this.lookChange.emit({ lookShape: shape, lookColor: this.color() || c, lookAccent: this.accent() || a });
  }

  setColor(key: 'lookColor' | 'lookAccent', value: string): void {
    if (!this.shape()) return;
    this.lookChange.emit({ lookShape: this.shape() ?? null, lookColor: this.color() ?? null, lookAccent: this.accent() ?? null, [key]: value.toLowerCase() });
  }

  isColor(key: 'lookColor' | 'lookAccent', c: string): boolean {
    return (key === 'lookColor' ? this.color() : this.accent())?.toLowerCase() === c;
  }

  toggleWalk(): void {
    this.walking.update((w) => !w);
  }

  private loop(): void {
    const cv = this.preview()?.nativeElement;
    const c = cv?.getContext('2d');
    if (cv && c) {
      const time = (performance.now() - this.start) / 1000;
      const look = this.current();
      // 武器を編集しているときは選んだ服のまま、防具を編集しているときは片手剣を持たせる
      const body = this.type() === 'armor' ? wearArmor(PREVIEW_LOOK, look) : PREVIEW_LOOK;
      const pose = weaponPose(this.type() === 'weapon' ? look : null, PREVIEW_SWORD);
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, cv.width, cv.height);
      const s = cv.height / 70;
      for (const [i, dir] of [1, -1].entries()) {
        c.save();
        c.translate(cv.width * (0.3 + i * 0.4), cv.height * 0.86);
        c.scale(s, s);
        drawLook(c, body, { dir, time, moving: this.walking(), ...pose });
        c.restore();
      }
    }
    this.frame = requestAnimationFrame(() => this.loop());
  }
}
