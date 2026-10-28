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
  // いるエリア(RpgMap の id)
  area: string;
  x: number;
  y: number;
  // 振り分けたステータスのポイントと、まだ振り分けていないポイント(front#223)。合計は (level - 1) * 3
  stats: RpgStats;
  statPoints: number;
  // プレイヤーの見た目(front#224)
  look: RpgLook;
  // 受けた・終わったクエストの進み具合(front#239)
  quests: RpgQuestProgress[];
  // 復活地点(front#337)。セーブポイントを調べたときに立っていたエリアとマス。まだ調べていなければ null
  respawn?: RpgRespawn | null;
  // 連れている仲間(front#358)。集会場で呼んだほかのアカウント。最大3人
  party?: RpgCompanion[];
  updatedAt?: string | null;
  // 今のMP(front#383 / api#181)。魔法ができる前のセーブデータは null(最大MPから始める)
  mp?: number | null;
  // 覚えた魔法のID(front#383)。魔法書を使うと増える
  spells?: string[];
  // 覚えた魔法のLV(front#387 / api#183)。ない魔法は LV1
  spellLevels?: RpgSpellLevel[];
}

// 覚えた魔法のLV(front#387)。LV は 1〜5
export interface RpgSpellLevel {
  id: string;
  level: number;
}

// 連れている仲間1人(front#358)。レベル・装備・持ち物などは、仲間のアカウントのセーブデータ
export interface RpgCompanion {
  userId: string;
  name: string;
  level: number;
  exp: number;
  hp: number;
  weapon: string;
  armor: string;
  items: RpgItemCount[];
  stats: RpgStats;
  statPoints: number;
  look: RpgLook;
  // MPと覚えた魔法(front#383)・魔法のLV(front#387)。今は仲間は魔法を使わないが、データは消さずに保存し直す
  mp?: number | null;
  spells?: string[];
  spellLevels?: RpgSpellLevel[];
}

// 保存するときにいっしょに送る仲間のデータ(front#358)。それぞれのアカウントのセーブデータに書かれる
export type RpgCompanionInput = Omit<RpgCompanion, 'name' | 'look'>;

// 集会場の一覧の1人(front#358)。登録した順
export interface RpgHallMember {
  userId: string;
  name: string;
  level: number;
  look: RpgLook;
  // ほかのユーザーが連れているときは、その人の名前
  partyOf: string | null;
  // 本人がRPGを遊んでいる(呼べない)
  playing: boolean;
  // 自分のパーティにいる
  inMyParty: boolean;
}

// RPGの復活地点(front#337)。たおれたときに戻るエリア(RpgMap の id)とマス
export interface RpgRespawn {
  area: string;
  x: number;
  y: number;
}

// クエストの進み具合(front#239)。active(受けている) / cleared(達成して報告待ち) / completed(報告済み)
export type RpgQuestState = 'active' | 'cleared' | 'completed';

export interface RpgQuestProgress {
  id: string;
  state: RpgQuestState;
  // 敵を倒すクエストで、たおした数
  count: number;
}

export type RpgQuestKind = 'defeat' | 'collect' | 'visit';

// NPCのクエスト(front#239)。1人1回きりで、報告先は依頼主
export interface RpgQuest {
  // 新しいクエストは null(保存するときにAPIが決める)
  id: string | null;
  title: string;
  kind: RpgQuestKind;
  // 敵の種類 / アイテムのID / 会うNPCの名前
  target: string;
  // 会うNPCのいるエリア(visit のときだけ)
  targetArea?: string | null;
  // たおす数・集める個数(visit は 1)
  count: number;
  // 依頼のセリフ(最後の行のあとに「引き受ける/やめておく」)・受けたあとのセリフ・報告のセリフ
  offerLines: string[];
  progressLines: string[];
  doneLines: string[];
  rewardGold: number;
  rewardItems: RpgItemCount[];
}

