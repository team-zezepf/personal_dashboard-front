// RPG(front#215)の定義データ。アイテム・敵の中身と、マップの見た目はフロントが持つ。
// エリアの地形などはマップのデータ(api#82)、ポイント交換所の品物と値段はAPIが持つ
import { RpgMap } from '../models/rpg.models';
import { objectTiles } from './rpg-house';

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

// 手に持つ剣の色(ゲーム画面と、見た目を選ぶ欄のプレビュー)
export function swordColorOf(weapon: string): string {
  if (weapon === 'star_sword') return '#fde047';
  if (weapon === 'mithril_sword') return '#a5f3fc';
  return (ITEMS[weapon]?.atk ?? 0) >= 6 ? '#cbd5e1' : '#c08a52';
}

export function itemStatLabel(item: ItemDef): string {
  return item.atk ? `攻撃 +${item.atk}` : `防御 +${item.def ?? 0}`;
}

// ===== 能力値 =====
// レベルが上がると STAT_POINTS_PER_LEVEL ポイントもらえ、プレイヤーが振り分ける(front#223)。
// HP・攻撃・防御を1ずつ振ると、以前の自動の上がり方(1レベルで最大HP+12・攻撃+3・防御+2)と同じになる
export const STAT_POINTS_PER_LEVEL = 3;
export const MAX_LUCK = 99;
export const nextExpOf = (level: number) => 12 * level + level * level * 3;
export const totalStatPointsOf = (level: number) => (level - 1) * STAT_POINTS_PER_LEVEL;

export type StatKey = 'hp' | 'atk' | 'def' | 'mag' | 'spd' | 'luk';
export type Stats = Record<StatKey, number>;
export const ZERO_STATS: Stats = { hp: 0, atk: 0, def: 0, mag: 0, spd: 0, luk: 0 };

export const STAT_DEFS: { key: StatKey; label: string; desc: string; max?: number }[] = [
  { key: 'hp', label: 'HP', desc: '最大HP' },
  { key: 'atk', label: '攻撃', desc: 'あたえるダメージ' },
  { key: 'def', label: '防御', desc: '受けるダメージを減らす' },
  { key: 'mag', label: '魔力', desc: '回復薬の回復量（あとで魔法の威力にも）' },
  { key: 'spd', label: '速さ', desc: '歩く速さ・攻撃の間隔' },
  { key: 'luk', label: '運', desc: '会心・回避・アイテム', max: MAX_LUCK }
];

// 速さ・運の効果は99で最大(それ以上振っても変わらない)
const rate99 = (n: number) => Math.min(Math.max(n, 0), 99) / 99;
export const maxHpOf = (s: Stats) => 50 + s.hp * 12;
export const baseAtkOf = (s: Stats) => 6 + s.atk * 3;
export const baseDefOf = (s: Stats) => 2 + s.def * 2;
// 回復薬の回復量の倍率
export const healRateOf = (s: Stats) => 1 + s.mag * 0.02;
// 歩く速さ(マス/秒): 3.0 → 6.0
export const walkSpeedOf = (s: Stats) => 3 + 3 * rate99(s.spd);
// 攻撃の間隔(秒): 0.85 → 0.425
export const attackIntervalOf = (s: Stats) => 0.85 * (1 - 0.5 * rate99(s.spd));
// 会心率 5% → 70%、回避率 0% → 60%(0〜1)
export const critRateOf = (s: Stats) => 0.05 + 0.65 * rate99(s.luk);
export const evadeRateOf = (s: Stats) => 0.6 * rate99(s.luk);
// アイテムを落とす確率の倍率 ×1 → ×2
export const dropRateOf = (s: Stats) => 1 + rate99(s.luk);

// ===== 敵 =====
// 敵の種類は「敵」タブ(front#229)で作れるようになったため、rpg-enemy.ts に移した
export { ENEMIES } from './rpg-enemy';
export type { EnemyDef } from './rpg-enemy';


// ===== マップ =====
// エリアの地形・置物・村人・敵・ポータルは、マップのデータ(RpgMap。マップ作成画面で作る)から作る。
// ここには、データの文字・種類が何を表すかと、見た目(テーマ)ごとの色を置く
export const TW = 64;
export const TH = 32;
// 地面の高さ(front#225)。1段の画面上の高さ(マスの縦の4分の1)と、いちばん高い段
export const HZ = 8;
export const MAX_HEIGHT = 3;
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
  // 家の形と向き(front#236)。x, y は占めるマスのいちばん左上
  shape?: string;
  rotation?: number;
}

