import { Component, ElementRef, HostListener, OnDestroy, afterNextRender, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { concat, toArray } from 'rxjs';
import { HeaderComponent } from '../../components/header/header.component';
import { RpgService } from '../../services/rpg.service';
import { AuthService } from '../../services/auth.service';
import { RpgMap, RpgNpcRole } from '../../models/rpg.models';
import { isRoleAllowed } from '../../config/tool-access';
import { TOOL_ACCESS } from '../../config/tool-access';
import { ENEMIES, G, GROUND_CHARS, TH, THEMES, TW, themeOf } from '../../rpg/rpg-data';
import { RpgGame, RpgGameEvents, iso } from '../../rpg/rpg-game';
import { RpgRenderer } from '../../rpg/rpg-render';
import {
  BODY_COLORS,
  EditorTool,
  HAIR_COLORS,
  MAP_SIZE,
  NPC_ROLES,
  PALETTE,
  PaletteItem,
  RpgMapEditor,
  Selection,
  blankMap,
  cloneMap,
  toMapInput
} from '../../rpg/rpg-editor';

const NO_EVENTS: RpgGameEvents = {
  log: () => undefined,
  statsChanged: () => undefined,
  inventoryChanged: () => undefined,
  dirty: () => undefined,
  talk: () => undefined,
  fade: () => undefined,
  areaEntered: () => undefined,
  knockedOut: () => undefined
};

const ZOOM = { min: 0.3, max: 2 };

/**
 * RPGのマップ作成画面(front#217)。管理者・開発者だけが使う。
 * マップはゲームと同じ描画(RpgRenderer)で出し、その上にマス目・選んでいるもの・マウスの下のマスを重ねる。
 */
@Component({
  selector: 'app-rpg-admin-page',
  standalone: true,
  imports: [HeaderComponent, FormsModule],
  templateUrl: './rpg-admin.component.html',
  styleUrl: './rpg-admin.component.css'
})
export class RpgAdminPageComponent implements OnDestroy {
  private rpgService = inject(RpgService);
  private authService = inject(AuthService);

  private readonly stage = viewChild<ElementRef<HTMLDivElement>>('stage');
  private readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>('canvas');

  readonly allowed = isRoleAllowed(this.authService.currentUser()?.role, TOOL_ACCESS['/rpg/admin']);
  readonly palette = PALETTE;
  readonly themes = Object.entries(THEMES).map(([id, t]) => ({ id, label: t.label }));
  readonly roles = Object.entries(NPC_ROLES) as [RpgNpcRole, string][];
  readonly hairColors = HAIR_COLORS;
  readonly bodyColors = BODY_COLORS;
  readonly enemyTypes = Object.entries(ENEMIES).map(([id, e]) => ({ id, name: e.name }));
  readonly sizeRange = MAP_SIZE;

  readonly isLoading = signal(true);
  readonly errorMessage = signal('');
  readonly saving = signal(false);
  readonly toastMessage = signal('');

  // 編集中の全エリア(保存するまでは画面の中だけで変わる)
  readonly maps = signal<RpgMap[]>([]);
  readonly currentId = signal<string | null>(null);
  readonly dirtyIds = signal<ReadonlySet<string>>(new Set());
  readonly tab = signal('ground');
  readonly tool = signal<PaletteItem>(PALETTE[0].items[0]);
  readonly brush = signal(1);
  readonly showGrid = signal(true);
  readonly selection = signal<Selection | null>(null);
  readonly hoverTile = signal<[number, number] | null>(null);
  readonly newAreaOpen = signal(false);
  // 編集するたびに上げて、右側の欄・確認を描き直す
  private readonly version = signal(0);

  readonly current = computed(() => this.maps().find((m) => m.id === this.currentId()) ?? null);
  readonly currentTheme = computed(() => {
    this.version();
    return themeOf(this.current()?.theme ?? 'plain');
  });
  readonly tabHint = computed(() => PALETTE.find((t) => t.id === this.tab())?.hint ?? '');
  readonly tabItems = computed(() => PALETTE.find((t) => t.id === this.tab())?.items ?? []);
  readonly isDirty = computed(() => this.dirtyIds().size > 0);
  readonly canUndo = computed(() => {
    this.version();
    return !!this.editor?.canUndo;
  });
  readonly canRedo = computed(() => {
    this.version();
    return !!this.editor?.canRedo;
  });
  readonly checks = computed(() => {
    this.version();
    return this.editor ? this.editor.checks(this.maps()) : [];
  });
  readonly otherMaps = computed(() => this.maps().filter((m) => m.id !== this.currentId()));
  readonly selected = computed(() => {
    this.version();
    return this.selection();
  });

  newArea = { name: '新しいエリア', theme: 'plain', recommendedLevel: 1, width: 20, height: 20 };

  private editor: RpgMapEditor | null = null;
  private game: RpgGame | null = null;
  private renderer: RpgRenderer | null = null;
  private frameId = 0;
  private lastFrame = 0;
  private dpr = 1;
  private resizeObserver: ResizeObserver | null = null;
  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  // マウスの操作中の状態(塗っている・画面を動かしている・選んだものを動かしている)
  private painting = false;
  private panning: { x: number; y: number; camX: number; camY: number } | null = null;
  private dragging: Selection | null = null;

  private readonly onBeforeUnload = (e: BeforeUnloadEvent) => {
    if (this.isDirty()) e.preventDefault();
  };

  constructor() {
    afterNextRender(() => {
      if (!this.allowed) return;
      this.rpgService.getMaps().subscribe({
        next: (maps) => {
          this.maps.set(maps.map(cloneMap));
          this.isLoading.set(false);
          // 画面(キャンバス)が出てから描き始める
          setTimeout(() => this.start());
        },
        error: () => {
          this.errorMessage.set('マップの取得に失敗しました');
          this.isLoading.set(false);
        }
      });
    });
    window.addEventListener('beforeunload', this.onBeforeUnload);
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.frameId);
    this.resizeObserver?.disconnect();
    window.removeEventListener('beforeunload', this.onBeforeUnload);
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.game?.dispose();
  }

  /** 保存していない変更があるとき、ほかの画面へ移る前に確かめる(ルートの canDeactivate から呼ぶ) */
  confirmLeave(): boolean {
    return !this.isDirty() || confirm('保存していない変更があります。保存せずに移動しますか？');
  }

  private start(): void {
    const canvas = this.canvas()?.nativeElement;
    const stage = this.stage()?.nativeElement;
    const ctx = canvas?.getContext('2d');
    const first = this.maps()[0];
    if (!canvas || !stage || !ctx || !first) return;
    this.renderer = new RpgRenderer(ctx);
    this.game = new RpgGame(NO_EVENTS, this.maps());
    this.game.hidePlayer = true;
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(stage);
    this.resize();
    this.selectArea(first.id);

    this.lastFrame = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - this.lastFrame) / 1000);
      this.lastFrame = now;
      if (this.game && this.renderer) {
        this.game.time += dt;
        this.renderer.draw(this.game, this.dpr);
        this.drawOverlay(ctx);
      }
      this.frameId = requestAnimationFrame(loop);
    };
    this.frameId = requestAnimationFrame(loop);
  }

  private resize(): void {
    const stage = this.stage()?.nativeElement;
    const canvas = this.canvas()?.nativeElement;
    if (!stage || !canvas || !this.game) return;
    this.dpr = window.devicePixelRatio || 1;
    this.game.viewW = stage.clientWidth;
    this.game.viewH = stage.clientHeight;
    canvas.width = Math.round(stage.clientWidth * this.dpr);
    canvas.height = Math.round(stage.clientHeight * this.dpr);
  }

  // ===== エリア =====

  selectArea(id: string): void {
    const map = this.maps().find((m) => m.id === id);
    if (!map || !this.game) return;
    this.currentId.set(id);
    this.editor = new RpgMapEditor(map);
    this.selection.set(null);
    this.refresh();
    this.fitView();
  }

  // 編集したマップを描き直す
  private refresh(): void {
    if (this.game && this.editor) {
      this.game.maps = this.maps();
      this.game.loadMap(this.editor.map);
    }
    this.version.update((v) => v + 1);
  }

  private markDirty(): void {
    const id = this.currentId();
    if (id && !this.dirtyIds().has(id)) this.dirtyIds.set(new Set([...this.dirtyIds(), id]));
    this.refresh();
  }

  fitView(): void {
    const game = this.game;
    const map = this.editor?.map;
    if (!game || !map) return;
    const mapW = ((map.width + map.height) * TW) / 2;
    const mapH = ((map.width + map.height) * TH) / 2 + 80;
    game.zoom = Math.min(1.4, Math.max(ZOOM.min, Math.min(game.viewW / mapW, game.viewH / mapH) * 0.92));
    const [cx, cy] = iso(map.width / 2, map.height / 2);
    game.camX = game.viewW / 2 - cx * game.zoom;
    game.camY = game.viewH / 2 - cy * game.zoom + 20;
  }

  zoomBy(factor: number, at?: { x: number; y: number }): void {
    const game = this.game;
    if (!game) return;
    const before = game.zoom;
    game.zoom = Math.min(ZOOM.max, Math.max(ZOOM.min, game.zoom * factor));
    const px = at?.x ?? game.viewW / 2;
    const py = at?.y ?? game.viewH / 2;
    game.camX = px - ((px - game.camX) * game.zoom) / before;
    game.camY = py - ((py - game.camY) * game.zoom) / before;
  }

  // ===== パレット =====

  selectTab(id: string): void {
    this.tab.set(id);
    this.tool.set(PALETTE.find((t) => t.id === id)!.items[0]);
  }

  itemLabel(item: PaletteItem): string {
    return item.tool.kind === 'ground' && item.tool.ground === 'w' ? this.currentTheme().liquidName : item.label;
  }

  // 地面の見本の色
  swatch(item: PaletteItem): string {
    const tool = item.tool;
    if (tool.kind === 'enemy') return ENEMIES[tool.type].color;
    if (tool.kind !== 'ground') return '';
    const t = this.currentTheme();
    switch (GROUND_CHARS.indexOf(tool.ground)) {
      case G.FLOWER: return t.flowers[0];
      case G.PATH: return t.path[0];
      case G.SAND: return t.sand;
      case G.WATER: return t.liquid(0, 0, 0);
      case G.BRIDGE: return '#b8834f';
      case G.VOID: return 'repeating-linear-gradient(45deg, #cbd5e1 0 4px, #ffffff 4px 8px)';
      default: return t.grass[0];
    }
  }

  // ===== マウス =====

  onMouseDown(event: MouseEvent): void {
    const game = this.game;
    const editor = this.editor;
    if (!game || !editor) return;
    if (event.button !== 0) {
      this.panning = { x: event.clientX, y: event.clientY, camX: game.camX, camY: game.camY };
      return;
    }
    const [x, y] = game.screenToTile(event.offsetX, event.offsetY);
    const tool = this.tool().tool;
    if (tool.kind === 'select') {
      const hit = editor.entityAt(x, y);
      this.selection.set(hit);
      if (hit) {
        editor.checkpoint();
        this.dragging = hit;
      }
      this.version.update((v) => v + 1);
      return;
    }
    editor.checkpoint();
    this.painting = true;
    this.useTool(tool, x, y, true);
  }

  @HostListener('window:mouseup')
  onMouseUp(): void {
    this.painting = false;
    this.panning = null;
    this.dragging = null;
  }

  onMouseMove(event: MouseEvent): void {
    const game = this.game;
    const editor = this.editor;
    if (!game || !editor) return;
    if (this.panning) {
      game.camX = this.panning.camX + event.clientX - this.panning.x;
      game.camY = this.panning.camY + event.clientY - this.panning.y;
      return;
    }
    const [x, y] = game.screenToTile(event.offsetX, event.offsetY);
    const prev = this.hoverTile();
    if (!prev || prev[0] !== x || prev[1] !== y) this.hoverTile.set([x, y]);
    const tool = this.tool().tool;
    if (this.painting && tool.kind !== 'npc' && tool.kind !== 'portal') this.useTool(tool, x, y, false);
    if (this.dragging && editor.moveTo(this.dragging, x, y)) this.markDirty();
  }

  onMouseLeave(): void {
    this.hoverTile.set(null);
  }

  onWheel(event: WheelEvent): void {
    event.preventDefault();
    this.zoomBy(event.deltaY < 0 ? 1.1 : 0.9, { x: event.offsetX, y: event.offsetY });
  }

  private useTool(tool: EditorTool, x: number, y: number, first: boolean): void {
    const editor = this.editor!;
    if (!editor.inMap(x, y)) return;
    const placed = editor.apply(tool, x, y, first, this.brush());
    if (placed) this.selection.set(placed);
    // 消したものを選んだままにしない
    const sel = this.selection();
    if (sel && !editor.entityAt(sel.ref.x, sel.ref.y)) this.selection.set(null);
    this.markDirty();
  }

  @HostListener('window:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if ((event.target as HTMLElement)?.matches?.('input, textarea, select')) return;
    if (event.ctrlKey && event.key === 'z') {
      event.preventDefault();
      this.undo();
    } else if (event.ctrlKey && event.key === 'y') {
      event.preventDefault();
      this.redo();
    } else if (event.key === 'Delete' && this.selection()) {
      this.deleteSelected();
    }
  }

  undo(): void {
    if (this.editor?.undo()) {
      this.selection.set(null);
      this.markDirty();
    }
  }

  redo(): void {
    if (this.editor?.redo()) {
      this.selection.set(null);
      this.markDirty();
    }
  }

  // ===== 右側の欄 =====

  // 入力欄の変更の前に1回だけ、元に戻せる位置を作る
  beginEdit(): void {
    this.editor?.checkpoint();
  }

  edited(): void {
    this.markDirty();
  }

  changeTheme(theme: string): void {
    this.editor?.checkpoint();
    this.editor!.map.theme = theme;
    this.markDirty();
  }

  changeSize(width: number, height: number): void {
    if (!this.editor) return;
    this.editor.checkpoint();
    this.editor.resize(width, height);
    this.selection.set(null);
    this.markDirty();
  }

  npcLines(sel: Selection): string {
    return sel.kind === 'npc' ? sel.ref.lines.join('\n') : '';
  }

  setNpcLines(sel: Selection, text: string): void {
    if (sel.kind !== 'npc') return;
    sel.ref.lines = text.split('\n');
    this.markDirty();
  }

  setColor(sel: Selection, key: 'hair' | 'body', color: string): void {
    if (sel.kind !== 'npc') return;
    this.editor?.checkpoint();
    sel.ref[key] = color;
    this.markDirty();
  }

  setPortalDestination(sel: Selection, to: string): void {
    if (sel.kind !== 'portal') return;
    this.editor?.checkpoint();
    const dest = this.maps().find((m) => m.id === to);
    sel.ref.to = dest ? dest.id : null;
    // 行き先を選んだら、まずは行き先の出発地点に着くようにする
    if (dest) {
      sel.ref.toX = dest.startX;
      sel.ref.toY = dest.startY;
    }
    this.markDirty();
  }

  mapName(id: string | null): string {
    return this.maps().find((m) => m.id === id)?.name ?? '';
  }

  mapSize(id: string | null): string {
    const map = this.maps().find((m) => m.id === id);
    return map ? `${map.width}×${map.height}マス` : '';
  }

  deleteSelected(): void {
    const sel = this.selection();
    if (!sel || !this.editor) return;
    this.editor.checkpoint();
    this.editor.removeAt(sel.ref.x, sel.ref.y);
    this.selection.set(null);
    this.markDirty();
  }

  // ===== 新しいエリア・保存・テストプレイ =====

  openNewArea(): void {
    this.newArea = { name: '新しいエリア', theme: 'plain', recommendedLevel: 1, width: 20, height: 20 };
    this.newAreaOpen.set(true);
  }

  // 新しいエリアはすぐに保存して、IDを決めてもらう(ほかのエリアのポータルの行き先に選べるように)
  createArea(): void {
    const a = this.newArea;
    const clamp = (v: number) => Math.min(MAP_SIZE.max, Math.max(MAP_SIZE.min, Math.round(Number(v) || MAP_SIZE.min)));
    const map = blankMap('', a.name.trim() || '新しいエリア', a.theme, clamp(a.width), clamp(a.height), Math.max(1, Number(a.recommendedLevel) || 1));
    this.saving.set(true);
    this.rpgService.saveMap(toMapInput(map, null)).subscribe({
      next: (created) => {
        this.saving.set(false);
        this.newAreaOpen.set(false);
        this.maps.set([...this.maps(), cloneMap(created)]);
        this.selectArea(created.id);
        this.toast(`「${created.name}」を作りました。ほかのエリアにポータルを置いて、つなげてください`);
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.toast(err.message || 'エリアを作れませんでした');
      }
    });
  }

  // 変更のあったエリアを順番に保存する
  save(): void {
    const ids = [...this.dirtyIds()];
    const targets = this.maps().filter((m) => ids.includes(m.id));
    if (!targets.length || this.saving()) return;
    this.saving.set(true);
    concat(...targets.map((m) => this.rpgService.saveMap(toMapInput(m))))
      .pipe(toArray())
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.dirtyIds.set(new Set());
          this.toast('保存しました。ゲームに反映されます');
        },
        error: (err: Error) => {
          this.saving.set(false);
          this.toast(`保存できませんでした：${err.message}`);
        }
      });
  }

  testPlay(): void {
    const id = this.currentId();
    if (id) window.open(`/rpg?test=${encodeURIComponent(id)}`, '_blank');
  }

  private toast(message: string): void {
    this.toastMessage.set(message);
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toastMessage.set(''), 3000);
  }

  // ===== 重ねて描くもの =====

  private drawOverlay(ctx: CanvasRenderingContext2D): void {
    const game = this.game;
    const editor = this.editor;
    if (!game || !editor) return;
    const map = editor.map;
    ctx.save();
    ctx.translate(game.camX, game.camY);
    ctx.scale(game.zoom, game.zoom);
    const diamond = (x: number, y: number, s = 1) => {
      const [cx, cy] = iso(x, y);
      ctx.beginPath();
      ctx.moveTo(cx, cy - (TH / 2) * s);
      ctx.lineTo(cx + (TW / 2) * s, cy);
      ctx.lineTo(cx, cy + (TH / 2) * s);
      ctx.lineTo(cx - (TW / 2) * s, cy);
      ctx.closePath();
    };

    // マス目(「なし」のマスは点線で、どこまでがマップかわかるようにする)
    if (this.showGrid()) {
      ctx.lineWidth = 1;
      for (let y = 0; y < map.height; y++) {
        for (let x = 0; x < map.width; x++) {
          diamond(x, y);
          if (editor.groundAt(x, y) === 'v') {
            ctx.setLineDash([4, 4]);
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
          } else {
            ctx.setLineDash([]);
            ctx.strokeStyle = 'rgba(0,0,0,0.12)';
          }
          ctx.stroke();
        }
      }
      ctx.setLineDash([]);
    }

    // 出発地点
    diamond(map.startX, map.startY, 0.8);
    ctx.fillStyle = 'rgba(34,181,115,0.45)';
    ctx.fill();
    this.label(ctx, '🚩 出発地点', ...iso(map.startX, map.startY + 0.6), 'rgba(34,181,115,0.92)');

    // 行き先が決まっていないポータル
    for (const p of map.portals) {
      if (this.maps().some((m) => m.id === p.to)) continue;
      const [sx, sy] = iso(p.x, p.y);
      this.label(ctx, '▶ 行き先が未設定', sx, sy - 48, 'rgba(245,158,11,0.95)');
    }

    // 選んでいるもの
    const sel = this.selection();
    if (sel) {
      ctx.strokeStyle = '#6076e0';
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 4]);
      diamond(sel.ref.x, sel.ref.y, 1.05);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // マウスの下のマス
    const hover = this.hoverTile();
    if (hover && editor.inMap(...hover)) {
      const tool = this.tool().tool;
      for (const [x, y] of editor.brushTiles(tool, hover[0], hover[1], this.brush())) {
        diamond(x, y);
        ctx.fillStyle = tool.kind === 'erase' ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.35)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(96,118,224,0.9)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  private label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, bg: string): void {
    ctx.font = 'bold 11px "Yu Gothic", Meiryo, sans-serif';
    const w = ctx.measureText(text).width + 12;
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.roundRect(x - w / 2, y - 9, w, 17, 8);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
  }
}