// キャラクター(プレイヤー・村人)の見た目(front#224 / api#89)。部品の一覧と描き方は rpg/rpg-look.ts
export interface RpgLook {
  hair: string;
  hairColor: string;
  skin: string;
  eyes: string;
  eyeColor: string;
  mouth: string;
  clothes: string;
  clothesColor: string;
  // 差し色(襟・ふち・帯など)
  accentColor: string;
  // 眉(front#362 / api#171)。ないときは normal として描く
  brows?: string;
  // 眉の色(front#362 / api#171)。null・ないときは髪の色に合わせる
  browColor?: string | null;
  // 髪のトップ・後ろ(front#370 / api#174)。null・ないときは髪型に合わせる
  hairTop?: string | null;
  hairBack?: string | null;
}

export interface RpgStats {
  hp: number;
  atk: number;
  def: number;
  // 魔力
  mag: number;
  // 速さ
  spd: number;
  // 運(99まで)
  luk: number;
}

export type RpgSaveInput = Omit<RpgSave, 'updatedAt' | 'party'> & {
  // 連れている仲間のデータ(front#358)
  companions?: RpgCompanionInput[];
  // RPG画面を離れるときの保存(front#360)。保存したあと、集会場の「自分で冒険中」がすぐ外れる
  leaving?: boolean;
};

// RPGのダンジョン(front#234 / api#96)。名前・ベース(旧「見た目」。front#401)・BGMを持つ、エリアのまとまり(推奨レベルは front#381 で廃止)
export interface RpgDungeon {
  id: string;
  name: string;
  // plain / forest / valley / tower
  theme: string;
  // ダンジョンで流すBGM(RpgBgm の id)。なければ何も流さない(front#218)
  bgmId?: string | null;
  sortOrder: number;
  updatedAt?: string | null;
}

// id が null なら新しいダンジョンとして追加する
export type RpgDungeonInput = Pick<RpgDungeon, 'name' | 'theme'> & { id: string | null; bgmId: string | null };

// RPGのマップ(エリア)(front#217 / api#82)。マップ作成画面で作り、ゲームはこれを読んで地形を作る
export interface RpgMapObject {
  // tree / rock / house / cliff / fern / crystal / pillar / volcano / grass / chest / armor / wall /
  // barrel / pot / bones / bookshelf / candle / grave / sign / bars / shackle / bucket
  type: string;
  x: number;
  y: number;
  // 家の屋根の色(#rrggbb)
  roof?: string | null;
  // 柱にたいまつを付ける
  torch: boolean;
  // 家の形(1x1 / 2x1 / 2x2 / L)と向き(0〜3。90°ずつ)(front#236)。x, y は占めるマスのいちばん左上。なければ 1×1・向き0
  shape?: string | null;
  rotation?: number | null;
  // 家の屋根を低く(つぶした形に)する(front#238)。なければふつう
  lowRoof?: boolean | null;
  // 家の壁の色(#rrggbb)と、窓を付けない(front#250)。なければクリーム色・窓あり
  wall?: string | null;
  noWindow?: boolean | null;
  // 看板の文章(front#314 / api#146)・クリック時に表示するメッセージ(front#333)。1行が1ページ
  lines?: string[] | null;
  // ここから置いた置物1つずつの設定(front#333 / api#157)。null・undefined なら置物の種類のデフォルト(RpgObjectDef)
  // 色合い(明るい色・暗い色。#rrggbb)
  color?: string | null;
  dark?: string | null;
  // 出てくるアイテム・出てくる敵(壊れる置物だけ)・擬態している敵。空の一覧は「なし」に上書き
  items?: RpgChanceItem[] | null;
  enemies?: RpgChanceEnemy[] | null;
  mimics?: RpgChanceEnemy[] | null;
  // 叩いたときの音の素材(flesh・soft・stone・wood・grass)
  hitMaterial?: string | null;
  // クリック時にメッセージ(lines)を表示する。表示する置物は壊せず、擬態もしない
  showMessage?: boolean | null;
  // 看板の矢印の向き(se・sw・nw・ne)。なければ自動(いちばん近いほかのダンジョンへの端)
  signDir?: string | null;
}

// 置物から出てくるアイテム(front#333)。chance は 0.001〜1
export interface RpgChanceItem {
  id: string;
  count: number;
  chance: number;
}

