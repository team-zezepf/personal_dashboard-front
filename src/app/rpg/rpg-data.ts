// RPG(front#215)の定義データ。マップの見た目はフロントが持つ。アイテム(api#163)・敵・合成の装備は、APIから読んで入れ替える。
// エリアの地形などはマップのデータ(api#82)、ポイント交換所の品物と値段はAPIが持つ
import { RpgAreaMove, RpgChanceEnemy, RpgChanceItem, RpgCraft, RpgDungeon, RpgItem, RpgItemType, RpgMap, RpgMapObject, RpgObjectDef } from '../models/rpg.models';
import { signal } from '@angular/core';
import { objectTiles } from './rpg-house';

// material: 素材(front#277)。使う・装備することはできず、クエストで集めたり、鍛冶屋で装備の合成に使ったりする
export type ItemType = RpgItemType;

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

/**
 * 最初のアイテム(api#163 の default_items.json と同じ)。APIから読めないとき・まだ読んでいないときに使う。
 * アイテムはマップ作成画面の「アイテム」タブで作る・直す(front#343)。setItems で入れ替える
 */
export const DEFAULT_ITEMS: RpgItem[] = [
  { id: 'potion', name: '回復薬', icon: '🧪', type: 'use', heal: 35, desc: 'HPを35回復', inShop: true, price: 10, sortOrder: 1 },
  { id: 'hipotion', name: '上回復薬', icon: '⚗️', type: 'use', heal: 120, desc: 'HPを120回復', inShop: true, price: 35, sortOrder: 2 },
  { id: 'wood_sword', name: '木の剣', icon: '🗡️', type: 'weapon', atk: 2, inShop: false, sortOrder: 3 },
  { id: 'copper_sword', name: '銅の剣', icon: '🗡️', type: 'weapon', atk: 6, inShop: true, price: 45, sortOrder: 4 },
  { id: 'iron_sword', name: '鉄の剣', icon: '⚔️', type: 'weapon', atk: 12, inShop: true, price: 140, sortOrder: 5 },
  { id: 'steel_sword', name: '鋼の剣', icon: '⚔️', type: 'weapon', atk: 22, inShop: true, price: 420, sortOrder: 6 },
  { id: 'mithril_sword', name: 'ミスリルの剣', icon: '🔱', type: 'weapon', atk: 34, inShop: true, price: 1200, sortOrder: 7 },
  { id: 'star_sword', name: '星の剣', icon: '🌟', type: 'weapon', atk: 26, desc: 'ポイント交換限定', inShop: false, sortOrder: 8 },
  { id: 'cloth', name: '布の服', icon: '👕', type: 'armor', def: 1, inShop: false, sortOrder: 9 },
  { id: 'leather', name: '革の鎧', icon: '🦺', type: 'armor', def: 5, inShop: true, price: 60, sortOrder: 10 },
  { id: 'chain_mail', name: 'くさりかたびら', icon: '🛡️', type: 'armor', def: 10, inShop: true, price: 260, sortOrder: 11 },
  { id: 'magic_armor', name: '魔法の鎧', icon: '💠', type: 'armor', def: 18, inShop: true, price: 800, sortOrder: 12 },
  { id: 'star_robe', name: '星のローブ', icon: '✨', type: 'armor', def: 16, desc: 'ポイント交換限定', inShop: false, sortOrder: 13 },
  { id: 'slime_jelly', name: 'スライムゼリー', icon: '💧', type: 'material', desc: 'スライムが落とす', inShop: false, sortOrder: 14 },
  { id: 'mushroom_spore', name: 'キノコの胞子', icon: '🍄', type: 'material', desc: 'キノコンが落とす', inShop: false, sortOrder: 15 },
  { id: 'spirit_light', name: '精霊の光', icon: '💫', type: 'material', desc: 'もりのせいれいが落とす', inShop: false, sortOrder: 16 },
  { id: 'raptor_fang', name: '恐竜の牙', icon: '🦷', type: 'material', desc: 'ラプトルが落とす', inShop: false, sortOrder: 17 },
  { id: 'golem_stone', name: '岩のかけら', icon: '🧱', type: 'material', desc: 'いわゴーレムが落とす', inShop: false, sortOrder: 18 },
  { id: 'ghost_cloth', name: '霊の布', icon: '🧣', type: 'material', desc: 'ゴーストが落とす', inShop: false, sortOrder: 19 },
  { id: 'black_iron', name: '黒鉄のかけら', icon: '🔩', type: 'material', desc: 'ダークナイトが落とす', inShop: false, sortOrder: 20 },
  { id: 'dark_gem', name: '闇の魔石', icon: '🔮', type: 'material', desc: '闇の魔導士が落とす', inShop: false, sortOrder: 21 },
  { id: 'bat_wing', name: 'コウモリの翼', icon: '🦇', type: 'material', desc: 'ナイトバットが落とす', inShop: false, sortOrder: 22 },
  { id: 'old_bone', name: '古い骨', icon: '🦴', type: 'material', desc: 'ガイコツ兵が落とす', inShop: false, sortOrder: 23 },
  { id: 'poison_petal', name: '毒の花びら', icon: '🌺', type: 'material', desc: 'ひとくいそうが落とす', inShop: false, sortOrder: 24 },
  { id: 'dragon_scale', name: '竜のうろこ', icon: '🐉', type: 'material', desc: 'レッドドラゴンが落とす', inShop: false, sortOrder: 25 },
  { id: 'mimic_tongue', name: 'ミミックの舌', icon: '👅', type: 'material', desc: 'ミミックが落とす', inShop: false, sortOrder: 26 },
  { id: 'magic_scrap', name: '魔法の鉄くず', icon: '⚙️', type: 'material', desc: 'リビングアーマーが落とす', inShop: false, sortOrder: 27 },
  { id: 'rabbit_horn', name: 'ウサギのつの', icon: '🦄', type: 'material', desc: 'つのウサギが落とす', inShop: false, sortOrder: 28 },
  { id: 'honey', name: 'はちみつ', icon: '🍯', type: 'material', desc: 'ミツバチンが落とす', inShop: false, sortOrder: 29 },
  { id: 'rat_tail', name: 'ネズミのしっぽ', icon: '🐀', type: 'material', desc: 'ドブネズミが落とす', inShop: false, sortOrder: 30 },
  { id: 'rusty_key', name: '錆びた鍵', icon: '🗝️', type: 'material', desc: '看守が落とす', inShop: false, sortOrder: 31 },
  { id: 'iron_chain', name: '鉄の鎖', icon: '⛓️', type: 'material', desc: '囚われの亡霊が落とす', inShop: false, sortOrder: 32 },
  { id: 'cursed_page', name: '呪われた頁', icon: '📜', type: 'material', desc: '浮かぶ魔導書が落とす', inShop: false, sortOrder: 33 },
  { id: 'shadow_shard', name: '影のかけら', icon: '🌑', type: 'material', desc: '影の分身が落とす', inShop: false, sortOrder: 34 },
  { id: 'dark_crystal', name: '闇の結晶片', icon: '🔷', type: 'material', desc: '闇の水晶が落とす', inShop: false, sortOrder: 35 },
  { id: 'gargoyle_wing', name: 'ガーゴイルの翼', icon: '🗿', type: 'material', desc: 'ガーゴイルが落とす', inShop: false, sortOrder: 36 }
];

