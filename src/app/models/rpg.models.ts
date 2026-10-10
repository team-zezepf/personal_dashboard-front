// RPG(front#215 / api#80)のセーブデータ。戦闘などの計算はフロントで行い、APIは結果を保存する
export interface RpgItemCount {
  itemId: string;
  count: number;
}

export interface RpgSave {
  level: number;
  exp: number;
  hp: number;
  gold: number;
  // 装備中の武器・防具のアイテムID
  weapon: string;
  armor: string;
  // 持ち物(装備も含む)
  items: RpgItemCount[];
  // plain / forest / valley / tower
  area: string;
  x: number;
  y: number;
  updatedAt?: string | null;
}

export type RpgSaveInput = Omit<RpgSave, 'updatedAt'>;

// RPGのマップ(エリア)(front#217 / api#82)。マップ作成画面で作り、ゲームはこれを読んで地形を作る
export interface RpgMapObject {
  // tree / rock / house / cliff / fern / crystal / pillar / volcano
  type: string;
  x: number;
  y: number;
  // 家の屋根の色(#rrggbb)
  roof?: string | null;
  // 柱にたいまつを付ける
  torch: boolean;
}

export type RpgNpcRole = 'talk' | 'shop' | 'exchange';

export interface RpgMapNpc {
  name: string;
  x: number;
  y: number;
  hair: string;
  body: string;
  // shop・exchange は、会話のあとにお店を開く
  role: RpgNpcRole;
  // 話しかけるまで頭に「!」を出す
  notice: boolean;
  lines: string[];
}

export interface RpgMapEnemy {
  type: string;
  x: number;
  y: number;
}

export interface RpgMapPortal {
  x: number;
  y: number;
  // 行き先のエリアのID(まだ決めていなければ null)
  to: string | null;
  toX: number;
  toY: number;
}

export interface RpgMap {
  id: string;
  name: string;
  recommendedLevel: number;
  // plain / forest / valley / tower
  theme: string;
  width: number;
  height: number;
  // 1行が奥行き1マス分の文字列で、1文字が1マス(g:草 f:花 p:道 w:水 b:橋 s:砂 v:なし)
  ground: string[];
  objects: RpgMapObject[];
  npcs: RpgMapNpc[];
  enemies: RpgMapEnemy[];
  portals: RpgMapPortal[];
  startX: number;
  startY: number;
  sortOrder: number;
  updatedAt?: string | null;
}

// id が null なら新しいエリアとして追加する
export type RpgMapInput = Omit<RpgMap, 'id' | 'sortOrder' | 'updatedAt'> & { id: string | null };

// ポイント交換所の品物(値段と中身はAPIが決める)
export interface RpgPointShopItem {
  id: string;
  name: string;
  point: number;
  description: string;
}

export interface RpgExchangeResult {
  save: RpgSave;
  // 交換した後のポイント残高
  points: number;
}
