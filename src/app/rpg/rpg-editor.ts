import { RpgMap, RpgMapEnemy, RpgMapInput, RpgMapNpc, RpgMapObject, RpgNpcRole, RpgQuest } from '../models/rpg.models';
import { DEFAULT_ROOF, DEFAULT_WALL, houseTiles, objectTiles } from './rpg-house';
import { ENEMIES, MAX_HEIGHT, SIDES, StaticType, exitOf, isBreakable, neighborOf, sideLabel } from './rpg-data';
import { CLOTHES_COLORS, HAIR_COLORS, lookFromColors } from './rpg-look';

// RPGのマップ作成画面(front#217)の編集の中身。画面(コンポーネント)から切り離して、テストできるようにしておく

export type EditorTool =
  | { kind: 'ground'; ground: string }
  // 地面の高さ(front#225)。up・down は1段ずつ、set は決まった高さにする
  | { kind: 'height'; op: 'up' | 'down' | 'set'; value?: number }
  | { kind: 'object'; type: StaticType; roof?: string; torch?: boolean }
  | { kind: 'enemy'; type: string }
  | { kind: 'npc' }
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
      { id: 't', label: 'タイル', tool: { kind: 'ground', ground: 't' } },
      { id: 'r', label: 'レンガ', tool: { kind: 'ground', ground: 'r' } },
      // 呼び名は見た目(テーマ)で変わる(水・泉・溶岩・闇)
      { id: 'w', label: '水', tool: { kind: 'ground', ground: 'w' } },
      { id: 'b', label: '橋', tool: { kind: 'ground', ground: 'b' } },
      { id: 'v', label: 'なし', tool: { kind: 'ground', ground: 'v' } }
    ]
  },
  {
    id: 'height', label: '高さ',
    hint: 'クリック・ドラッグしたマスの高さを変えます（0〜3段）。となりとの差が1段までなら登り降りでき、2段以上は崖になって通れません。',
    items: [
      { id: 'up', label: '高くする', icon: '⬆️', tool: { kind: 'height', op: 'up' } },
      { id: 'down', label: '低くする', icon: '⬇️', tool: { kind: 'height', op: 'down' } },
      { id: 'h0', label: '0段にする', icon: '▭', tool: { kind: 'height', op: 'set', value: 0 } },
      { id: 'h2', label: '2段にする', icon: '▤', tool: { kind: 'height', op: 'set', value: 2 } }
    ]
  },
  {
    id: 'object', label: '置物', hint: '木・岩・家などを置きます。置物のマスは通れません。家は置いたあと、形・向き・屋根の色を選べます。置いてある物をクリックすると選べます。',
    items: [
      { id: 'tree', label: '木', icon: '🌳', tool: { kind: 'object', type: 'tree' } },
      { id: 'rock', label: '岩', icon: '🪨', tool: { kind: 'object', type: 'rock' } },
      // 形・向き・屋根の色は、置いたあとにモーダルで選ぶ(front#236)
      { id: 'house', label: '家', icon: '🏠', tool: { kind: 'object', type: 'house' } },
      { id: 'cliff', label: '崖', icon: '⛰️', tool: { kind: 'object', type: 'cliff' } },
      // 石積みの高い壁(front#268)。部屋の奥側の端に並べて、建物の中のように見せる
      { id: 'wall', label: '壁', icon: '🧱', tool: { kind: 'object', type: 'wall' } },
      { id: 'fern', label: 'シダ', icon: '🌿', tool: { kind: 'object', type: 'fern' } },
      { id: 'crystal', label: '水晶', icon: '💎', tool: { kind: 'object', type: 'crystal' } },
      // 草むら・シダ・水晶・岩は攻撃で壊れ、置いたあとに中身(アイテム・敵)を選べる(front#264)
      { id: 'grass', label: '草むら', icon: '🌾', tool: { kind: 'object', type: 'grass' } },
      // 宝箱・甲冑も壊れる置物(front#266)。甲冑は斜め右正面を向く
      { id: 'chest', label: '宝箱', icon: '🧰', tool: { kind: 'object', type: 'chest' } },
      { id: 'armor', label: '甲冑', icon: '🛡️', tool: { kind: 'object', type: 'armor' } },
      // たる・つぼ・骨の山も壊れる置物(front#270)
      { id: 'barrel', label: 'たる', icon: '🛢️', tool: { kind: 'object', type: 'barrel' } },
      { id: 'pot', label: 'つぼ', icon: '🏺', tool: { kind: 'object', type: 'pot' } },
      { id: 'bones', label: '骨の山', icon: '🦴', tool: { kind: 'object', type: 'bones' } },
      // 壊れない飾り(front#270)。本棚は壁ぎわに置くと部屋の内側を向く
      { id: 'bookshelf', label: '本棚', icon: '📚', tool: { kind: 'object', type: 'bookshelf' } },
      { id: 'candle', label: '燭台', icon: '🕯️', tool: { kind: 'object', type: 'candle' } },
      { id: 'grave', label: '墓石', icon: '🪦', tool: { kind: 'object', type: 'grave' } },
      // 牢獄の置物(front#321)。鉄格子は壁と同じく通れず、向こうが透けて見える。続けて置くと1本の柵になる。木のおけは壊れる置物
      { id: 'bars', label: '鉄格子', icon: '▥', tool: { kind: 'object', type: 'bars' } },
      { id: 'shackle', label: '鎖の杭', icon: '⛓️', tool: { kind: 'object', type: 'shackle' } },
      { id: 'bucket', label: '木のおけ', icon: '🧺', tool: { kind: 'object', type: 'bucket' } },
      // 看板(front#274)。いちばん近い「ほかのダンジョンへの端」を指し、行き先のダンジョンの名前を出す
      { id: 'sign', label: '看板', icon: '➡️', tool: { kind: 'object', type: 'sign' } },
      { id: 'pillar', label: '柱', icon: '🏛️', tool: { kind: 'object', type: 'pillar' } },
      { id: 'torch', label: 'たいまつ柱', icon: '🔥', tool: { kind: 'object', type: 'pillar', torch: true } },
      { id: 'volcano', label: '火山', icon: '🌋', tool: { kind: 'object', type: 'volcano' } }
    ]
  },
  {
    id: 'enemy', label: '敵', hint: '空いているマスをクリックすると、敵が出てくる場所を1つ置きます。敵はこの場所のまわりを歩き回ります。敵の見た目・強さは「👾 敵」タブで作れます。',
    // 敵の種類は「敵」タブ(front#229)で増やせるため、読むたびに今の種類から作る
    get items(): PaletteItem[] {
      return Object.entries(ENEMIES).map(([type, e]) => ({ id: type, label: e.name, tool: { kind: 'enemy', type } as EditorTool }));
    }
  },
  {
    id: 'npc', label: 'NPC', hint: 'NPCを置きます。置いたあと、名前・役割・セリフ・見た目を決めます。',
    items: [{ id: 'npc', label: 'NPCを置く', icon: '🧑', tool: { kind: 'npc' } }]
  },
  {
    id: 'other', label: 'その他', hint: '「選ぶ・動かす」では何も置かず、置いてある物を選んで動かします。ほかの道具を選んでいるときに、その道具をもう一度押しても「選ぶ・動かす」に戻ります。',
    items: [
      { id: 'select', label: '選ぶ・動かす', icon: '👆', tool: { kind: 'select' } },
      { id: 'start', label: '出発地点', icon: '🚩', tool: { kind: 'start' } },
      { id: 'erase', label: '消しゴム', icon: '🧽', tool: { kind: 'erase' } }
    ]
  }
];

