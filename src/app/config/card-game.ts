// カード収集ゲームの表示用の設定。抽選の確率などの実際の値は API(CardService)側で持ち、
// ここでは画面に案内として表示する文言だけを持つ

export const CARDS_PER_PACK = 5;

export const CARD_RARITIES = [1, 2, 3] as const;

export const NORMAL_SLOT_RATES_LABEL = '★ 75% / ★★ 22% / ★★★ 3%';
export const GUARANTEED_SLOT_RATES_LABEL = '★★ 85% / ★★★ 15%';

// アップロードするイラストの大きさ。登録時にこの縦横比で切り抜き、この大きさに縮めて保存する。
// 表示枠(card-view / card-tile の 4:3、card-pack-view の 3:4)と縦横比を合わせておくこと
export const CARD_IMAGE_SIZE = { width: 800, height: 600 } as const;
export const PACK_IMAGE_SIZE = { width: 600, height: 800 } as const;

export const DEFAULT_PACK_COLOR = '#4c8a3a';
export const DEFAULT_PACK_EMBLEM = '🍃';

export function rarityStars(rarity: number): string {
  return '★'.repeat(Math.max(0, rarity));
}

// 図鑑番号を「No.014」の形にする
export function formatCardNumber(number: number): string {
  return `No.${String(number).padStart(3, '0')}`;
}