// 置物から出てくる敵・擬態している敵(front#333)。chance は 0.001〜1(擬態は合計で1まで)
export interface RpgChanceEnemy {
  id: string;
  chance: number;
}

// 置物の種類ごとのデフォルト(front#333 / api#157)。マップ作成画面の「置物」タブで決める。色・叩いたときの音がなければ今のまま
export interface RpgObjectDef {
  type: string;
  color?: string | null;
  dark?: string | null;
  items: RpgChanceItem[];
  enemies: RpgChanceEnemy[];
  mimics: RpgChanceEnemy[];
  hitMaterial?: string | null;
  updatedAt?: string | null;
}

// 保存する置物のデフォルト。expectedUpdatedAt は読み込んだときの更新日時(まだ保存していなければ '')
export type RpgObjectDefInput = Omit<RpgObjectDef, 'updatedAt'> & { expectedUpdatedAt?: string | null };

// quest はクエスト依頼(front#239)
// smith: 鍛冶屋(素材で装備を合成する。front#277)
// hall: 集会場の受付(front#358)
export type RpgNpcRole = 'talk' | 'shop' | 'exchange' | 'quest' | 'smith' | 'hall';

export interface RpgMapNpc {
  name: string;
  x: number;
  y: number;
  // 髪の色・服の色(look の色と同じ。見た目を選べるようになる前からある項目)
  hair: string;
  body: string;
  // shop・exchange は、会話のあとにお店を開く
  role: RpgNpcRole;
  // 話しかけるまで頭に「!」を出す(クエストができる前の項目。今は使わず、「!」は受けられるクエストがあるときに出す)
  notice: boolean;
  lines: string[];
  look: RpgLook;
  // クエスト依頼(role = quest)のクエスト。上から順に受けられる(front#239)
  quests: RpgQuest[];
}

export interface RpgMapEnemy {
  type: string;
  x: number;
  y: number;
}

// ほかのダンジョンのエリアへの端のつながり(front#274)。(dx, dy) はどの端か([1, 0] は x が大きい側の端 = 画面の右下)、to は行き先のエリアのID。
// その端で止まると、画面が暗くなって行き先のエリアへ移る(光る場所・ポータルは廃止した)
export interface RpgMapLink {
  dx: number;
  dy: number;
  to: string;
}

export interface RpgMap {
  id: string;
  name: string;
  // どのダンジョンのエリアか。ダンジョンの中では縦横のマス目(gridX, gridY)に並び、隣り合うエリアは向かい合う端でつながる(front#234)
  dungeonId: string;
  gridX: number;
  gridY: number;
  width: number;
  height: number;
  // 1行が奥行き1マス分の文字列で、1文字が1マス(g:草 f:花 p:道 w:水 b:橋 s:砂 v:なし t:タイル r:レンガ)
  ground: string[];
  // 地面の高さ(front#225)。ground と同じ形で、1文字が1マス(0〜3段)
  heights: string[];
  objects: RpgMapObject[];
  npcs: RpgMapNpc[];
  enemies: RpgMapEnemy[];
  links: RpgMapLink[];
  sortOrder: number;
  updatedAt?: string | null;
  // このエリアにいる間だけ流す曲(RpgBgm の id。front#304)。なければダンジョンの曲
  bgmId?: string | null;
  // このエリアだけで使うベース(RpgTheme の id。front#401)。なければダンジョンのベース
  theme?: string | null;
}