export const SELECT_ITEM = PALETTE.find((t) => t.id === 'other')!.items[0];

/** 置いてある物をクリックしたとき、その物を選ぶ道具か(地面・高さ・消しゴムは、物の上でも塗る・消す)(front#290) */
/** その道具で置いた物が、マップにいくつあるか(地面はマスの数。たいまつ柱と柱は分ける)。地面・置物・敵のほかは0 */
export function countInMap(map: Pick<RpgMap, 'ground' | 'objects' | 'enemies'>, tool: EditorTool): number {
  switch (tool.kind) {
    case 'ground':
      return map.ground.reduce((n, row) => n + row.split(tool.ground).length - 1, 0);
    case 'object':
      return map.objects.filter((o) => o.type === tool.type && !!o.torch === !!tool.torch).length;
    case 'enemy':
      return map.enemies.filter((e) => e.type === tool.type).length;
    default:
      return 0;
  }
}

/**
 * パレットの3つの段(front#323)。
 * area: 開いているエリアで使っている物(多い順)、dungeon: 同じダンジョンのほかのエリア(others)で使っていて area に入らない物(合計の多い順)、
 * other: どちらでも使っていない物(いつもの順)
 */
export function paletteGroups(
  items: readonly PaletteItem[],
  area: Pick<RpgMap, 'ground' | 'objects' | 'enemies'>,
  others: readonly Pick<RpgMap, 'ground' | 'objects' | 'enemies'>[]
): { area: PaletteItem[]; dungeon: PaletteItem[]; other: PaletteItem[] } {
  const used = (count: (item: PaletteItem) => number, from: readonly PaletteItem[]) =>
    from
      .map((item) => ({ item, n: count(item) }))
      .filter((u) => u.n > 0)
      .sort((a, b) => b.n - a.n)
      .map((u) => u.item);
  const inArea = used((item) => countInMap(area, item.tool), items);
  const rest = items.filter((item) => !inArea.includes(item));
  const inDungeon = used((item) => others.reduce((n, m) => n + countInMap(m, item.tool), 0), rest);
  return { area: inArea, dungeon: inDungeon, other: rest.filter((item) => !inDungeon.includes(item)) };
}

