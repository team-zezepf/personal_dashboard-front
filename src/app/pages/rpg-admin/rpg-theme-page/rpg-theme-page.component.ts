import { Component, ElementRef, OnDestroy, afterNextRender, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { concat, toArray } from 'rxjs';
import { RpgDungeon, RpgMap, RpgMapObject, RpgTheme, RpgThemeInput } from '../../../models/rpg.models';
import { RpgService } from '../../../services/rpg.service';
import { THEME_EFFECT_KINDS, THEME_EFFECT_LABELS, THEME_FLOWERS, THEME_FLOWER_LABELS, TREE_KINDS, TREE_KIND_LABELS, liquidEdgeOf, setThemes, toThemeDef, treeKindOf } from '../../../rpg/rpg-data';
import { RpgGame, RpgGameEvents, iso } from '../../../rpg/rpg-game';
import { RpgRenderer } from '../../../rpg/rpg-render';

const NO_EVENTS: RpgGameEvents = {
  log: () => undefined,
  statsChanged: () => undefined,
  inventoryChanged: () => undefined,
  dirty: () => undefined,
  talk: () => undefined,
  fade: () => undefined,
  dungeonEntered: () => undefined,
  captureScreen: () => null,
  knockedOut: () => undefined
};

// APIの値の範囲(api#185 の RpgThemeService と合わせる)
export const THEME_LIMITS = { name: 20, liquidName: 10, sway: [0, 10], treeScale: [0.5, 2] } as const;
// 最初からあるベースは消せない(api#185 の RpgThemeService.LOCKED と同じ)
export const LOCKED_THEMES = ['plain', 'forest', 'valley', 'tower'];

// 色を何色持つか(編集欄の並び)
type ColorListKey = 'sky' | 'grass' | 'path' | 'edge' | 'stone' | 'brick' | 'flowers' | 'leaves' | 'rock';
type ColorKey = 'sand' | 'grout' | 'mortar' | 'liquid' | 'trunk';

// 一覧に出すベース(保存したベースと、まだ保存していない新しいベース)
interface ThemeRow {
  theme: RpgTheme;
  isNew: boolean;
}

/**
 * プレビューのエリア(9×9)。草・花・道・砂・水・石畳・レンガが並び、左上が1段高い。木と岩を置く。
 * g 草 / f 花 / p 道 / s 砂 / w 水 / t 石畳 / r レンガ
 */
const PREVIEW_GROUND = ['ggggggggg', 'gfggppggg', 'ggpppgwwg', 'gpptpgwwg', 'gpttrgggg', 'ggtrrgsgg', 'gggggssgf', 'gfgggggfg', 'ggggggggg'];
// 水の手前の列(y=3)は1段くぼませ、水のマスの段差の側面(front#415)が見えるようにする
const PREVIEW_HEIGHTS = ['110000000', '100000000', '000000000', '000000aa0', '000000000', '000000000', '000000000', '000000000', '000000000'];
const PREVIEW_OBJECTS: RpgMapObject[] = [
  { type: 'tree', x: 1, y: 6, torch: false },
  { type: 'tree', x: 7, y: 1, torch: false },
  { type: 'tree', x: 6, y: 7, torch: false },
  { type: 'rock', x: 7, y: 4, torch: false },
  { type: 'rock', x: 3, y: 7, torch: false }
];

/** ベースの問題(front#389)。名前がない・長すぎるは保存できない */
export function themeProblems(t: RpgTheme): string[] {
  const out: string[] = [];
  if (!t.name.trim() || t.name.trim().length > THEME_LIMITS.name) out.push(`ベースの名前は1〜${THEME_LIMITS.name}文字にしてください。`);
  if (!t.liquidName.trim() || t.liquidName.trim().length > THEME_LIMITS.liquidName) out.push(`水のマスの呼び名は1〜${THEME_LIMITS.liquidName}文字にしてください。`);
  return out;
}

export function toThemeInput(row: ThemeRow): RpgThemeInput {
  const { id, sortOrder, updatedAt, ...rest } = row.theme;
  void updatedAt;
  return { ...rest, name: rest.name.trim(), liquidName: rest.liquidName.trim(), id: row.isNew ? null : id, sortOrder };
}

const cloneTheme = (t: RpgTheme): RpgTheme => JSON.parse(JSON.stringify(t)) as RpgTheme;

/**
 * マップ作成画面の「ベース」タブ(旧「見た目」。front#389 / front#401)。ダンジョン・エリアのベース(空・地面・水・木・岩の色と装飾)を作る・直す・消す。
 * 保存すると、ゲーム・マップ作成画面のベース(THEMES)を入れ替え、saved で知らせる
 */
@Component({
  selector: 'app-rpg-theme-page',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './rpg-theme-page.component.html',
  styleUrls: ['./rpg-theme-page.component.css']
})
export class RpgThemePageComponent implements OnDestroy {
  private rpgService = inject(RpgService);

  readonly themes = input.required<RpgTheme[]>();
  readonly dungeons = input.required<RpgDungeon[]>();
  // エリアだけのベース(front#401)も「使っている」に入れる
  readonly maps = input<RpgMap[]>([]);
  readonly saved = output<RpgTheme[]>();
  readonly dirtyChange = output<boolean>();

  readonly limits = THEME_LIMITS;
  readonly flowers = THEME_FLOWERS;
  readonly flowerLabels = THEME_FLOWER_LABELS;
  readonly treeKinds = TREE_KINDS;
  readonly treeKindLabels = TREE_KIND_LABELS;
  readonly treeKindOf = treeKindOf;
  readonly effectKinds = THEME_EFFECT_KINDS;
  readonly effectLabels = THEME_EFFECT_LABELS;
  // 編集欄に並べる色のまとまり(名前・何色か)
  readonly colorGroups: { title: string; rows: { label: string; key: ColorListKey | ColorKey; count?: number }[] }[] = [
    { title: '空', rows: [{ label: '上・下', key: 'sky', count: 2 }] },
    {
      title: '地面',
      rows: [
        { label: '草（3色）', key: 'grass', count: 3 },
        { label: '道（2色）', key: 'path', count: 2 },
        { label: '砂', key: 'sand' },
        { label: '段差の側面', key: 'edge', count: 2 }
      ]
    },
    {
      title: '石畳・レンガ',
      rows: [
        { label: '石（3色）', key: 'stone', count: 3 },
        { label: '石の目地', key: 'grout' },
        { label: 'レンガ（3色）', key: 'brick', count: 3 },
        { label: 'レンガの目地', key: 'mortar' }
      ]
    }
  ];

  readonly rows = signal<ThemeRow[]>([]);
  readonly selectedId = signal<string | null>(null);
  readonly dirtyIds = signal<Set<string>>(new Set());
  readonly saving = signal(false);
  readonly message = signal('');

  private stored: RpgTheme[] = [];
  private newCount = 0;

  readonly selected = computed(() => this.rows().find((r) => r.theme.id === this.selectedId()) ?? null);
  readonly isDirty = computed(() => this.dirtyIds().size > 0);

  private readonly preview = viewChild<ElementRef<HTMLCanvasElement>>('preview');
  private previewGame: RpgGame | null = null;
  private previewRenderer: RpgRenderer | null = null;
  private previewKey = '';
  private frameId = 0;
  private lastTime = 0;

  constructor() {
    afterNextRender(() => {
      this.stored = this.themes().map(cloneTheme);
      this.rows.set(this.stored.map((t) => ({ theme: cloneTheme(t), isNew: false })));
      this.selectedId.set(this.rows()[0]?.theme.id ?? null);
      this.frameId = requestAnimationFrame((t) => this.loop(t));
    });
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.frameId);
    this.previewGame?.dispose();
  }

  // ===== 表示 =====

  /** そのベースを使っているダンジョンの名前 */
  usesOf(id: string): string[] {
    return this.dungeons().filter((d) => d.theme === id).map((d) => d.name);
  }

  /** そのベースを使っているエリア(front#401)。「ダンジョン／エリア」の形 */
  areaUsesOf(id: string): string[] {
    const name = new Map(this.dungeons().map((d) => [d.id, d.name]));
    return this.maps().filter((m) => m.theme === id).map((m) => `${name.get(m.dungeonId) ?? ''}／${m.name}`);
  }

  /** 一覧に出す、使っている数(front#401)。なければ「使っていない」 */
  usesLabel(id: string): string {
    const d = this.usesOf(id).length;
    const a = this.areaUsesOf(id).length;
    if (!d && !a) return '使っていない';
    return [d ? `${d}つのダンジョン` : '', a ? `${a}つのエリア` : ''].filter((s) => s).join('・') + 'で使用';
  }

  problemsOf(t: RpgTheme): string[] {
    return themeProblems(t);
  }

  /** 消せない理由(なければ null) */
  deleteBlocker(row: ThemeRow): string | null {
    if (row.isNew) return null;
    if (LOCKED_THEMES.includes(row.theme.id)) return '最初からあるベースは消せません';
    const uses = [...this.usesOf(row.theme.id), ...this.areaUsesOf(row.theme.id)];
    return uses.length ? `${uses.join('・')}で使っているため消せません` : null;
  }

  /** 一覧の小さな見本(空と草の色) */
  swatch(t: RpgTheme): string {
    return `linear-gradient(${t.sky[0]}, ${t.sky[1]} 45%, ${t.grass[0]} 45%)`;
  }

  colorAt(t: RpgTheme, key: ColorListKey | ColorKey, i: number | null): string {
    const v = t[key];
    return Array.isArray(v) ? v[i ?? 0] : v;
  }

  indexes(count: number | undefined): (number | null)[] {
    return count ? Array.from({ length: count }, (_, i) => i) : [null];
  }

  // ===== 選ぶ・編集 =====

  select(id: string): void {
    this.selectedId.set(id);
  }

  private update(fn: (t: RpgTheme) => void): void {
    const sel = this.selected();
    if (!sel) return;
    const theme = cloneTheme(sel.theme);
    fn(theme);
    this.rows.update((rows) => rows.map((r) => (r === sel ? { ...r, theme } : r)));
    this.dirtyIds.update((s) => new Set(s).add(theme.id));
    this.dirtyChange.emit(true);
  }

  setColor(key: ColorListKey | ColorKey, i: number | null, value: string): void {
    this.update((t) => {
      const v = t[key];
      if (Array.isArray(v) && i !== null) v[i] = value;
      else (t as unknown as Record<string, string>)[key] = value;
    });
  }

  setName(name: string): void {
    this.update((t) => (t.name = name.slice(0, THEME_LIMITS.name)));
  }

  setLiquidName(name: string): void {
    this.update((t) => (t.liquidName = name.slice(0, THEME_LIMITS.liquidName)));
  }

  setSway(v: number | string): void {
    this.update((t) => (t.liquidSway = Math.min(THEME_LIMITS.sway[1], Math.max(THEME_LIMITS.sway[0], Math.round(Number(v) || 0)))));
  }

  /** 波の光(なしにすると波を出さない) */
  setWave(on: boolean, color?: string): void {
    this.update((t) => (t.wave = on ? (color ?? t.wave ?? '#ffffff') : null));
  }

  /** 水のマスの段差の側面の2色(front#415)。自動なら水の色を暗くした色 */
  liquidEdgeColors(t: RpgTheme): [string, string] {
    return liquidEdgeOf(t);
  }

  /** 水のマスの段差の側面を「水の色に合わせる」(自動)にする・やめる。やめたときは、今の自動の色から選び始める */
  setLiquidEdgeAuto(auto: boolean): void {
    this.update((t) => (t.liquidEdge = auto ? null : liquidEdgeOf(t)));
  }

  setLiquidEdge(i: number, color: string): void {
    this.update((t) => {
      const colors = liquidEdgeOf(t);
      colors[i] = color;
      t.liquidEdge = colors;
    });
  }

  setFlower(kind: string): void {
    this.update((t) => (t.flower = kind));
  }

  /** 木の種類(front#447)。広葉樹は null(API と同じく「なし = 広葉樹」) */
  setTreeKind(kind: string): void {
    this.update((t) => (t.treeKind = treeKindOf(kind) === 'broadleaf' ? null : kind));
  }

  setTreeScale(v: number | string): void {
    this.update((t) => (t.treeScale = Math.min(THEME_LIMITS.treeScale[1], Math.max(THEME_LIMITS.treeScale[0], Math.round(Number(v) * 20) / 20))));
  }

  /** 装飾(1つだけ)。種類を変えたら、その種類のよくある色にする */
  setEffectKind(kind: string): void {
    const colors: Record<string, string> = { stars: '#ffffff', fireflies: '#e6ffb3', vignette: '#000000', bubbles: '#e6fbff' };
    this.update((t) => (t.effect = { ...t.effect, kind, color: colors[kind] ?? t.effect.color }));
  }

  setEffectColor(color: string): void {
    this.update((t) => (t.effect = { ...t.effect, color }));
  }

  setEffectAlpha(v: number | string): void {
    this.update((t) => (t.effect = { ...t.effect, alpha: Math.min(1, Math.max(0, Math.round(Number(v) * 20) / 20)) }));
  }

  // ===== 追加・削除・保存 =====

  /** 選んでいるベースを複製して、新しいベースを作る */
  add(): void {
    const base = this.selected()?.theme ?? this.rows()[0]?.theme;
    if (!base) return;
    const id = `new-${++this.newCount}`;
    const theme: RpgTheme = {
      ...cloneTheme(base),
      id,
      name: `${base.name}のコピー`.slice(0, THEME_LIMITS.name),
      sortOrder: Math.max(0, ...this.rows().map((r) => r.theme.sortOrder)) + 1,
      updatedAt: null
    };
    this.rows.update((rows) => [...rows, { theme, isNew: true }]);
    this.dirtyIds.update((s) => new Set(s).add(id));
    this.dirtyChange.emit(true);
    this.select(id);
  }

  delete(): void {
    const sel = this.selected();
    if (!sel || this.deleteBlocker(sel)) return;
    if (sel.isNew) {
      this.removeRow(sel.theme.id);
      return;
    }
    if (!confirm(`「${sel.theme.name}」を消しますか？`)) return;
    this.rpgService.deleteTheme(sel.theme.id).subscribe({
      next: () => {
        this.stored = this.stored.filter((t) => t.id !== sel.theme.id);
        this.removeRow(sel.theme.id);
        this.publish();
        this.flash(`「${sel.theme.name}」を消しました`);
      },
      error: (err: Error) => this.flash(err.message || '消せませんでした')
    });
  }

  private removeRow(id: string): void {
    const index = this.rows().findIndex((r) => r.theme.id === id);
    this.rows.update((rows) => rows.filter((r) => r.theme.id !== id));
    const dirty = new Set(this.dirtyIds());
    dirty.delete(id);
    this.dirtyIds.set(dirty);
    this.dirtyChange.emit(this.isDirty());
    this.select(this.rows()[Math.max(0, index - 1)]?.theme.id ?? '');
  }

  /** 変えたベースをまとめて保存する */
  save(): void {
    if (!this.isDirty() || this.saving()) return;
    const targets = this.rows().filter((r) => this.dirtyIds().has(r.theme.id));
    const bad = targets.filter((r) => themeProblems(r.theme).length);
    if (bad.length) {
      this.flash(`⛔ があるベースは保存できません（${bad.map((r) => r.theme.name || '名前なし').join('・')}）`);
      this.select(bad[0].theme.id);
      return;
    }
    this.saving.set(true);
    concat(...targets.map((r) => this.rpgService.saveTheme(toThemeInput(r))))
      .pipe(toArray())
      .subscribe({
        next: (savedList) => {
          // 新しいベースは、APIが決めたIDに置き換える
          const selected = this.selectedId();
          let nextSelected = selected;
          this.rows.update((list) =>
            list.map((r) => {
              const i = targets.indexOf(r);
              if (i < 0) return r;
              if (r.theme.id === selected) nextSelected = savedList[i].id;
              return { theme: cloneTheme(savedList[i]), isNew: false };
            })
          );
          const byId = new Map(savedList.map((t) => [t.id, t]));
          this.stored = [...this.stored.filter((t) => !byId.has(t.id)), ...savedList].sort((a, b) => a.sortOrder - b.sortOrder);
          this.selectedId.set(nextSelected);
          this.dirtyIds.set(new Set());
          this.dirtyChange.emit(false);
          this.saving.set(false);
          this.publish();
          this.flash('ベースを保存しました');
        },
        error: (err: Error) => {
          this.saving.set(false);
          this.flash(err.message || '保存に失敗しました');
        }
      });
  }

  private publish(): void {
    const list = this.stored.map(cloneTheme);
    setThemes(list);
    this.saved.emit(list);
  }

  private flash(text: string): void {
    this.message.set(text);
    setTimeout(() => this.message() === text && this.message.set(''), 3000);
  }

  // ===== プレビュー =====

  private previewGameFor(): RpgGame {
    const map: RpgMap = {
      id: 'theme-preview', name: '見本', dungeonId: 'theme-preview', gridX: 0, gridY: 0, width: 9, height: 9,
      ground: PREVIEW_GROUND, heights: PREVIEW_HEIGHTS, objects: PREVIEW_OBJECTS.map((o) => ({ ...o })), npcs: [], enemies: [], links: [], sortOrder: 0
    };
    const dungeon: RpgDungeon = { id: 'theme-preview', name: '見本', theme: 'plain', sortOrder: 0 };
    const game = new RpgGame(NO_EVENTS, [map], [dungeon]);
    game.hidePlayer = true;
    return game;
  }

  private loop(now: number): void {
    const dt = Math.min(0.1, (now - this.lastTime) / 1000 || 0);
    this.lastTime = now;
    const cv = this.preview()?.nativeElement;
    const sel = this.selected();
    if (cv && cv.clientWidth && sel) {
      this.previewGame ??= this.previewGameFor();
      const game = this.previewGame;
      // 編集中のベース(保存前)で描く。変わったときだけ作り直す
      const key = JSON.stringify(sel.theme);
      if (key !== this.previewKey) {
        game.theme = toThemeDef(sel.theme);
        this.previewKey = key;
      }
      const dpr = window.devicePixelRatio || 1;
      const w = cv.clientWidth;
      const h = cv.clientHeight;
      if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
        cv.width = Math.round(w * dpr);
        cv.height = Math.round(h * dpr);
      }
      game.time += dt;
      game.viewW = w;
      game.viewH = h;
      game.zoom = 1.1;
      const [cx, cy] = iso(4, 4);
      game.camX = w / 2 - cx * game.zoom;
      game.camY = h * 0.55 - cy * game.zoom;
      const ctx = cv.getContext('2d');
      if (ctx) {
        this.previewRenderer ??= new RpgRenderer(ctx);
        this.previewRenderer.draw(game, dpr);
      }
    }
    this.frameId = requestAnimationFrame((t) => this.loop(t));
  }
}