// RPGの敵(front#229 / api#94)。マップ作成画面の「敵」タブで作る。絵の描き方・攻撃の動きは rpg/rpg-enemy.ts
export interface RpgEnemy {
  id: string;
  name: string;
  // slime / mushroom / wisp / raptor / golem / ghost / knight / lord
  shape: string;
  // 明るい色(体)・暗い色(影・ふち)
  color: string;
  dark: string;
  // 大きさ(0.8〜1.6倍)
  size: number;
  hp: number;
  atk: number;
  def: number;
  // 攻撃の間隔(秒)・歩く速さ(マス/秒)
  interval: number;
  speed: number;
  exp: number;
  gold: number;
  // 落とすアイテムのID(なければ null)と確率(0〜1)
  drop: string | null;
  dropRate: number;
  // 落とす素材のIDと確率(0〜1)(front#277)。アイテムとは別に落とす
  material?: string | null;
  materialRate?: number;
  // 叩いたときの音の素材(front#282。flesh・soft・stone・wood・grass)。null なら体の形から決める
  hitMaterial?: string | null;
  // 光る(front#284)
  glow?: boolean;
  // ボスを守る(front#330 / api#153)。同じエリアで生きている守る敵1体につき、ボスに与えるダメージが1/4ずつ減る
  guard?: boolean;
  // 襲ってくる距離(マス)。0なら攻撃されるまで襲ってこない
  sight: number;
  // 倒してから復活するまでの秒数
  respawn: number;
  // いつも名前とHPを出す
  boss: boolean;
  // tackle / claw / bite / jump / fire / water / wind / thunder / dark / shockwave
  attack: string;
  // 体当たり・ジャンプの距離(マス)とためる時間(秒)
  dash: number;
  charge: number;
  // 炎・水・風・雷・暗黒の射程(マス)
  range: number;
  // 衝撃波の範囲(まわり何マス)
  radius: number;
  sortOrder: number;
  updatedAt?: string | null;
}

// id が null なら新しい敵として追加する。sortOrder がなければ今の並び順のまま(front#299 / api#136)
// expectedUpdatedAt: 読み込んだときの更新日時(まだ保存していない敵は '')。送ると、ほかで変えられていれば保存しない(front#312 / api#144)
export type RpgEnemyInput = Omit<RpgEnemy, 'id' | 'sortOrder' | 'updatedAt'> & { id: string | null; sortOrder?: number | null; expectedUpdatedAt?: string | null };

// 鍛冶屋で合成してできる装備とレシピ(front#288 / api#134)。管理画面の「合成」タブで作る
// ダンジョンの見た目(front#389 / api#185)。描き方はフロントが持ち、APIは色などの値を保存する。色は #rrggbb
export interface RpgTheme {
  id: string;
  name: string;
  // 水のマスの呼び名(水・泉・溶岩・闇など)
  liquidName: string;
  // 空(上・下)・草(3色)・道(2色)・砂・段差の側面(左・右)
  sky: string[];
  grass: string[];
  path: string[];
  sand: string;
  edge: string[];
  // 石畳の石(3色)・目地、レンガ(3色)・目地
  stone: string[];
  grout: string;
  brick: string[];
  mortar: string;
  // 水のマスの色・明るさのゆらぎ(0〜10)・波の光の色(null なら波を出さない)
  liquid: string;
  liquidSway: number;
  wave: string | null;
  // 水のマスの段差の側面の色(左の面・右の面。front#415 / api#192)。null・なしなら自動(水の色を暗くした色)
  liquidEdge?: string[] | null;
  // 草の上の飾り(flower 花 / glow 光る粒 / tuft 草の房 / crack ひび割れ)と色(3色)
  flower: string;
  flowers: string[];
  // 木の幹・葉(3色)・大きさ(0.5〜2)、岩(暗い・明るい)
  trunk: string;
  leaves: string[];
  treeScale: number;
  rock: string[];
  // 装飾(1つだけ)。none なし / stars 装飾1 / fireflies 装飾2 / vignette 装飾3 / bubbles 装飾4(泡)。alpha は装飾3・4の濃さ
  effect: { kind: string; color: string; alpha: number };
  sortOrder: number;
  updatedAt?: string | null;
}

// id が null なら新しい見た目として追加する。sortOrder が null なら今の順番のまま(新しければ最後)
export type RpgThemeInput = Omit<RpgTheme, 'id' | 'sortOrder' | 'updatedAt'> & { id: string | null; sortOrder: number | null };