export function selectsPlaced(tool: EditorTool): boolean {
  return tool.kind !== 'ground' && tool.kind !== 'height' && tool.kind !== 'erase';
}

export const NPC_ROLES: Record<RpgNpcRole, string> = { talk: '話すだけ', shop: '道具屋', exchange: 'ポイント交換所', quest: 'クエスト依頼', smith: '鍛冶屋' };

/** 新しいクエスト(front#239)。最初は、いちばん最初の敵を3体たおすクエスト */
export function blankQuest(): RpgQuest {
  const enemy = Object.keys(ENEMIES)[0] ?? 'slime';
  return {
    id: null, title: '新しいクエスト', kind: 'defeat', target: enemy, targetArea: null, count: 3,
    offerLines: [`${ENEMIES[enemy]?.name ?? '敵'}を3体たおしてきてくれないか？`], progressLines: ['たのんだぞ。'], doneLines: ['ありがとう！ これはお礼だ。'],
    rewardGold: 50, rewardItems: []
  };
}
export const MAP_SIZE = { min: 12, max: 50 };

export type Selection =
  | { kind: 'npc'; ref: RpgMapNpc }
  | { kind: 'house'; ref: RpgMapObject }
  | { kind: 'enemy'; ref: RpgMapEnemy }
  // 壊れる置物(front#264)。中身を選べる
  | { kind: 'breakable'; ref: RpgMapObject }
  // そのほかの置物(木・岩など)。選んで動かす・消すだけ(front#290)
  | { kind: 'object'; ref: RpgMapObject };

export interface MapCheck {
  ok: boolean;
  text: string;
}

const MAX_UNDO = 50;
const BLOCKED_GROUND = ['w', 'v'];

/** 一面が草のエリア。dungeonId のダンジョンの、位置(gridX, gridY)に置く */
export function blankMap(id: string, name: string, dungeonId: string, gridX: number, gridY: number, width: number, height: number): RpgMap {
  return {
    id, name, dungeonId, gridX, gridY, width, height,
    ground: Array.from({ length: height }, () => 'g'.repeat(width)),
    heights: flatHeights(width, height),
    objects: [], npcs: [], enemies: [], links: [],
    startX: Math.floor(width / 2), startY: Math.floor(height / 2), sortOrder: 0
  };
}

// すべて0段の高さ
export function flatHeights(width: number, height: number): string[] {
  return Array.from({ length: height }, () => '0'.repeat(width));
}

export function toMapInput(map: RpgMap, id: string | null = map.id): RpgMapInput {
  return {
    id, name: map.name, dungeonId: map.dungeonId, gridX: map.gridX, gridY: map.gridY, width: map.width, height: map.height,
    ground: map.ground,
    heights: map.heights ?? flatHeights(map.width, map.height),
    objects: map.objects.map((o) => ({
      type: o.type, x: o.x, y: o.y, roof: o.roof ?? null, torch: o.torch,
      shape: o.type === 'house' ? (o.shape ?? null) : null, rotation: o.type === 'house' ? (o.rotation ?? null) : null,
      lowRoof: o.type === 'house' ? (o.lowRoof ?? null) : null,
      wall: o.type === 'house' ? (o.wall ?? null) : null, noWindow: o.type === 'house' ? (o.noWindow ?? null) : null,
      contents: isBreakable(o.type) && o.contents ? { kind: o.contents.kind, id: o.contents.id, count: o.contents.count, chance: o.contents.chance ?? 1 } : null,
      // 看板の文章(front#314)。前後の空白・空の行は API が捨てる
      lines: o.type === 'sign' ? (o.lines ?? []) : null
    })),
    npcs: map.npcs.map((n) => ({
      ...n,
      lines: n.lines.map((l) => l.trim()).filter((l) => l),
      // クエストはクエスト依頼だけが持つ(front#239)
      quests: n.role === 'quest' ? (n.quests ?? []).map((q) => ({ ...q, rewardItems: q.rewardItems.map((r) => ({ itemId: r.itemId, count: r.count })) })) : []
    })),
    enemies: map.enemies.map((e) => ({ ...e })),
    links: (map.links ?? []).map((l) => ({ dx: l.dx, dy: l.dy, to: l.to })),
    startX: map.startX, startY: map.startY,
    bgmId: map.bgmId ?? null
  };
}

