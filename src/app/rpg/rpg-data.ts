// RPG(front#215)の定義データ。アイテム・敵・エリアの中身はフロントが持ち、APIはセーブデータを保存するだけ
// (ポイント交換所の品物と値段だけはAPIが持つ)

export type ItemType = 'use' | 'weapon' | 'armor';

export interface ItemDef {
  name: string;
  icon: string;
  type: ItemType;
  heal?: number;
  atk?: number;
  def?: number;
  // 道具屋での値段(ゴールド)。ポイント交換限定の品物は持たない
  price?: number;
  desc?: string;
}

export const ITEMS: Record<string, ItemDef> = {
  potion: { name: '回復薬', icon: '🧪', type: 'use', heal: 35, price: 10, desc: 'HPを35回復' },
  hipotion: { name: '上回復薬', icon: '⚗️', type: 'use', heal: 120, price: 35, desc: 'HPを120回復' },
  wood_sword: { name: '木の剣', icon: '🗡️', type: 'weapon', atk: 2, price: 0 },
  copper_sword: { name: '銅の剣', icon: '🗡️', type: 'weapon', atk: 6, price: 45 },
  iron_sword: { name: '鉄の剣', icon: '⚔️', type: 'weapon', atk: 12, price: 140 },
  steel_sword: { name: '鋼の剣', icon: '⚔️', type: 'weapon', atk: 22, price: 420 },
  mithril_sword: { name: 'ミスリルの剣', icon: '🔱', type: 'weapon', atk: 34, price: 1200 },
  star_sword: { name: '星の剣', icon: '🌟', type: 'weapon', atk: 26, desc: 'ポイント交換限定' },
  cloth: { name: '布の服', icon: '👕', type: 'armor', def: 1, price: 0 },
  leather: { name: '革の鎧', icon: '🦺', type: 'armor', def: 5, price: 60 },
  chain_mail: { name: 'くさりかたびら', icon: '🛡️', type: 'armor', def: 10, price: 260 },
  magic_armor: { name: '魔法の鎧', icon: '💠', type: 'armor', def: 18, price: 800 },
  star_robe: { name: '星のローブ', icon: '✨', type: 'armor', def: 16, desc: 'ポイント交換限定' }
};

export const SHOP_ITEMS = ['potion', 'hipotion', 'copper_sword', 'iron_sword', 'steel_sword', 'mithril_sword', 'leather', 'chain_mail', 'magic_armor'];

// ポイント交換所の品物のアイコン(名前・値段はAPIから受け取る)
export const POINT_SHOP_ICONS: Record<string, string> = { star_sword: '🌟', star_robe: '✨', gold_100: '💰' };

export function itemStatLabel(item: ItemDef): string {
  return item.atk ? `攻撃 +${item.atk}` : `防御 +${item.def ?? 0}`;
}

// ===== 能力値 =====
export const maxHpOf = (level: number) => 50 + (level - 1) * 12;
export const nextExpOf = (level: number) => 12 * level + level * level * 3;
export const baseAtkOf = (level: number) => 6 + (level - 1) * 3;
export const baseDefOf = (level: number) => 2 + (level - 1) * 2;

// ===== 敵 =====
export type EnemyDraw = 'slime' | 'mushroom' | 'wisp' | 'raptor' | 'golem' | 'ghost' | 'knight' | 'lord';

export interface EnemyDef {
  name: string;
  draw: EnemyDraw;
  hp: number;
  atk: number;
  def: number;
  exp: number;
  gold: number;
  speed: number;
  // 攻撃の間隔(秒)
  interval: number;
  color: string;
  dark: string;
  // この距離(マス)まで近づくと向こうから襲ってくる。0なら攻撃されるまで襲ってこない
  sight: number;
  drop: { id: string; rate: number };
  size: number;
  // クリックで選べる高さ(px)
  hit: number;
  // 倒してから復活するまでの秒数(省略すると10秒)
  respawn?: number;
  boss?: boolean;
}

