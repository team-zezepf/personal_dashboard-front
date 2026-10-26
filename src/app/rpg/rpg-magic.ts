// RPGの魔法(front#383)。魔法の中身(威力・MP・見た目)はフロントが持ち、APIは覚えた魔法のIDとMPだけを保存する(api#181)。
// 魔法書(アイテムの種類 book)を使うと覚える。威力・回復量・最大MP・攻撃魔法の届く距離は、魔力で伸びる
import type { Stats } from './rpg-data';

export type SpellId = 'fire' | 'blizzard' | 'thunder' | 'heal' | 'healall';

export interface SpellDef {
  id: SpellId;
  name: string;
  icon: string;
  mp: number;
  // attack: 敵に撃つ / heal: 味方を回復する
  kind: 'attack' | 'heal';
  // 威力・回復量の倍率(spellPowerOf・spellHealOf に掛ける)
  rate: number;
  // 当たった敵のまわり(マス)の敵にも当たる(サンダー)。なければ1体だけ
  radius?: number;
  // 当たった敵を遅くする秒(ブリザド)
  slow?: number;
  // パーティ全員を回復する(ヒールオール)
  all?: boolean;
  desc: string;
}

export const SPELLS: Record<SpellId, SpellDef> = {
  fire: { id: 'fire', name: 'ファイア', icon: '🔥', mp: 4, kind: 'attack', rate: 1, desc: '選んだ敵1体に火の玉' },
  blizzard: { id: 'blizzard', name: 'ブリザド', icon: '❄️', mp: 6, kind: 'attack', rate: 0.9, slow: 3, desc: '敵1体に氷。少しの間 動きが遅くなる' },
  thunder: { id: 'thunder', name: 'サンダー', icon: '⚡', mp: 10, kind: 'attack', rate: 0.8, radius: 1.5, desc: '選んだ敵のまわりの敵全部に雷' },
  heal: { id: 'heal', name: 'ヒール', icon: '💚', mp: 5, kind: 'heal', rate: 1, desc: '自分か仲間1人のHPを回復' },
  healall: { id: 'healall', name: 'ヒールオール', icon: '✨', mp: 14, kind: 'heal', rate: 1, all: true, desc: 'パーティ全員のHPを回復' }
};

/** 魔法の並び順(一覧・ショートカットの選ぶ欄) */
export const SPELL_IDS: SpellId[] = ['fire', 'blizzard', 'thunder', 'heal', 'healall'];

export const isSpellId = (id: string | null | undefined): id is SpellId => !!id && Object.prototype.hasOwnProperty.call(SPELLS, id);

/** 魔法のLV(front#387)。魔法の書で覚える・上がる。LV が上がるほど威力・回復量が増える(消費MP・届く距離は変わらない) */
export const MAX_SPELL_LEVEL = 5;
/** LV による威力・回復量の倍率。LV1 ×1.0 → LV が1上がるごとに +0.5 */
export const levelRateOf = (level: number) => 1 + (Math.min(Math.max(Math.round(level), 1), MAX_SPELL_LEVEL) - 1) * 0.5;
/** 魔法の名前に LV を付けた文字(例: 「ファイア LV2」) */
export const spellLabel = (id: SpellId, level: number) => `${SPELLS[id].name} LV${level}`;

/** 魔法を使ったあと、次の魔法を使えるまでの秒(通常攻撃とは別に数える) */
export const SPELL_COOLDOWN = 1;

// 魔力の効果は、届く距離だけ99で最大(速さ・運と同じ)
const rate99 = (n: number) => Math.min(Math.max(n, 0), 99) / 99;

/** 最大MP */
export const maxMpOf = (s: Stats) => 20 + s.mag * 4;
/** 攻撃魔法のもとの威力(敵の防御は通常攻撃の半分だけ効く) */
export const spellPowerOf = (s: Stats) => 8 + s.mag * 3;
/** 回復魔法のもとの回復量 */
export const spellHealOf = (s: Stats) => 15 + s.mag * 3;
/** 攻撃魔法の届く距離(マス)。魔力0で3マス → 99以上で7マス */
export const spellRangeOf = (s: Stats) => 3 + 4 * rate99(s.mag);

// ショートカット(front#272)には、道具のIDと区別するため「spell:」を付けて登録する
const SHORTCUT_PREFIX = 'spell:';
export const spellShortcut = (id: SpellId) => `${SHORTCUT_PREFIX}${id}`;
/** ショートカットに登録したものが魔法なら、その魔法のID。道具なら null */
export function spellOfShortcut(key: string): SpellId | null {
  if (!key.startsWith(SHORTCUT_PREFIX)) return null;
  const id = key.slice(SHORTCUT_PREFIX.length);
  return isSpellId(id) ? id : null;
}