/** アイテム(合成の装備も含む)。setItems・setCrafts で中身を入れ替える(使っている所はそのまま新しい中身を使える) */
export const ITEMS: Record<string, ItemDef> = {};

/** 鍛冶屋の合成のレシピ(front#277)。素材とゴールドを払って、装備(result)を1つ作る */
export interface Recipe {
  result: string;
  materials: { id: string; count: number }[];
  gold: number;
}

/** 鍛冶屋のレシピ(鍛冶屋に並ぶ順)。setCrafts で中身を入れ替える */
export const RECIPES: Recipe[] = [];

/**
 * 合成の装備とレシピの最初の8つ(api#134 の default_crafts.json と同じ)。
 * APIから読めないとき・まだ読んでいないときに使う
 */
const craft = (id: string, name: string, icon: string, type: 'weapon' | 'armor', power: number, gold: number, materials: [string, number][], sortOrder: number): RpgCraft =>
  ({ id, name, icon, type, power, gold, materials: materials.map(([itemId, count]) => ({ itemId, count })), sortOrder });
export const DEFAULT_CRAFTS: RpgCraft[] = [
  craft('jelly_robe', 'ゼリーの服', '👘', 'armor', 4, 20, [['slime_jelly', 5]], 1),
  craft('fang_sword', '牙の剣', '🗡️', 'weapon', 16, 120, [['raptor_fang', 3], ['golem_stone', 2]], 2),
  craft('forest_robe', '森の衣', '🥻', 'armor', 9, 80, [['mushroom_spore', 3], ['spirit_light', 3]], 3),
  craft('bone_mail', '骨の鎧', '🦺', 'armor', 15, 300, [['old_bone', 5], ['bat_wing', 3]], 4),
  craft('black_sword', '黒鉄の剣', '⚔️', 'weapon', 28, 500, [['black_iron', 4], ['old_bone', 3], ['magic_scrap', 1]], 5),
  craft('dark_sword', '闇の剣', '🗡️', 'weapon', 38, 900, [['dark_gem', 2], ['black_iron', 3], ['ghost_cloth', 2]], 6),
  craft('dragon_sword', '竜牙の剣', '🔱', 'weapon', 46, 1500, [['dragon_scale', 3], ['raptor_fang', 4], ['dark_gem', 1]], 7),
  craft('dragon_mail', '竜鱗の鎧', '🛡️', 'armor', 26, 1600, [['dragon_scale', 4], ['dark_gem', 2], ['mimic_tongue', 1]], 8)
];

