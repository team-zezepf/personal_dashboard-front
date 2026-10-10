import { RpgMap, RpgMapEnemy, RpgMapInput, RpgMapNpc, RpgMapPortal, RpgNpcRole } from '../models/rpg.models';
import { ENEMIES, StaticType } from './rpg-data';

// RPGのマップ作成画面(front#217)の編集の中身。画面(コンポーネント)から切り離して、テストできるようにしておく

export type EditorTool =
  | { kind: 'ground'; ground: string }
  | { kind: 'object'; type: StaticType; roof?: string; torch?: boolean }
  | { kind: 'enemy'; type: string }
  | { kind: 'npc' }
  | { kind: 'portal' }
  | { kind: 'select' }
  | { kind: 'start' }
  | { kind: 'erase' };

export interface PaletteItem {
  id: string;
  label: string;
  tool: EditorTool;
  icon?: string;
}

export interface PaletteTab {
  id: string;
  label: string;
  hint: string;
  items: PaletteItem[];
}

export const PALETTE: PaletteTab[] = [
  {
    id: 'ground', label: '地面', hint: '地面の種類を選んで、マップを塗ります。「なし」にすると、空に浮かぶ島のような形にできます。',
    items: [
      { id: 'g', label: '草', tool: { kind: 'ground', ground: 'g' } },
      { id: 'f', label: '花', tool: { kind: 'ground', ground: 'f' } },
      { id: 'p', label: '道', tool: { kind: 'ground', ground: 'p' } },
      { id: 's', label: '砂・ふち', tool: { kind: 'ground', ground: 's' } },
      // 呼び名は見た目(テーマ)で変わる(水・泉・溶岩・闇)
      { id: 'w', label: '水', tool: { kind: 'ground', ground: 'w' } },
      { id: 'b', label: '橋', tool: { kind: 'ground', ground: 'b' } },
      { id: 'v', label: 'なし', tool: { kind: 'ground', ground: 'v' } }
    ]
  },
  {
    id: 'object', label: '置物', hint: '木・岩・家などを置きます。置物のマスは通れません。',
    items: [
      { id: 'tree', label: '木', icon: '🌳', tool: { kind: 'object', type: 'tree' } },
      { id: 'rock', label: '岩', icon: '🪨', tool: { kind: 'object', type: 'rock' } },
      { id: 'house-red', label: '家（赤）', icon: '🏠', tool: { kind: 'object', type: 'house', roof: '#e0605a' } },
      { id: 'house-blue', label: '家（青）', icon: '🏠', tool: { kind: 'object', type: 'house', roof: '#5b8def' } },
      { id: 'house-green', label: '家（緑）', icon: '🏠', tool: { kind: 'object', type: 'house', roof: '#45b36b' } },
      { id: 'house-orange', label: '家（橙）', icon: '🏠', tool: { kind: 'object', type: 'house', roof: '#f2a33a' } },
      { id: 'cliff', label: '崖', icon: '⛰️', tool: { kind: 'object', type: 'cliff' } },
      { id: 'fern', label: 'シダ', icon: '🌿', tool: { kind: 'object', type: 'fern' } },
      { id: 'crystal', label: '水晶', icon: '💎', tool: { kind: 'object', type: 'crystal' } },
      { id: 'pillar', label: '柱', icon: '🏛️', tool: { kind: 'object', type: 'pillar' } },
      { id: 'torch', label: 'たいまつ柱', icon: '🔥', tool: { kind: 'object', type: 'pillar', torch: true } },
      { id: 'volcano', label: '火山', icon: '🌋', tool: { kind: 'object', type: 'volcano' } }
    ]
  },
  {
    id: 'enemy', label: '敵', hint: '敵が出てくる場所を置きます。敵はこの場所のまわりを歩き回ります。',
    items: Object.entries(ENEMIES).map(([type, e]) => ({ id: type, label: e.name, tool: { kind: 'enemy', type } as EditorTool }))
  },
  {
    id: 'npc', label: '人', hint: '村人を置きます。置いたあと、右側で名前・役割・セリフを決めます。',
    items: [{ id: 'npc', label: '村人を置く', icon: '🧑', tool: { kind: 'npc' } }]
  },
  {
    id: 'portal', label: 'ポータル', hint: 'ほかのエリアへ移動する光る場所を置きます。右側で行き先を決めます。',
    items: [{ id: 'portal', label: 'ポータルを置く', icon: '🌀', tool: { kind: 'portal' } }]
  },
  {
    id: 'other', label: 'その他', hint: '「選ぶ・動かす」で、置いた村人・ポータル・敵をクリックして選び、ドラッグで動かせます。',
    items: [
      { id: 'select', label: '選ぶ・動かす', icon: '👆', tool: { kind: 'select' } },
      { id: 'start', label: '出発地点', icon: '🚩', tool: { kind: 'start' } },
      { id: 'erase', label: '消しゴム', icon: '🧽', tool: { kind: 'erase' } }
    ]
  }
];