export const ENEMIES: Record<string, EnemyDef> = {
  slime: { name: 'スライム', draw: 'slime', hp: 22, atk: 8, def: 1, exp: 6, gold: 4, speed: 1.3, interval: 1.4,
    color: '#7ddc6f', dark: '#3fa24a', sight: 0, drop: { id: 'potion', rate: 0.25 }, size: 1, hit: 28 },
  blue: { name: 'ブルースライム', draw: 'slime', hp: 50, atk: 14, def: 5, exp: 16, gold: 10, speed: 1.6, interval: 1.3,
    color: '#6fb6ff', dark: '#2c74d6', sight: 2.5, drop: { id: 'potion', rate: 0.35 }, size: 1.2, hit: 34 },
  kinokon: { name: 'キノコン', draw: 'mushroom', hp: 75, atk: 20, def: 8, exp: 26, gold: 15, speed: 1.2, interval: 1.5,
    color: '#e85d75', dark: '#b83a52', sight: 0, drop: { id: 'potion', rate: 0.35 }, size: 1, hit: 36 },
  spirit: { name: 'もりのせいれい', draw: 'wisp', hp: 60, atk: 26, def: 6, exp: 32, gold: 18, speed: 2.2, interval: 1.2,
    color: '#7ef9ff', dark: '#22b8c9', sight: 3, drop: { id: 'hipotion', rate: 0.2 }, size: 1, hit: 46 },
  raptor: { name: 'ラプトル', draw: 'raptor', hp: 130, atk: 34, def: 12, exp: 60, gold: 32, speed: 2.4, interval: 1.2,
    color: '#7fb069', dark: '#4f7a3d', sight: 3.5, drop: { id: 'hipotion', rate: 0.3 }, size: 1.2, hit: 40 },
  golem: { name: 'いわゴーレム', draw: 'golem', hp: 240, atk: 42, def: 20, exp: 110, gold: 65, speed: 1.1, interval: 1.8,
    color: '#a3acb6', dark: '#6b7480', sight: 3, drop: { id: 'hipotion', rate: 0.6 }, size: 1.5, hit: 62 },
  ghost: { name: 'ゴースト', draw: 'ghost', hp: 170, atk: 48, def: 16, exp: 120, gold: 55, speed: 1.8, interval: 1.4,
    color: '#f5f3ff', dark: '#a78bfa', sight: 3, drop: { id: 'hipotion', rate: 0.4 }, size: 1, hit: 50 },
  knight: { name: 'ダークナイト', draw: 'knight', hp: 320, atk: 62, def: 30, exp: 220, gold: 110, speed: 1.4, interval: 1.6,
    color: '#475569', dark: '#1f2937', sight: 3, drop: { id: 'hipotion', rate: 0.5 }, size: 1.15, hit: 64 },
  darklord: { name: '闇の魔導士', draw: 'lord', hp: 900, atk: 85, def: 40, exp: 1000, gold: 500, speed: 1.2, interval: 2.0,
    color: '#6d28d9', dark: '#2e1065', sight: 4, drop: { id: 'hipotion', rate: 1 }, size: 1.45, hit: 94, respawn: 60, boss: true }
};

// ===== マップ =====
export const N = 26;
export const TW = 64;
export const TH = 32;
export const G = { GRASS: 0, FLOWER: 1, PATH: 2, WATER: 3, BRIDGE: 4, SAND: 5, VOID: 6 } as const;

export type AreaId = 'plain' | 'forest' | 'valley' | 'tower';
export type StaticType = 'tree' | 'rock' | 'house' | 'cliff' | 'fern' | 'crystal' | 'pillar' | 'volcano';

export interface StaticObj {
  kind: 'static';
  type: StaticType;
  x: number;
  y: number;
  torch?: boolean;
  roof?: string;
  roofDark?: string;
}

export interface Portal {
  x: number;
  y: number;
  to: AreaId;
  // 移動先で立つ位置
  tx: number;
  ty: number;
}

export interface NpcDef {
  name: string;
  x: number;
  y: number;
  hair: string;
  body: string;
  lines: string[];
  // 会話のあとに開く画面
  after?: 'shop' | 'exchange';
  // 頭の上に「!」を出す(話しかけるまで)
  notice?: boolean;
}