/** 素材のID(持ち物・「敵」タブ・クエストで使う)。setItems で中身を入れ替える */
export const MATERIAL_IDS: string[] = [];

/** 道具屋に並ぶアイテムのID(並ぶ順)。setItems で中身を入れ替える */
export const SHOP_ITEMS: string[] = [];

// 合成の装備のID(ITEMS のうち setCrafts で足したもの)
const craftItemIds = new Set<string>();

/** 合成の装備のIDか(管理画面で、お店・ポイント交換の装備と分けるのに使う) */
export const isCraftItem = (id: string) => craftItemIds.has(id);

// 今のアイテムと合成の装備(どちらかを入れ替えたら、両方から ITEMS を作り直す)
let currentItems: RpgItem[] = DEFAULT_ITEMS;
let currentCrafts: RpgCraft[] = DEFAULT_CRAFTS;

/** APIのアイテムを、ゲームで使う形にする。種類に関係ない値と、売らないアイテムの値段は持たない */
export function toItemDef(item: RpgItem): ItemDef {
  return {
    name: item.name,
    icon: item.icon,
    type: item.type,
    ...(item.type === 'use' ? { heal: item.heal ?? 0 } : {}),
    ...(item.type === 'weapon' ? { atk: item.atk ?? 0 } : {}),
    ...(item.type === 'armor' ? { def: item.def ?? 0 } : {}),
    ...(item.inShop ? { price: item.price ?? 0 } : {}),
    ...(item.desc ? { desc: item.desc } : {})
  };
}

/**
 * ITEMS・RECIPES・MATERIAL_IDS・SHOP_ITEMS を、今のアイテムと合成の装備から作り直す。
 * 中身を入れ替えるだけなので、使っている所(持ち物・お店・鍛冶屋・描画)はそのまま新しい中身を使える
 */
/** ITEMS を作り直すたびに増える。管理画面のアイテムの選択欄は、これを見て作り直す */
export const itemsVersion = signal(0);

