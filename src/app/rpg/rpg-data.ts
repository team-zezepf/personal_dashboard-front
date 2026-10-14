// RPG(front#215)の定義データ。アイテム・敵の中身と、マップの見た目はフロントが持つ。
// エリアの地形などはマップのデータ(api#82)、ポイント交換所の品物と値段はAPIが持つ
import { RpgMap, RpgObjectContents } from '../models/rpg.models';
import { objectTiles } from './rpg-house';

// material: 素材(front#277)。使う・装備することはできず、クエストで集めたり、鍛冶屋で装備の合成に使ったりする
export type ItemType = 'use' | 'weapon' | 'armor' | 'material';

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
  star_robe: { name: '星のローブ', icon: '✨', type: 'armor', def: 16, desc: 'ポイント交換限定' },
  // 鍛冶屋で合成してだけ手に入る装備(front#277)
  fang_sword: { name: '牙の剣', icon: '🗡️', type: 'weapon', atk: 16, desc: '鍛冶屋で合成' },
  black_sword: { name: '黒鉄の剣', icon: '⚔️', type: 'weapon', atk: 28, desc: '鍛冶屋で合成' },
  dark_sword: { name: '闇の剣', icon: '🗡️', type: 'weapon', atk: 38, desc: '鍛冶屋で合成' },
  dragon_sword: { name: '竜牙の剣', icon: '🔱', type: 'weapon', atk: 46, desc: '鍛冶屋で合成' },
  jelly_robe: { name: 'ゼリーの服', icon: '👘', type: 'armor', def: 4, desc: '鍛冶屋で合成' },
  forest_robe: { name: '森の衣', icon: '🥻', type: 'armor', def: 9, desc: '鍛冶屋で合成' },
  bone_mail: { name: '骨の鎧', icon: '🦺', type: 'armor', def: 15, desc: '鍛冶屋で合成' },
  dragon_mail: { name: '竜鱗の鎧', icon: '🛡️', type: 'armor', def: 26, desc: '鍛冶屋で合成' },
  // 素材(front#277)。最初からいる敵ごとに1つ(どの敵が落とすかは「敵」タブで決める)
  slime_jelly: { name: 'スライムゼリー', icon: '💧', type: 'material', desc: 'スライムが落とす' },
  mushroom_spore: { name: 'キノコの胞子', icon: '🍄', type: 'material', desc: 'キノコンが落とす' },
  spirit_light: { name: '精霊の光', icon: '💫', type: 'material', desc: 'もりのせいれいが落とす' },
  raptor_fang: { name: '恐竜の牙', icon: '🦷', type: 'material', desc: 'ラプトルが落とす' },
  golem_stone: { name: '岩のかけら', icon: '🧱', type: 'material', desc: 'いわゴーレムが落とす' },
  ghost_cloth: { name: '霊の布', icon: '🧣', type: 'material', desc: 'ゴーストが落とす' },
  black_iron: { name: '黒鉄のかけら', icon: '🔩', type: 'material', desc: 'ダークナイトが落とす' },
  dark_gem: { name: '闇の魔石', icon: '🔮', type: 'material', desc: '闇の魔導士が落とす' },
  bat_wing: { name: 'コウモリの翼', icon: '🦇', type: 'material', desc: 'ナイトバットが落とす' },
  old_bone: { name: '古い骨', icon: '🦴', type: 'material', desc: 'ガイコツ兵が落とす' },
  poison_petal: { name: '毒の花びら', icon: '🌺', type: 'material', desc: 'ひとくいそうが落とす' },
  dragon_scale: { name: '竜のうろこ', icon: '🐉', type: 'material', desc: 'レッドドラゴンが落とす' },
  mimic_tongue: { name: 'ミミックの舌', icon: '👅', type: 'material', desc: 'ミミックが落とす' },
  magic_scrap: { name: '魔法の鉄くず', icon: '⚙️', type: 'material', desc: 'リビングアーマーが落とす' }
};

/** 鍛冶屋の合成のレシピ(front#277)。素材とゴールドを払って、装備(result)を1つ作る */
export interface Recipe {
  result: string;
  materials: { id: string; count: number }[];
  gold: number;
}