const clone = (map: RpgMap): RpgMap => JSON.parse(JSON.stringify(map));

/** 1エリア分の編集。map は画面に出しているマップのデータそのもの(書き換えるとすぐ画面に出る) */
export class RpgMapEditor {
  private undoStack: string[] = [];
  // 1回のドラッグで高さを変えたマス
  private readonly heightPainted = new Set<number>();
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

  heightAt(x: number, y: number): number {
    return Number(this.map.heights?.[y]?.[x] ?? 0) || 0;
  }

  private setHeight(x: number, y: number, value: number): void {
    if (!this.map.heights) this.map.heights = flatHeights(this.map.width, this.map.height);
    const row = this.map.heights[y];
    this.map.heights[y] = row.slice(0, x) + String(Math.min(MAX_HEIGHT, Math.max(0, value))) + row.slice(x + 1);
  }

  private setGround(x: number, y: number, ground: string): void {
    const row = this.map.ground[y];
    this.map.ground[y] = row.slice(0, x) + ground + row.slice(x + 1);
  }

  // 水・なしでない地面(人・敵・出発地点を置ける)
  walkableGround(x: number, y: number): boolean {
    return this.inMap(x, y) && !BLOCKED_GROUND.includes(this.groundAt(x, y));
  }

  occupied(x: number, y: number): 'object' | 'npc' | 'enemy' | null {
    const at = (o: { x: number; y: number }) => o.x === x && o.y === y;
    if (this.objectAt(x, y)) return 'object';
    if (this.map.npcs.some(at)) return 'npc';
    if (this.map.enemies.some(at)) return 'enemy';
    return null;
  }

  // そのマスを占める置物(家は占めるマスのどれか)
  objectAt(x: number, y: number, except?: RpgMapObject): RpgMapObject | undefined {
    return this.map.objects.find((o) => o !== except && objectTiles(o).some(([tx, ty]) => tx === x && ty === y));
  }

  entityAt(x: number, y: number): Selection | null {
    const at = (o: { x: number; y: number }) => o.x === x && o.y === y;
    const npc = this.map.npcs.find(at);
    if (npc) return { kind: 'npc', ref: npc };
    const enemy = this.map.enemies.find(at);
    if (enemy) return { kind: 'enemy', ref: enemy };
    const house = this.objectAt(x, y);
    if (house?.type === 'house') return { kind: 'house', ref: house };
    if (house && isBreakable(house.type)) return { kind: 'breakable', ref: house };
    if (house) return { kind: 'object', ref: house };
    return null;
  }

  /** そのマスに置いたものを消す(家は、占めるマスのどれかなら家ごと)。消したものがあれば true */
  removeAt(x: number, y: number): boolean {
    const keep = (o: { x: number; y: number }) => o.x !== x || o.y !== y;
    const before = this.countAll();
    this.map.objects = this.map.objects.filter((o) => !objectTiles(o).some(([tx, ty]) => tx === x && ty === y));
    this.map.npcs = this.map.npcs.filter(keep);
    this.map.enemies = this.map.enemies.filter(keep);
    return before !== this.countAll();
  }

  /** その道具で置いた物が、このマップにいくつあるか(地面はマスの数)。パレットの「このエリアで使用中」に使う(front#290) */
  countOf(tool: EditorTool): number {
    return countInMap(this.map, tool);
  }

  private countAll(): number {
    return this.map.objects.length + this.map.npcs.length + this.map.enemies.length;
  }

  /** 筆で塗るマス(地面・高さの 3×3 のときは、まわりも) */
  brushTiles(tool: EditorTool, x: number, y: number, brush: number): [number, number][] {
    if ((tool.kind !== 'ground' && tool.kind !== 'height') || brush === 1) return [[x, y]];
    const tiles: [number, number][] = [];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (this.inMap(x + dx, y + dy)) tiles.push([x + dx, y + dy]);
    return tiles;
  }

