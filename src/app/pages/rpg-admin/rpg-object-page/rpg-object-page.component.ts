import { Component, ElementRef, OnDestroy, afterNextRender, afterRenderEffect, computed, inject, input, output, signal, viewChild, viewChildren } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { concat, toArray } from 'rxjs';
import { RpgDungeon, RpgMap, RpgMapObject, RpgObjectDef } from '../../../models/rpg.models';
import { RpgService } from '../../../services/rpg.service';
import { ITEMS, OBJECT_DEF_TYPES, STATIC_NAMES, StaticType, THEMES, isBreakable, setObjectDefs } from '../../../rpg/rpg-data';
import { ENEMIES } from '../../../rpg/rpg-enemy';
import { RpgGame, RpgGameEvents, iso } from '../../../rpg/rpg-game';
import { RpgRenderer } from '../../../rpg/rpg-render';
import { blankMap } from '../../../rpg/rpg-editor';
import { ObjectDraft, applyDraft, defInputOf, draftOfDef, draftProblem } from '../../../rpg/rpg-object';
import { RpgObjectFormComponent } from '../rpg-object-form/rpg-object-form.component';

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

// 見本のエリアの広さ(マス)。置物はまんなかに置く
const PREVIEW = 5;

/**
 * マップ作成画面の「置物」タブ(front#333)。置物の種類ごとのデフォルト(色合い・出てくるアイテム・敵・擬態している敵・叩いたときの音)を決める。
 * 新しい種類の置物は作らない。保存すると、ゲーム・マップ作成画面の置物の設定(OBJECT_DEFS)を入れ替え、saved で知らせる
 */
@Component({
  selector: 'app-rpg-object-page',
  imports: [FormsModule, RpgObjectFormComponent],
  templateUrl: './rpg-object-page.component.html',
  styleUrl: './rpg-object-page.component.css'
})
export class RpgObjectPageComponent implements OnDestroy {
  private readonly rpgService = inject(RpgService);

  readonly defs = input.required<RpgObjectDef[]>();
  readonly maps = input.required<RpgMap[]>();
  readonly saved = output<RpgObjectDef[]>();
  readonly dirtyChange = output<boolean>();

  readonly types = OBJECT_DEF_TYPES;
  readonly themes = Object.entries(THEMES).map(([id, t]) => ({ id, label: t.label }));
  readonly selected = signal<StaticType>(OBJECT_DEF_TYPES[0]);
  readonly previewTheme = signal('plain');
  readonly saving = signal(false);
  readonly message = signal('');
  readonly errorMessage = signal('');
  // 保存していない下書き(種類ごと)。下書きを書きかえたら version を進めて描き直す
  private readonly drafts = new Map<string, ObjectDraft>();
  readonly dirtyTypes = signal<ReadonlySet<string>>(new Set());
  readonly version = signal(0);
  readonly results = signal('');

  private readonly preview = viewChild<ElementRef<HTMLCanvasElement>>('preview');
  private readonly thumbs = viewChildren<ElementRef<HTMLCanvasElement>>('thumb');
  private frameId = 0;
  private previewGame: RpgGame | null = null;
  private previewKey = '';
  private previewRenderer: RpgRenderer | null = null;
  private lastTime = 0;

  readonly selectedDraft = computed(() => {
    this.version();
    return this.draftOf(this.selected());
  });
  readonly problem = computed(() => {
    this.version();
    for (const type of this.dirtyTypes()) {
      const p = draftProblem(this.draftOf(type));
      if (p) return `${this.name(type)}: ${p}`;
    }
    return null;
  });

