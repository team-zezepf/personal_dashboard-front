// カード収集ゲームのパック(弾)。カードはどれか1つのパックに入る
export interface CardPack {
  id: string;
  seriesNumber: number;
  name: string;
  price: number;
  // イラスト画像がないときに使うパックの見た目(絵文字・色)
  emblem: string | null;
  color: string | null;
  imageFilename: string | null;
  published: boolean;
}

export interface Card {
  id: string;
  packId: string;
  number: number;
  name: string;
  // レア度 1〜3(★の数)
  rarity: number;
  typeLabel: string | null;
  habitat: string | null;
  favoriteFood: string | null;
  personality: string | null;
  quote: string | null;
  imageFilename: string | null;
  published: boolean;
  // 持っている人数(登録画面でだけ取得する)
  ownerCount?: number;
}

// コレクション画面用。未所持のカードは count = 0
export interface CollectionCard {
  card: Card;
  count: number;
  // false なら NEW バッジを出す
  seen: boolean;
  firstObtainedAt: string | null;
}

export interface CardCollection {
  packs: CardPack[];
  cards: CollectionCard[];
  // ログイン中のユーザーのポイント残高
  points: number;
}

export interface OpenedCard {
  card: Card;
  isNew: boolean;
}

export interface OpenCardPackResult {
  // 開けた順の5枚(5枚目が★★以上の確定枠)
  cards: OpenedCard[];
  // 開けた後のポイント残高
  points: number;
}

export type CardPackInput = Omit<CardPack, 'id'>;

export type CardInput = Omit<Card, 'id' | 'ownerCount'>;
