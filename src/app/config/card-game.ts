// カード収集ゲームの表示用の設定。抽選の確率などの実際の値は API(CardService)側で持ち、
// ここでは画面に案内として表示する文言だけを持つ

export const CARDS_PER_PACK = 5;

export const CARD_RARITIES = [1, 2, 3] as const;

export const NORMAL_SLOT_RATES_LABEL = '★ 75% / ★★ 22% / ★★★ 3%';
export const GUARANTEED_SLOT_RATES_LABEL = '★★ 85% / ★★★ 15%';

export const DEFAULT_PACK_COLOR = '#4c8a3a';
export const DEFAULT_PACK_EMBLEM = '🍃';

export function rarityStars(rarity: number): string {
  return '★'.repeat(Math.max(0, rarity));
}

// 図鑑番号を「No.014」の形にする
export function formatCardNumber(number: number): string {
  return `No.${String(number).padStart(3, '0')}`;
}