export const NPC_ROLES: Record<RpgNpcRole, string> = { talk: '話すだけ', shop: '道具屋', exchange: 'ポイント交換所' };
export const HAIR_COLORS = ['#6b3f1f', '#8b5a2b', '#e5e7eb', '#fcd34d', '#374151', '#a7f3d0', '#f472b6'];
export const BODY_COLORS = ['#3b82f6', '#4b9e5f', '#f08a4b', '#8b5cf6', '#10b981', '#ef4444', '#64748b'];
export const MAP_SIZE = { min: 12, max: 40 };

export type Selection =
  | { kind: 'npc'; ref: RpgMapNpc }
  | { kind: 'portal'; ref: RpgMapPortal }
  | { kind: 'enemy'; ref: RpgMapEnemy };

export interface MapCheck {
  ok: boolean;
  text: string;
}

const MAX_UNDO = 50;
const BLOCKED_GROUND = ['w', 'v'];

export function blankMap(id: string, name: string, theme: string, width: number, height: number, recommendedLevel: number): RpgMap {
  return {
    id, name, recommendedLevel, theme, width, height,
    ground: Array.from({ length: height }, () => 'g'.repeat(width)),
    objects: [], npcs: [], enemies: [], portals: [],
    startX: Math.floor(width / 2), startY: Math.floor(height / 2), sortOrder: 0
  };
}

export function toMapInput(map: RpgMap, id: string | null = map.id): RpgMapInput {
  return {
    id, name: map.name, recommendedLevel: map.recommendedLevel, theme: map.theme, width: map.width, height: map.height,
    ground: map.ground,
    objects: map.objects.map((o) => ({ type: o.type, x: o.x, y: o.y, roof: o.roof ?? null, torch: o.torch })),
    npcs: map.npcs.map((n) => ({ ...n, lines: n.lines.map((l) => l.trim()).filter((l) => l) })),
    enemies: map.enemies.map((e) => ({ ...e })),
    portals: map.portals.map((p) => ({ ...p })),
    startX: map.startX, startY: map.startY
  };
}

const clone = (map: RpgMap): RpgMap => JSON.parse(JSON.stringify(map));

/** 1エリア分の編集。map は画面に出しているマップのデータそのもの(書き換えるとすぐ画面に出る) */
export class RpgMapEditor {
  private undoStack: string[] = [];
  private redoStack: string[] = [];

  constructor(public map: RpgMap) {}

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /** 変える直前に呼ぶ(元に戻すときは、ここに戻る) */
  checkpoint(): void {
    this.undoStack.push(JSON.stringify(this.map));
    if (this.undoStack.length > MAX_UNDO) this.undoStack.shift();
    this.redoStack = [];
  }

  undo(): boolean {
    const prev = this.undoStack.pop();
    if (!prev) return false;
    this.redoStack.push(JSON.stringify(this.map));
    Object.assign(this.map, JSON.parse(prev));
    return true;
  }

  redo(): boolean {
    const next = this.redoStack.pop();
    if (!next) return false;
    this.undoStack.push(JSON.stringify(this.map));
    Object.assign(this.map, JSON.parse(next));
    return true;
  }

  // ===== マス =====

  inMap(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.map.width && y < this.map.height;
  }

  groundAt(x: number, y: number): string {
    return this.map.ground[y]?.[x] ?? 'g';
  }

