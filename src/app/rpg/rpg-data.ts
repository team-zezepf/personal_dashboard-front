// RPG(front#215)の定義データ。アイテム・敵の中身と、マップの見た目はフロントが持つ。
// エリアの地形などはマップのデータ(api#82)、ポイント交換所の品物と値段はAPIが持つ
import { RpgMap } from '../models/rpg.models';

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
// エリアの地形・置物・村人・敵・ポータルは、マップのデータ(RpgMap。マップ作成画面で作る)から作る。
// ここには、データの文字・種類が何を表すかと、見た目(テーマ)ごとの色を置く
export const TW = 64;
export const TH = 32;
export const G = { GRASS: 0, FLOWER: 1, PATH: 2, WATER: 3, BRIDGE: 4, SAND: 5, VOID: 6 } as const;

// マップのデータの地面の文字(g:草 f:花 p:道 w:水 b:橋 s:砂 v:なし)
export const GROUND_CHARS = ['g', 'f', 'p', 'w', 'b', 's', 'v'];

export type StaticType = 'tree' | 'rock' | 'house' | 'cliff' | 'fern' | 'crystal' | 'pillar' | 'volcano';
export const STATIC_TYPES: StaticType[] = ['tree', 'rock', 'house', 'cliff', 'fern', 'crystal', 'pillar', 'volcano'];

export interface StaticObj {
  kind: 'static';
  type: StaticType;
  x: number;
  y: number;
  torch?: boolean;
  roof?: string;
}

export interface ThemeDef {
  label: string;
  // 水の地面の呼び名(マップ作成画面のパレット)
  liquidName: string;
  sky: [string, string];
  grass: [string, string, string];
  path: [string, string];
  sand: string;
  liquid: (x: number, y: number, time: number) => string;
  wave: string | null;
  flower: 'flower' | 'glow' | 'tuft' | 'crack';
  flowers: string[];
  edge: [string, string];
  tree: { trunk: string; leaves: [string, string, string]; scale: number };
  rock: [string, string];
  vignette?: string;
  stars?: boolean;
  fireflies?: boolean;
}

const waterColor = (hue: number, light: number, amp: number) => (x: number, y: number, time: number) =>
  `hsl(${hue}, 78%, ${light + Math.sin(time * 2 + x * 0.8 + y * 0.5) * amp}%)`;
const GREEN_TREE: ThemeDef['tree'] = { trunk: '#8a5a35', leaves: ['#3f9b48', '#46a851', '#5cbf64'], scale: 1 };

export const THEMES: Record<string, ThemeDef> = {
  plain: {
    label: '草原', liquidName: '水',
    sky: ['#8fd0f5', '#d6f2fd'], grass: ['#8fd16a', '#88cb63', '#95d771'], path: ['#ead6a8', '#e4cf9f'], sand: '#f2e5b8',
    liquid: waterColor(200, 56, 4), wave: 'rgba(255,255,255,0.45)',
    flower: 'flower', flowers: ['#ff7eb6', '#fff176', '#ffffff'], edge: ['#a0754d', '#7f5a3a'],
    tree: GREEN_TREE, rock: ['#9aa3ad', '#b7bec6']
  },
  forest: {
    label: '森', liquidName: '泉',
    sky: ['#123c3a', '#2f7d6d'], grass: ['#5fae73', '#58a66c', '#64b679'], path: ['#c9b48a', '#c2ad82'], sand: '#8fc89a',
    liquid: waterColor(178, 58, 5), wave: 'rgba(220,255,255,0.7)',
    flower: 'glow', flowers: ['#b4f8ff', '#e9d5ff', '#fdffb6'], edge: ['#6b4f33', '#57402a'],
    tree: { trunk: '#5b3a29', leaves: ['#1f7a5c', '#23896a', '#36a882'], scale: 1.25 }, rock: ['#7d8a86', '#9aa8a3'],
    vignette: 'rgba(5,40,35,0.45)', fireflies: true
  },
  valley: {
    label: '谷', liquidName: '溶岩',
    sky: ['#f59e5b', '#fde2b6'], grass: ['#c9a46c', '#c19c63', '#d0ab74'], path: ['#a98457', '#a27d50'], sand: '#6b4a32',
    liquid: (x, y, time) => `hsl(${18 + Math.sin(time * 2 + x + y) * 8}, 95%, ${50 + Math.sin(time * 3 + x * 0.7 + y * 0.4) * 6}%)`,
    wave: 'rgba(255,230,120,0.8)', flower: 'tuft', flowers: ['#7a9a3a', '#8fb045', '#6b8a30'], edge: ['#7c4f2c', '#5f3b20'],
    tree: GREEN_TREE, rock: ['#8a5a3c', '#a97450']
  },
  tower: {
    label: '塔', liquidName: '闇',
    sky: ['#0b0820', '#2a2255'], grass: ['#5b5770', '#56526a', '#615c77'], path: ['#8b1e3f', '#7d1a38'], sand: '#4a4660',
    liquid: () => '#000', wave: null, flower: 'crack', flowers: ['#3f3b52'], edge: ['#2a2738', '#1f1d2b'],
    tree: GREEN_TREE, rock: ['#4b4763', '#625d7d'], vignette: 'rgba(8,4,25,0.7)', stars: true
  }
};

export const themeOf = (theme: string): ThemeDef => THEMES[theme] ?? THEMES['plain'];
export const recLabel = (level: number) => `推奨 Lv${level}〜`;

/** 1エリア分の地面・通れないマス・置物。マップのデータから作る */
export class AreaMap {
  readonly ground: number[][];
  readonly solid: boolean[][];
  readonly statics: StaticObj[];

  constructor(readonly w: number, readonly h: number, ground: number[][], statics: StaticObj[]) {
    this.ground = ground;
    this.statics = statics;
    this.solid = Array.from({ length: h }, () => Array<boolean>(w).fill(false));
    for (const o of statics) {
      // 火山は大きいので、まわり1マスも通れない
      const r = o.type === 'volcano' ? 1 : 0;
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (this.inMap(o.x + dx, o.y + dy)) this.solid[o.y + dy][o.x + dx] = true;
    }
  }

  inMap(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }

  walkable(x: number, y: number): boolean {
    return this.inMap(x, y) && !this.solid[y][x] && this.ground[y][x] !== G.WATER && this.ground[y][x] !== G.VOID;
  }

  isVoid(x: number, y: number): boolean {
    return !this.inMap(x, y) || this.ground[y][x] === G.VOID;
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

/** マップのデータから地形を作る。村人のマスは通れない */
export function buildAreaMap(map: RpgMap): AreaMap {
  const ground = Array.from({ length: map.height }, (_, y) =>
    Array.from({ length: map.width }, (_, x) => Math.max(0, GROUND_CHARS.indexOf(map.ground[y]?.[x] ?? 'g')))
  );
  const statics: StaticObj[] = map.objects
    .filter((o) => (STATIC_TYPES as string[]).includes(o.type))
    .map((o) => ({ kind: 'static', type: o.type as StaticType, x: o.x, y: o.y, torch: o.torch, roof: o.roof ?? undefined }));
  const area = new AreaMap(map.width, map.height, ground, statics);
  for (const n of map.npcs) if (area.inMap(n.x, n.y)) area.solid[n.y][n.x] = true;
  return area;
}