export interface AreaPalette {
  sky: [string, string];
  grass: [string, string, string];
  path: [string, string];
  sand: string;
  liquid: (x: number, y: number, time: number) => string;
  wave: string | null;
  flower: 'flower' | 'glow' | 'tuft' | 'crack';
  flowers: string[];
  edge: [string, string];
  vignette?: string;
  stars?: boolean;
  fireflies?: boolean;
}

export interface AreaDef {
  id: AreaId;
  name: string;
  rec: string;
  seed: number;
  // 確認用ワープ・セーブデータの位置が使えないときに立つ位置
  start: [number, number];
  pal: AreaPalette;
  tree: { trunk: string; leaves: [string, string, string]; scale: number };
  rock: [string, string];
  portals: Portal[];
  // 魔法陣を描く位置
  decal?: [number, number];
  build: (m: AreaMap) => void;
  npcs: NpcDef[];
  spawns: [string, number, number][];
}

/** 1エリア分の地面・通れないマス・置物。エリアを読み込むたびに作り直す */
export class AreaMap {
  ground: number[][] = [];
  solid: boolean[][] = [];
  statics: StaticObj[] = [];
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  // 同じエリアは毎回同じ地形になるよう、決まった種から乱数を作る
  rand(): number {
    this.seed = (this.seed * 16807) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }

  inMap(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < N && y < N;
  }

  walkable(x: number, y: number): boolean {
    return this.inMap(x, y) && !this.solid[y][x] && this.ground[y][x] !== G.WATER && this.ground[y][x] !== G.VOID;
  }

  isVoid(x: number, y: number): boolean {
    return !this.inMap(x, y) || this.ground[y][x] === G.VOID;
  }

  fill(flowerRate: number): void {
    this.ground = [];
    this.solid = [];
    this.statics = [];
    for (let y = 0; y < N; y++) {
      this.ground.push([]);
      this.solid.push([]);
      for (let x = 0; x < N; x++) {
        this.ground[y].push(this.rand() < flowerRate ? G.FLOWER : G.GRASS);
        this.solid[y].push(false);
      }
    }
  }

  setG(x: number, y: number, g: number): void {
    if (this.inMap(x, y)) this.ground[y][x] = g;
  }

  addStatic(type: StaticType, x: number, y: number, extra: Partial<StaticObj> = {}): void {
    if (!this.inMap(x, y) || this.solid[y][x]) return;
    const g = this.ground[y][x];
    if (g === G.WATER || g === G.VOID || g === G.PATH || g === G.BRIDGE || g === G.SAND) return;
    this.statics.push({ kind: 'static', type, x, y, ...extra });
    this.solid[y][x] = true;
  }

  border(type: StaticType): void {
    for (let i = 0; i < N; i++) {
      for (const [x, y] of [[i, 0], [i, N - 1], [0, i], [N - 1, i]]) {
        this.ground[y][x] = G.GRASS;
        this.addStatic(type, x, y);
      }
    }
  }

  pool(cx: number, cy: number, rx: number, ry: number, rim: boolean): void {
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const d = (x - cx) ** 2 / (rx * rx) + (y - cy) ** 2 / (ry * ry);
        if (d < 1) this.setG(x, y, G.WATER);
        else if (rim && d < 1.9) this.setG(x, y, G.SAND);
      }
    }
  }

  // 横に x1→x2(y1の行)、そのあと縦に y1→y2(x2の列)
  road(x1: number, y1: number, x2: number, y2: number, g: number): void {
    for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) this.setG(x, y1, g);
    for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) this.setG(x2, y, g);
  }

  scatter(x1: number, y1: number, x2: number, y2: number, list: [StaticType, number][], skip: (x: number, y: number) => boolean = () => false): void {
    for (let y = y1; y <= y2; y++) {
      for (let x = x1; x <= x2; x++) {
        if (skip(x, y)) continue;
        let r = this.rand();
        for (const [type, rate] of list) {
          if (r < rate) {
            this.addStatic(type, x, y);
            break;
          }
          r -= rate;
        }
      }
    }
  }

  nearestWalkable(x: number, y: number): [number, number] {
    for (let r = 0; r < 6; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (this.walkable(x + dx, y + dy)) return [x + dx, y + dy];
        }
      }
    }
    return [x, y];
  }
}

