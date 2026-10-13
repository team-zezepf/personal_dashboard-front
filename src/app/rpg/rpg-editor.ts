import { RpgMap, RpgMapEnemy, RpgMapInput, RpgMapNpc, RpgMapObject, RpgMapPortal, RpgNpcRole, RpgQuest } from '../models/rpg.models';
import { DEFAULT_ROOF, DEFAULT_WALL, houseTiles, objectTiles } from './rpg-house';
import { ENEMIES, MAX_HEIGHT, SIDES, StaticType, isBreakable, neighborOf, sideLabel } from './rpg-data';
import { CLOTHES_COLORS, HAIR_COLORS, lookFromColors } from './rpg-look';

// RPGのマップ作成画面(front#217)の編集の中身。画面(コンポーネント)から切り離して、テストできるようにしておく

export type EditorTool =
  | { kind: 'ground'; ground: string }
  // 地面の高さ(front#225)。up・down は1段ずつ、set は決まった高さにする
  | { kind: 'height'; op: 'up' | 'down' | 'set'; value?: number }
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
    id: 'object', label: '置物', hint: '木・岩・家などを置きます。置物のマスは通れません。家は置いたあと、形・向き・屋根の色を選べます。',
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
      { id: 'pillar', label: '柱', icon: '🏛️', tool: { kind: 'object', type: 'pillar' } },
      { id: 'torch', label: 'たいまつ柱', icon: '🔥', tool: { kind: 'object', type: 'pillar', torch: true } },
      { id: 'volcano', label: '火山', icon: '🌋', tool: { kind: 'object', type: 'volcano' } }
    ]
  },
  {
    id: 'enemy', label: '敵', hint: '敵が出てくる場所を置きます。敵はこの場所のまわりを歩き回ります。敵の見た目・強さは「👾 敵」タブで作れます。',
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
    id: 'portal', label: 'ポータル', hint: 'ほかのエリアへ移動する光る場所を置きます。右側で行き先を決めます。',
    items: [{ id: 'portal', label: 'ポータルを置く', icon: '🌀', tool: { kind: 'portal' } }]
  },
  {
    id: 'other', label: 'その他', hint: '「選ぶ・動かす」で、置いたNPC・家・ポータル・敵をクリックすると中身を変えられ、ドラッグで動かせます。',
    items: [
      { id: 'select', label: '選ぶ・動かす', icon: '👆', tool: { kind: 'select' } },
      { id: 'start', label: '出発地点', icon: '🚩', tool: { kind: 'start' } },
      { id: 'erase', label: '消しゴム', icon: '🧽', tool: { kind: 'erase' } }
    ]
  }
];

export const NPC_ROLES: Record<RpgNpcRole, string> = { talk: '話すだけ', shop: '道具屋', exchange: 'ポイント交換所', quest: 'クエスト依頼' };

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
  | { kind: 'portal'; ref: RpgMapPortal }
  | { kind: 'enemy'; ref: RpgMapEnemy }
  // 壊れる置物(front#264)。中身を選べる
  | { kind: 'breakable'; ref: RpgMapObject };

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
    objects: [], npcs: [], enemies: [], portals: [],
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
      contents: isBreakable(o.type) && o.contents ? { kind: o.contents.kind, id: o.contents.id, count: o.contents.count } : null
    })),
    npcs: map.npcs.map((n) => ({
      ...n,
      lines: n.lines.map((l) => l.trim()).filter((l) => l),
      // クエストはクエスト依頼だけが持つ(front#239)
      quests: n.role === 'quest' ? (n.quests ?? []).map((q) => ({ ...q, rewardItems: q.rewardItems.map((r) => ({ itemId: r.itemId, count: r.count })) })) : []
    })),
    enemies: map.enemies.map((e) => ({ ...e })),
    portals: map.portals.map((p) => ({ ...p })),
    startX: map.startX, startY: map.startY
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

  // 水・なしでない地面(人・敵・ポータル・出発地点を置ける)
  walkableGround(x: number, y: number): boolean {
    return this.inMap(x, y) && !BLOCKED_GROUND.includes(this.groundAt(x, y));
  }

  occupied(x: number, y: number): 'object' | 'npc' | 'enemy' | 'portal' | null {
    const at = (o: { x: number; y: number }) => o.x === x && o.y === y;
    if (this.objectAt(x, y)) return 'object';
    if (this.map.npcs.some(at)) return 'npc';
    if (this.map.enemies.some(at)) return 'enemy';
    if (this.map.portals.some(at)) return 'portal';
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
    const portal = this.map.portals.find(at);
    if (portal) return { kind: 'portal', ref: portal };
    const enemy = this.map.enemies.find(at);
    if (enemy) return { kind: 'enemy', ref: enemy };
    const house = this.objectAt(x, y);
    if (house?.type === 'house') return { kind: 'house', ref: house };
    if (house && isBreakable(house.type)) return { kind: 'breakable', ref: house };
    return null;
  }

  /** そのマスに置いたものを消す(家は、占めるマスのどれかなら家ごと)。消したものがあれば true */
  removeAt(x: number, y: number): boolean {
    const keep = (o: { x: number; y: number }) => o.x !== x || o.y !== y;
    const before = this.countAll();
    this.map.objects = this.map.objects.filter((o) => !objectTiles(o).some(([tx, ty]) => tx === x && ty === y));
    this.map.npcs = this.map.npcs.filter(keep);
    this.map.enemies = this.map.enemies.filter(keep);
    this.map.portals = this.map.portals.filter(keep);
    return before !== this.countAll();
  }

  private countAll(): number {
    return this.map.objects.length + this.map.npcs.length + this.map.enemies.length + this.map.portals.length;
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
      if (this.map.portals.some(at)) return 'ポータルと重なります';
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
        // 壊れる置物は、置いたものを選んだ状態にする(中身を選べる)
        return first && isBreakable(tool.type) ? { kind: 'breakable', ref: placed } : null;
      }
      case 'enemy':
        if (canPlace) this.map.enemies.push({ type: tool.type, x, y });
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

  /** 選んだもの(NPC・家・ポータル・敵)を動かす。家は (x, y) を左上の角にする。置けないマスなら動かさない */
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

    // 隣のエリアがある側の端に、通れるマス(出口)があるか(front#234)
    for (const side of SIDES) {
      const next = neighborOf(maps, m, side);
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
      maps.some((a) => a.id !== m.id && a.portals.some((p) => p.to === m.id)) ||
      SIDES.some((side) => neighborOf(maps, m, side));
    checks.push({
      ok: reachable,
      text: reachable
        ? 'ほかのエリアから来られる'
        : 'まだどのエリアからも来られません（隣にエリアを作るか、ほかのダンジョンにこのエリアへのポータルを置いてください）'
    });
    return checks;
  }
}

export { clone as cloneMap };