  // ===== 家(front#236) =====

  /**
   * 家をその形・向きで (x, y) に置けるか。置けなければ、その理由を返す。
   * 占めるマスがすべてマップの中の通れる地面で、ほかの置物・NPC・敵・ポータルと重ならないこと
   */
  houseProblem(house: RpgMapObject | null, x: number, y: number, shape: string, rotation: number): string | null {
    const tiles = houseTiles(x, y, shape, rotation);
    if (tiles.some(([tx, ty]) => !this.inMap(tx, ty))) return 'マップの外にはみ出します';
    if (tiles.some(([tx, ty]) => !this.walkableGround(tx, ty))) return '水・「なし」のマスにかかります';
    for (const [tx, ty] of tiles) {
      const at = (o: { x: number; y: number }) => o.x === tx && o.y === ty;
      const npc = this.map.npcs.find(at);
      if (npc) return `NPC「${npc.name}」と重なります`;
      const other = this.objectAt(tx, ty, house ?? undefined);
      if (other) return other.type === 'house' ? 'ほかの家と重なります' : '置物と重なります';
      if (this.map.enemies.some(at)) return '敵の出る場所と重なります';
    }
    return null;
  }

  /** 家の形・向き・屋根の色・屋根の高さ・壁の色・窓の有無を変える。置けない形・向きなら変えずに false */
  setHouse(house: RpgMapObject, shape: string, rotation: number, roof: string, lowRoof = false, wall: string | null = null, noWindow = false): boolean {
    if (this.houseProblem(house, house.x, house.y, shape, rotation)) return false;
    house.shape = shape;
    house.rotation = rotation;
    house.roof = roof;
    house.lowRoof = lowRoof;
    // 最初の色・窓ありは持たない(今までの家と同じ形にする)(front#250)
    house.wall = wall && wall.toLowerCase() !== DEFAULT_WALL ? wall : null;
    house.noWindow = noWindow || null;
    return true;
  }