function rebuild(): void {
  for (const id of Object.keys(ITEMS)) delete ITEMS[id];
  craftItemIds.clear();
  RECIPES.length = 0;
  const items = [...currentItems].sort((a, b) => a.sortOrder - b.sortOrder);
  for (const item of items) ITEMS[item.id] = toItemDef(item);
  for (const c of [...currentCrafts].sort((a, b) => a.sortOrder - b.sortOrder)) {
    // 回復薬など、アイテムと同じIDは使わない
    if (ITEMS[c.id]) continue;
    ITEMS[c.id] = { name: c.name, icon: c.icon, type: c.type, ...(c.type === 'weapon' ? { atk: c.power } : { def: c.power }), desc: '鍛冶屋で合成' };
    craftItemIds.add(c.id);
    RECIPES.push({ result: c.id, materials: c.materials.map((m) => ({ id: m.itemId, count: m.count })), gold: c.gold });
  }
  MATERIAL_IDS.splice(0, MATERIAL_IDS.length, ...items.filter((i) => i.type === 'material').map((i) => i.id));
  SHOP_ITEMS.splice(0, SHOP_ITEMS.length, ...items.filter((i) => i.inShop && i.type !== 'material').map((i) => i.id));
  itemsVersion.update((v) => v + 1);
}

/** アイテムを入れ替える(front#343)。ゲーム・管理画面がAPIから読んだもので呼ぶ。合成の装備より先に呼ぶ */
export function setItems(list: RpgItem[]): void {
  currentItems = list;
  rebuild();
}

/** 合成の装備とレシピを入れ替える(front#288)。ゲーム・管理画面がAPIから読んだもので呼ぶ */
export function setCrafts(list: RpgCraft[]): void {
  currentCrafts = list;
  rebuild();
}

rebuild();

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
// 攻撃の間隔(秒): 1.10 → 0.325(front#286)
export const attackIntervalOf = (s: Stats) => 1.1 - 0.775 * rate99(s.spd);
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
  | 'barrel' | 'pot' | 'bones' | 'bookshelf' | 'candle' | 'grave' | 'sign' | 'bars' | 'shackle' | 'bucket' | 'save_point';
export const STATIC_TYPES: StaticType[] = [
  'tree', 'rock', 'house', 'cliff', 'fern', 'crystal', 'pillar', 'volcano', 'grass', 'chest', 'armor', 'wall', 'barrel', 'pot', 'bones', 'bookshelf', 'candle', 'grave', 'sign', 'bars', 'shackle', 'bucket', 'save_point'
];

// 攻撃で壊れる置物と、壊すのに必要な攻撃の回数(front#264)。宝箱・甲冑(front#266)、たる・つぼ・骨の山(front#270)、木のおけ(front#321)。ほかの置物は壊れない
export const BREAK_HITS: Partial<Record<StaticType, number>> = { grass: 1, fern: 1, crystal: 2, rock: 3, chest: 1, armor: 3, barrel: 1, pot: 1, bones: 1, bucket: 1 };
export const isBreakable = (type: string): boolean => !!BREAK_HITS[type as StaticType];
// 叩いたときの音の素材(front#282)。叩ける(壊れる)置物ごと
export const OBJECT_HIT_MATERIAL: Partial<Record<StaticType, 'stone' | 'wood' | 'grass'>> = {
  grass: 'grass', fern: 'grass', rock: 'stone', crystal: 'stone', armor: 'stone', pot: 'stone', bones: 'stone', chest: 'wood', barrel: 'wood', bucket: 'wood'
};
// 中身が消えて(アイテムを取る・敵を倒す・中身なしは壊れて)から、元に戻るまでの秒数
export const BREAK_RESPAWN_SEC = 10;
// セーブポイント(front#337)。調べると、そのとき立っていたマスが、たおれたときに戻る復活地点になる
export const SAVE_POINT = 'save_point';
export const STATIC_NAMES: Record<StaticType, string> = {
  tree: '木', rock: '岩', house: '家', cliff: '崖', fern: 'シダ', crystal: '水晶', pillar: '柱', volcano: '火山', grass: '草むら', chest: '宝箱', armor: '甲冑', wall: '壁',
  barrel: 'たる', pot: 'つぼ', bones: '骨の山', bookshelf: '本棚', candle: '燭台', grave: '墓石', sign: '看板',
  bars: '鉄格子', shackle: '鎖の杭', bucket: '木のおけ', save_point: 'セーブポイント'
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
  // 置いた置物1つずつの設定(front#333)。なければ置物の種類のデフォルト(objectSettingsOf でまとめて読む)
  color?: string;
  dark?: string;
  items?: RpgChanceItem[];
  enemies?: RpgChanceEnemy[];
  mimics?: RpgChanceEnemy[];
  hitMaterial?: string;
  showMessage?: boolean;
  signDir?: string;
  // 擬態している敵がこの置物のふりをしている(front#333)。置物そのものは描かず、通れる(敵が置物の絵で立つ)
  mimicked?: boolean;
  // 壊れる置物のゲームの中での状態(front#264)。hits: 受けた攻撃の回数、broken: 壊れている、
  // respawnIn: 元に戻るまでの残りの秒数(出てきた敵が生きている間は null)、shake: 叩かれてゆれる量、fade: 戻るときの濃さ(0〜1)
  hits?: number;
  broken?: boolean;
  respawnIn?: number | null;
  shake?: number;
  fade?: number;
  // 看板の文章(front#314)・クリック時に表示するメッセージ(front#333)
  lines?: string[];
}