  private setGround(x: number, y: number, ground: string): void {
    const row = this.map.ground[y];
    this.map.ground[y] = row.slice(0, x) + ground + row.slice(x + 1);
  }

  // 水・なしでない地面(人・敵・ポータル・出発地点を置ける)
  walkableGround(x: number, y: number): boolean {
    return this.inMap(x, y) && !BLOCKED_GROUND.includes(this.groundAt(x, y));
  }

  occupied(x: number, y: number): 'object' | 'npc' | 'enemy' | 'portal' | null {
    const at = (o: { x: number; y: number }) => o.x === x && o.y === y;
    if (this.map.objects.some(at)) return 'object';
    if (this.map.npcs.some(at)) return 'npc';
    if (this.map.enemies.some(at)) return 'enemy';
    if (this.map.portals.some(at)) return 'portal';
    return null;
  }

  entityAt(x: number, y: number): Selection | null {
    const at = (o: { x: number; y: number }) => o.x === x && o.y === y;
    const npc = this.map.npcs.find(at);
    if (npc) return { kind: 'npc', ref: npc };
    const portal = this.map.portals.find(at);
    if (portal) return { kind: 'portal', ref: portal };
    const enemy = this.map.enemies.find(at);
    if (enemy) return { kind: 'enemy', ref: enemy };
    return null;
  }

  /** そのマスに置いたものを消す。消したものがあれば true */
  removeAt(x: number, y: number): boolean {
    const keep = (o: { x: number; y: number }) => o.x !== x || o.y !== y;
    const before = this.countAll();
    this.map.objects = this.map.objects.filter(keep);
    this.map.npcs = this.map.npcs.filter(keep);
    this.map.enemies = this.map.enemies.filter(keep);
    this.map.portals = this.map.portals.filter(keep);
    return before !== this.countAll();
  }

  private countAll(): number {
    return this.map.objects.length + this.map.npcs.length + this.map.enemies.length + this.map.portals.length;
  }

  /** 筆で塗るマス(地面の 3×3 のときは、まわりも) */
  brushTiles(tool: EditorTool, x: number, y: number, brush: number): [number, number][] {
    if (tool.kind !== 'ground' || brush === 1) return [[x, y]];
    const tiles: [number, number][] = [];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (this.inMap(x + dx, y + dy)) tiles.push([x + dx, y + dy]);
    return tiles;
  }

  /**
   * クリック・ドラッグしたマスに道具を使う。first はドラッグの最初のマス(村人・ポータルは最初の1回だけ置く)。
   * 村人・ポータルを置いたときは、置いたものを返す(右側で中身を決めるため選んだ状態にする)
   */
  apply(tool: EditorTool, x: number, y: number, first: boolean, brush = 1): Selection | null {
    if (!this.inMap(x, y)) return null;
    const canPlace = this.walkableGround(x, y) && !this.occupied(x, y);
    switch (tool.kind) {
      case 'ground':
        for (const [tx, ty] of this.brushTiles(tool, x, y, brush)) {
          this.setGround(tx, ty, tool.ground);
          // 水・なしの上には何も置けないので消す
          if (BLOCKED_GROUND.includes(tool.ground)) this.removeAt(tx, ty);
        }
        return null;
      case 'object':
        if (!this.walkableGround(x, y)) return null;
        this.removeAt(x, y);
        this.map.objects.push({ type: tool.type, x, y, roof: tool.roof ?? null, torch: !!tool.torch });
        return null;
      case 'enemy':
        if (canPlace) this.map.enemies.push({ type: tool.type, x, y });
        return null;
      case 'npc': {
        if (!first || !canPlace) return null;
        const n = this.map.npcs.length;
        const npc: RpgMapNpc = {
          name: `村人${n + 1}`, x, y, hair: HAIR_COLORS[n % HAIR_COLORS.length], body: BODY_COLORS[n % BODY_COLORS.length],
          role: 'talk', notice: false, lines: ['こんにちは！']
        };
        this.map.npcs.push(npc);
        return { kind: 'npc', ref: npc };
      }
      case 'portal': {
        if (!first || !canPlace) return null;
        const portal: RpgMapPortal = { x, y, to: null, toX: 0, toY: 0 };
        // ポータルは道の上に光る
        this.setGround(x, y, 'p');
        this.map.portals.push(portal);
        return { kind: 'portal', ref: portal };
      }
      case 'start':
        if (canPlace) {
          this.map.startX = x;
          this.map.startY = y;
        }
        return null;
      case 'erase':
        this.removeAt(x, y);
        return null;
      case 'select':
        return null;
    }
  }