export const RECIPES: Recipe[] = [
  { result: 'jelly_robe', materials: [{ id: 'slime_jelly', count: 5 }], gold: 20 },
  { result: 'fang_sword', materials: [{ id: 'raptor_fang', count: 3 }, { id: 'golem_stone', count: 2 }], gold: 120 },
  { result: 'forest_robe', materials: [{ id: 'mushroom_spore', count: 3 }, { id: 'spirit_light', count: 3 }], gold: 80 },
  { result: 'bone_mail', materials: [{ id: 'old_bone', count: 5 }, { id: 'bat_wing', count: 3 }], gold: 300 },
  { result: 'black_sword', materials: [{ id: 'black_iron', count: 4 }, { id: 'old_bone', count: 3 }, { id: 'magic_scrap', count: 1 }], gold: 500 },
  { result: 'dark_sword', materials: [{ id: 'dark_gem', count: 2 }, { id: 'black_iron', count: 3 }, { id: 'ghost_cloth', count: 2 }], gold: 900 },
  { result: 'dragon_sword', materials: [{ id: 'dragon_scale', count: 3 }, { id: 'raptor_fang', count: 4 }, { id: 'dark_gem', count: 1 }], gold: 1500 },
  { result: 'dragon_mail', materials: [{ id: 'dragon_scale', count: 4 }, { id: 'dark_gem', count: 2 }, { id: 'mimic_tongue', count: 1 }], gold: 1600 }
];

/** 素材のID(持ち物・「敵」タブ・クエストで使う) */
export const MATERIAL_IDS = Object.keys(ITEMS).filter((id) => ITEMS[id].type === 'material');

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
export const G = { GRASS: 0, FLOWER: 1, PATH: 2, WATER: 3, BRIDGE: 4, SAND: 5, VOID: 6, TILE: 7, BRICK: 8 } as const;

// マップのデータの地面の文字(g:草 f:花 p:道 w:水 b:橋 s:砂 v:なし t:タイル r:レンガ)
export const GROUND_CHARS = ['g', 'f', 'p', 'w', 'b', 's', 'v', 't', 'r'];

export type StaticType = 'tree' | 'rock' | 'house' | 'cliff' | 'fern' | 'crystal' | 'pillar' | 'volcano' | 'grass' | 'chest' | 'armor' | 'wall'
  | 'barrel' | 'pot' | 'bones' | 'bookshelf' | 'candle' | 'grave' | 'sign';
export const STATIC_TYPES: StaticType[] = [
  'tree', 'rock', 'house', 'cliff', 'fern', 'crystal', 'pillar', 'volcano', 'grass', 'chest', 'armor', 'wall', 'barrel', 'pot', 'bones', 'bookshelf', 'candle', 'grave', 'sign'
];

// 攻撃で壊れる置物と、壊すのに必要な攻撃の回数(front#264)。宝箱・甲冑(front#266)、たる・つぼ・骨の山(front#270)。ほかの置物は壊れない
export const BREAK_HITS: Partial<Record<StaticType, number>> = { grass: 1, fern: 1, crystal: 2, rock: 3, chest: 1, armor: 3, barrel: 1, pot: 1, bones: 1 };
export const isBreakable = (type: string): boolean => !!BREAK_HITS[type as StaticType];
// 中身が消えて(アイテムを取る・敵を倒す・中身なしは壊れて)から、元に戻るまでの秒数
export const BREAK_RESPAWN_SEC = 10;
export const STATIC_NAMES: Record<StaticType, string> = {
  tree: '木', rock: '岩', house: '家', cliff: '崖', fern: 'シダ', crystal: '水晶', pillar: '柱', volcano: '火山', grass: '草むら', chest: '宝箱', armor: '甲冑', wall: '壁',
  barrel: 'たる', pot: 'つぼ', bones: '骨の山', bookshelf: '本棚', candle: '燭台', grave: '墓石', sign: '看板'
};

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
  lowRoof?: boolean;
  // 壁の色と窓なし(front#250)
  wall?: string;
  noWindow?: boolean;
  // 壊れる置物の中身と、ゲームの中での状態(front#264)。hits: 受けた攻撃の回数、broken: 壊れている、
  // respawnIn: 元に戻るまでの残りの秒数(中身の敵が生きている間は null)、shake: 叩かれてゆれる量、fade: 戻るときの濃さ(0〜1)
  contents?: RpgObjectContents;
  hits?: number;
  broken?: boolean;
  respawnIn?: number | null;
  shake?: number;
  fade?: number;
}

/**
 * 本棚(front#270)の向き。左上のとなりが「なし」か壁なら右下('x')、そうでなく右上のとなりが「なし」か壁なら左下('y')を向く。
 * 壁ぎわに置くと、いつも部屋の内側を向く。どちらでもなければ右下
 */