/** 奥から順に描くときの奥行き。大きな家は、いちばん手前のマスで並べる */
export function staticDepth(o: StaticObj): number {
  return Math.max(...objectTiles(o).map(([x, y]) => x + y));
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

// ===== ダンジョンの中のエリアのつながり(front#234) =====
// エリアはダンジョンの中で縦横のマス目(gridX, gridY)に並び、隣り合うエリアは向かい合う端でつながる。
// 向きはマップの x・y の向き([1, 0] は x が大きい側の端 = 画面の右下)

export type Side = readonly [number, number];
export const SIDES: readonly Side[] = [[1, 0], [-1, 0], [0, 1], [0, -1]];

// 画面上の向きの呼び名(マップ作成画面)
export function sideLabel([dx, dy]: Side): string {
  if (dx === 1) return '右下';
  if (dx === -1) return '左上';
  return dy === 1 ? '左下' : '右上';
}

/** 同じダンジョンの中で、area の side の向きに隣り合うエリア */
export function neighborOf(maps: readonly RpgMap[], area: RpgMap, [dx, dy]: Side): RpgMap | undefined {
  return maps.find((m) => m.id !== area.id && m.dungeonId === area.dungeonId && m.gridX === area.gridX + dx && m.gridY === area.gridY + dy);
}

/** 端のマス(x, y)が、隣のエリアへの出口になる向き(隣にエリアがある側の端だけ)。出口でなければ null */
export function exitSideAt(maps: readonly RpgMap[], area: RpgMap, x: number, y: number): Side | null {
  for (const side of SIDES) {
    const [dx, dy] = side;
    const onEdge = (dx === 1 && x === area.width - 1) || (dx === -1 && x === 0) || (dy === 1 && y === area.height - 1) || (dy === -1 && y === 0);
    if (onEdge && neighborOf(maps, area, side)) return side;
  }
  return null;
}

/**
 * 出口(from の (x, y))から隣のエリア(to)へ移ったときに立つマス。
 * 反対側の端の同じ位置の1マス内側(広さが違えば、はみ出さないところ)
 */
export function arrivalOf(from: Side, to: RpgMap, x: number, y: number): [number, number] {
  const clamp = (v: number, max: number) => Math.min(max - 1, Math.max(0, v));
  const [dx, dy] = from;
  const ax = dx === 1 ? Math.min(1, to.width - 1) : dx === -1 ? Math.max(0, to.width - 2) : clamp(x, to.width);
  const ay = dy === 1 ? Math.min(1, to.height - 1) : dy === -1 ? Math.max(0, to.height - 2) : clamp(y, to.height);
  return [ax, ay];
}

/** 1エリア分の地面・地面の高さ・通れないマス・置物。マップのデータから作る */
export class AreaMap {
  readonly ground: number[][];
  // 地面の高さ(0〜3段)。段差のないマップはすべて0
  readonly heights: number[][];
  // 1マスでも高いマスがあるか(なければ段差の計算・描き分けをしない)
  readonly hasHeights: boolean;
  readonly solid: boolean[][];
  readonly statics: StaticObj[];

  constructor(readonly w: number, readonly h: number, ground: number[][], statics: StaticObj[], heights?: number[][]) {
    this.ground = ground;
    this.statics = statics;
    this.heights = heights ?? Array.from({ length: h }, () => Array<number>(w).fill(0));
    this.hasHeights = this.heights.some((row) => row.some((v) => v > 0));
    this.solid = Array.from({ length: h }, () => Array<boolean>(w).fill(false));
    for (const o of statics) {
      // 火山は大きいので、まわり1マスも通れない。家は占めるマスがすべて通れない
      const r = o.type === 'volcano' ? 1 : 0;
      for (const [tx, ty] of objectTiles(o)) {
        for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (this.inMap(tx + dx, ty + dy)) this.solid[ty + dy][tx + dx] = true;
      }
    }
  }

  inMap(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }

  walkable(x: number, y: number): boolean {
    return this.inMap(x, y) && !this.solid[y][x] && this.ground[y][x] !== G.WATER && this.ground[y][x] !== G.VOID;
  }

  heightAt(x: number, y: number): number {
    return this.inMap(x, y) ? this.heights[y][x] : 0;
  }

  /** となりのマスへ進めるか。高さの差が1段までなら登り降りでき、2段以上は崖で進めない */
  canStep(ax: number, ay: number, bx: number, by: number): boolean {
    return Math.abs(this.heightAt(ax, ay) - this.heightAt(bx, by)) <= 1;
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
    .map((o) => ({
      kind: 'static', type: o.type as StaticType, x: o.x, y: o.y, torch: o.torch, roof: o.roof ?? undefined,
      shape: o.shape ?? undefined, rotation: o.rotation ?? undefined
    }));
  // 高さがない・知らない文字は0段
  const heights = Array.from({ length: map.height }, (_, y) =>
    Array.from({ length: map.width }, (_, x) => Math.min(MAX_HEIGHT, Math.max(0, Number(map.heights?.[y]?.[x] ?? 0) || 0)))
  );
  const area = new AreaMap(map.width, map.height, ground, statics, heights);
  for (const n of map.npcs) if (area.inMap(n.x, n.y)) area.solid[n.y][n.x] = true;
  return area;
}