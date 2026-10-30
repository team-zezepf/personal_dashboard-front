// RPGの属性(front#437 / api#208)。火・水・木は三すくみ、光と闇はおたがいに強い。
// 攻撃力・防御力などは変えず、ダメージを計算するときだけ使う。有利なときだけ増え、不利でも減らない
export type ElementId = 'fire' | 'water' | 'wood' | 'light' | 'dark';

export interface ElementDef {
  id: ElementId;
  label: string;
  icon: string;
  // バッジの色と文字の色
  color: string;
  text: string;
}

export const ELEMENTS: Record<ElementId, ElementDef> = {
  fire: { id: 'fire', label: '火', icon: '🔥', color: '#ef4444', text: '#ffffff' },
  water: { id: 'water', label: '水', icon: '💧', color: '#3b82f6', text: '#ffffff' },
  wood: { id: 'wood', label: '木', icon: '🌳', color: '#16a34a', text: '#ffffff' },
  light: { id: 'light', label: '光', icon: '✨', color: '#eab308', text: '#422006' },
  dark: { id: 'dark', label: '闇', icon: '🌑', color: '#7c3aed', text: '#ffffff' }
};

export const ELEMENT_IDS: ElementId[] = ['fire', 'water', 'wood', 'light', 'dark'];

/** プレイヤー・仲間のはじめの属性 */
export const INITIAL_ELEMENT: ElementId = 'wood';

// それぞれの属性が強い相手
const STRONG_AGAINST: Record<ElementId, ElementId> = { fire: 'wood', water: 'fire', wood: 'water', light: 'dark', dark: 'light' };

// 有利なときの倍率。プレイヤー・仲間はキャラの属性と魔法の属性で 1.2 倍ずつ、敵は 1.5 倍
export const PLAYER_ELEMENT_RATE = 1.2;
export const SPELL_ELEMENT_RATE = 1.2;
export const ENEMY_ELEMENT_RATE = 1.5;

export function isElementId(id: unknown): id is ElementId {
  return typeof id === 'string' && (ELEMENT_IDS as string[]).includes(id);
}

/** 知らない値・ないとき(前のセーブデータ)は木 */
export function elementOrInitial(id: unknown): ElementId {
  return isElementId(id) ? id : INITIAL_ELEMENT;
}

/** attacker の属性が target の属性に強いか。どちらかが属性なしなら強くない */
export function beats(attacker: ElementId | null | undefined, target: ElementId | null | undefined): boolean {
  return !!attacker && !!target && STRONG_AGAINST[attacker] === target;
}

/**
 * プレイヤー・仲間が敵に与えるダメージの倍率。キャラの属性が有利なら ×1.2、
 * 攻撃魔法の属性(spell)が有利ならさらに ×1.2(両方有利なら ×1.44)
 */
export function playerElementRate(own: ElementId, foe: ElementId | null | undefined, spell: ElementId | null = null): number {
  return (beats(own, foe) ? PLAYER_ELEMENT_RATE : 1) * (beats(spell, foe) ? SPELL_ELEMENT_RATE : 1);
}

/** 敵がプレイヤー・仲間に与えるダメージの倍率。敵の属性が有利なら ×1.5 */
export function enemyElementRate(foe: ElementId | null | undefined, own: ElementId): number {
  return beats(foe, own) ? ENEMY_ELEMENT_RATE : 1;
}

/** 「🔥火」のような表示。属性なしなら「なし」 */
export function elementLabel(id: ElementId | null | undefined): string {
  return id ? `${ELEMENTS[id].icon}${ELEMENTS[id].label}` : 'なし';
}