  constructor() {
    // 一覧の見本(下書きの色で描く)
    afterRenderEffect(() => {
      this.version();
      this.defs();
      for (const ref of this.thumbs()) {
        const type = ref.nativeElement.dataset['type'] as StaticType;
        this.drawThumb(ref.nativeElement, type);
      }
    });
    afterNextRender(() => this.loop(performance.now()));
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.frameId);
    this.previewGame?.dispose();
  }

  name(type: string): string {
    return STATIC_NAMES[type as StaticType] ?? type;
  }

  draftOf(type: string): ObjectDraft {
    let d = this.drafts.get(type);
    if (!d) {
      d = draftOfDef(this.defs().find((x) => x.type === type));
      this.drafts.set(type, d);
    }
    return d;
  }

  select(type: StaticType): void {
    this.selected.set(type);
    this.results.set('');
    this.message.set('');
  }

  onChanged(): void {
    const type = this.selected();
    if (!this.dirtyTypes().has(type)) this.dirtyTypes.set(new Set([...this.dirtyTypes(), type]));
    this.dirtyChange.emit(true);
    this.message.set('');
    this.version.update((v) => v + 1);
  }

  /** マップに置いてある数 */
  usedCount(type: string): number {
    return this.maps().reduce((n, m) => n + m.objects.filter((o) => o.type === type).length, 0);
  }

  /** 一覧の説明(デフォルトで決めたこと) */
  summary(type: string): string {
    this.version();
    const d = this.draftOf(type);
    const parts = [
      d.items?.length ? `🎁${d.items.map((r) => ITEMS[r.id]?.icon ?? '').join('')}` : '',
      d.enemies?.length ? `👾${d.enemies.map((r) => ENEMIES[r.id]?.name ?? r.id).join('・')}` : '',
      d.mimics?.length ? `🎭${d.mimics.map((r) => ENEMIES[r.id]?.name ?? r.id).join('・')}` : '',
      d.color || d.dark ? '🎨' : '',
      d.hitMaterial ? '🔊' : ''
    ].filter((p) => p);
    return parts.length ? parts.join(' ') : 'デフォルトの設定なし';
  }

  /** 叩いて壊したときの例(下書きの確率で判定する) */
  tryBreak(): void {
    const type = this.selected();
    const d = this.draftOf(type);
    if (!isBreakable(type)) {
      this.results.set(`${this.name(type)}は壊れない置物です。`);
      return;
    }
    const out = [
      ...(d.items ?? []).filter((r) => Math.random() < r.chance).map((r) => `${ITEMS[r.id]?.icon ?? ''}${ITEMS[r.id]?.name ?? r.id}×${r.count}が落ちた`),
      ...(d.enemies ?? []).filter((r) => Math.random() < r.chance).map((r) => `${ENEMIES[r.id]?.name ?? r.id}が現れた`)
    ];
    this.results.set(`壊した: ${out.length ? out.join('、') : '何も出なかった'}`);
  }

  /** 置物が出直したときの擬態の例 */
  tryMimic(): void {
    const d = this.draftOf(this.selected());
    let r = Math.random();
    const hit = (d.mimics ?? []).find((m) => (r -= m.chance) < 0);
    this.results.set(hit ? `出直した: ${ENEMIES[hit.id]?.name ?? hit.id}が擬態している（近づくと正体を現す）` : '出直した: ただの置物');
  }

  // ===== 保存 =====

  save(): void {
    if (this.problem() || this.saving()) return;
    const types = [...this.dirtyTypes()];
    if (!types.length) return;
    this.saving.set(true);
    this.errorMessage.set('');
    const requests = types.map((type) => {
      const def = this.defs().find((x) => x.type === type);
      return this.rpgService.saveObjectDef(defInputOf(type, this.draftOf(type), def?.updatedAt ?? ''));
    });
    concat(...requests).pipe(toArray()).subscribe({
      next: (savedDefs) => {
        const list = this.defs().map((d) => savedDefs.find((s) => s.type === d.type) ?? d);
        for (const s of savedDefs) if (!list.some((d) => d.type === s.type)) list.push(s);
        setObjectDefs(list);
        for (const type of types) this.drafts.delete(type);
        this.dirtyTypes.set(new Set());
        this.dirtyChange.emit(false);
        this.saving.set(false);
        this.message.set('保存しました。置いてあるすべての置物に反映されます。');
        this.saved.emit(list);
        this.version.update((v) => v + 1);
      },
      error: (e: Error) => {
        this.saving.set(false);
        this.errorMessage.set(e.message || '保存に失敗しました');
      }
    });
  }

  // ===== 見本 =====

  /** 下書きを持った置物を1つ置いた、5×5 の見本のエリア */
  private previewMap(type: string, theme: string): { map: RpgMap; dungeon: RpgDungeon } {
    const map = blankMap('object-preview', '見本', 'object-preview', 0, 0, PREVIEW, PREVIEW);
    const o: RpgMapObject = { type, x: 2, y: 2, torch: type === 'pillar' };
    applyDraft(o, { ...this.draftOf(type), showMessage: false, lines: '', signDir: null, mimics: [] });
    map.objects = [o];
    return { map, dungeon: { id: 'object-preview', name: '見本', recommendedLevel: 1, theme, sortOrder: 0 } };
  }

  private gameFor(type: string, theme: string): RpgGame {
    const { map, dungeon } = this.previewMap(type, theme);
    const game = new RpgGame(NO_EVENTS, [map], [dungeon]);
    game.hidePlayer = true;
    return game;
  }

  private drawThumb(cv: HTMLCanvasElement, type: StaticType): void {
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const game = this.gameFor(type, 'plain');
    const renderer = new RpgRenderer(ctx);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    const tall = type === 'tree' || type === 'bookshelf' || type === 'pillar' || type === 'volcano' || type === 'wall' ? 0.45 : 0.75;
    const scale = (cv.width / 70) * tall * (type === 'volcano' || type === 'wall' ? 0.5 : 1);
    ctx.translate(cv.width / 2, cv.height * 0.85);
    ctx.scale(scale, scale);
    renderer.drawObjectPreview(game, game.map.statics[0], 0, 0);
    game.dispose();
  }

  private loop(now: number): void {
    const dt = Math.min(0.1, (now - this.lastTime) / 1000 || 0);
    this.lastTime = now;
    const cv = this.preview()?.nativeElement;
    if (cv && cv.clientWidth) {
      const key = `${this.selected()}|${this.previewTheme()}|${this.version()}`;
      if (key !== this.previewKey || !this.previewGame) {
        this.previewGame?.dispose();
        this.previewGame = this.gameFor(this.selected(), this.previewTheme());
        this.previewKey = key;
      }
      const game = this.previewGame;
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
      game.zoom = this.selected() === 'volcano' || this.selected() === 'wall' ? 1 : 1.9;
      const [cx, cy] = iso(2, 2);
      game.camX = w / 2 - cx * game.zoom;
      game.camY = h * 0.62 - cy * game.zoom;
      const ctx = cv.getContext('2d');
      if (ctx) {
        this.previewRenderer ??= new RpgRenderer(ctx);
        this.previewRenderer.draw(game, dpr);
      }
    }
    this.frameId = requestAnimationFrame((t) => this.loop(t));
  }
}