// ===== 置物の設定(front#333) =====

/** 置物の種類ごとのデフォルト。「置物」タブ・ゲームが API から読んで setObjectDefs で入れる。ない種類は何も決めていない */
export const OBJECT_DEFS: Record<string, RpgObjectDef> = {};

export function setObjectDefs(list: readonly RpgObjectDef[]): void {
  for (const key of Object.keys(OBJECT_DEFS)) delete OBJECT_DEFS[key];
  for (const d of list) OBJECT_DEFS[d.type] = d;
}

/** デフォルトを決められる置物(家・看板は置いたあとに一つずつ決めるので除く。API の RpgObjectService.TYPES と同じ) */
export const OBJECT_DEF_TYPES: StaticType[] = STATIC_TYPES.filter((t) => t !== 'house' && t !== 'sign');

/** テーマ(草原・森・谷・塔)で色が変わる置物。色を決めていなければ、テーマの色で描く */
export const THEMED_OBJECTS: StaticType[] = ['tree', 'rock', 'wall'];

/**
 * 色を決めていない置物の、今の明るい色・暗い色(「置物」タブ・モーダルで最初に選んでおく色)。
 * 素材が2つある置物は、明るい色 = おもな素材(たるの木・宝箱の木・甲冑の鎧)、暗い色 = もう1つ(鉄の輪・金具・羽飾り)
 */
export const DEFAULT_TINTS: Partial<Record<StaticType, { m: string; d: string }>> = {
  cliff: { m: '#a47148', d: '#7d5232' }, fern: { m: '#76a84a', d: '#5f8f3a' }, crystal: { m: '#7ef9ff', d: '#3fd3e6' },
  pillar: { m: '#6b6785', d: '#3a3650' }, volcano: { m: '#8a5a3c', d: '#5b3a29' }, grass: { m: '#6cb84f', d: '#4f9a3c' },
  chest: { m: '#a8682f', d: '#f2c14e' }, armor: { m: '#94a3b8', d: '#dc2626' }, barrel: { m: '#9a6230', d: '#4b5563' },
  pot: { m: '#c8693a', d: '#8f4322' }, bones: { m: '#efeadb', d: '#7c7363' }, bookshelf: { m: '#7a4b25', d: '#5e3a1c' },
  candle: { m: '#71717a', d: '#3f3f46' }, grave: { m: '#9ca3af', d: '#6b7280' }, bars: { m: '#6b6880', d: '#1f1d2b' },
  shackle: { m: '#6b6880', d: '#1f1d2b' }, bucket: { m: '#966131', d: '#3f3f46' },
  // セーブポイント(front#337)。明るい色 = 光る石、暗い色 = 台座
  save_point: { m: '#8b5cf6', d: '#9ca3af' }
};

