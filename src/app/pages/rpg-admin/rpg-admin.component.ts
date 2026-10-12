import { Component, ElementRef, HostListener, OnDestroy, afterNextRender, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { concat, forkJoin, toArray } from 'rxjs';
import { HeaderComponent } from '../../components/header/header.component';
import { RPG_BGM_ACCEPT, RPG_BGM_MAX_BYTES, RpgService } from '../../services/rpg.service';
import { AuthService } from '../../services/auth.service';
import { RpgBgm, RpgDungeon, RpgEnemy, RpgLook, RpgMap, RpgMapNpc, RpgMapObject, RpgNpcRole, RpgQuest, RpgQuestKind } from '../../models/rpg.models';
import { QUEST_KIND_LABELS } from '../../rpg/rpg-quest';
import {
  DEFAULT_ROOF, DEFAULT_WALL, HOUSE_ROTATIONS, HOUSE_SHAPES, ROOF_COLORS, WALL_COLORS, doorLabel, houseGeometry, housePieces, objectTiles, roofRise,
  wallColors, wallOpenings
} from '../../rpg/rpg-house';
import { isRoleAllowed } from '../../config/tool-access';
import { TOOL_ACCESS } from '../../config/tool-access';
import { ENEMIES, G, GROUND_CHARS, HZ, ITEMS, SIDES, TH, THEMES, TW, neighborOf, sideLabel, themeOf } from '../../rpg/rpg-data';
import { RpgGame, RpgGameEvents, iso } from '../../rpg/rpg-game';
import { RpgRenderer, shade } from '../../rpg/rpg-render';
import { lookFromColors } from '../../rpg/rpg-look';
import { RpgLookEditorComponent } from '../../components/rpg-look-editor/rpg-look-editor.component';
import { RpgEnemyPageComponent } from './rpg-enemy-page/rpg-enemy-page.component';
import { setEnemies } from '../../rpg/rpg-enemy';
import {
  EditorTool,
  MAP_SIZE,
  NPC_ROLES,
  PALETTE,
  PaletteItem,
  RpgMapEditor,
  Selection,
  blankMap,
  blankQuest,
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
  dungeonEntered: () => undefined,
  captureScreen: () => null,
  knockedOut: () => undefined
};

const ZOOM = { min: 0.3, max: 2 };

// エリアの配置(ダンジョンの中のマス目)の1マス
export interface LayoutCell {
  x: number;
  y: number;
  area: RpgMap | null;
  // 今のエリアの上下左右の空いたマス(新しいエリアを作れる)
  addable: boolean;
}

/**
 * RPGのマップ作成画面(front#217)。管理者・開発者だけが使う。
 * ダンジョン(front#234)を選び、その中に縦横のマス目で並ぶエリアを1つずつ編集する。
 * マップはゲームと同じ描画(RpgRenderer)で出し、その上にマス目・選んでいるもの・マウスの下のマスを重ねる。
 */
@Component({
  selector: 'app-rpg-admin-page',
  standalone: true,
  imports: [HeaderComponent, FormsModule, RpgLookEditorComponent, RpgEnemyPageComponent],
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
  // 敵の種類(「敵」タブで保存すると変わる。front#229)
  readonly enemies = signal<RpgEnemy[]>([]);
  readonly enemyDirty = signal(false);
  readonly enemyTypes = computed(() => {
    this.enemies();
    return Object.entries(ENEMIES).map(([id, e]) => ({ id, name: e.name }));
  });
  readonly sizeRange = MAP_SIZE;

  readonly isLoading = signal(true);
  readonly errorMessage = signal('');
  readonly saving = signal(false);
  readonly toastMessage = signal('');

  // 編集中の全エリア・全ダンジョン(保存するまでは画面の中だけで変わる)
  readonly maps = signal<RpgMap[]>([]);
  readonly dungeons = signal<RpgDungeon[]>([]);
  readonly currentDungeonId = signal<string | null>(null);
  readonly currentId = signal<string | null>(null);
  readonly dirtyIds = signal<ReadonlySet<string>>(new Set());
  readonly dirtyDungeonIds = signal<ReadonlySet<string>>(new Set());
  readonly tab = signal('ground');
  readonly tool = signal<PaletteItem>(PALETTE[0].items[0]);
  readonly brush = signal(1);
  readonly showGrid = signal(true);
  // 段差(front#225): 高さを数字で出す・2段以上の差(崖)に赤い線を引く
  readonly showHeights = signal(false);
  readonly showCliffs = signal(true);
  readonly selection = signal<Selection | null>(null);
  readonly hoverTile = signal<[number, number] | null>(null);
  readonly newAreaOpen = signal(false);
  readonly newDungeonOpen = signal(false);
  // NPC・家の中身を変えるモーダル(front#236)。家は、決めるまでは下書き(houseDraft)を変える
  readonly npcModal = signal<RpgMapNpc | null>(null);
  readonly houseModal = signal<RpgMapObject | null>(null);
  readonly houseDraft = signal<{ shape: string; rotation: number; roof: string; lowRoof: boolean; wall: string; noWindow: boolean }>({
    shape: '1x1', rotation: 0, roof: DEFAULT_ROOF, lowRoof: false, wall: DEFAULT_WALL, noWindow: false
  });
  readonly houseShapes = HOUSE_SHAPES;
  // クエスト(front#239)。NPCのモーダルで、いま編集しているクエストの番号
  readonly questIndex = signal(0);
  readonly questKinds = Object.entries(QUEST_KIND_LABELS) as [RpgQuestKind, string][];
  readonly itemOptions = Object.entries(ITEMS).map(([id, item]) => ({ id, name: item.name }));
  readonly roofColors = ROOF_COLORS;
  readonly wallColors = WALL_COLORS;
  // 家を下書きの形・向きにしたときに置けない理由(置ければ空)
  readonly houseProblem = computed(() => {
    this.version();
    const house = this.houseModal();
    const d = this.houseDraft();
    return house && this.editor ? (this.editor.houseProblem(house, house.x, house.y, d.shape, d.rotation) ?? '') : '';
  });
  readonly houseDoorLabel = computed(() => {
    const d = this.houseDraft();
    return doorLabel(houseGeometry(d.shape, d.rotation).door.normal);
  });
  // 編集するたびに上げて、右側の欄・確認を描き直す
  private readonly version = signal(0);

  readonly current = computed(() => this.maps().find((m) => m.id === this.currentId()) ?? null);
  readonly currentDungeon = computed(() => {
    this.version();
    return this.dungeons().find((d) => d.id === this.currentDungeonId()) ?? null;
  });
  readonly currentTheme = computed(() => {
    this.version();
    return themeOf(this.currentDungeon()?.theme ?? 'plain');
  });
  // エリアの配置: 今のダンジョンのエリアのまわりを1マスずつ広げたマス目
  readonly layout = computed<{ columns: number; cells: LayoutCell[] }>(() => {
    this.version();
    const areas = this.maps().filter((m) => m.dungeonId === this.currentDungeonId());
    const cur = this.current();
    if (!areas.length) return { columns: 1, cells: [{ x: 0, y: 0, area: null, addable: true }] };
    const xs = areas.map((a) => a.gridX);
    const ys = areas.map((a) => a.gridY);
    const [minX, maxX, minY, maxY] = [Math.min(...xs) - 1, Math.max(...xs) + 1, Math.min(...ys) - 1, Math.max(...ys) + 1];
    const cells: LayoutCell[] = [];
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const area = areas.find((a) => a.gridX === x && a.gridY === y) ?? null;
        const addable = !area && !!cur && Math.abs(cur.gridX - x) + Math.abs(cur.gridY - y) === 1;
        cells.push({ x, y, area, addable });
      }
    }
    return { columns: maxX - minX + 1, cells };
  });
  readonly tabHint = computed(() => PALETTE.find((t) => t.id === this.tab())?.hint ?? '');
  readonly tabItems = computed(() => {
    this.enemies();
    return PALETTE.find((t) => t.id === this.tab())?.items ?? [];
  });
  readonly isDirty = computed(() => this.dirtyIds().size > 0 || this.dirtyDungeonIds().size > 0);
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
  readonly selected = computed(() => {
    this.version();
    return this.selection();
  });

  newArea = { name: '新しいエリア', width: 20, height: 20, gridX: 0, gridY: 0 };
  newDungeon = { name: '新しいダンジョン', theme: 'plain', recommendedLevel: 1, width: 20, height: 20 };

  // ===== BGM(front#218) =====
  readonly page = signal<'map' | 'bgm' | 'enemy'>('map');
  readonly bgms = signal<RpgBgm[]>([]);
  readonly bgmAccept = RPG_BGM_ACCEPT;
  readonly uploading = signal(false);
  readonly bgmError = signal('');
  readonly previewId = signal<string | null>(null);
  readonly renamingId = signal<string | null>(null);
  renameText = '';
  uploadName = '';
  readonly dragOver = signal(false);
  private previewAudio: HTMLAudioElement | null = null;

  // 曲ごとの、使っているダンジョンの名前
  readonly bgmUsage = computed(() => {
    this.version();
    const usage = new Map<string, string[]>();
    for (const d of this.dungeons()) {
      if (d.bgmId) usage.set(d.bgmId, [...(usage.get(d.bgmId) ?? []), d.name]);
    }
    return usage;
  });

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
  // 選んだものをつかんだマスの、家の左上の角からのずれ・ドラッグで動かしたか(動かさずに離したら、モーダルを開く)
  private dragOffset: [number, number] = [0, 0];
  private dragMoved = false;
  // 置いたばかりのNPC・家。マウスを離したときにモーダルを開く(押したときに開くと、離したクリックがモーダルの外側に当たって閉じてしまう)
  private placedToOpen: Selection | null = null;

  private readonly onBeforeUnload = (e: BeforeUnloadEvent) => {
    if (this.isDirty() || this.enemyDirty()) e.preventDefault();
  };

  constructor() {
    afterNextRender(() => {
      if (!this.allowed) return;
      forkJoin({
        maps: this.rpgService.getMaps(),
        dungeons: this.rpgService.getDungeons(),
        bgms: this.rpgService.getBgms(),
        enemies: this.rpgService.getEnemies()
      }).subscribe({
        next: ({ maps, dungeons, bgms, enemies }) => {
          setEnemies(enemies);
          this.enemies.set(enemies);
          this.maps.set(maps.map(cloneMap));
          this.dungeons.set(dungeons.map((d) => ({ ...d })));
          this.bgms.set(bgms);
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
    this.stopPreview();
  }

  /** 保存していない変更があるとき、ほかの画面へ移る前に確かめる(ルートの canDeactivate から呼ぶ) */
  confirmLeave(): boolean {
    return (!this.isDirty() && !this.enemyDirty()) || confirm('保存していない変更があります。保存せずに移動しますか？');
  }

  // 「敵」タブで保存・削除したら、パレット・マップの敵を描き直す(front#229)
  onEnemiesSaved(enemies: RpgEnemy[]): void {
    this.enemies.set(enemies);
    this.refresh();
  }

  private start(): void {
    const canvas = this.canvas()?.nativeElement;
    const stage = this.stage()?.nativeElement;
    const ctx = canvas?.getContext('2d');
    const first = this.maps()[0];
    if (!canvas || !stage || !ctx || !first) return;
    this.renderer = new RpgRenderer(ctx);
    this.game = new RpgGame(NO_EVENTS, this.maps(), this.dungeons());
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
    // BGMタブから戻ったとき(隠れていて大きさが0だったとき)は、全体が見えるように合わせ直す
    const wasHidden = this.game.viewW === 0;
    this.dpr = window.devicePixelRatio || 1;
    this.game.viewW = stage.clientWidth;
    this.game.viewH = stage.clientHeight;
    canvas.width = Math.round(stage.clientWidth * this.dpr);
    canvas.height = Math.round(stage.clientHeight * this.dpr);
    if (wasHidden && stage.clientWidth > 0) this.fitView();
  }

  // ===== ダンジョン・エリア =====

  // ダンジョンを選ぶと、その中の最初のエリア(並び順)を編集する
  selectDungeon(id: string): void {
    const first = this.maps().find((m) => m.dungeonId === id);
    if (first) {
      this.selectArea(first.id);
      return;
    }
    // エリアがまだないダンジョン(作りかけ)は、エリアの配置から最初のエリアを作る
    this.currentDungeonId.set(id);
    this.currentId.set(null);
    this.editor = null;
    this.selection.set(null);
    this.version.update((v) => v + 1);
  }

  selectArea(id: string): void {
    const map = this.maps().find((m) => m.id === id);
    if (!map || !this.game) return;
    this.currentDungeonId.set(map.dungeonId);
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
      this.game.dungeons = this.dungeons();
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
      // タイルは2×2の石、レンガは互い違いの横長の模様
      case G.TILE:
        return `linear-gradient(90deg, ${t.tile.grout} 1px, transparent 1px) 0 0 / 50% 50%, linear-gradient(${t.tile.grout} 1px, transparent 1px) 0 0 / 50% 50%, ${t.tile.stone[0]}`;
      case G.BRICK:
        return `linear-gradient(${t.brick.mortar} 1px, transparent 1px) 0 0 / 100% 50%, linear-gradient(90deg, ${t.brick.mortar} 1px, transparent 1px) 0 0 / 50% 100%, ${t.brick.brick[0]}`;
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
        this.dragOffset = [x - hit.ref.x, y - hit.ref.y];
        this.dragMoved = false;
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
    // 「選ぶ・動かす」でNPC・家をクリックした(動かさずに離した)ら、中身を変えるモーダルを開く
    const clicked = this.dragging && !this.dragMoved ? this.dragging : this.placedToOpen;
    this.painting = false;
    this.panning = null;
    this.dragging = null;
    this.placedToOpen = null;
    if (clicked) this.openModal(clicked);
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
    if (this.dragging && editor.moveTo(this.dragging, x - this.dragOffset[0], y - this.dragOffset[1])) {
      this.dragMoved = true;
      this.markDirty();
    }
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
    if (placed) {
      this.selection.set(placed);
      // NPC・家は、置いた直後(マウスを離したとき)に中身を決めるモーダルを開く
      if (placed.kind === 'npc' || placed.kind === 'house') {
        this.painting = false;
        this.placedToOpen = placed;
      }
    }
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

  // ダンジョンの設定(名前・推奨レベル・見た目・BGM)を変えた。ダンジョンの中のすべてのエリアで共通
  editDungeon(dungeon: RpgDungeon, change: Partial<RpgDungeon>): void {
    Object.assign(dungeon, change);
    if (!this.dirtyDungeonIds().has(dungeon.id)) this.dirtyDungeonIds.set(new Set([...this.dirtyDungeonIds(), dungeon.id]));
    this.refresh();
  }

  dungeonName(id: string): string {
    return this.dungeons().find((d) => d.id === id)?.name ?? '';
  }

  // 隣のエリアへつながる向きと、隣のエリア(マップの上に名前を出す)
  private neighbors(map: RpgMap): { side: readonly [number, number]; area: RpgMap }[] {
    return SIDES.flatMap((side) => {
      const area = neighborOf(this.maps(), map, side);
      return area ? [{ side, area }] : [];
    });
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

  // 見た目を選ぶ前の村人は、髪の色・服の色から作った見た目を出す
  npcLook(npc: RpgMapNpc): RpgLook {
    return npc.look ?? lookFromColors(npc.hair, npc.body);
  }

  // 見た目を変える(front#224)。前からある髪の色・服の色も合わせる
  setNpcLook(sel: Selection, look: RpgLook): void {
    if (sel.kind !== 'npc') return;
    this.editor?.checkpoint();
    sel.ref.look = look;
    sel.ref.hair = look.hairColor;
    sel.ref.body = look.clothesColor;
    this.markDirty();
  }

  // ポータルの行き先は、ダンジョン → エリアの順に選ぶ
  portalDungeonId(sel: Selection): string {
    return sel.kind === 'portal' ? (this.maps().find((m) => m.id === sel.ref.to)?.dungeonId ?? '') : '';
  }

  // 行き先に選べるエリア(今のエリアは選べない)
  portalAreas(dungeonId: string): RpgMap[] {
    return this.maps().filter((m) => m.dungeonId === dungeonId && m.id !== this.currentId());
  }

  setPortalDungeon(sel: Selection, dungeonId: string): void {
    this.setPortalDestination(sel, this.portalAreas(dungeonId)[0]?.id ?? '');
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
    const map = this.maps().find((m) => m.id === id);
    return map ? `${this.dungeonName(map.dungeonId)} ／ ${map.name}` : '';
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
    this.npcModal.set(null);
    this.houseModal.set(null);
    this.markDirty();
  }

  // ===== クエスト(front#239) =====

  editingQuest(npc: RpgMapNpc): RpgQuest | null {
    const quests = npc.quests ?? [];
    return quests[Math.min(this.questIndex(), quests.length - 1)] ?? null;
  }

  // NPCの役割を変える。クエスト依頼にしたとき、クエストがなければ1つ作っておく
  setNpcRole(npc: RpgMapNpc, role: RpgNpcRole): void {
    this.editor?.checkpoint();
    npc.role = role;
    if (role === 'quest' && !(npc.quests ?? []).length) npc.quests = [blankQuest()];
    this.questIndex.set(0);
    this.markDirty();
  }

  addQuest(npc: RpgMapNpc): void {
    this.editor?.checkpoint();
    npc.quests = [...(npc.quests ?? []), blankQuest()];
    this.questIndex.set(npc.quests.length - 1);
    this.markDirty();
  }

  removeQuest(npc: RpgMapNpc): void {
    const quests = npc.quests ?? [];
    const i = Math.min(this.questIndex(), quests.length - 1);
    if (i < 0) return;
    this.editor?.checkpoint();
    npc.quests = quests.filter((_, k) => k !== i);
    this.questIndex.set(Math.max(0, i - 1));
    this.markDirty();
  }

  // いま編集しているクエストを、上(-1)・下(+1)へ動かす(上から順に受けられる)
  moveQuest(npc: RpgMapNpc, d: number): void {
    const quests = [...(npc.quests ?? [])];
    const i = Math.min(this.questIndex(), quests.length - 1);
    const j = i + d;
    if (i < 0 || j < 0 || j >= quests.length) return;
    this.editor?.checkpoint();
    [quests[i], quests[j]] = [quests[j], quests[i]];
    npc.quests = quests;
    this.questIndex.set(j);
    this.markDirty();
  }

  // 種類を変えたら、対象をその種類の最初のものにする
  setQuestKind(q: RpgQuest, kind: RpgQuestKind): void {
    this.editor?.checkpoint();
    q.kind = kind;
    q.target = kind === 'defeat' ? (Object.keys(ENEMIES)[0] ?? '') : kind === 'collect' ? 'potion' : '';
    q.targetArea = null;
    q.count = kind === 'visit' ? 1 : Math.max(1, q.count || 3);
    this.markDirty();
  }

  questLines(lines: string[]): string {
    return lines.join('\n');
  }

  setQuestLines(q: RpgQuest, key: 'offerLines' | 'progressLines' | 'doneLines', text: string): void {
    q[key] = text.split('\n');
    this.markDirty();
  }

  // 会うNPCは、ダンジョン → エリア → NPC の順に選ぶ
  visitDungeonId(q: RpgQuest): string {
    return this.maps().find((m) => m.id === q.targetArea)?.dungeonId ?? '';
  }

  areasOf(dungeonId: string): RpgMap[] {
    return this.maps().filter((m) => m.dungeonId === dungeonId);
  }

  npcNamesOf(areaId: string | null | undefined): string[] {
    return this.maps().find((m) => m.id === areaId)?.npcs.map((n) => n.name) ?? [];
  }

  setVisitDungeon(q: RpgQuest, dungeonId: string): void {
    this.editor?.checkpoint();
    q.targetArea = this.areasOf(dungeonId)[0]?.id ?? null;
    q.target = this.npcNamesOf(q.targetArea)[0] ?? '';
    this.markDirty();
  }

  setVisitArea(q: RpgQuest, areaId: string): void {
    this.editor?.checkpoint();
    q.targetArea = areaId || null;
    q.target = this.npcNamesOf(q.targetArea)[0] ?? '';
    this.markDirty();
  }

  addReward(q: RpgQuest): void {
    this.editor?.checkpoint();
    q.rewardItems = [...q.rewardItems, { itemId: 'potion', count: 1 }];
    this.markDirty();
  }

  removeReward(q: RpgQuest, index: number): void {
    this.editor?.checkpoint();
    q.rewardItems = q.rewardItems.filter((_, k) => k !== index);
    this.markDirty();
  }

  questSummary(q: RpgQuest): string {
    const rewards = [...(q.rewardGold ? [`${q.rewardGold}G`] : []), ...q.rewardItems.map((r) => `${ITEMS[r.itemId]?.name ?? r.itemId}×${r.count}`)];
    return [QUEST_KIND_LABELS[q.kind] ?? q.kind, ...rewards].join('・');
  }

  // ===== NPC・家のモーダル(front#236) =====

  openModal(sel: Selection): void {
    this.selection.set(sel);
    if (sel.kind === 'npc') {
      this.questIndex.set(0);
      this.npcModal.set(sel.ref);
    } else if (sel.kind === 'house') {
      const h = sel.ref;
      this.houseDraft.set({
        shape: h.shape ?? '1x1', rotation: h.rotation ?? 0, roof: h.roof ?? DEFAULT_ROOF, lowRoof: !!h.lowRoof, wall: h.wall ?? DEFAULT_WALL, noWindow: !!h.noWindow
      });
      this.houseModal.set(h);
    }
    this.version.update((v) => v + 1);
  }

  closeModal(): void {
    this.npcModal.set(null);
    this.houseModal.set(null);
  }

  setHouseShape(shape: string): void {
    this.houseDraft.update((d) => ({ ...d, shape }));
  }

  rotateHouse(): void {
    this.houseDraft.update((d) => ({ ...d, rotation: (d.rotation + 1) % HOUSE_ROTATIONS }));
  }

  setRoof(roof: string): void {
    this.houseDraft.update((d) => ({ ...d, roof }));
  }

  setLowRoof(lowRoof: boolean): void {
    this.houseDraft.update((d) => ({ ...d, lowRoof }));
  }

  setWall(wall: string): void {
    this.houseDraft.update((d) => ({ ...d, wall }));
  }

  setNoWindow(noWindow: boolean): void {
    this.houseDraft.update((d) => ({ ...d, noWindow }));
  }

  // 家の下書きを決める(置けない形・向きのときは、ボタンを押せない)
  applyHouse(): void {
    const house = this.houseModal();
    const d = this.houseDraft();
    if (!house || !this.editor) return;
    this.editor.checkpoint();
    if (!this.editor.setHouse(house, d.shape, d.rotation, d.roof, d.lowRoof, d.wall, d.noWindow)) return;
    this.houseModal.set(null);
    this.markDirty();
  }

  /**
   * 家の見本の絵(SVG の多角形)。マップと同じ形の計算(rpg-house.ts)で、マスごとの壁(扉・窓) → 屋根を奥から並べる。
   * 屋根の色・高さ、壁の色、窓の有無は下書きのものを使う。withGround のときは、まわりの地面と扉の前の印も描く
   */
  housePolygons(shape: string, rotation: number, scale: number, withGround = false): { points: string; fill: string }[] {
    const { roof, lowRoof, wall: wallColor, noWindow } = this.houseDraft();
    const colors = wallColors(wallColor);
    const geo = houseGeometry(shape, rotation);
    const wall = 34;
    const top = wall + roofRise(geo.ridge, lowRoof);
    // 家の真ん中を (0, 0) にする
    const cx = geo.tiles.reduce((a, t) => a + t[0], 0) / geo.tiles.length;
    const cy = geo.tiles.reduce((a, t) => a + t[1], 0) / geo.tiles.length;
    const at = (x: number, y: number, z = 0) => {
      const [sx, sy] = iso(x - cx, y - cy);
      return `${(sx * scale).toFixed(1)},${((sy - z) * scale).toFixed(1)}`;
    };
    const tile = (x: number, y: number) => [at(x - 0.5, y - 0.5), at(x + 0.5, y - 0.5), at(x + 0.5, y + 0.5), at(x - 0.5, y + 0.5)].join(' ');
    const polys: { points: string; fill: string }[] = [];
    if (withGround) {
      for (let y = -1; y <= 2; y++) for (let x = -1; x <= 2; x++) polys.push({ points: tile(x, y), fill: (x + y) % 2 ? '#8fd16a' : '#88cb63' });
      const [dx, dy] = [geo.door.at[0] + geo.door.normal[0] * 0.5, geo.door.at[1] + geo.door.normal[1] * 0.5];
      polys.push({ points: tile(dx, dy), fill: 'rgba(124,195,238,0.8)' });
    }
    for (const piece of housePieces(geo)) {
      for (const w of piece.walls) {
        polys.push({ points: [at(...w.a), at(...w.b), at(...w.b, wall), at(...w.a, wall)].join(' '), fill: w.normal[1] === 1 ? colors.front : colors.side });
        for (const op of wallOpenings(w, geo.door, colors, noWindow)) {
          polys.push({ points: [at(...op.p1, op.z0), at(...op.p2, op.z0), at(...op.p2, op.z1), at(...op.p1, op.z1)].join(' '), fill: op.color });
        }
      }
      for (const f of piece.roof) {
        const k = f.normal[1] === 1 ? 1 : f.normal[0] === 1 ? 0.86 : f.normal[1] === -1 ? 0.78 : 0.82;
        polys.push({ points: f.points.map((p) => at(p.x, p.y, wall + p.z * (top - wall))).join(' '), fill: k === 1 ? roof : shade(roof, k) });
      }
    }
    return polys;
  }

  // ===== BGM =====

  // ダンジョンで流す曲を選ぶ(マップ作成の「ダンジョンの設定」と、BGMタブの「ダンジョンごとの曲」の両方から)
  setDungeonBgm(dungeon: RpgDungeon, bgmId: string): void {
    this.editDungeon(dungeon, { bgmId: bgmId || null });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) this.uploadBgm(file);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) this.uploadBgm(file);
  }

  private uploadBgm(file: File): void {
    this.bgmError.set('');
    if (file.size > RPG_BGM_MAX_BYTES) {
      this.bgmError.set('1曲 10MB までのファイルにしてください');
      return;
    }
    this.uploading.set(true);
    this.rpgService.uploadBgm(file, this.uploadName).subscribe({
      next: (bgm) => {
        this.uploading.set(false);
        this.uploadName = '';
        this.bgms.set([...this.bgms(), bgm]);
        this.toast(`「${bgm.name}」を登録しました`);
      },
      error: (err: Error) => {
        this.uploading.set(false);
        this.bgmError.set(err.message);
      }
    });
  }

  // 試聴。もう一度押すか、ほかの曲を試聴すると止める
  togglePreview(bgm: RpgBgm): void {
    const playing = this.previewId() === bgm.id;
    this.stopPreview();
    if (playing) return;
    const audio = new Audio(this.rpgService.bgmUrl(bgm));
    audio.volume = 0.6;
    audio.onended = () => this.stopPreview();
    void audio.play().catch(() => this.bgmError.set('この曲を再生できませんでした'));
    this.previewAudio = audio;
    this.previewId.set(bgm.id);
  }

  private stopPreview(): void {
    this.previewAudio?.pause();
    this.previewAudio = null;
    this.previewId.set(null);
  }

  startRename(bgm: RpgBgm): void {
    this.renameText = bgm.name;
    this.renamingId.set(bgm.id);
  }

  rename(bgm: RpgBgm): void {
    const name = this.renameText.trim();
    if (!name || name === bgm.name) {
      this.renamingId.set(null);
      return;
    }
    this.rpgService.renameBgm(bgm.id, name).subscribe({
      next: (renamed) => {
        this.bgms.set(this.bgms().map((b) => (b.id === renamed.id ? renamed : b)));
        this.renamingId.set(null);
      },
      error: (err: Error) => this.bgmError.set(err.message)
    });
  }

  deleteBgm(bgm: RpgBgm): void {
    const used = this.bgmUsage().get(bgm.id) ?? [];
    const message = used.length
      ? `「${bgm.name}」は ${used.join('・')} で使っています。消すと、そのダンジョンは曲なしになります。消しますか？`
      : `「${bgm.name}」を消しますか？`;
    if (!confirm(message)) return;
    if (this.previewId() === bgm.id) this.stopPreview();
    this.rpgService.deleteBgm(bgm.id).subscribe({
      next: () => {
        this.bgms.set(this.bgms().filter((b) => b.id !== bgm.id));
        // API側で、保存済みのダンジョンは曲なしになっている。画面の中のダンジョンも合わせる
        for (const d of this.dungeons()) if (d.bgmId === bgm.id) d.bgmId = null;
        this.refresh();
        this.toast(`「${bgm.name}」を消しました`);
      },
      error: (err: Error) => this.bgmError.set(err.message)
    });
  }

  formatSize(bytes: number): string {
    return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  }

  // ===== 新しいダンジョン・エリア、保存・テストプレイ =====

  // エリアの配置で、空いたマス(x, y)に新しいエリアを作る
  openNewArea(x: number, y: number): void {
    this.newArea = { name: '新しいエリア', width: 20, height: 20, gridX: x, gridY: y };
    this.newAreaOpen.set(true);
  }

  // 新しいエリアを、今のエリアのどちら側に作るか(ダイアログの説明)
  newAreaWhere(): string {
    const cur = this.current();
    if (!cur) return `「${this.currentDungeon()?.name ?? ''}」の最初のエリアを作ります。`;
    const side = [this.newArea.gridX - cur.gridX, this.newArea.gridY - cur.gridY] as const;
    return `「${cur.name}」の${sideLabel(side)}の端につながるエリアを作ります。`;
  }

  private clampSize(v: number): number {
    return Math.min(MAP_SIZE.max, Math.max(MAP_SIZE.min, Math.round(Number(v) || MAP_SIZE.min)));
  }

  // 新しいエリアはすぐに保存して、IDを決めてもらう(ほかのダンジョンのポータルの行き先に選べるように)
  createArea(): void {
    const a = this.newArea;
    const dungeonId = this.currentDungeonId();
    if (!dungeonId) return;
    const map = blankMap('', a.name.trim() || '新しいエリア', dungeonId, a.gridX, a.gridY, this.clampSize(a.width), this.clampSize(a.height));
    this.saving.set(true);
    this.rpgService.saveMap(toMapInput(map, null)).subscribe({
      next: (created) => {
        this.saving.set(false);
        this.newAreaOpen.set(false);
        this.maps.set([...this.maps(), cloneMap(created)]);
        this.selectArea(created.id);
        this.toast(`「${created.name}」を作りました。隣のエリアとは、向かい合う端でつながります`);
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.toast(err.message || 'エリアを作れませんでした');
      }
    });
  }

  openNewDungeon(): void {
    this.newDungeon = { name: '新しいダンジョン', theme: 'plain', recommendedLevel: 1, width: 20, height: 20 };
    this.newDungeonOpen.set(true);
  }

  // 新しいダンジョンと、その最初のエリア(位置 0, 0)をすぐに保存する
  createDungeon(): void {
    const d = this.newDungeon;
    const input = { id: null, name: d.name.trim() || '新しいダンジョン', theme: d.theme, recommendedLevel: Math.max(1, Number(d.recommendedLevel) || 1), bgmId: null };
    this.saving.set(true);
    this.rpgService.saveDungeon(input).subscribe({
      next: (dungeon) => {
        this.dungeons.set([...this.dungeons(), { ...dungeon }]);
        this.currentDungeonId.set(dungeon.id);
        this.newArea = { name: '入口', width: d.width, height: d.height, gridX: 0, gridY: 0 };
        this.newDungeonOpen.set(false);
        this.createArea();
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.toast(err.message || 'ダンジョンを作れませんでした');
      }
    });
  }

  // 変更のあったダンジョン・エリアを順番に保存する
  save(): void {
    const dungeonIds = [...this.dirtyDungeonIds()];
    const ids = [...this.dirtyIds()];
    const dungeons = this.dungeons().filter((d) => dungeonIds.includes(d.id));
    const targets = this.maps().filter((m) => ids.includes(m.id));
    if ((!targets.length && !dungeons.length) || this.saving()) return;
    this.saving.set(true);
    concat(
      ...dungeons.map((d) =>
        this.rpgService.saveDungeon({ id: d.id, name: d.name, recommendedLevel: d.recommendedLevel, theme: d.theme, bgmId: d.bgmId ?? null })
      ),
      ...targets.map((m) => this.rpgService.saveMap(toMapInput(m)))
    )
      .pipe(toArray())
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.dirtyIds.set(new Set());
          this.dirtyDungeonIds.set(new Set());
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
    const area = game.map;
    ctx.save();
    ctx.translate(game.camX, game.camY);
    ctx.scale(game.zoom, game.zoom);
    // マスの上の面の中心(高いマスは、その高さの分だけ上)
    const top = (x: number, y: number): [number, number] => {
      const [cx, cy] = iso(x, y);
      return [cx, cy - area.heightAt(x, y) * HZ];
    };
    const diamond = (x: number, y: number, s = 1) => {
      const [cx, cy] = top(x, y);
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

    // 通れない段差(となりとの差が2段以上)のふちに赤い線
    if (this.showCliffs() && area.hasHeights) {
      ctx.strokeStyle = 'rgba(220,38,38,0.85)';
      ctx.lineWidth = 2.5;
      for (let y = 0; y < map.height; y++) {
        for (let x = 0; x < map.width; x++) {
          const [cx, cy] = top(x, y);
          const L: [number, number] = [cx - TW / 2, cy];
          const R: [number, number] = [cx + TW / 2, cy];
          const T: [number, number] = [cx, cy - TH / 2];
          const B: [number, number] = [cx, cy + TH / 2];
          const edges: [number, number, [number, number], [number, number]][] = [[x, y + 1, L, B], [x + 1, y, B, R], [x, y - 1, T, R], [x - 1, y, L, T]];
          for (const [nx, ny, a, b] of edges) {
            if (!area.inMap(nx, ny) || area.canStep(x, y, nx, ny)) continue;
            ctx.beginPath();
            ctx.moveTo(...a);
            ctx.lineTo(...b);
            ctx.stroke();
          }
        }
      }
    }

    if (this.showHeights()) {
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(17,24,39,0.75)';
      for (let y = 0; y < map.height; y++) {
        for (let x = 0; x < map.width; x++) {
          if (editor.groundAt(x, y) !== 'v') ctx.fillText(String(area.heightAt(x, y)), ...top(x, y));
        }
      }
    }

    // 出発地点
    diamond(map.startX, map.startY, 0.8);
    ctx.fillStyle = 'rgba(34,181,115,0.45)';
    ctx.fill();
    const [fx, fy] = top(map.startX, map.startY);
    this.label(ctx, '🚩 出発地点', fx - TW * 0.3, fy + TH * 0.3, 'rgba(34,181,115,0.92)');

    // 隣のエリアへつながる端に、隣のエリアの名前(端の真ん中の外側)
    for (const { side, area: next } of this.neighbors(map)) {
      const [dx, dy] = side;
      const ex = dx === 1 ? map.width : dx === -1 ? -1 : (map.width - 1) / 2;
      const ey = dy === 1 ? map.height : dy === -1 ? -1 : (map.height - 1) / 2;
      const [lx, ly] = iso(ex, ey);
      this.label(ctx, `▶ ${next.name}`, lx, ly, 'rgba(8,145,178,0.92)');
    }

    // 行き先が決まっていないポータル
    for (const p of map.portals) {
      if (this.maps().some((m) => m.id === p.to)) continue;
      const [sx, sy] = top(p.x, p.y);
      this.label(ctx, '▶ 行き先が未設定', sx, sy - 48, 'rgba(245,158,11,0.95)');
    }

    // 選んでいるもの
    const sel = this.selection();
    if (sel) {
      ctx.strokeStyle = '#6076e0';
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 4]);
      // 家は占めるマスすべてに印を付ける
      const tiles = sel.kind === 'house' ? objectTiles(sel.ref) : [[sel.ref.x, sel.ref.y]];
      for (const [tx, ty] of tiles) {
        diamond(tx, ty, 1.05);
        ctx.stroke();
      }
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
