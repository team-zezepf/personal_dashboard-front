import { Component, ElementRef, OnDestroy, afterNextRender, afterRenderEffect, input, output, signal, viewChild, viewChildren } from '@angular/core';
import { RpgLook } from '../../models/rpg.models';
import {
  ACCENT_COLORS,
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

type PartKey = 'hair' | 'eyes' | 'mouth' | 'clothes';
type ColorKey = 'hairColor' | 'skin' | 'eyeColor' | 'clothesColor' | 'accentColor';

/**
 * キャラクターの見た目を選ぶ欄(front#224)。マップ作成画面の村人と、ゲーム画面のプレイヤーで使う。
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

  // 部品ごとに、その下に出す色の欄
  readonly parts: { key: PartKey; label: string; list: [string, string][]; colors: ColorKey[] }[] = [
    { key: 'hair', label: '髪型', list: HAIRS, colors: ['hairColor', 'skin'] },
    { key: 'eyes', label: '目', list: EYES, colors: ['eyeColor'] },
    { key: 'mouth', label: '口', list: MOUTHS, colors: [] },
    { key: 'clothes', label: '服', list: CLOTHES, colors: ['clothesColor', 'accentColor'] }
  ];
  readonly colorLists: Record<ColorKey, { label: string; list: string[] }> = {
    hairColor: { label: '髪の色', list: HAIR_COLORS },
    skin: { label: '肌の色', list: SKINS },
    eyeColor: { label: '目の色', list: EYE_COLORS },
    clothesColor: { label: '服の色', list: CLOTHES_COLORS },
    accentColor: { label: '差し色（襟・ふち・帯など）', list: ACCENT_COLORS }
  };

  readonly dir = signal(1);
  readonly walking = signal(true);

  private readonly preview = viewChild<ElementRef<HTMLCanvasElement>>('preview');
  private readonly thumbs = viewChildren<ElementRef<HTMLCanvasElement>>('thumb');
  private frame = 0;
  private start = performance.now();

  constructor() {
    afterNextRender(() => this.loop());
    // 部品の見本は、今の見た目のその部品だけを変えた絵にする(色を変えると見本も変わる)
    afterRenderEffect(() => {
      const look = this.look();
      for (const ref of this.thumbs()) {
        const cv = ref.nativeElement;
        const key = cv.dataset['key'] as PartKey;
        const c = cv.getContext('2d');
        if (!c) continue;
        c.setTransform(1, 0, 0, 1, 0, 0);
        c.clearRect(0, 0, cv.width, cv.height);
        // 髪型・目・口は頭のまわりを大きく、服は全身を見せる
        const head = key !== 'clothes';
        c.translate(56, head ? 158 : 100);
        c.scale(head ? 3.6 : 1.9, head ? 3.6 : 1.9);
        drawLook(c, { ...look, [key]: cv.dataset['id'] }, { dir: 1, time: 0 });
      }
    });
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

  colorKeys(keys: ColorKey[]): ColorKey[] {
    // メガネのときは目が見えないので、目の色の欄は出さない
    return this.look().eyes === 'glasses' ? keys.filter((k) => k !== 'eyeColor') : keys;
  }

  set(key: PartKey | ColorKey, value: string): void {
    if (this.look()[key] === value) return;
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