  /** 選んだもの(村人・ポータル・敵)を動かす。置けないマスなら動かさない */
  moveTo(selection: Selection, x: number, y: number): boolean {
    if (!this.walkableGround(x, y) || this.occupied(x, y)) return false;
    selection.ref.x = x;
    selection.ref.y = y;
    if (selection.kind === 'portal') this.setGround(x, y, 'p');
    return true;
  }

  /** 広さを変える。広げたところは草、はみ出したものは消す */
  resize(width: number, height: number): void {
    const w = Math.min(MAP_SIZE.max, Math.max(MAP_SIZE.min, Math.round(width)));
    const h = Math.min(MAP_SIZE.max, Math.max(MAP_SIZE.min, Math.round(height)));
    this.map.ground = Array.from({ length: h }, (_, y) => {
      const row = (this.map.ground[y] ?? '').slice(0, w);
      return row + 'g'.repeat(w - row.length);
    });
    this.map.width = w;
    this.map.height = h;
    const inside = (o: { x: number; y: number }) => o.x < w && o.y < h;
    this.map.objects = this.map.objects.filter(inside);
    this.map.npcs = this.map.npcs.filter(inside);
    this.map.enemies = this.map.enemies.filter(inside);
    this.map.portals = this.map.portals.filter(inside);
    if (!this.inMap(this.map.startX, this.map.startY)) {
      this.map.startX = Math.floor(w / 2);
      this.map.startY = Math.floor(h / 2);
    }
  }

  /** 保存する前の確認。問題があっても保存はできるが、ゲームで困るものを知らせる */
  checks(maps: RpgMap[]): MapCheck[] {
    const m = this.map;
    const checks: MapCheck[] = [];
    const startOk = this.walkableGround(m.startX, m.startY) && !this.occupied(m.startX, m.startY);
    checks.push({ ok: startOk, text: startOk ? '出発地点が通れるマスにある' : '出発地点が通れないマスにあります' });

    const noDest = m.portals.filter((p) => !maps.some((a) => a.id === p.to));
    checks.push({
      ok: noDest.length === 0,
      text: noDest.length ? `行き先が決まっていないポータルが ${noDest.length} 個あります` : 'ポータルの行き先がすべて決まっている'
    });

    const badArrival = m.portals.filter((p) => {
      const dest = maps.find((a) => a.id === p.to);
      if (!dest) return false;
      const ground = dest.ground[p.toY]?.[p.toX];
      const blocked = dest.objects.some((o) => o.x === p.toX && o.y === p.toY) || dest.npcs.some((o) => o.x === p.toX && o.y === p.toY);
      return ground === undefined || BLOCKED_GROUND.includes(ground) || blocked;
    });
    checks.push({
      ok: badArrival.length === 0,
      text: badArrival.length ? `着く位置が通れないマスのポータルが ${badArrival.length} 個あります` : 'ポータルの着く位置が通れるマスにある'
    });

    const emptyNpc = m.npcs.filter((n) => !n.name.trim() || !n.lines.some((l) => l.trim()));
    checks.push({
      ok: emptyNpc.length === 0,
      text: emptyNpc.length ? `名前かセリフが空の村人が ${emptyNpc.length} 人います` : '村人の名前とセリフが入っている'
    });

    const reachable = m.id === 'plain' || maps.some((a) => a.id !== m.id && a.portals.some((p) => p.to === m.id));
    checks.push({
      ok: reachable,
      text: reachable ? 'ほかのエリアから来られる' : 'まだどのエリアからも来られません（ほかのエリアに、このエリアへのポータルを置いてください）'
    });
    return checks;
  }
}

export { clone as cloneMap };
