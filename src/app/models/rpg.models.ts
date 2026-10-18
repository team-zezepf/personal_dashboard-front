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
  updatedAt?: string | null;
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

export type RpgSaveInput = Omit<RpgSave, 'updatedAt'>;

// RPGのダンジョン(front#234 / api#96)。名前・推奨レベル・見た目・BGMを持つ、エリアのまとまり
export interface RpgDungeon {
  id: string;
  name: string;
  recommendedLevel: number;
  // plain / forest / valley / tower
  theme: string;
  // ダンジョンで流すBGM(RpgBgm の id)。なければ何も流さない(front#218)
  bgmId?: string | null;
  sortOrder: number;
  updatedAt?: string | null;
}

// id が null なら新しいダンジョンとして追加する
export type RpgDungeonInput = Pick<RpgDungeon, 'name' | 'recommendedLevel' | 'theme'> & { id: string | null; bgmId: string | null };

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
  // 壊れる置物(草むら・シダ・水晶・岩・宝箱・甲冑)の中身(front#264)。なければ中身なし
  contents?: RpgObjectContents | null;
  // 看板の文章(front#314 / api#146)。1行が1ページ。看板でなければ空
  lines?: string[] | null;
}

// 壊れる置物の中身(front#264)。item はアイテムの ID と個数、enemy は敵の ID(個数は1)
export interface RpgObjectContents {
  kind: 'item' | 'enemy';
  id: string;
  count: number;
  // 中の敵が出る確率(front#284。0.001〜1)。なければ1(かならず出る)
  chance?: number;
}

// quest はクエスト依頼(front#239)
// smith: 鍛冶屋(素材で装備を合成する。front#277)
export type RpgNpcRole = 'talk' | 'shop' | 'exchange' | 'quest' | 'smith';

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
  startX: number;
  startY: number;
  sortOrder: number;
  updatedAt?: string | null;
  // このエリアにいる間だけ流す曲(RpgBgm の id。front#304)。なければダンジョンの曲
  bgmId?: string | null;
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
export interface RpgCraft {
  // 装備のID(持ち物・装備のIDと同じ)
  id: string;
  name: string;
  // アイコン(絵文字)
  icon: string;
  type: 'weapon' | 'armor';
  // 攻撃力(武器)・防御力(防具)
  power: number;
  // 合成に払うゴールドと素材
  gold: number;
  materials: RpgItemCount[];
  // 鍛冶屋に並ぶ順番
  sortOrder: number;
  updatedAt?: string | null;
}

// id が null なら新しい装備として追加する。sortOrder が null なら今の順番のまま(新しければ最後)
export type RpgCraftInput = Omit<RpgCraft, 'id' | 'sortOrder' | 'updatedAt'> & { id: string | null; sortOrder: number | null };

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