  /**
   * クリック・ドラッグしたマスに道具を使う。first はドラッグの最初のマス(NPC・家・ポータルは最初の1回だけ置く)。
   * NPC・家・ポータルを置いたときは、置いたものを返す(続けて中身を決めるため選んだ状態にする)
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
      case 'height':
        // ドラッグで同じマスを何度もなぞっても、1回のドラッグでは1段ずつしか変えない
        if (first) this.heightPainted.clear();
        for (const [tx, ty] of this.brushTiles(tool, x, y, brush)) {
          const key = ty * this.map.width + tx;
          if (this.heightPainted.has(key)) continue;
          this.heightPainted.add(key);
          const h = this.heightAt(tx, ty);
          this.setHeight(tx, ty, tool.op === 'up' ? h + 1 : tool.op === 'down' ? h - 1 : (tool.value ?? 0));
        }
        return null;
      case 'object': {
        if (tool.type === 'house') {
          // 家はまず1×1で、空いたマスに置く(形・向き・屋根の色は、置いたあとに選ぶ)
          if (!first || this.houseProblem(null, x, y, '1x1', 0)) return null;
          const house: RpgMapObject = { type: 'house', x, y, roof: tool.roof ?? DEFAULT_ROOF, torch: false, shape: '1x1', rotation: 0 };
          this.map.objects.push(house);
          return { kind: 'house', ref: house };
        }
        if (!this.walkableGround(x, y)) return null;
        this.removeAt(x, y);
        const placed: RpgMapObject = { type: tool.type, x, y, roof: tool.roof ?? null, torch: !!tool.torch };
        this.map.objects.push(placed);
        // 壊れる置物は、置いたものを選んだ状態にする(中身を選べる)。看板も選んだ状態にする(文章を書ける。front#314)
        if (!first) return null;
        if (isBreakable(tool.type)) return { kind: 'breakable', ref: placed };
        return tool.type === 'sign' ? { kind: 'object', ref: placed } : null;
      }
      case 'enemy':
        // 1回のクリックで1体だけ置く(ドラッグで続けて置かない。front#290)
        if (first && canPlace) this.map.enemies.push({ type: tool.type, x, y });
        return null;
      case 'npc': {
        if (!first || !canPlace) return null;
        const n = this.map.npcs.length;
        // 置くたびに髪の色・服の色を変える(見た目はモーダルで選び直せる)
        const hair = HAIR_COLORS[n % HAIR_COLORS.length];
        const body = CLOTHES_COLORS[n % CLOTHES_COLORS.length];
        const npc: RpgMapNpc = {
          name: `NPC${n + 1}`, x, y, hair, body, role: 'talk', notice: false, lines: ['こんにちは！'], look: lookFromColors(hair, body), quests: []
        };
        this.map.npcs.push(npc);
        return { kind: 'npc', ref: npc };
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

  /** 選んだもの(NPC・家・敵)を動かす。家は (x, y) を左上の角にする。置けないマスなら動かさない */
  moveTo(selection: Selection, x: number, y: number): boolean {
    if (selection.kind === 'house') {
      const { ref } = selection;
      if (this.houseProblem(ref, x, y, ref.shape ?? '1x1', ref.rotation ?? 0)) return false;
      ref.x = x;
      ref.y = y;
      return true;
    }
    if (!this.walkableGround(x, y) || this.occupied(x, y)) return false;
    selection.ref.x = x;
    selection.ref.y = y;
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
    // 広げたところは0段
    this.map.heights = Array.from({ length: h }, (_, y) => {
      const row = (this.map.heights?.[y] ?? '').slice(0, w);
      return row + '0'.repeat(w - row.length);
    });
    this.map.width = w;
    this.map.height = h;
    const inside = (o: { x: number; y: number }) => o.x < w && o.y < h;
    this.map.objects = this.map.objects.filter((o) => objectTiles(o).every(([tx, ty]) => tx < w && ty < h));
    this.map.npcs = this.map.npcs.filter(inside);
    this.map.enemies = this.map.enemies.filter(inside);
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

    // 端のつながり(front#274)の行き先のエリアがなくなった・同じダンジョンの隣のエリアができて使えなくなった
    const lost = (m.links ?? []).filter((l) => exitOf(maps, m, [l.dx, l.dy])?.to.id !== l.to);
    if (lost.length) checks.push({ ok: false, text: `使えない端のつながりが ${lost.length} 個あります（行き先のエリアがない・同じダンジョンの隣のエリアがある）` });

    // クエスト依頼なのにクエストがない・会う相手が見つからないクエスト(front#239)
    const noQuest = m.npcs.filter((n) => n.role === 'quest' && !(n.quests ?? []).length);
    if (noQuest.length) checks.push({ ok: false, text: `クエストを1つも持っていないクエスト依頼のNPCが ${noQuest.length} 人います` });
    const lostVisit = m.npcs
      .flatMap((n) => (n.role === 'quest' ? (n.quests ?? []) : []))
      .filter((q) => q.kind === 'visit' && !maps.find((a) => a.id === q.targetArea)?.npcs.some((n) => n.name === q.target));
    if (lostVisit.length) checks.push({ ok: false, text: `会う相手のNPCが見つからないクエストが ${lostVisit.length} 個あります` });

    const emptyNpc = m.npcs.filter((n) => !n.name.trim() || !n.lines.some((l) => l.trim()));
    checks.push({
      ok: emptyNpc.length === 0,
      text: emptyNpc.length ? `名前かセリフが空のNPCが ${emptyNpc.length} 人います` : 'NPCの名前とセリフが入っている'
    });

    // 隣のエリア・ほかのダンジョン(front#274)へつながる端に、通れるマス(出口)があるか(front#234)
    for (const side of SIDES) {
      const next = exitOf(maps, m, side)?.to;
      if (!next) continue;
      const [dx, dy] = side;
      const edge = dx !== 0
        ? Array.from({ length: m.height }, (_, y) => [dx === 1 ? m.width - 1 : 0, y])
        : Array.from({ length: m.width }, (_, x) => [x, dy === 1 ? m.height - 1 : 0]);
      const open = edge.some(([x, y]) => this.walkableGround(x, y) && this.occupied(x, y) !== 'object' && this.occupied(x, y) !== 'npc');
      checks.push({
        ok: open,
        text: open
          ? `${sideLabel(side)}の「${next.name}」へ出られる`
          : `${sideLabel(side)}の端に通れるマスがなく、「${next.name}」へ出られません`
      });
    }

    const reachable =
      m.id === 'plain' ||
      maps.some((a) => a.id !== m.id && (a.links ?? []).some((l) => l.to === m.id)) ||
      SIDES.some((side) => neighborOf(maps, m, side));
    checks.push({
      ok: reachable,
      text: reachable
        ? 'ほかのエリアから来られる'
        : 'まだどのエリアからも来られません（隣にエリアを作るか、ほかのダンジョンのエリアの端をこのエリアとつないでください）'
    });
    return checks;
  }
}

export { clone as cloneMap };