/** 置物の設定(置いた1つずつの設定と、種類のデフォルトをまとめたもの) */
export interface ObjectSettings {
  // 色合い。なければ今の色(テーマで変わる置物はテーマの色)
  color: string | null;
  dark: string | null;
  items: RpgChanceItem[];
  enemies: RpgChanceEnemy[];
  mimics: RpgChanceEnemy[];
  hitMaterial: string;
  showMessage: boolean;
  lines: string[];
}

type ObjectLike = Pick<RpgMapObject, 'type' | 'color' | 'dark' | 'items' | 'enemies' | 'mimics' | 'hitMaterial' | 'showMessage' | 'lines'>;

/**
 * 置物の設定。置いた置物で決めていない項目は種類のデフォルトを使う。
 * メッセージを表示する置物は壊せず擬態もしないので、出てくるアイテム・敵・擬態はなし。出てくるアイテム・敵は壊れる置物だけ
 */
export function objectSettingsOf(o: ObjectLike): ObjectSettings {
  const def = OBJECT_DEFS[o.type];
  // セーブポイント(front#337)は調べると復活地点になるので、メッセージを表示せず、擬態もしない
  const savePoint = o.type === SAVE_POINT;
  const showMessage = o.type !== 'sign' && !savePoint && !!o.showMessage;
  const breakable = isBreakable(o.type) && !showMessage;
  return {
    color: o.color ?? def?.color ?? null,
    dark: o.dark ?? def?.dark ?? null,
    items: breakable ? (o.items ?? def?.items ?? []) : [],
    enemies: breakable ? (o.enemies ?? def?.enemies ?? []) : [],
    mimics: showMessage || savePoint ? [] : (o.mimics ?? def?.mimics ?? []),
    hitMaterial: o.hitMaterial ?? def?.hitMaterial ?? OBJECT_HIT_MATERIAL[o.type as StaticType] ?? 'stone',
    showMessage,
    lines: showMessage ? (o.lines ?? []).map((l) => l.trim()).filter((l) => l) : []
  };
}

/** 置物の色合い(描くときに使う)。明るい色・暗い色のどちらも決めていなければ null(今の色)。片方だけなら、もう片方は今の色 */
export function objectTintOf(o: Pick<RpgMapObject, 'type' | 'color' | 'dark'>): { m: string; d: string } | null {
  const def = OBJECT_DEFS[o.type];
  const m = o.color ?? def?.color ?? null;
  const d = o.dark ?? def?.dark ?? null;
  if (!m && !d) return null;
  const base = DEFAULT_TINTS[o.type as StaticType];
  return { m: m ?? base?.m ?? d!, d: d ?? base?.d ?? m! };
}

/** 攻撃で壊れる置物か。メッセージを表示する置物は壊せない(front#333) */
export const isBreakableObj = (o: Pick<RpgMapObject, 'type' | 'showMessage'>): boolean => isBreakable(o.type) && !(o.type !== 'sign' && o.showMessage);

/** 擬態している敵を1体決める(front#333)。確率の合計は1まで、外れたら '' (ただの置物) */
export function pickMimic(list: readonly RpgChanceEnemy[], r = Math.random()): string {
  for (const m of list) {
    if (r < m.chance) return m.id;
    r -= m.chance;
  }
  return '';
}

/** 看板の矢印の向き(front#333)と、マップの向き(x・y)。右下・左下・左上・右上 */
export const SIGN_DIRS: [string, string, Side][] = [['se', '右下', [1, 0]], ['sw', '左下', [0, 1]], ['nw', '左上', [-1, 0]], ['ne', '右上', [0, -1]]];

/**
 * 看板が指す向きと、その先の「ほかのダンジョンへの端」(front#274 / front#333)。
 * 向きを決めていなければ自動(いちばん近いほかのダンジョンへの端)で、帯の色を付ける。決めていれば、その向きの端(ほかのダンジョンへの端なら案内に使う)
 */