export function shelfFace(map: Pick<AreaMap, 'inMap' | 'ground' | 'statics'>, o: Pick<StaticObj, 'x' | 'y'>): 'x' | 'y' {
  const back = (x: number, y: number) =>
    !map.inMap(x, y) || map.ground[y][x] === G.VOID || map.statics.some((s) => s.type === 'wall' && s.x === x && s.y === y);
  return !back(o.x - 1, o.y) && back(o.x, o.y - 1) ? 'y' : 'x';
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
  // タイル(石畳)の石・目地の色と、レンガ・目地の色(front#254)。石・レンガは3色を混ぜて並べる
  tile: { stone: [string, string, string]; grout: string };
  brick: { brick: [string, string, string]; mortar: string };
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
    tile: { stone: ['#dcd7ca', '#d2ccbd', '#e3dfd3'], grout: '#aaa392' }, brick: { brick: ['#c96a4c', '#bd5f43', '#d07455'], mortar: '#ead9bf' },
    liquid: waterColor(200, 56, 4), wave: 'rgba(255,255,255,0.45)',
    flower: 'flower', flowers: ['#ff7eb6', '#fff176', '#ffffff'], edge: ['#a0754d', '#7f5a3a'],
    tree: GREEN_TREE, rock: ['#9aa3ad', '#b7bec6']
  },
  forest: {
    label: '森', liquidName: '泉',
    sky: ['#123c3a', '#2f7d6d'], grass: ['#5fae73', '#58a66c', '#64b679'], path: ['#c9b48a', '#c2ad82'], sand: '#8fc89a',
    tile: { stone: ['#9db2a0', '#93a895', '#a7bba9'], grout: '#5f8a66' }, brick: { brick: ['#8e6c55', '#83624c', '#977560'], mortar: '#8fb47f' },
    liquid: waterColor(178, 58, 5), wave: 'rgba(220,255,255,0.7)',
    flower: 'glow', flowers: ['#b4f8ff', '#e9d5ff', '#fdffb6'], edge: ['#6b4f33', '#57402a'],
    tree: { trunk: '#5b3a29', leaves: ['#1f7a5c', '#23896a', '#36a882'], scale: 1.25 }, rock: ['#7d8a86', '#9aa8a3'],
    vignette: 'rgba(5,40,35,0.45)', fireflies: true
  },
  valley: {
    label: '谷', liquidName: '溶岩',
    sky: ['#f59e5b', '#fde2b6'], grass: ['#c9a46c', '#c19c63', '#d0ab74'], path: ['#a98457', '#a27d50'], sand: '#6b4a32',
    tile: { stone: ['#dcb98d', '#d2ae82', '#e3c398'], grout: '#9a7550' }, brick: { brick: ['#a4512f', '#97492a', '#ae5a36'], mortar: '#d6b588' },
    liquid: (x, y, time) => `hsl(${18 + Math.sin(time * 2 + x + y) * 8}, 95%, ${50 + Math.sin(time * 3 + x * 0.7 + y * 0.4) * 6}%)`,
    wave: 'rgba(255,230,120,0.8)', flower: 'tuft', flowers: ['#7a9a3a', '#8fb045', '#6b8a30'], edge: ['#7c4f2c', '#5f3b20'],
    tree: GREEN_TREE, rock: ['#8a5a3c', '#a97450']
  },
  tower: {
    label: '塔', liquidName: '闇',
    sky: ['#0b0820', '#2a2255'], grass: ['#5b5770', '#56526a', '#615c77'], path: ['#8b1e3f', '#7d1a38'], sand: '#4a4660',
    tile: { stone: ['#4d4869', '#46415f', '#554f72'], grout: '#25222f' }, brick: { brick: ['#5e2c42', '#55283b', '#68324a'], mortar: '#25222f' },
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

/**
 * 端の行き先。to は行き先のエリア、link は「ほかのダンジョンへの端のつながり(front#274)」か。
 * 同じダンジョンの隣のエリアへは横にすべって、ほかのダンジョンへは画面が暗くなって移る
 */
export interface AreaExit {
  side: Side;
  to: RpgMap;
  link: boolean;
}

/** area の side の端の行き先。同じダンジョンの隣のエリアがあればそこ、なければ端のつながりのエリア(なければ null) */
export function exitOf(maps: readonly RpgMap[], area: RpgMap, side: Side): AreaExit | null {
  const next = neighborOf(maps, area, side);
  if (next) return { side, to: next, link: false };
  const link = (area.links ?? []).find((l) => l.dx === side[0] && l.dy === side[1]);
  // 行き先のエリアがなくなった・同じダンジョンのエリアになったつながりは使わない
  const to = link && maps.find((m) => m.id === link.to && m.dungeonId !== area.dungeonId);
  return to ? { side, to, link: true } : null;
}

// (x, y) がその向きの端のマスか
const onEdge = (area: Pick<RpgMap, 'width' | 'height'>, [dx, dy]: Side, x: number, y: number) =>
  (dx === 1 && x === area.width - 1) || (dx === -1 && x === 0) || (dy === 1 && y === area.height - 1) || (dy === -1 && y === 0);

/** 端のマス(x, y)が出口なら、その行き先(隣のエリア・端のつながり)。出口でなければ null */
export function exitAt(maps: readonly RpgMap[], area: RpgMap, x: number, y: number): AreaExit | null {
  for (const side of SIDES) {
    if (!onEdge(area, side, x, y)) continue;
    const exit = exitOf(maps, area, side);
    if (exit) return exit;
  }
  return null;
}

/**
 * 端のつながり(front#274)で、from の端のマス(x, y)から行き先(to)へ移ったときに立つマス。
 * 行き先の、from へ戻るつながりのある端の1マス内側のうち、端のマスも通れるマスで、
 * 出てきた位置と端の上で同じ割合の位置にいちばん近いマス。端が道・橋のマス(道の出口)があれば、その中から選ぶ。戻る端がない・通れるマスがなければ、行き先の出発地点
 */
export function linkArrival(maps: readonly RpgMap[], from: RpgMap, fromSide: Side, x: number, y: number, to: RpgMap, toMap: AreaMap): [number, number] {
  const back = SIDES.find((s) => exitOf(maps, to, s)?.to.id === from.id && exitOf(maps, to, s)?.link);
  if (!back) return [to.startX, to.startY];
  const [dx, dy] = back;
  // 端に沿った位置の割合(0〜1)
  const ratio = fromSide[0] !== 0 ? y / Math.max(1, from.height - 1) : x / Math.max(1, from.width - 1);
  const len = dx !== 0 ? to.height : to.width;
  const want = Math.round(ratio * (len - 1));
  // 端のマスと1マス内側がどちらも通れるマス。端が道・橋のマス(道の出口)があれば、その中から選ぶ
  const open: [number, number][] = [];
  const road: [number, number][] = [];
  for (let i = 0; i < len; i++) {
    const edge: [number, number] = dx !== 0 ? [dx === 1 ? to.width - 1 : 0, i] : [i, dy === 1 ? to.height - 1 : 0];
    const inner: [number, number] = [edge[0] - dx, edge[1] - dy];
    if (!toMap.walkable(...edge) || !toMap.walkable(...inner)) continue;
    open.push(inner);
    const g = toMap.ground[edge[1]][edge[0]];
    if (g === G.PATH || g === G.BRIDGE) road.push(inner);
  }
  const along = ([ix, iy]: [number, number]) => Math.abs((dx !== 0 ? iy : ix) - want);
  const best = (road.length ? road : open).sort((a, b) => along(a) - along(b))[0];
  return best ?? [to.startX, to.startY];
}

/** 看板(front#274)が指す、いちばん近い「ほかのダンジョンへの端」。そのエリアにほかのダンジョンへの端がなければ null */
export function signExit(maps: readonly RpgMap[], area: RpgMap, x: number, y: number): AreaExit | null {
  const dist = ([dx, dy]: Side) => (dx === 1 ? area.width - 1 - x : dx === -1 ? x : dy === 1 ? area.height - 1 - y : y);
  const exits = SIDES.map((s) => exitOf(maps, area, s)).filter((e): e is AreaExit => !!e?.link);
  return exits.sort((a, b) => dist(a.side) - dist(b.side))[0] ?? null;
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
      shape: o.shape ?? undefined, rotation: o.rotation ?? undefined, lowRoof: o.lowRoof ?? undefined,
      wall: o.wall ?? undefined, noWindow: o.noWindow ?? undefined,
      contents: isBreakable(o.type) ? (o.contents ?? undefined) : undefined
    }));
  // 高さがない・知らない文字は0段
  const heights = Array.from({ length: map.height }, (_, y) =>
    Array.from({ length: map.width }, (_, x) => Math.min(MAX_HEIGHT, Math.max(0, Number(map.heights?.[y]?.[x] ?? 0) || 0)))
  );
  const area = new AreaMap(map.width, map.height, ground, statics, heights);
  for (const n of map.npcs) if (area.inMap(n.x, n.y)) area.solid[n.y][n.x] = true;
  return area;
}