const waterColor = (hue: number, light: number, amp: number) => (x: number, y: number, time: number) =>
  `hsl(${hue}, 78%, ${light + Math.sin(time * 2 + x * 0.8 + y * 0.5) * amp}%)`;

export const AREAS: Record<AreaId, AreaDef> = {
  plain: {
    id: 'plain', name: '始まりの草原', rec: '推奨 Lv1〜', seed: 11, start: [6, 7],
    pal: {
      sky: ['#8fd0f5', '#d6f2fd'], grass: ['#8fd16a', '#88cb63', '#95d771'], path: ['#ead6a8', '#e4cf9f'], sand: '#f2e5b8',
      liquid: waterColor(200, 56, 4), wave: 'rgba(255,255,255,0.45)',
      flower: 'flower', flowers: ['#ff7eb6', '#fff176', '#ffffff'], edge: ['#a0754d', '#7f5a3a']
    },
    tree: { trunk: '#8a5a35', leaves: ['#3f9b48', '#46a851', '#5cbf64'], scale: 1 },
    rock: ['#9aa3ad', '#b7bec6'],
    portals: [{ x: 24, y: 6, to: 'forest', tx: 2, ty: 12 }, { x: 6, y: 24, to: 'valley', tx: 12, ty: 2 }],
    build(m) {
      m.fill(0.08);
      for (let y = 0; y < N; y++) {
        m.setG(11, y, G.SAND); m.setG(12, y, G.WATER); m.setG(13, y, G.WATER); m.setG(14, y, G.SAND);
      }
      m.pool(20, 18, 2.45, 2, true);
      m.road(2, 6, 24, 6, G.PATH);
      m.road(6, 2, 6, 24, G.PATH);
      m.road(17, 6, 17, 22, G.PATH);
      for (let y = 5; y <= 7; y++) for (let x = 5; x <= 7; x++) m.setG(x, y, G.PATH);
      m.setG(12, 6, G.BRIDGE); m.setG(13, 6, G.BRIDGE);
      m.border('tree');
      m.addStatic('house', 3, 3, { roof: '#e0605a', roofDark: '#c24a45' });
      m.addStatic('house', 9, 3, { roof: '#5b8def', roofDark: '#3f6fcf' });
      m.addStatic('house', 3, 9, { roof: '#45b36b', roofDark: '#2f8f51' });
      m.addStatic('house', 9, 9, { roof: '#f2a33a', roofDark: '#d0841f' });
      m.scatter(1, 13, 10, N - 2, [['tree', 0.22]]);
      m.scatter(15, 1, N - 2, N - 2, [['tree', 0.07], ['rock', 0.025]], (x) => Math.abs(x - 17) <= 1);
    },
    npcs: [
      { name: '村長 ゴロウ', x: 5, y: 4, hair: '#e5e7eb', body: '#4b9e5f', notice: true, lines: [
        'ようこそ、始まりの草原へ！ ここは草原のまんなかにある小さな村じゃ。',
        '川の向こうにはスライムが住みついておる。敵をクリックすると、近づいて自動で戦うぞ。',
        'HPが減ったら持ち物の回復薬を使うのじゃ（[1]キーでも使える）。',
        '東の道を進むと「精霊の森」、南の道を進むと「原始の谷」に出る。森のさらに奥には「闇の塔」がそびえておる…。強くなってから向かうのじゃぞ。'
      ] },
      { name: '道具屋 ミナ', x: 8, y: 4, hair: '#8b5a2b', body: '#f08a4b', after: 'shop', lines: [
        'いらっしゃい！ 道具屋だよ。',
        'ためたゴールドで、装備や回復薬を買っていってね。'
      ] },
      { name: '交換所 ステラ', x: 4, y: 8, hair: '#fcd34d', body: '#8b5cf6', after: 'exchange', lines: [
        'ここはポイント交換所。',
        'ダッシュボードでためたポイントを、ここでしか手に入らない品物と交換できるよ。'
      ] },
      { name: '旅人 ケン', x: 10, y: 7, hair: '#374151', body: '#3b82f6', lines: [
        'この橋を渡ると草原の東側だよ。',
        '道の先の光っている場所に乗ると、別のエリアに行けるんだ。',
        '青いスライムは、近づくと向こうから襲ってくるから気をつけて。'
      ] }
    ],
    spawns: [
      ...[[16, 3], [19, 3], [22, 4], [20, 9], [16, 10], [23, 8], [21, 12]].map(([x, y]) => ['slime', x, y] as [string, number, number]),
      ...[[16, 15], [23, 14], [15, 21], [19, 23]].map(([x, y]) => ['blue', x, y] as [string, number, number])
    ]
  },

  forest: {
    id: 'forest', name: '精霊の森', rec: '推奨 Lv4〜', seed: 23, start: [2, 12],
    pal: {
      sky: ['#123c3a', '#2f7d6d'], grass: ['#5fae73', '#58a66c', '#64b679'], path: ['#c9b48a', '#c2ad82'], sand: '#8fc89a',
      liquid: waterColor(178, 58, 5), wave: 'rgba(220,255,255,0.7)',
      flower: 'glow', flowers: ['#b4f8ff', '#e9d5ff', '#fdffb6'], edge: ['#6b4f33', '#57402a'], vignette: 'rgba(5,40,35,0.45)', fireflies: true
    },
    tree: { trunk: '#5b3a29', leaves: ['#1f7a5c', '#23896a', '#36a882'], scale: 1.25 },
    rock: ['#7d8a86', '#9aa8a3'],
    portals: [{ x: 1, y: 12, to: 'plain', tx: 23, ty: 6 }, { x: 12, y: 1, to: 'tower', tx: 12, ty: 21 }],
    build(m) {
      m.fill(0.12);
      const glades = [[6, 6], [18, 8], [18, 17], [6, 19]];
      m.road(6, 12, 6, 6, G.SAND);
      m.road(12, 8, 18, 8, G.SAND);
      m.road(12, 12, 18, 14, G.SAND);
      m.road(6, 12, 6, 19, G.SAND);
      m.road(1, 12, 12, 12, G.PATH);
      m.road(12, 12, 12, 1, G.PATH);
      m.pool(18.5, 17.5, 2, 1.5, false);
      m.border('tree');
      for (const [x, y] of [[16, 15], [21, 16], [21, 19], [15, 19], [4, 5], [8, 21]]) m.addStatic('crystal', x, y);
      m.scatter(1, 1, N - 2, N - 2, [['tree', 0.34], ['crystal', 0.015]],
        (x, y) => glades.some(([gx, gy]) => Math.hypot(x - gx, y - gy) < 3));
    },
    npcs: [
      { name: '森の精霊 リーフ', x: 3, y: 11, hair: '#a7f3d0', body: '#10b981', lines: [
        'ようこそ、精霊の森へ。ここは光る花と水晶の森だよ。',
        'キノコンはおとなしいけど、もりのせいれいは近づくと襲ってくるの。',
        '北の道のずっと先に「闇の塔」があるよ。とても強い魔物がいるから、じゅうぶん強くなってからね。'
      ] }
    ],
    spawns: [
      ...[[6, 6], [7, 7], [17, 7], [5, 19], [7, 20]].map(([x, y]) => ['kinokon', x, y] as [string, number, number]),
      ...[[21, 15], [16, 17], [19, 9]].map(([x, y]) => ['spirit', x, y] as [string, number, number])
    ]
  },

  valley: {
    id: 'valley', name: '原始の谷', rec: '推奨 Lv8〜', seed: 37, start: [12, 2],
    pal: {
      sky: ['#f59e5b', '#fde2b6'], grass: ['#c9a46c', '#c19c63', '#d0ab74'], path: ['#a98457', '#a27d50'], sand: '#6b4a32',
      liquid: (x, y, time) => `hsl(${18 + Math.sin(time * 2 + x + y) * 8}, 95%, ${50 + Math.sin(time * 3 + x * 0.7 + y * 0.4) * 6}%)`,
      wave: 'rgba(255,230,120,0.8)', flower: 'tuft', flowers: ['#7a9a3a', '#8fb045', '#6b8a30'], edge: ['#7c4f2c', '#5f3b20']
    },
    tree: { trunk: '#8a5a35', leaves: ['#3f9b48', '#46a851', '#5cbf64'], scale: 1 },
    rock: ['#8a5a3c', '#a97450'],
    portals: [{ x: 12, y: 1, to: 'plain', tx: 6, ty: 23 }],
    build(m) {
      m.fill(0.1);
      m.pool(18, 8, 2.6, 1.8, true);
      m.pool(8, 17, 2.4, 1.9, true);
      m.road(12, 1, 12, 13, G.PATH);
      m.road(12, 13, 21, 22, G.PATH);
      m.border('cliff');
      m.addStatic('volcano', 5, 5);
      for (const [dx, dy] of [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]]) m.solid[5 + dy][5 + dx] = true;
      m.scatter(1, 1, N - 2, N - 2, [['rock', 0.07], ['fern', 0.07]]);
    },
    npcs: [],
    spawns: [
      ...[[8, 9], [16, 4], [10, 21], [18, 18], [5, 13], [20, 12]].map(([x, y]) => ['raptor', x, y] as [string, number, number]),
      ...[[22, 21], [4, 21]].map(([x, y]) => ['golem', x, y] as [string, number, number])
    ]
  },

  tower: {
    id: 'tower', name: '闇の塔', rec: '推奨 Lv15〜', seed: 51, start: [12, 21],
    pal: {
      sky: ['#0b0820', '#2a2255'], grass: ['#5b5770', '#56526a', '#615c77'], path: ['#8b1e3f', '#7d1a38'], sand: '#4a4660',
      liquid: () => '#000', wave: null, flower: 'crack', flowers: ['#3f3b52'], edge: ['#2a2738', '#1f1d2b'],
      vignette: 'rgba(8,4,25,0.7)', stars: true
    },
    tree: { trunk: '#8a5a35', leaves: ['#3f9b48', '#46a851', '#5cbf64'], scale: 1 },
    rock: ['#4b4763', '#625d7d'],
    portals: [{ x: 12, y: 23, to: 'forest', tx: 12, ty: 2 }],
    decal: [12, 5],
    build(m) {
      m.fill(0.06);
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (Math.hypot(x - 12.5, y - 12.5) > 10.6) m.ground[y][x] = G.VOID;
      m.road(12, 4, 12, 23, G.PATH);
      m.road(13, 4, 13, 23, G.PATH);
      for (let k = 0; k < 12; k++) {
        const a = (k * Math.PI) / 6;
        m.addStatic('pillar', Math.round(12.5 + Math.cos(a) * 8.3), Math.round(12.5 + Math.sin(a) * 8.3), { torch: k % 2 === 0 });
      }
      m.scatter(1, 1, N - 2, N - 2, [['rock', 0.03]]);
    },
    npcs: [],
    spawns: [
      ...[[7, 9], [18, 9], [8, 17], [17, 17]].map(([x, y]) => ['ghost', x, y] as [string, number, number]),
      ...[[9, 13], [16, 13]].map(([x, y]) => ['knight', x, y] as [string, number, number]),
      ['darklord', 12, 5]
    ]
  }
};

export function isAreaId(id: string): id is AreaId {
  return id in AREAS;
}

/** エリアの地形を作る。ポータルのマスは必ず通れるようにする */
export function buildAreaMap(area: AreaDef): AreaMap {
  const map = new AreaMap(area.seed);
  area.build(map);
  for (const p of area.portals) {
    map.setG(p.x, p.y, G.PATH);
    map.solid[p.y][p.x] = false;
  }
  for (const n of area.npcs) map.solid[n.y][n.x] = true;
  return map;
}