export function signPointing(maps: readonly RpgMap[], area: RpgMap, o: Pick<RpgMapObject, 'x' | 'y' | 'signDir'>): { side: Side | null; exit: AreaExit | null; auto: boolean } {
  const dir = SIGN_DIRS.find(([k]) => k === o.signDir);
  if (dir) {
    const exit = exitOf(maps, area, dir[2]);
    return { side: dir[2], exit: exit?.link ? exit : null, auto: false };
  }
  const exit = signExit(maps, area, o.x, o.y);
  return { side: exit?.side ?? null, exit, auto: true };
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

/**
 * 鉄格子(front#321)の向き。左右(x)のとなりに壁か鉄格子があれば x の向き、なければ y の向きに並ぶ。
 * 続けて置くと1本の柵になり、壁と壁の間に置くと壁につながる
 */
export function barsAlong(map: Pick<AreaMap, 'statics'>, o: Pick<StaticObj, 'x' | 'y'>): 'x' | 'y' {
  const fence = (x: number, y: number) => map.statics.some((s) => (s.type === 'wall' || s.type === 'bars') && s.x === x && s.y === y);
  return fence(o.x - 1, o.y) || fence(o.x + 1, o.y) ? 'x' : 'y';
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
 * エリアの配置で、area をマス(x, y)へドラッグして離したときの位置の変更(front#301)。
 * ほかのエリアの上なら入れ替え、空いたマスならそこへ移す。
 * 空いたマスは、ほかのエリアと1辺でも接するときだけ(どこともつながらないエリアにしない)。置けなければ null
 */
export function areaDropMoves(maps: readonly RpgMap[], area: RpgMap, x: number, y: number): RpgAreaMove[] | null {
  if (area.gridX === x && area.gridY === y) return null;
  const others = maps.filter((m) => m.id !== area.id && m.dungeonId === area.dungeonId);
  const target = others.find((m) => m.gridX === x && m.gridY === y);
  if (target) {
    return [
      { id: area.id, gridX: x, gridY: y },
      { id: target.id, gridX: area.gridX, gridY: area.gridY }
    ];
  }
  const touches = SIDES.some(([dx, dy]) => others.some((m) => m.gridX === x + dx && m.gridY === y + dy));
  return touches ? [{ id: area.id, gridX: x, gridY: y }] : null;
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
 * 端のつながり(front#274)で、from の fromSide の端から行き先(to)へ移ったときに立つマス。
 * 行き先の、from へ戻るつながりのある端(なければ進んできた向きの反対側の端)の、着地できるマスの真ん中(front#339。edgeMiddle)
 */
export function linkArrival(maps: readonly RpgMap[], from: RpgMap, fromSide: Side, to: RpgMap, toMap: AreaMap): [number, number] {
  const back = SIDES.find((s) => exitOf(maps, to, s)?.to.id === from.id && exitOf(maps, to, s)?.link);
  return edgeMiddle(toMap, back ?? [-fromSide[0], -fromSide[1]]);
}

/**
 * map の side の端の「着地できるマス」(front#274 / front#337)。端のマスと1マス内側がどちらも通れるところの、1マス内側のマス。
 * 端に沿った順に並べる
 */
export function edgeLandings(map: AreaMap, [dx, dy]: Side): [number, number][] {
  const len = dx !== 0 ? map.h : map.w;
  const list: [number, number][] = [];
  for (let i = 0; i < len; i++) {
    const edge: [number, number] = dx !== 0 ? [dx === 1 ? map.w - 1 : 0, i] : [i, dy === 1 ? map.h - 1 : 0];
    const inner: [number, number] = [edge[0] - dx, edge[1] - dy];
    if (map.walkable(...edge) && map.walkable(...inner)) list.push(inner);
  }
  return list;
}

/**
 * side の端に着くときの、着地できるマスの真ん中(front#337)。偶数個なら真ん中の2つのうち左・上側。
 * 着地できるマスがなければ、エリアの中央にいちばん近い通れるマス
 */
export function edgeMiddle(map: AreaMap, side: Side): [number, number] {
  const list = edgeLandings(map, side);
  return list.length ? list[Math.floor((list.length - 1) / 2)] : centerSpot(map);
}

/** エリアの中央にいちばん近い通れるマス(front#337)。テストプレイの始まりや、着く場所が見つからないときに立つ。通れるマスがなければ中央 */
export function centerSpot(map: AreaMap): [number, number] {
  const cx = (map.w - 1) / 2;
  const cy = (map.h - 1) / 2;
  let best: [number, number] = [Math.floor(cx), Math.floor(cy)];
  let bestDist = Infinity;
  for (let y = 0; y < map.h; y++) {
    for (let x = 0; x < map.w; x++) {
      const d = (x - cx) ** 2 + (y - cy) ** 2;
      if (d < bestDist && map.walkable(x, y)) {
        bestDist = d;
        best = [x, y];
      }
    }
  }
  return best;
}

/** セーブポイントのとなりの通れるマス(front#337)。(x, y+1)・(x+1, y)・(x-1, y)・(x, y-1) の順に探す。なければ null */
export function besideSavePoint(map: AreaMap, o: Pick<StaticObj, 'x' | 'y'>): [number, number] | null {
  for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) {
    if (map.walkable(o.x + dx, o.y + dy)) return [o.x + dx, o.y + dy];
  }
  return null;
}

/** はじめて遊ぶときに立つマス(front#337)。セーブポイントのとなり(いくつかあれば最初のもの)、なければエリアの中央付近 */
export function firstSpot(map: AreaMap): [number, number] {
  for (const o of map.statics) {
    const spot = o.type === SAVE_POINT ? besideSavePoint(map, o) : null;
    if (spot) return spot;
  }
  return centerSpot(map);
}

/**
 * 看板をクリックしたときに出す文(front#314)。1行が1ページ。
 * 文章があればその文章、なければ指すダンジョンへの案内(「この先 闇の塔(推奨 Lv15〜)」)。どちらもなければ null(読めない看板)
 */
export function signLinesOf(lines: readonly string[] | null | undefined, to: Pick<RpgDungeon, 'name' | 'recommendedLevel'> | null): string[] | null {
  const own = (lines ?? []).map((l) => l.trim()).filter((l) => l);
  if (own.length) return own;
  return to ? [`この先 ${to.name}（${recLabel(to.recommendedLevel)}）`] : null;
}

/** 看板(front#274)が指す、いちばん近い「ほかのダンジョンへの端」。そのエリアにほかのダンジョンへの端がなければ null */
export function signExit(maps: readonly RpgMap[], area: RpgMap, x: number, y: number): AreaExit | null {
  const dist = ([dx, dy]: Side) => (dx === 1 ? area.width - 1 - x : dx === -1 ? x : dy === 1 ? area.height - 1 - y : y);
  const exits = SIDES.map((s) => exitOf(maps, area, s)).filter((e): e is AreaExit => !!e?.link);
  return exits.sort((a, b) => dist(a.side) - dist(b.side))[0] ?? null;
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
      lines: o.type === 'sign' || o.showMessage ? (o.lines ?? undefined) : undefined,
      // 置いた置物1つずつの設定(front#333)
      color: o.color ?? undefined, dark: o.dark ?? undefined,
      items: o.items ?? undefined, enemies: o.enemies ?? undefined, mimics: o.mimics ?? undefined,
      hitMaterial: o.hitMaterial ?? undefined, showMessage: o.showMessage ?? undefined, signDir: o.signDir ?? undefined
    }));
  // 高さがない・知らない文字は0段
  const heights = Array.from({ length: map.height }, (_, y) =>
    Array.from({ length: map.width }, (_, x) => Math.min(MAX_HEIGHT, Math.max(0, Number(map.heights?.[y]?.[x] ?? 0) || 0)))
  );
  const area = new AreaMap(map.width, map.height, ground, statics, heights);
  for (const n of map.npcs) if (area.inMap(n.x, n.y)) area.solid[n.y][n.x] = true;
  return area;
}