export interface RpgCraft {
  // 装備のID(持ち物・装備のIDと同じ)
  id: string;
  name: string;
  // アイコン(絵文字)
  icon: string;
  // book: 魔法の書(front#387)。覚える魔法(spell)と LV(level)を持ち、攻撃力・防御力(power)は 0
  type: 'weapon' | 'armor' | 'book';
  // 攻撃力(武器)・防御力(防具)
  power: number;
  spell?: string | null;
  level?: number | null;
  // 合成に払うゴールドと素材
  gold: number;
  materials: RpgItemCount[];
  // 鍛冶屋に並ぶ順番
  sortOrder: number;
  updatedAt?: string | null;
  // 画像のファイル名(front#345 / api#166。/rpg-item-images/{image})。なければ絵文字(icon)で出す
  image?: string | null;
}

// id が null なら新しい装備として追加する。sortOrder が null なら今の順番のまま(新しければ最後)
export type RpgCraftInput = Omit<RpgCraft, 'id' | 'sortOrder' | 'updatedAt'> & { id: string | null; sortOrder: number | null };

// RPGのアイテム(front#343 / api#163)。回復の道具・武器・防具・素材。マップ作成画面の「アイテム」タブで作る(合成の装備は含まない)
// revive: たおれた人を起き上がらせる道具(front#358)。heal は起き上がるときのHPの割合(%)
// book: 魔法書(front#383)。使うと spell の魔法を覚え、なくなる
export type RpgItemType = 'use' | 'revive' | 'weapon' | 'armor' | 'material' | 'book';

export interface RpgItem {
  // アイテムのID(持ち物・装備のIDと同じ)
  id: string;
  name: string;
  // アイコン(絵文字)
  icon: string;
  type: RpgItemType;
  // 回復量(use)・攻撃力(weapon)・防御力(armor)。種類に関係ないものは null
  heal?: number | null;
  // MPの回復量(use。front#383)。use は heal と mp のどちらかがある
  mp?: number | null;
  // 覚える魔法のID(book。front#383)
  spell?: string | null;
  // 魔法書の LV(front#387)。なければ 1
  level?: number | null;
  atk?: number | null;
  def?: number | null;
  desc?: string | null;
  // 道具屋で売るか。売るときだけ値段(ゴールド)がある
  inShop: boolean;
  price?: number | null;
  // プレイヤーが道具屋で売るときの値段(front#379 / api#177)。null なら道具屋の値段の半分、値段もなければ売れない
  sellPrice?: number | null;
  // 道具屋に並ぶ順番(一覧もこの順)
  sortOrder: number;
  updatedAt?: string | null;
  // 画像のファイル名(front#345 / api#166。/rpg-item-images/{image})。なければ絵文字(icon)で出す
  image?: string | null;
}

// id が null なら新しいアイテムとして追加する。sortOrder が null なら今の順番のまま(新しければ最後)。保存したアイテムの種類は変えられない
export type RpgItemInput = Omit<RpgItem, 'id' | 'sortOrder' | 'updatedAt'> & { id: string | null; sortOrder: number | null };

// RPGの効果音(front#278 / api#127)。音のファイルは /rpg-se/{filename} で配られる
export interface RpgSe {
  id: string;
  name: string;
  filename: string;
  // ファイルの大きさ(バイト)
  size: number;
  createdAt: string;
}

// 効果音を鳴らす場面(hit_{叩いたものの素材}(front#282)・attack_{敵の攻撃の種類})と、選んだ効果音
export interface RpgSeSlot {
  slot: string;
  seId: string;
}

// RPGのBGM(front#218 / api#83)。音楽ファイルは /rpg-bgm/{filename} で配られる
export interface RpgBgm {
  id: string;
  name: string;
  filename: string;
  // ファイルの大きさ(バイト)
  size: number;
  createdAt: string;
}

// id が null なら新しいエリアとして追加する
export type RpgMapInput = Omit<RpgMap, 'id' | 'sortOrder' | 'updatedAt'> & { id: string | null };

// エリアの位置の変更(エリアの配置での入れ替え・移動。front#301 / api#138)
export interface RpgAreaMove {
  id: string;
  gridX: number;
  gridY: number;
}

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
