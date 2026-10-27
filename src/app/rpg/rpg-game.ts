import { RpgCompanion, RpgDungeon, RpgLook, RpgMap, RpgMapNpc, RpgQuest, RpgRespawn, RpgSave, RpgSaveInput, RpgSpellLevel } from '../models/rpg.models';
import { QuestEntry, QuestLog, QuestMark, allQuests } from './rpg-quest';
import {
  AreaExit,
  AreaMap,
  BREAK_HITS,
  BREAK_RESPAWN_SEC,
  ENEMIES,
  HZ,
  ITEMS,
  TH,
  TW,
  MAX_GOLD,
  MAX_LUCK,
  RECIPES,
  Recipe,
  SAVE_POINT,
  STATIC_NAMES,
  STAT_POINTS_PER_LEVEL,
  Side,
  StatKey,
  StaticObj,
  Stats,
  ThemeDef,
  ZERO_STATS,
  attackIntervalOf,
  baseAtkOf,
  baseDefOf,
  buildAreaMap,
  centerSpot,
  critRateOf,
  dropRateOf,
  edgeMiddle,
  evadeRateOf,
  exitAt,
  firstSpot,
  healRateOf,
  linkArrival,
  maxHpOf,
  neighborOf,
  nextExpOf,
  isBreakableObj,
  objectSettingsOf,
  objectTintOf,
  pickMimic,
  signLinesOf,
  signPointing,
  themeOf,
  totalStatPointsOf,
  walkSpeedOf
} from './rpg-data';
import { DEFAULT_LOOK } from './rpg-look';
import { EnemyDef, SPELLS, attackReach, attackTiming, disguiseOf, guardRateOf, hitHeightOf, hitMaterialOf, isPassive, isRooted, movesToTarget, ringSizeOf } from './rpg-enemy';
import { cheb, findPath, octile } from './rpg-path';
import { SPELLS as MAGIC, MAX_SPELL_LEVEL, SPELL_COOLDOWN, SPELL_IDS, SpellId, isSpellId, levelRateOf, maxMpOf, spellHealOf, spellLabel, spellPowerOf, spellRangeOf } from './rpg-magic';

export interface Mover {
  x: number;
  y: number;
  // これから通るマス(先頭が次に向かうマス)
  path: [number, number][];
  // 画面上の向き(右なら1、左なら-1)
  dir: 1 | -1;
  moving: boolean;
  // 今立っている高さ(段。front#225)。段を登り降りするときは、なめらかに変わる
  z: number;
}

/** 敵の攻撃の途中の状態(front#229) */
export interface EnemyAct {
  // 攻撃を始めてからの秒
  t: number;
  // もう当たり判定をしたか(1回の攻撃で1回だけ)
  hit: boolean;
  // 攻撃する場所(炎・水などは攻撃を始めたときの相手のマス。ほかは相手の位置)
  tx: number;
  ty: number;
  // 体当たり・ジャンプで動くときの、動き始めと着く位置
  sx: number;
  sy: number;
  mx: number;
  my: number;
  // 狙っている相手(front#358)。範囲の攻撃でなければ、この相手にだけ当たる
  foe?: Fighter;
}

export interface Npc extends RpgMapNpc, Mover {
  kind: 'npc';
}

export interface Enemy extends Mover {
  kind: 'enemy';
  type: string;
  // 出現位置(ここから離れすぎると追いかけるのをやめて戻る)
  hx: number;
  hy: number;
  hp: number;
  alive: boolean;
  aggro: boolean;
  wander: number;
  repath: number;
  atkCd: number;
  flash: number;
  lunge: number;
  respawn: number;
  // 攻撃している途中(front#229)。ためる → 動く/予告 → 当たる → 終わる まで、ほかの動きをしない
  act: EnemyAct | null;
  seed: number;
  // 壊れる置物から出てきた敵(front#264)。倒しても出直さず、置物が元に戻る
  fromObject?: StaticObj;
  // ふりをしている置物(擬態している敵。front#333)。正体を現すまで、その置物の絵で動かずにいる。
  // 倒すと、復活の秒数のあとに擬態する敵を決め直し(外れたらただの置物に戻る)
  disguise?: StaticObj;
  // ただの置物に戻って、もういない(擬態している敵。front#333)
  gone?: boolean;
  // 狙っている相手(プレイヤー・仲間。front#358)と、狙う相手を見直すまでの秒
  foe?: Fighter | null;
  retarget?: number;
  // ブリザド(front#383)で遅くなっている残りの秒
  slow?: number;
}

/** フィールドに落ちたアイテム(front#276)。クリックすると、そこまで歩いて拾う。from は飛び出した位置、t は落ちてからの秒 */
export interface Drop {
  kind: 'drop';
  id: string;
  count: number;
  x: number;
  y: number;
  fromX: number;
  fromY: number;
  t: number;
}

/** 落ちたアイテムが消えるまでの秒数(最後の DROP_BLINK_SEC 秒は点滅する) */
export const DROP_LIFE_SEC = 60;
export const DROP_BLINK_SEC = 10;

export interface Player extends Mover {
  kind: 'player';
  // 話す相手・攻撃する敵・壊す置物(front#264)
  target: Npc | Enemy | StaticObj | Drop | null;
  repath: number;
  atkCd: number;
  lunge: number;
  hurt: number;
  level: number;
  exp: number;
  hp: number;
  gold: number;
  weapon: string;
  armor: string;
  inv: Record<string, number>;
  // 振り分けたステータスのポイントと、まだ振り分けていないポイント(front#223)
  stats: Stats;
  statPoints: number;
  // 見た目(front#224)
  look: RpgLook;
  lastCombat: number;
  regen: number;
  dead: boolean;
  // 仲間がいるときに、たおれてから待てる残りの秒(front#358)。仲間がいのちの羽を使ってくれれば起き上がる
  downT: number;
  // MP(front#383)と、時間で戻るMPの端数
  mp: number;
  mpRegen: number;
  // 覚えた魔法(front#383)と、次の魔法を使えるまでの秒(通常攻撃とは別)
  spells: SpellId[];
  spellCd: number;
  // 覚えた魔法のLV(front#387)。ない魔法は LV1
  spellLevels: Partial<Record<SpellId, number>>;
}

/**
 * 仲間(front#358)。集会場で呼んだほかのアカウント。プレイヤーについて歩き、敵と戦い、自分の持ち物の道具でパーティを助ける。
 * レベル・装備・持ち物などは仲間のアカウントのデータで、保存するとそのアカウントに書かれる
 */
export interface Companion extends Mover {
  kind: 'mate';
  userId: string;
  name: string;
  level: number;
  exp: number;
  hp: number;
  weapon: string;
  armor: string;
  inv: Record<string, number>;
  stats: Stats;
  statPoints: number;
  look: RpgLook;
  // 攻撃する敵
  target: Enemy | null;
  repath: number;
  atkCd: number;
  lunge: number;
  hurt: number;
  lastCombat: number;
  regen: number;
  dead: boolean;
  // たおれてから待てる残りの秒。0になるとパーティから抜けて集会場に戻る
  downT: number;
  // いのちの羽を使いに行く相手と、そばで起こしている秒(REVIVE_SEC になったら使う)
  help: Fighter | null;
  reviving: number;
  // 次に道具を使えるまでの秒
  itemCd: number;
  // MP・覚えた魔法とLV(front#383 / front#387)。仲間も戦闘中に魔法を使う(front#391)。保存すると仲間のアカウントに書かれる
  mp: number;
  mpRegen: number;
  spellCd: number;
  spells: string[];
  spellLevels: RpgSpellLevel[];
  // 拾いに行く落ちたアイテム(front#391)
  pick: Drop | null;
}

/** 仲間のまわりのエフェクト(front#391)。回復の光・レベルアップの光をプレイヤーと同じ絵で出す */
export interface MateFx {
  target: Companion;
  fx: PlayerFx;
}

/** 敵と戦う人(プレイヤー・仲間。front#358) */
export type Fighter = Player | Companion;

export interface FloatText {
  x: number;
  y: number;
  text: string;
  color: string;
  size: number;
  oy: number;
  t: number;
}

/**
 * プレイヤーのまわりのエフェクト(front#335)。レベルアップは金色の光の輪・柱・星、回復は緑の光の輪・「＋」の粒。
 * 粒の位置は seed から決める(描くたびに同じ位置になる)
 */
export interface PlayerFx {
  kind: 'level' | 'heal';
  t: number;
  seed: number;
  // 回復量が多い(上回復薬など)ときは粒を増やす
  big?: boolean;
}

/** エフェクトの長さ(秒) */
export const PLAYER_FX_SEC: Record<PlayerFx['kind'], number> = { level: 1.6, heal: 1.1 };

/**
 * 魔法の演出(front#383)。攻撃魔法は撃った位置から相手へ飛び(サンダーは相手の上に雷雲)、hitAt 秒で当たる。
 * 回復魔法は相手のまわりに回復の光を出す(プレイヤーは PlayerFx で出す)
 */
export interface SpellFx {
  spell: SpellId;
  // 魔法を使った人(プレイヤー・仲間。front#391)。威力はこの人の魔力と魔法の LV で決まる
  caster: Fighter;
  t: number;
  fromX: number;
  fromY: number;
  // 当たる相手と、当たる位置(相手が生きている間は相手について動く)
  target: Enemy | Fighter;
  x: number;
  y: number;
  hit: boolean;
  // 当たった敵(サンダーは、まわりの敵も)
  hits: Enemy[];
  seed: number;
}

/** 魔法の演出の長さ(秒)と、当たるまでの秒 */
export const SPELL_FX_SEC: Record<SpellId, { hitAt: number; duration: number }> = {
  fire: { hitAt: 0.3, duration: 0.85 },
  blizzard: { hitAt: 0.3, duration: 0.85 },
  thunder: { hitAt: 0.25, duration: 0.75 },
  heal: { hitAt: 0, duration: 1.1 },
  healall: { hitAt: 0, duration: 1.1 }
};

/** 敵・仲間・自分を選んだもの(front#383)。選んだ相手に魔法・回復薬を使う */
export type Selection = Enemy | Fighter;

export interface Particle {
  x: number;
  y: number;
  ox: number;
  oy: number;
  vx: number;
  vy: number;
  t: number;
  color: string;
}

/** ゲームから画面(コンポーネント)へ知らせること */
export interface RpgGameEvents {
  log(message: string): void;
  // HP・経験値・ゴールド・装備などが変わった
  statsChanged(): void;
  inventoryChanged(): void;
  // 保存が必要な変化があった
  dirty(): void;
  talk(npc: Npc): void;
  fade(on: boolean): void;
  // ほかのダンジョンに入った(暗転が明けたとき)。同じダンジョンの中のエリアの移動では呼ばない(front#234)
  dungeonEntered(dungeon: RpgDungeon): void;
  // エリアを移った(同じダンジョンの中の移動も。front#304)。エリアごとの曲に切り替えるのに使う
  areaEntered?(area: RpgMap, dungeon: RpgDungeon): void;
  // 看板を読んだ(front#314)。lines は1行が1ページ
  read?(title: string, lines: string[]): void;
  // 隣のエリアへスライドする直前の画面(スライドで押し出す絵)。描く画面がなければ null
  captureScreen(): CanvasImageSource | null;
  // たおれた(true)/村に戻った(false)
  knockedOut(on: boolean): void;
  // 効果音を鳴らす場面(front#278。hit_{叩いたものの素材}(front#282)・attack_{敵の攻撃の種類})
  sound?(slot: string): void;
  // 仲間がいるときにたおれ、起こしてもらうのを待っている(true)/起き上がった・町に戻った(false)(front#358)
  waiting?(on: boolean): void;
  // 仲間がパーティから抜けて集会場に戻る(front#358)。抜ける直前に呼ぶ(このときの保存データには、まだ抜ける仲間が入っている)。
  // timeout: 1分のうちに起き上がれなかった / town: 町に戻った
  companionsLeft?(cs: Companion[], reason: 'timeout' | 'town'): void;
}

const ATTACK_RANGE = 1.35;
const LEASH = 8;
// 仲間(front#358)は3人まで。たおれてから1分待てる
export const MAX_PARTY = 3;
export const DOWN_SEC = 60;
// 敵が狙う相手を見直す間隔(秒)
const RETARGET_SEC = 2;
// 仲間が回復薬を使う、HPの割合
const LOW_HP_RATE = 0.3;
// 仲間が落ちたアイテムに気づく、落ちてからの秒と距離(マス)(front#391)
export const MATE_PICK_DELAY = 3;
export const MATE_PICK_RANGE = 4;

/**
 * 仲間(bot)のレベルアップで、ポイントを振る項目(front#391)。今の振り分けの割合に近づくように選ぶ
 * (魔力6・HP3 なら、魔力に2/3・HPに1/3)。まだ何も振っていなければランダム。運は上限を超えない
 */
export function mateStatToRaise(stats: Stats, random: () => number = Math.random): StatKey {
  const keys = STAT_KEYS.filter((k) => k !== 'luk' || stats.luk < MAX_LUCK);
  const total = keys.reduce((n, k) => n + stats[k], 0);
  if (total <= 0) return keys[Math.floor(random() * keys.length)];
  let r = random() * total;
  for (const k of keys) {
    r -= stats[k];
    if (r < 0) return k;
  }
  return keys.find((k) => stats[k] > 0) ?? keys[0];
}
// 仲間がいのちの羽で起こすのにかかる秒(そばで起こしている様子が見えるように)
export const REVIVE_SEC = 1.5;
const FADE_MS = 380;
const KNOCKOUT_MS = 1500;
// 隣のエリアへスライドする時間(秒)
const SLIDE_SEC = 0.45;
// たおれたときに戻るエリア(なければ並び順で最初のエリア)
const HOME_AREA = 'plain';

// 仲間のレベルアップで、ポイントをランダムに振り分ける項目(front#358)と、ログに出す短い名前
const STAT_KEYS: StatKey[] = ['hp', 'atk', 'def', 'mag', 'spd', 'luk'];
const STAT_SHORT: Record<StatKey, string> = { hp: 'HP', atk: '攻撃', def: '防御', mag: '魔力', spd: '速さ', luk: '運' };

const randi = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));
export const iso = (x: number, y: number): [number, number] => [((x - y) * TW) / 2, ((x + y) * TH) / 2];

/** 立つ場所(エリアとマス) */
export interface Spot {
  area: RpgMap;
  x: number;
  y: number;
}

/** 隣のエリアへのスライド(front#234)。t は 0→1 で進み、image は前のエリアの画面 */
export interface AreaSlide {
  side: Side;
  t: number;
  image: CanvasImageSource | null;
}

/**
 * RPGの状態と動き(移動・会話・戦闘・アイテム・エリア移動)。描画は RpgRenderer が行う。
 * 1人用なので計算はすべてここで行い、APIへはセーブデータ(toSaveInput)だけを送る。
 */
export class RpgGame {
  area!: RpgMap;
  // area が入っているダンジョン。見た目(theme)・BGMはダンジョンで決まる
  dungeon!: RpgDungeon;
  theme!: ThemeDef;
  map!: AreaMap;
  npcs: Npc[] = [];
  enemies: Enemy[] = [];
  readonly player: Player = {
    kind: 'player', x: 0, y: 0, z: 0, path: [], dir: 1, moving: false, target: null, repath: 0, atkCd: 0, lunge: 0, hurt: 0,
    level: 1, exp: 0, hp: maxHpOf(ZERO_STATS), gold: 30, weapon: 'wood_sword', armor: 'cloth',
    inv: { potion: 3, wood_sword: 1, cloth: 1 }, stats: { ...ZERO_STATS }, statPoints: 0, look: { ...DEFAULT_LOOK }, lastCombat: -99, regen: 0, dead: false,
    downT: 0, mp: maxMpOf(ZERO_STATS), mpRegen: 0, spells: [], spellCd: 0, spellLevels: {}
  };
  // 連れている仲間(front#358)
  companions: Companion[] = [];

  time = 0;
  readonly floats: FloatText[] = [];
  readonly particles: Particle[] = [];
  readonly playerFx: PlayerFx[] = [];
  // 魔法の演出(front#383)
  spellFx: SpellFx[] = [];
  // 仲間のまわりのエフェクト(front#391)
  mateFx: MateFx[] = [];
  // 選んでいる敵・仲間・自分(front#383)と、マウスの下にいる仲間・自分
  selected: Selection | null = null;
  hoverFighter: Fighter | null = null;
  clickMarker: { x: number; y: number; t: number } | null = null;

  // 画面の大きさとカメラ(プレイヤーが中央に来る位置)。zoom はマップ作成画面で拡大・縮小するときだけ変える
  viewW = 0;
  viewH = 0;
  camX = 0;
  camY = 0;
  zoom = 1;
  // マップ作成画面ではプレイヤーを描かない
  hidePlayer = false;
  mouse: { x: number; y: number } | null = null;
  hover: Npc | Enemy | StaticObj | Drop | null = null;
  // フィールドに落ちているアイテム(front#276)。エリアを移ると消える
  drops: Drop[] = [];

  // 会話・お店などを開いている間はクリックで動かない。敵も止まり、攻撃してこない(front#243)
  locked = false;
  transitioning = false;
  slide: AreaSlide | null = null;
  // 受けた・終わったクエストの進み具合(front#239)
  readonly questLog = new QuestLog();
  // 復活地点(front#337)。セーブポイントを調べたときに立っていたエリアとマス。まだ調べていなければ null
  respawn: RpgRespawn | null = null;
  private timers: ReturnType<typeof setTimeout>[] = [];

  /** maps は全エリアのマップのデータ(並び順)。1つ以上あること。dungeons は全ダンジョン */
  constructor(private events: RpgGameEvents, public maps: RpgMap[], public dungeons: RpgDungeon[] = []) {
    const spot = this.firstSpot();
    this.loadMap(spot.area);
    this.placePlayer(spot.x, spot.y);
  }

  mapById(id: string | null): RpgMap | undefined {
    return this.maps.find((m) => m.id === id);
  }

  /** エリアが入っているダンジョン(見つからなければ、エリアの名前で最初の見た目のダンジョンとして扱う) */
  /**
   * 看板(front#314)・メッセージを表示する置物(front#333)をクリックしたときに出す文。読めなければ null。
   * 看板の文章がなければ、指している先(決めた向き、なければいちばん近い端)のダンジョンの案内
   */
  signLines(o: StaticObj): string[] | null {
    if (o.mimicked) return null;
    // セーブポイント(front#337)はいつも調べられる。出す文は調べたときに決める(touchSavePoint)
    if (o.type === SAVE_POINT) return ['ふっかつ地点にする'];
    if (o.type !== 'sign') {
      const lines = objectSettingsOf(o).lines;
      return lines.length ? lines : null;
    }
    const exit = signPointing(this.maps, this.area, o).exit;
    return signLinesOf(o.lines, exit ? this.dungeonOf(exit.to) : null);
  }

  dungeonOf(area: RpgMap): RpgDungeon {
    return this.dungeons.find((d) => d.id === area.dungeonId) ?? { id: area.dungeonId, name: area.name, theme: 'plain', sortOrder: 0 };
  }

  private homeArea(): RpgMap {
    return this.mapById(HOME_AREA) ?? this.maps[0];
  }

  // ===== 立つ場所(front#337) =====

  /** はじめて遊ぶときに立つ場所。始まりの草原のセーブポイントのとなり、なければ草原の中央付近 */
  private firstSpot(): Spot {
    const area = this.homeArea();
    const [x, y] = firstSpot(buildAreaMap(area));
    return { area, x, y };
  }

  /** たおれたときに戻る場所。最後に覚えた復活地点。まだ覚えていない・そのマスが通れなくなっていたら、はじめて遊ぶときと同じ場所 */
  respawnSpot(): Spot {
    const r = this.respawn;
    const area = r ? this.mapById(r.area) : undefined;
    if (r && area && buildAreaMap(area).walkable(r.x, r.y)) return { area, x: r.x, y: r.y };
    return this.firstSpot();
  }

  /** プレイヤーを今のエリアのマス(x, y)に立たせる */
  private placePlayer(x: number, y: number): void {
    const p = this.player;
    p.x = x;
    p.y = y;
    this.snapZ(p);
    p.path = [];
    p.target = null;
    this.placeCompanions();
  }

  /** 仲間(front#358)を、プレイヤーのまわりの通れるマスに並べる(エリアに入ったとき・呼んだとき) */
  private placeCompanions(): void {
    const [px, py] = [Math.round(this.player.x), Math.round(this.player.y)];
    const taken = new Set([`${px},${py}`]);
    for (const c of this.companions) {
      const [x, y] = this.freeSpotNear(px, py, taken);
      taken.add(`${x},${y}`);
      Object.assign(c, { x, y, path: [], target: null, help: null, reviving: 0, repath: 0 });
      this.snapZ(c);
    }
  }

  /** (x, y) のまわりで、通れて taken にないマス(近い順)。なければ (x, y) */
  private freeSpotNear(x: number, y: number, taken: Set<string>): [number, number] {
    for (let r = 1; r <= 3; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const [tx, ty] = [x + dx, y + dy];
          if (this.map.walkable(tx, ty) && !taken.has(`${tx},${ty}`)) return [tx, ty];
        }
      }
    }
    return [x, y];
  }

  /** テストプレイ(マップ作成画面から開く)で、そのエリアの中央付近から始める */
  startTestPlay(area: RpgMap): void {
    this.loadMap(area);
    const [x, y] = centerSpot(this.map);
    this.placePlayer(x, y);
  }

  /**
   * セーブポイントを調べる(front#337)。立っているマスを復活地点として覚える。
   * 戻り値は出す文。すでにこのセーブポイントのとなりを覚えていれば、覚え直さない
   */
  private touchSavePoint(o: StaticObj): string[] {
    const r = this.respawn;
    if (r && r.area === this.area.id && cheb(r.x, r.y, o.x, o.y) <= 1.5) return ['ここが ふっかつ地点だ。'];
    this.respawn = { area: this.area.id, x: Math.round(this.player.x), y: Math.round(this.player.y) };
    this.events.log(`ふっかつ地点を ${this.area.name} にした`);
    this.events.dirty();
    return ['ここを ふっかつ地点にした。たおれたら、ここに戻ってくる。'];
  }

  dispose(): void {
    this.timers.forEach(clearTimeout);
    this.timers = [];
  }

  // ===== 能力値 =====
  maxHp = () => maxHpOf(this.player.stats);
  maxMp = () => maxMpOf(this.player.stats);
  nextExp = () => nextExpOf(this.player.level);
  atk = () => baseAtkOf(this.player.stats) + (ITEMS[this.player.weapon]?.atk ?? 0);
  def = () => baseDefOf(this.player.stats) + (ITEMS[this.player.armor]?.def ?? 0);
  owned = (id: string) => (this.player.inv[id] ?? 0) > 0;

  // ===== セーブデータ =====

  /** 保存されていた状態を読み込む。知らないアイテム・エリア、通れない位置は使わない */
  loadSave(save: RpgSave): void {
    const p = this.player;
    p.level = Math.max(1, save.level);
    p.exp = Math.max(0, save.exp);
    p.gold = Math.max(0, save.gold);
    p.inv = {};
    for (const item of save.items) if (ITEMS[item.itemId] && item.count > 0) p.inv[item.itemId] = item.count;
    p.weapon = ITEMS[save.weapon]?.type === 'weapon' ? save.weapon : 'wood_sword';
    p.armor = ITEMS[save.armor]?.type === 'armor' ? save.armor : 'cloth';
    p.inv[p.weapon] = Math.max(1, p.inv[p.weapon] ?? 0);
    p.inv[p.armor] = Math.max(1, p.inv[p.armor] ?? 0);
    p.stats = { ...ZERO_STATS, ...save.stats };
    p.statPoints = Math.max(0, save.statPoints);
    // 合計がレベルと合わないとき(ふつうはAPIが保存しない)は、振り分けを戻して全部を振り分けていないポイントにする
    const used = Object.values(p.stats).reduce((n, v) => n + v, 0);
    if (used + p.statPoints !== totalStatPointsOf(p.level)) {
      p.stats = { ...ZERO_STATS };
      p.statPoints = totalStatPointsOf(p.level);
    }
    p.look = { ...DEFAULT_LOOK, ...save.look };
    this.questLog.load(save.quests);
    // たおれたまま保存されていたら、村で全回復した状態から始める
    p.hp = save.hp > 0 ? Math.min(save.hp, this.maxHp()) : this.maxHp();
    // MP・覚えた魔法(front#383)。魔法ができる前のセーブデータ(MPなし)・たおれたまま保存されていたら、MPは最大
    p.spells = SPELL_IDS.filter((id) => save.spells?.includes(id));
    // 魔法のLV(front#387)。覚えていない魔法の LV は使わない
    p.spellLevels = {};
    for (const l of save.spellLevels ?? []) {
      if (isSpellId(l.id) && p.spells.includes(l.id)) p.spellLevels[l.id] = Math.min(Math.max(Math.round(l.level), 1), MAX_SPELL_LEVEL);
    }
    p.mp = save.mp == null || save.hp <= 0 ? this.maxMp() : Math.max(0, Math.min(save.mp, this.maxMp()));
    p.mpRegen = 0;
    p.spellCd = 0;
    this.selected = null;
    this.respawn = save.respawn ? { area: save.respawn.area, x: save.respawn.x, y: save.respawn.y } : null;
    // 連れている仲間(front#358)。たおれたまま保存されていたら、全回復した状態にする
    this.companions = (save.party ?? []).slice(0, MAX_PARTY).map((rc) => this.toCompanion(rc, rc.hp > 0));
    this.placeFromSave(save);
    this.events.statsChanged();
    this.events.inventoryChanged();
  }

  /**
   * セーブデータの位置に立たせる(front#337)。まだ一度も保存していなければ、はじめて遊ぶときの場所。
   * 保存した位置が通れなければ近くの通れるマス、それもなければ(エリアがなくなったときも)たおれたときに戻る場所
   */
  private placeFromSave(save: RpgSave): void {
    const area = this.mapById(save.area);
    let spot: Spot | null = save.updatedAt ? null : this.firstSpot();
    if (!spot && area) {
      this.loadMap(area);
      const [x, y] = this.map.nearestWalkable(save.x, save.y);
      if (this.map.walkable(x, y)) spot = { area, x, y };
    }
    spot ??= this.respawnSpot();
    if (this.area !== spot.area) this.loadMap(spot.area);
    this.placePlayer(spot.x, spot.y);
  }

  toSaveInput(): RpgSaveInput {
    const p = this.player;
    // 歩いている途中なら、向かっているマスの位置で保存する
    const [x, y] = p.path.length ? p.path[0] : [Math.round(p.x), Math.round(p.y)];
    return {
      level: p.level,
      exp: p.exp,
      hp: Math.max(0, p.hp),
      gold: p.gold,
      weapon: p.weapon,
      armor: p.armor,
      items: Object.entries(p.inv).filter(([, count]) => count > 0).map(([itemId, count]) => ({ itemId, count })),
      area: this.area.id,
      x,
      y,
      stats: { ...p.stats },
      statPoints: p.statPoints,
      look: { ...p.look },
      quests: this.questLog.toList(),
      respawn: this.respawn ? { ...this.respawn } : null,
      // MP・覚えた魔法(front#383)
      mp: Math.max(0, Math.floor(p.mp)),
      spells: [...p.spells],
      // LV2 以上の魔法だけ送る(ない魔法は LV1)
      spellLevels: p.spells.filter((id) => this.spellLevel(id) > 1).map((id) => ({ id, level: this.spellLevel(id) })),
      // 仲間のデータ(front#358)。それぞれのアカウントに書かれる
      companions: this.companions.map((c) => ({
        userId: c.userId,
        level: c.level,
        exp: c.exp,
        hp: Math.max(0, Math.round(c.hp)),
        weapon: c.weapon,
        armor: c.armor,
        items: Object.entries(c.inv).filter(([, count]) => count > 0).map(([itemId, count]) => ({ itemId, count })),
        stats: { ...c.stats },
        statPoints: c.statPoints,
        mp: Math.max(0, Math.floor(c.mp)),
        spells: [...c.spells],
        spellLevels: c.spellLevels.map((l) => ({ ...l }))
      }))
    };
  }

  // ===== 仲間(front#358) =====

  /**
   * 仲間のアカウントのデータから、ゲームの仲間を作る。知らないアイテム・装備は使わない。
   * keepHp でなければ(呼んだとき・たおれたまま保存されていたとき)、HPは全回復
   */
  private toCompanion(rc: RpgCompanion, keepHp: boolean): Companion {
    const inv: Record<string, number> = {};
    for (const item of rc.items) if (ITEMS[item.itemId] && item.count > 0) inv[item.itemId] = item.count;
    const weapon = ITEMS[rc.weapon]?.type === 'weapon' ? rc.weapon : 'wood_sword';
    const armor = ITEMS[rc.armor]?.type === 'armor' ? rc.armor : 'cloth';
    let stats: Stats = { ...ZERO_STATS, ...rc.stats };
    let statPoints = Math.max(0, rc.statPoints);
    const level = Math.max(1, rc.level);
    if (Object.values(stats).reduce((n, v) => n + v, 0) + statPoints !== totalStatPointsOf(level)) {
      stats = { ...ZERO_STATS };
      statPoints = totalStatPointsOf(level);
    }
    const max = maxHpOf(stats);
    return {
      kind: 'mate', userId: rc.userId, name: rc.name, level, exp: Math.max(0, rc.exp), weapon, armor, inv, stats, statPoints,
      hp: keepHp ? Math.min(rc.hp, max) : max, look: { ...DEFAULT_LOOK, ...rc.look },
      x: this.player.x, y: this.player.y, z: this.player.z, path: [], dir: 1, moving: false,
      target: null, repath: 0, atkCd: 0, lunge: 0, hurt: 0, lastCombat: -99, regen: 0, dead: false, downT: 0, help: null, reviving: 0, itemCd: 0,
      // MP(front#391)。呼んだとき・魔法ができる前のデータは最大MP
      mp: keepHp && rc.mp != null ? Math.min(rc.mp, maxMpOf(stats)) : maxMpOf(stats), mpRegen: 0, spellCd: 0,
      spells: [...(rc.spells ?? [])], spellLevels: (rc.spellLevels ?? []).map((l) => ({ ...l })), pick: null
    };
  }

  /** 集会場で呼んだ仲間を加える(HPは全回復)。もういる・いっぱいなら何もしない */
  addCompanion(rc: RpgCompanion): void {
    if (this.companions.length >= MAX_PARTY || this.companions.some((c) => c.userId === rc.userId)) return;
    this.companions.push(this.toCompanion(rc, false));
    this.placeCompanions();
    this.events.log(`${rc.name}が仲間になった！`);
    this.events.statsChanged();
    this.events.inventoryChanged();
  }

  /** 仲間をパーティから外す(別れる・ほかで外れた)。敵の狙いも外す */
  removeCompanion(userId: string): Companion | null {
    const c = this.companions.find((m) => m.userId === userId);
    if (!c) return null;
    this.companions = this.companions.filter((m) => m !== c);
    if (this.selected === c) this.selected = null;
    if (this.hoverFighter === c) this.hoverFighter = null;
    for (const e of this.enemies) if (e.foe === c) e.foe = null;
    for (const m of this.companions) if (m.help === c) m.help = null;
    this.events.statsChanged();
    this.events.inventoryChanged();
    return c;
  }

  /** プレイヤーと仲間 */
  fighters(): Fighter[] {
    return [this.player, ...this.companions];
  }

  maxHpOf = (f: Fighter) => maxHpOf(f.stats);
  atkOf = (f: Fighter) => baseAtkOf(f.stats) + (ITEMS[f.weapon]?.atk ?? 0);
  defOf = (f: Fighter) => baseDefOf(f.stats) + (ITEMS[f.armor]?.def ?? 0);
  nameOf = (f: Fighter) => (f.kind === 'player' ? 'あなた' : f.name);

  /** プレイヤーの持ち物から、仲間に道具(回復薬・いのちの羽)を1つ渡す */
  giveItem(userId: string, id: string): boolean {
    const c = this.companions.find((m) => m.userId === userId);
    const item = ITEMS[id];
    // MPだけを回復する道具(front#383)は、仲間は使わないので渡さない
    if (!c || !item || !((item.type === 'use' && item.heal) || item.type === 'revive') || !this.owned(id)) return false;
    this.player.inv[id]--;
    c.inv[id] = (c.inv[id] ?? 0) + 1;
    this.events.log(`${c.name}に${item.name}を渡した`);
    this.events.inventoryChanged();
    this.events.dirty();
    return true;
  }

  /** 見た目を変える(front#224) */
  setLook(look: RpgLook): void {
    this.player.look = { ...look };
    this.events.dirty();
  }

  // ===== ステータスの振り分け(front#223) =====

  /**
   * 振り分けていないポイントを、ステータスに振り分ける(add は項目ごとに足すポイント)。
   * 振り直しはできないので、足すだけ。ポイントが足りない・運が上限を超えるときは何もしない
   */
  allocate(add: Partial<Stats>): boolean {
    const p = this.player;
    const entries = Object.entries(add) as [StatKey, number][];
    const total = entries.reduce((n, [, v]) => n + v, 0);
    if (total <= 0 || total > p.statPoints || entries.some(([, v]) => v < 0 || !Number.isInteger(v))) return false;
    if (p.stats.luk + (add.luk ?? 0) > MAX_LUCK) return false;
    const beforeMaxHp = this.maxHp();
    const beforeMaxMp = this.maxMp();
    for (const [key, v] of entries) p.stats[key] += v;
    p.statPoints -= total;
    // 最大HP・最大MP(front#383)が増えた分は、今のHP・MPにも足す
    p.hp += this.maxHp() - beforeMaxHp;
    p.mp += this.maxMp() - beforeMaxMp;
    this.events.log(`ステータスに${total}ポイントを振り分けた`);
    this.events.statsChanged();
    this.events.dirty();
    return true;
  }

  /** ポイント交換の結果(APIが品物を足したセーブデータ)のうち、ゴールドと持ち物を反映する */
  applyExchange(save: RpgSave): void {
    this.player.gold = save.gold;
    this.player.inv = {};
    for (const item of save.items) if (ITEMS[item.itemId] && item.count > 0) this.player.inv[item.itemId] = item.count;
    this.events.statsChanged();
    this.events.inventoryChanged();
  }

  // ===== エリア =====

  /** マップのデータからエリアを作る(マップ作成画面は、編集中のデータを渡して描き直すのにも使う) */
  loadMap(area: RpgMap): void {
    this.area = area;
    this.dungeon = this.dungeonOf(area);
    this.theme = themeOf(this.dungeon.theme);
    this.map = buildAreaMap(area);
    this.npcs = area.npcs.map((n) => ({
      ...n, kind: 'npc', path: [], dir: 1, moving: false, z: this.map.heightAt(n.x, n.y)
    }));
    this.enemies = area.enemies
      .filter((e) => ENEMIES[e.type])
      .map((e) => {
        const [x, y] = this.map.nearestWalkable(e.x, e.y);
        return {
          kind: 'enemy', type: e.type, x, y, z: this.map.heightAt(x, y), hx: x, hy: y, hp: ENEMIES[e.type].hp, alive: true, path: [], dir: -1, moving: false,
          wander: Math.random() * 3, repath: 0, atkCd: 0, flash: 0, lunge: 0, aggro: false, respawn: 0, seed: Math.random() * 6, act: null
        };
      });
    // 擬態している敵(front#333)。置物ごとに1回判定して、どれか1体がふりをする(外れたらただの置物)
    for (const o of this.map.statics) {
      const id = pickMimic(objectSettingsOf(o).mimics);
      if (id && ENEMIES[id]) this.enemies.push(this.placeMimic(o, id));
    }
    this.updateDisguises();
    this.floats.length = 0;
    this.particles.length = 0;
    this.playerFx.length = 0;
    this.drops = [];
    this.clickMarker = null;
    this.hover = null;
    // エリアを移ったら、選んでいた相手は外す(front#383)
    this.spellFx = [];
    this.selected = null;
    this.hoverFighter = null;
  }

  goArea(id: string, x: number, y: number, after?: () => void): void {
    const dest = this.mapById(id);
    if (this.transitioning || !dest) return;
    this.transitioning = true;
    this.player.path = [];
    this.player.target = null;
    this.events.fade(true);
    const before = this.dungeon.id;
    this.later(FADE_MS, () => {
      this.loadMap(dest);
      // 着く位置が通れなければ(マップを作り直したときなど)、エリアの中央付近に立つ(front#337)
      const [tx, ty] = this.map.walkable(x, y) ? [x, y] : centerSpot(this.map);
      this.placePlayer(tx, ty);
      after?.();
      this.transitioning = false;
      this.events.fade(false);
      this.events.areaEntered?.(dest, this.dungeon);
      // 同じダンジョンの中の移動(倒れて村に戻ったときなど)では、ダンジョン名を出さない
      if (this.dungeon.id !== before) {
        this.events.dungeonEntered(this.dungeon);
        this.events.log(`${this.dungeon.name}にやってきた`);
      }
      this.events.dirty();
    });
  }

  /**
   * 端のつながり(front#274)の出口から、ほかのダンジョンのエリアへ移る。
   * 今までのポータルと同じく画面が暗くなって移り、ダンジョンの名前が出る。着くのは、行き先のこちらへ戻る端の真ん中(front#339)
   */
  goLink(exit: AreaExit): void {
    const [ax, ay] = linkArrival(this.maps, this.area, exit.side, exit.to, buildAreaMap(exit.to));
    this.goArea(exit.to.id, ax, ay);
  }

  /**
   * 端の出口から、side の向きに隣り合うエリアへ移る(front#234)。着くのは、反対側の端の着地できるマスの真ん中(front#339)
   * 画面は進む向きにスライドし、ダンジョン名は出さない(BGMも変えない)
   */
  goNeighbor(side: Side): void {
    const dest = neighborOf(this.maps, this.area, side);
    if (this.transitioning || !dest) return;
    const image = this.events.captureScreen();
    this.player.path = [];
    this.player.target = null;
    this.loadMap(dest);
    const [tx, ty] = edgeMiddle(this.map, [-side[0], -side[1]]);
    this.placePlayer(tx, ty);
    this.slide = { side, t: 0, image };
    this.transitioning = true;
    this.events.areaEntered?.(dest, this.dungeon);
    this.events.dirty();
  }

  private later(ms: number, fn: () => void): void {
    this.timers.push(setTimeout(fn, ms));
  }

  // ===== 経路 =====

  private setPath(ent: Mover, isGoal: (x: number, y: number) => boolean, h: (x: number, y: number) => number): boolean {
    // 歩いている途中なら、向かっているマスから探し直す(マスの途中で向きを変えない)
    const moving = ent.path.length > 0;
    const [sx, sy] = moving ? ent.path[0] : [Math.round(ent.x), Math.round(ent.y)];
    const map = this.map;
    const path = findPath((x, y) => map.walkable(x, y), sx, sy, isGoal, h, map.w, (ax, ay, bx, by) => map.canStep(ax, ay, bx, by));
    if (path === null) return false;
    ent.path = moving ? [[sx, sy], ...path] : path;
    return true;
  }

  private pathTo(ent: Mover, tx: number, ty: number): boolean {
    return this.setPath(ent, (x, y) => x === tx && y === ty, (x, y) => octile(x, y, tx, ty));
  }

  // 相手の隣のマスまで
  private pathNear(ent: Mover, tx: number, ty: number): boolean {
    return this.setPath(
      ent,
      (x, y) => cheb(x, y, tx, ty) <= 1 && !(x === tx && y === ty),
      (x, y) => Math.max(0, octile(x, y, tx, ty) - 1)
    );
  }

  private moveAlong(ent: Mover, speed: number, dt: number): boolean {
    if (!ent.path.length) return false;
    const [tx, ty] = ent.path[0];
    const dx = tx - ent.x;
    const dy = ty - ent.y;
    const d = Math.hypot(dx, dy);
    const step = speed * dt;
    if (Math.abs(dx - dy) > 0.01) ent.dir = dx - dy > 0 ? 1 : -1;
    if (d <= step) {
      ent.x = tx;
      ent.y = ty;
      ent.path.shift();
    } else {
      ent.x += (dx / d) * step;
      ent.y += (dy / d) * step;
    }
    return true;
  }

  // ===== 高さ(front#225) =====

  /** 立っているマスの高さにすぐ合わせる(エリアに入ったとき・敵が出てきたとき) */
  private snapZ(ent: Mover): void {
    ent.z = this.map.heightAt(Math.round(ent.x), Math.round(ent.y));
  }

  /** 段を登り降りするときは、なめらかに高さを変える */
  private settleZ(ent: Mover, dt: number): void {
    const target = this.map.heightAt(Math.round(ent.x), Math.round(ent.y));
    ent.z += (target - ent.z) * Math.min(1, dt * 12);
    if (Math.abs(target - ent.z) < 0.01) ent.z = target;
  }

  private faceTo(ent: Mover, t: { x: number; y: number }): void {
    const s = t.x - t.y - (ent.x - ent.y);
    if (Math.abs(s) > 0.05) ent.dir = s > 0 ? 1 : -1;
  }

  // ===== 入力 =====

  /** 画面上の位置にあるマス。高いマスがあるときは、手前のマスから上の面と側面に当たるかを見る */
  screenToTile(mx: number, my: number): [number, number] {
    const wx = (mx - this.camX) / this.zoom;
    const wy = (my - this.camY) / this.zoom;
    const map = this.map;
    if (map.hasHeights) {
      for (let s = map.w + map.h - 2; s >= 0; s--) {
        for (let x = Math.min(map.w - 1, s); x >= 0 && s - x < map.h; x--) {
          const y = s - x;
          const [cx, cy] = iso(x, y);
          const lift = map.heightAt(x, y) * HZ;
          // 上の面のひし形と、その下の側面を合わせた六角形の中か
          const dx = Math.abs(wx - cx) / (TW / 2);
          if (dx > 1) continue;
          const top = cy - lift - (TH / 2) * (1 - dx);
          const bottom = cy + (TH / 2) * (1 - dx);
          if (wy >= top && wy <= bottom) return [x, y];
        }
      }
    }
    const a = wx / (TW / 2);
    const b = wy / (TH / 2);
    return [Math.round((a + b) / 2), Math.round((b - a) / 2)];
  }

  /** 画面上の位置にいる村人・敵・壊れる置物・落ちたアイテム(重なっていれば手前のもの) */
  pickEntity(mx: number, my: number): Npc | Enemy | StaticObj | Drop | null {
    const wx = (mx - this.camX) / this.zoom;
    const wy = (my - this.camY) / this.zoom;
    let best: Npc | Enemy | StaticObj | Drop | null = null;
    let bestDepth = -Infinity;
    for (const e of [...this.npcs, ...this.enemies.filter((e) => e.alive)]) {
      const [sx, sy0] = iso(e.x, e.y);
      const sy = sy0 - e.z * HZ;
      const def = e.kind === 'enemy' ? ENEMIES[e.type] : null;
      const hw = def ? 18 * ringSizeOf(def) + 4 : 18;
      const ht = def ? hitHeightOf(def) : 50;
      if (wx > sx - hw && wx < sx + hw && wy > sy - ht && wy < sy + 8 && e.x + e.y > bestDepth) {
        bestDepth = e.x + e.y;
        best = e;
      }
    }
    // 壊れる置物(壊れていないもの)・読める看板(front#314)もクリックで狙える(front#264)。人・敵と重なれば手前のもの
    for (const o of this.map.statics) {
      if (o.mimicked || ((!isBreakableObj(o) || o.broken) && !this.signLines(o))) continue;
      const [sx, sy0] = iso(o.x, o.y);
      const sy = sy0 - this.map.heightAt(o.x, o.y) * HZ;
      const ht = o.type === 'armor' ? 52 : o.type === 'sign' || o.type === SAVE_POINT ? 46 : o.type === 'crystal' ? 34 : o.type === 'barrel' || o.type === 'pot' || o.type === 'bucket' ? 28 : 24;
      if (wx > sx - 20 && wx < sx + 20 && wy > sy - ht && wy < sy + 10 && o.x + o.y > bestDepth) {
        bestDepth = o.x + o.y;
        best = o;
      }
    }
    // 落ちたアイテム(front#276)。同じマスなら、人・敵・置物より手前として選ぶ
    for (const d of this.drops) {
      const [sx, sy0] = iso(d.x, d.y);
      const sy = sy0 - this.map.heightAt(d.x, d.y) * HZ;
      if (wx > sx - 14 && wx < sx + 14 && wy > sy - 26 && wy < sy + 8 && d.x + d.y + 0.01 > bestDepth) {
        bestDepth = d.x + d.y + 0.01;
        best = d;
      }
    }
    return best;
  }

  /** 村人・敵の足元の画面上の位置(E2Eテストでクリックする位置を求めるのに使う) */
  screenPositionOf(e: { x: number; y: number; z?: number }): [number, number] {
    const [sx, sy] = iso(e.x, e.y);
    const z = e.z ?? this.map.heightAt(Math.round(e.x), Math.round(e.y));
    return [sx * this.zoom + this.camX, (sy - z * HZ) * this.zoom + this.camY];
  }

  /** 画面上の位置にいる自分・仲間(front#383。重なっていれば手前の人)。たおれている仲間も選べる(いのちの羽を使うため) */
  pickFighter(mx: number, my: number): Fighter | null {
    const wx = (mx - this.camX) / this.zoom;
    const wy = (my - this.camY) / this.zoom;
    let best: Fighter | null = null;
    for (const f of this.fighters()) {
      if (f.kind === 'player' && this.hidePlayer) continue;
      const [sx, sy0] = iso(f.x, f.y);
      const sy = sy0 - f.z * HZ;
      if (Math.abs(wx - sx) < 16 && wy > sy - 52 && wy < sy + 8 && (!best || f.x + f.y > best.x + best.y)) best = f;
    }
    return best;
  }

  mouseMove(mx: number, my: number): void {
    this.mouse = { x: mx, y: my };
    this.hover = this.locked ? null : this.pickEntity(mx, my);
    this.hoverFighter = this.locked ? null : this.frontFighter(mx, my, this.hover);
  }

  mouseLeave(): void {
    this.mouse = null;
    this.hover = null;
    this.hoverFighter = null;
  }

  /** (mx, my) にいる自分・仲間が、ほかに当たったもの(hit)より手前なら、その人 */
  private frontFighter(mx: number, my: number, hit: { x: number; y: number } | null): Fighter | null {
    const f = this.pickFighter(mx, my);
    return f && (!hit || f.x + f.y >= hit.x + hit.y) ? f : null;
  }

  // ===== 選ぶ(front#383) =====

  /**
   * 敵・仲間・自分を選ぶ。選んだ相手に魔法・回復薬を使う。
   * 敵をクリックしたときは、選ぶのに加えて今までどおり近づいて殴る(click)。仲間・自分は選ぶだけで動かない
   */
  select(s: Selection | null): void {
    this.selected = s;
  }

  clearSelection(): void {
    this.selected = null;
  }

  /** 選んでいる敵(生きているときだけ) */
  selectedEnemy(): Enemy | null {
    const s = this.selected;
    return s?.kind === 'enemy' && s.alive ? s : null;
  }

  /** 選んでいる自分・仲間(パーティにいるときだけ) */
  selectedFighter(): Fighter | null {
    const s = this.selected;
    if (s?.kind === 'player') return s;
    return s?.kind === 'mate' && this.companions.includes(s) ? s : null;
  }

  /** 回復(回復魔法・回復薬)を使う相手。仲間・自分を選んでいればその人、敵を選んでいる・選んでいなければ自分 */
  healTarget(): Fighter {
    return this.selectedFighter() ?? this.player;
  }

  click(mx: number, my: number): void {
    if (this.locked || this.player.dead || this.transitioning) return;
    const hit = this.pickEntity(mx, my);
    const mate = this.frontFighter(mx, my, hit);
    if (mate) {
      this.select(mate);
      return;
    }
    if (hit) {
      this.player.target = hit;
      this.player.repath = 0;
      if (hit.kind === 'enemy') this.select(hit);
      return;
    }
    const [tx, ty] = this.screenToTile(mx, my);
    if (!this.map.walkable(tx, ty)) return;
    this.player.target = null;
    if (this.pathTo(this.player, tx, ty)) this.clickMarker = { x: tx, y: ty, t: 0 };
  }

  // ===== 持ち物・お店 =====

  /**
   * 持ち物の道具を使う。回復薬は選んでいる仲間・自分(front#383。なければ自分)に、MPだけを回復する道具は自分に使う。
   * 魔法書は使うと魔法を覚える(front#383)
   */
  useItem(id: string): boolean {
    const item = ITEMS[id];
    if (item?.type === 'book') return this.learnSpell(id);
    return this.useItemOn(id, item?.type === 'use' && !item.heal ? this.player : this.healTarget());
  }

  /**
   * 道具を使えるか(front#358)。回復薬はたおれていない人に、いのちの羽はたおれている人にだけ使える。
   * MPを回復する道具(front#383)はプレイヤーのMPが減っているときに使える。使えないときは理由を返す
   */
  itemBlocker(id: string, target: Fighter): string | null {
    const item = ITEMS[id];
    if (!item) return '使えない';
    if (item.type === 'revive') return target.dead ? null : 'たおれていない';
    if (item.type === 'book') return target.kind !== 'player' ? '使えない' : this.knowsBook(id) ? 'もう覚えている' : null;
    if (item.type !== 'use') return '使えない';
    if (target.dead) return 'たおれている';
    const needHp = !!item.heal && target.hp < this.maxHpOf(target);
    const needMp = !!item.mp && target.kind === 'player' && target.mp < this.maxMp();
    if (needHp || needMp) return null;
    if (item.heal) return 'HPは満タン';
    return target.kind === 'player' ? 'MPは満タン' : '使えない';
  }

  /** プレイヤーの持ち物の道具を、自分か仲間に使う(front#358)。そばにいなくても使える */
  useItemOn(id: string, target: Fighter): boolean {
    const item = ITEMS[id];
    if (!item || !this.owned(id) || this.player.dead) return false;
    if (item.type === 'book') return target.kind === 'player' && this.learnSpell(id);
    const blocker = this.itemBlocker(id, target);
    if (blocker) {
      if (blocker === 'HPは満タン') this.events.log(target.kind === 'player' ? 'HPは満タンだ' : `${target.name}のHPは満タンだ`);
      if (blocker === 'MPは満タン') this.events.log('MPは満タンだ');
      return false;
    }
    this.player.inv[id]--;
    this.applyItem(this.player, target, id);
    this.events.inventoryChanged();
    this.events.dirty();
    return true;
  }

  /** user が target に道具を使った効果(回復量は使う人の魔力で増える)。持ち物は呼ぶ側で減らす */
  private applyItem(user: Fighter, target: Fighter, id: string): void {
    const item = ITEMS[id];
    const by = user === target ? '' : `${this.nameOf(user)}が`;
    const to = target.kind === 'player' ? '' : `${target.name}に`;
    if (item.type === 'revive') {
      this.revive(target, item.heal ?? 50);
      this.events.log(`${by}${to}${item.name}を使った！ ${this.nameOf(target)}が起き上がった`);
    } else {
      const got: string[] = [];
      if (item.heal) {
        const before = target.hp;
        target.hp = Math.min(this.maxHpOf(target), target.hp + Math.round(item.heal * healRateOf(user.stats)));
        this.floatText(target.x, target.y, `+${target.hp - before}`, '#4ade80', 17);
        got.push(`HPが${target.hp - before}`);
      }
      // MPの回復(front#383)。仲間は魔法を使わないので、プレイヤーのときだけ
      if (item.mp && target.kind === 'player') {
        const before = Math.floor(target.mp);
        target.mp = Math.min(this.maxMp(), target.mp + item.mp);
        const n = Math.floor(target.mp) - before;
        this.floatText(target.x, target.y, `+${n} MP`, '#60a5fa', 15, item.heal ? -18 : 0);
        got.push(`MPが${n}`);
      }
      this.events.log(`${by}${to}${item.name}を使った。${got.join('・')}回復した`);
    }
    // 回復のエフェクト(front#335)はプレイヤーのまわり、仲間のときは仲間のまわり(front#383)に出す。効果音はだれのときも鳴らす
    if (target.kind === 'player') this.addPlayerFx('heal', item.type === 'revive' || (item.heal ?? 0) >= 100);
    else this.addMateFx(target, 'heal', item.type === 'revive');
    this.events.sound?.('heal');
    this.events.statsChanged();
  }

  // ===== 魔法(front#383) =====

  /** 覚えた魔法の LV(front#387)。覚えていなければ 0 */
  spellLevel(id: SpellId): number {
    return this.player.spells.includes(id) ? (this.player.spellLevels[id] ?? 1) : 0;
  }

  /** 魔法書の LV(front#387。なければ 1) */
  bookLevel(id: string): number {
    return ITEMS[id]?.level ?? 1;
  }

  /** 魔法書を読んでも意味がないか(その魔法を、書と同じかそれより高い LV でもう覚えている。front#387) */
  knowsBook(id: string): boolean {
    const spell = ITEMS[id]?.spell;
    return isSpellId(spell) && this.spellLevel(spell) >= this.bookLevel(id);
  }

  /**
   * 魔法書を使って魔法を覚える。魔法書はなくなる。
   * 覚えている魔法は、書の LV のほうが高ければその LV に上がる(front#387)。同じか低ければ使わない
   */
  private learnSpell(id: string): boolean {
    const item = ITEMS[id];
    const p = this.player;
    if (!item || item.type !== 'book' || !this.owned(id) || p.dead || !isSpellId(item.spell)) return false;
    const s = MAGIC[item.spell];
    const now = this.spellLevel(s.id);
    const level = Math.min(this.bookLevel(id), MAX_SPELL_LEVEL);
    if (now >= level) {
      this.events.log(`${s.name}はもう LV${now} で覚えている`);
      return false;
    }
    p.inv[id]--;
    p.spells = SPELL_IDS.filter((sid) => sid === s.id || p.spells.includes(sid));
    p.spellLevels[s.id] = level;
    this.floatText(p.x, p.y, `${s.icon} ${spellLabel(s.id, level)}`, '#c4b5fd', 16, -18);
    this.events.log(now
      ? `${item.name}を読んだ。${s.icon} ${s.name}が LV${level} に上がった！`
      : `${item.name}を読んだ。${s.icon} ${s.name}を覚えた！（LV${level}）`);
    this.events.sound?.('level_up');
    this.events.statsChanged();
    this.events.inventoryChanged();
    this.events.dirty();
    return true;
  }

  /** 攻撃魔法の届く距離(マス) */
  spellRange = () => spellRangeOf(this.player.stats);

  /**
   * 攻撃魔法を撃つ敵。選んでいる敵がいればその敵、いなければ届く中でいちばん近い敵。
   * 届かなければ、ログに出す理由
   */
  private spellTarget(): Enemy | string {
    const p = this.player;
    const range = this.spellRange();
    const dist = (e: Enemy) => Math.hypot(e.x - p.x, e.y - p.y);
    const chosen = this.selectedEnemy();
    if (chosen) return dist(chosen) <= range ? chosen : `${ENEMIES[chosen.type].name}は遠すぎて届かない`;
    // 正体を現していない擬態している敵・化ける敵は狙わない
    const near = this.enemies
      .filter((e) => e.alive && !this.hiding(e) && dist(e) <= range)
      .sort((a, b) => dist(a) - dist(b))[0];
    return near ?? '届く敵がいない';
  }

  /** 置物に擬態している・化けている敵(front#270 / front#333)が、まだ正体を現していない */
  private hiding(e: Enemy): boolean {
    return !e.aggro && (!!e.disguise || !!disguiseOf(ENEMIES[e.type]));
  }

  /**
   * 魔法を使う。攻撃魔法は選んでいる敵(なければいちばん近い敵)に、回復魔法は選んでいる仲間・自分(なければ自分)に使う。
   * 使えなければ(覚えていない・MPが足りない・届かない・満タン)、理由をログに出して false。次の魔法を使えるまでの間は何もしない
   */
  castSpell(id: string): boolean {
    const p = this.player;
    if (!isSpellId(id) || p.dead || this.transitioning || this.locked) return false;
    const s = MAGIC[id];
    if (!p.spells.includes(id)) {
      this.events.log(`${s.name}をまだ覚えていない`);
      return false;
    }
    if (p.spellCd > 0) return false;
    if (p.mp < s.mp) {
      this.events.log(`MPが足りない（${s.name}はMP${s.mp}）`);
      return false;
    }
    const level = this.spellLevel(id);
    let message = `${s.icon} ${level > 1 ? spellLabel(id, level) : s.name}！`;
    if (s.kind === 'attack') {
      const target = this.spellTarget();
      if (typeof target === 'string') {
        this.events.log(target);
        return false;
      }
      this.castAttack(p, id, target);
    } else {
      const targets = s.all ? this.fighters().filter((f) => !f.dead) : [this.healTarget()];
      if (targets[0].dead) {
        this.events.log(`${this.nameOf(targets[0])}はたおれている（いのちの羽で起こせる）`);
        return false;
      }
      if (targets.every((f) => f.hp >= this.maxHpOf(f))) {
        this.events.log(s.all ? 'みんなHPは満タンだ' : targets[0].kind === 'player' ? 'HPは満タンだ' : `${targets[0].name}のHPは満タンだ`);
        return false;
      }
      this.castHeal(p, id, targets);
      if (!s.all && targets[0] !== p) message += ` ${this.nameOf(targets[0])}のHPが回復した`;
    }
    this.events.log(message);
    this.events.statsChanged();
    this.events.dirty();
    return true;
  }

  /** 魔法を使った人(user)の MP を減らし、次の魔法を使えるまでの秒を決める */
  private spendSpell(user: Fighter, id: SpellId): void {
    user.mp -= MAGIC[id].mp;
    user.spellCd = SPELL_COOLDOWN;
    user.lunge = 0.6;
  }

  /** user が攻撃魔法を target に撃つ(プレイヤー・仲間。front#391)。当たるのは飛んでいったあと(updateSpellFx) */
  private castAttack(user: Fighter, id: SpellId, target: Enemy): void {
    this.faceTo(user, target);
    this.spellFx.push({ spell: id, caster: user, t: 0, fromX: user.x, fromY: user.y, target, x: target.x, y: target.y, hit: false, hits: [], seed: Math.random() * 1000 });
    user.lastCombat = this.time;
    this.spendSpell(user, id);
  }

  /** user が回復魔法を targets に使う(プレイヤー・仲間。front#391)。回復量は user の魔力と魔法の LV で決まる */
  private castHeal(user: Fighter, id: SpellId, targets: Fighter[]): void {
    const s = MAGIC[id];
    // 回復量は LV で増える(front#387)
    const amount = Math.round(spellHealOf(user.stats) * s.rate * levelRateOf(this.levelOf(user, id)));
    for (const f of targets) {
      const before = f.hp;
      f.hp = Math.min(this.maxHpOf(f), f.hp + amount);
      if (f.hp > before) this.floatText(f.x, f.y, `+${f.hp - before}`, '#4ade80', 17);
      if (f.kind === 'player') this.addPlayerFx('heal', !!s.all);
      else this.addMateFx(f, 'heal', !!s.all);
    }
    this.events.sound?.('heal');
    if (targets.length === 1 && targets[0] !== user) this.faceTo(user, targets[0]);
    this.spendSpell(user, id);
  }

  /** プレイヤー・仲間が覚えている魔法の LV(覚えていなければ 0) */
  levelOf(f: Fighter, id: SpellId): number {
    if (f.kind === 'player') return this.spellLevel(id);
    if (!f.spells.includes(id)) return 0;
    return Math.min(Math.max(f.spellLevels.find((l) => l.id === id)?.level ?? 1, 1), MAX_SPELL_LEVEL);
  }

  /** 仲間のまわりにエフェクト(回復・レベルアップ)を出す(front#391)。同じ種類が出ていれば、始めからやり直す */
  private addMateFx(c: Companion, kind: PlayerFx['kind'], big = false): void {
    this.mateFx = this.mateFx.filter((m) => !(m.target === c && m.fx.kind === kind));
    this.mateFx.push({ target: c, fx: { kind, t: 0, seed: Math.random() * 1000, big } });
  }

  /** 魔法の演出を進め、攻撃魔法が当たる時になったら敵にダメージを与える */
  private updateSpellFx(dt: number): void {
    for (const fx of this.spellFx) {
      fx.t += dt;
      const t = fx.target;
      if (t.kind !== 'enemy' || t.alive) {
        fx.x = t.x;
        fx.y = t.y;
      }
      if (!fx.hit && fx.t >= SPELL_FX_SEC[fx.spell].hitAt) {
        fx.hit = true;
        this.spellImpact(fx);
      }
    }
    if (this.spellFx.some((fx) => fx.t >= SPELL_FX_SEC[fx.spell].duration)) {
      this.spellFx = this.spellFx.filter((fx) => fx.t < SPELL_FX_SEC[fx.spell].duration);
    }
  }

  /** 攻撃魔法が当たった。サンダーは当たった位置のまわりの敵全部に当たる */
  private spellImpact(fx: SpellFx): void {
    const s = MAGIC[fx.spell];
    if (s.kind !== 'attack') return;
    const main = fx.target.kind === 'enemy' && fx.target.alive ? fx.target : null;
    const radius = s.radius;
    fx.hits = radius
      ? this.enemies.filter((e) => e.alive && !this.hiding(e) && Math.hypot(e.x - fx.x, e.y - fx.y) <= radius)
      : main ? [main] : [];
    // 効果音は、敵の同じ種類の攻撃(炎・水・雷)の音を使う
    this.events.sound?.(`attack_${fx.spell === 'blizzard' ? 'water' : fx.spell}`);
    for (const e of fx.hits) this.spellDamage(e, fx.spell, fx.caster);
  }

  /** 攻撃魔法のダメージ。敵の防御は通常攻撃の半分だけ効き、会心はない。威力は撃った人(caster)の魔力と魔法の LV で決まる */
  private spellDamage(e: Enemy, spell: SpellId, caster: Fighter = this.player): void {
    const s = MAGIC[spell];
    const p = caster;
    const def = ENEMIES[e.type];
    // 威力は LV で増える(front#387)
    let dmg = Math.max(1, Math.round(spellPowerOf(p.stats) * s.rate * levelRateOf(this.levelOf(caster, spell)) - def.def * 0.3 + randi(-2, 2)));
    // 守る敵(front#330)が生きている間は、魔法でもボスへのダメージが減る
    const guards = def.boss ? this.bossGuards() : 0;
    if (guards) dmg = Math.round(dmg * guardRateOf(guards));
    e.hp -= dmg;
    e.flash = 0.12;
    if (s.slow) e.slow = s.slow;
    p.lastCombat = this.time;
    if (!e.aggro) {
      e.aggro = true;
      e.atkCd = 0.6;
    }
    const color = spell === 'fire' ? '#fdba74' : spell === 'blizzard' ? '#bae6fd' : '#fde047';
    this.floatText(e.x, e.y, guards ? `🛡${dmg}` : `${dmg}`, guards ? '#9ca3af' : color, 18);
    if (e.hp <= 0) this.killEnemy(e);
  }

  /** ショートカットキー(front#272)に登録した道具・魔法(front#383)を使う。spell があれば魔法 */
  useShortcut(id: string, spell: SpellId | null = null): void {
    if (spell) {
      this.castSpell(spell);
      return;
    }
    const item = ITEMS[id];
    if (!item || item.type !== 'use') return;
    if (!this.owned(id)) {
      this.events.log(`${item.name}を持っていない`);
      return;
    }
    this.useItem(id);
  }

  /** たおれている人を起き上がらせる。rate は最大HPに対する割合(%) */
  private revive(f: Fighter, rate: number): void {
    f.dead = false;
    f.downT = 0;
    f.hp = Math.max(1, Math.round((this.maxHpOf(f) * rate) / 100));
    f.lastCombat = this.time;
    this.floatText(f.x, f.y, '起き上がった！', '#86efac', 15, -10);
    if (f.kind === 'player') this.events.waiting?.(false);
  }

  equip(id: string): void {
    const item = ITEMS[id];
    // 装備できるのは武器・防具だけ(使う道具・素材(front#277)は装備しない)
    if (!item || (item.type !== 'weapon' && item.type !== 'armor') || !this.owned(id)) return;
    if (item.type === 'weapon') this.player.weapon = id;
    else this.player.armor = id;
    this.events.log(`${item.name}を装備した`);
    this.events.statsChanged();
    this.events.inventoryChanged();
    this.events.dirty();
  }

  /** 道具屋で今買える数。回復薬・いのちの羽(front#358)は所持ゴールドで買える数まで、装備は持っていなければ1つ */
  buyableCount(id: string): number {
    const item = ITEMS[id];
    if (!item || item.price === undefined) return 0;
    const can = item.price > 0 ? Math.floor(this.player.gold / item.price) : 1;
    if (item.type === 'use' || item.type === 'revive') return can;
    // 魔法書(front#383)は、覚えている魔法の書も買える(合成の素材に使うため。front#387)。回復薬と同じく、いくつでも買える
    if (item.type === 'book') return can;
    return this.owned(id) ? 0 : Math.min(can, 1);
  }

  /** 道具屋で買う。回復薬などは count 個まとめて買える(front#379)。装備は1つまで */
  buy(id: string, count = 1): boolean {
    const item = ITEMS[id];
    if (!item || item.price === undefined || !Number.isInteger(count) || count < 1 || count > this.buyableCount(id)) return false;
    const gold = item.price * count;
    this.player.gold -= gold;
    this.player.inv[id] = (this.player.inv[id] ?? 0) + count;
    this.events.log(count > 1 ? `${item.name}を${count}個買った（-${gold}G）` : `${item.name}を買った（-${gold}G）`);
    this.events.statsChanged();
    this.events.inventoryChanged();
    this.events.dirty();
    return true;
  }

  /** 装備しているか(装備中のものは売れない) */
  isEquipped = (id: string) => this.player.weapon === id || this.player.armor === id;

  /**
   * 道具屋で今売れる数(front#379)。売値がない・装備中なら0。
   * 武器・防具は1つずつ、回復薬・素材は持っている数まで。ゴールドの上限を超える分は売れない
   */
  sellableCount(id: string): number {
    const item = ITEMS[id];
    const price = item?.sellPrice;
    if (!item || price === undefined || this.isEquipped(id)) return 0;
    const room = Math.floor((MAX_GOLD - this.player.gold) / price);
    const max = item.type === 'weapon' || item.type === 'armor' ? 1 : Infinity;
    return Math.max(0, Math.min(this.player.inv[id] ?? 0, max, room));
  }

  /** 道具屋で売る(front#379)。売れなければ何もせず false */
  sell(id: string, count = 1): boolean {
    const item = ITEMS[id];
    if (!item || item.sellPrice === undefined || !Number.isInteger(count) || count < 1 || count > this.sellableCount(id)) return false;
    const gold = item.sellPrice * count;
    this.player.inv[id] -= count;
    this.player.gold += gold;
    this.events.log(count > 1 ? `${item.name}を${count}個売った（+${gold}G）` : `${item.name}を売った（+${gold}G）`);
    this.events.statsChanged();
    this.events.inventoryChanged();
    this.events.dirty();
    return true;
  }

  // ===== 鍛冶屋の合成(front#277) =====

  /** レシピの素材とゴールドが足りていて、まだ持っていない装備なら作れる */
  canCraft(recipe: Recipe): boolean {
    const p = this.player;
    return !this.owned(recipe.result) && p.gold >= recipe.gold && recipe.materials.every((m) => (p.inv[m.id] ?? 0) >= m.count);
  }

  /** 素材とゴールドを払って装備を作る。作れなければ何もせず false */
  craft(result: string): boolean {
    const recipe = RECIPES.find((r) => r.result === result);
    const item = ITEMS[result];
    if (!recipe || !item || !this.canCraft(recipe)) return false;
    const p = this.player;
    p.gold -= recipe.gold;
    for (const m of recipe.materials) p.inv[m.id] -= m.count;
    p.inv[result] = (p.inv[result] ?? 0) + 1;
    this.events.log(`${item.name}を作った！（-${recipe.gold}G）`);
    this.events.statsChanged();
    this.events.inventoryChanged();
    this.events.dirty();
    return true;
  }

  // ===== 戦闘 =====

  private floatText(x: number, y: number, text: string, color: string, size = 16, oy = 0): void {
    this.floats.push({ x, y, text, color, size, oy, t: 0 });
  }

  /** プレイヤーのまわりのエフェクト(front#335)を始める。同じ種類が出ていれば、始めからやり直す */
  private addPlayerFx(kind: PlayerFx['kind'], big = false): void {
    const i = this.playerFx.findIndex((f) => f.kind === kind);
    if (i >= 0) this.playerFx.splice(i, 1);
    this.playerFx.push({ kind, t: 0, seed: Math.random() * 1000, big });
  }

  /** プレイヤー・仲間(front#358)が敵を1回叩く */
  private playerAttack(e: Enemy, p: Fighter = this.player): void {
    const def = ENEMIES[e.type];
    p.atkCd = attackIntervalOf(p.stats);
    p.lunge = 1;
    p.lastCombat = this.time;
    let dmg = Math.max(1, Math.round(this.atkOf(p) - def.def * 0.6 + randi(-2, 2)));
    const crit = Math.random() < critRateOf(p.stats);
    if (crit) dmg = Math.round(dmg * 1.6);
    // 守る敵(front#330)が生きている間、ボスへのダメージは1体につき1/4ずつ減る
    const guards = def.boss ? this.bossGuards() : 0;
    if (guards) dmg = Math.round(dmg * guardRateOf(guards));
    e.hp -= dmg;
    e.flash = 0.12;
    this.events.sound?.(`hit_${hitMaterialOf(def)}`);
    if (!e.aggro) {
      e.aggro = true;
      e.atkCd = 0.6;
    }
    if (guards) this.floatText(e.x, e.y, `🛡${dmg}`, '#9ca3af', 17);
    else this.floatText(e.x, e.y, crit ? `${dmg}!` : `${dmg}`, crit ? '#ffd54a' : '#ffffff', crit ? 22 : 17);
    if (e.hp <= 0) this.killEnemy(e);
  }

  /** ボスを守っている敵(front#330)の数。このエリアで生きている「ボスを守る」敵 */
  bossGuards(): number {
    return this.enemies.filter((e) => e.alive && ENEMIES[e.type]?.guard).length;
  }

  // ===== 壊れる置物(front#264) =====

  /** 壊れる置物を1回叩く。必要な回数を叩くと壊れる */
  private hitObject(o: StaticObj): void {
    const p = this.player;
    p.atkCd = attackIntervalOf(p.stats);
    p.lunge = 1;
    o.hits = (o.hits ?? 0) + 1;
    o.shake = 1;
    this.events.sound?.(`hit_${objectSettingsOf(o).hitMaterial}`);
    if (o.hits >= (BREAK_HITS[o.type] ?? 1)) this.breakObject(o);
  }

  /** 置物を壊し、中身を出す。アイテムはそのまま持ち物に入り、敵はそのマスに現れて襲ってくる */
  private breakObject(o: StaticObj): void {
    const p = this.player;
    o.broken = true;
    o.hits = 0;
    o.shake = 0;
    this.map.solid[o.y][o.x] = false;
    p.target = null;
    const color =
      objectTintOf(o)?.m ??
      { grass: '#5cbf64', fern: '#76a84a', crystal: '#7ef9ff', chest: '#f2c14e', armor: '#cbd5e1', barrel: '#9a6230', pot: '#c8693a', bones: '#e9e4d4', bucket: '#966131' }[o.type as string] ??
      this.theme.rock[1];
    for (let i = 0; i < 12; i++) {
      this.particles.push({ x: o.x, y: o.y, ox: 0, oy: -8, vx: randi(-70, 70), vy: randi(-150, -50), t: 0, color: i % 3 ? color : '#ffffff' });
    }
    const settings = objectSettingsOf(o);
    // 出てくるアイテム(front#333)は1つずつそれぞれの確率で判定し、当たったものがフィールドに落ちる(front#276)。
    // 置物は元に戻るので、置物のマスには落とさない
    for (const item of settings.items) {
      if (ITEMS[item.id] && Math.random() < item.chance) this.dropItem(item.id, item.count, o.x, o.y, true);
    }
    // 出てくる敵(front#333)も1つずつそれぞれの確率で判定し、当たった敵が現れる(置物のマスから順に、重ならないまわりのマスへ)
    const spawned: Enemy[] = [];
    for (const c of settings.enemies) {
      if (!ENEMIES[c.id] || Math.random() >= c.chance) continue;
      const [x, y] = this.spawnSpot(o.x, o.y, spawned);
      const e: Enemy = {
        kind: 'enemy', type: c.id, x, y, z: this.map.heightAt(x, y), hx: x, hy: y, hp: ENEMIES[c.id].hp, alive: true, path: [], dir: -1,
        moving: false, wander: 0, repath: 0, atkCd: 0.8, flash: 0, lunge: 0, aggro: true, respawn: 0, seed: Math.random() * 6, act: null, fromObject: o
      };
      this.enemies.push(e);
      spawned.push(e);
      this.events.log(`${STATIC_NAMES[o.type]}の中から${ENEMIES[c.id].name}が現れた！`);
    }
    if (spawned.length) {
      // 出てきた敵をそのまま狙う。全部倒すまで置物は戻らない
      p.target = spawned[0];
      p.repath = 0;
      o.respawnIn = null;
    } else {
      o.respawnIn = BREAK_RESPAWN_SEC;
    }
  }

  /** 置物から出てくる敵が立つマス(front#333)。(x, y) から順に、通れてほかの出てきた敵と重ならないマス */
  private spawnSpot(x: number, y: number, taken: readonly Enemy[]): [number, number] {
    const spots: [number, number][] = [[0, 0], [1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]];
    for (const [dx, dy] of spots) {
      const [tx, ty] = [x + dx, y + dy];
      if ((dx || dy) && !this.map.walkable(tx, ty)) continue;
      if (!taken.some((e) => e.x === tx && e.y === ty)) return [tx, ty];
    }
    return [x, y];
  }

  /** 擬態している敵(front#333)を、置物のふりをさせて置く。置物は描かず、敵が置物の絵で立つ */
  private placeMimic(o: StaticObj, id: string, e?: Enemy): Enemy {
    const def = ENEMIES[id];
    o.mimicked = true;
    const enemy: Enemy = Object.assign(e ?? ({} as Enemy), {
      kind: 'enemy', type: id, x: o.x, y: o.y, z: this.map.heightAt(o.x, o.y), hx: o.x, hy: o.y, hp: def.hp, alive: true, path: [], dir: -1,
      moving: false, wander: 0, repath: 0, atkCd: 0, flash: 0, lunge: 0, aggro: false, respawn: 0, seed: Math.random() * 6, act: null, disguise: o
    } satisfies Enemy);
    return enemy;
  }

  /** 擬態している敵が正体を現すまでは、置物のマスを通れない。倒した・正体を現したあとは通れる */
  private updateDisguises(): void {
    for (const e of this.enemies) {
      if (e.disguise && !e.gone) this.map.solid[e.disguise.y][e.disguise.x] = e.alive && !e.aggro;
    }
  }

  // ===== フィールドに落ちたアイテム(front#276) =====

  /**
   * (x, y) からアイテムを飛び出させ、近くの通れるマスに落とす。ほかのアイテムが落ちているマスは避ける。
   * notCenter なら (x, y) 自身には落とさない(元に戻る置物のマス)
   */
  dropItem(id: string, count: number, x: number, y: number, notCenter = false): Drop | null {
    if (!ITEMS[id] || count <= 0) return null;
    const spots: [number, number][] = [[0, 0], [1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]];
    const free = spots
      .map(([dx, dy]) => [x + dx, y + dy] as [number, number])
      .filter(([tx, ty], i) => !(notCenter && i === 0) && this.map.walkable(tx, ty) && !this.drops.some((d) => d.x === tx && d.y === ty));
    // 空いているマスがなければ、ほかのアイテムと重ねて落とす
    const [tx, ty] = free[0] ?? spots.map(([dx, dy]) => [x + dx, y + dy] as [number, number]).find(([sx, sy]) => this.map.walkable(sx, sy)) ?? [x, y];
    const drop: Drop = { kind: 'drop', id, count, x: tx, y: ty, fromX: x, fromY: y, t: 0 };
    this.drops.push(drop);
    return drop;
  }

  // ===== 捨てる・仲間が拾う(front#391) =====

  /** 捨てられる最大の数。装備中は0、武器・防具は1つずつ */
  discardableCount(id: string): number {
    const item = ITEMS[id];
    if (!item || !this.owned(id) || this.isEquipped(id)) return 0;
    return item.type === 'weapon' || item.type === 'armor' ? 1 : this.player.inv[id];
  }

  /** 持ち物を count 個捨てる。プレイヤーのとなりのマスにまとめて落ちる(敵が落としたアイテムと同じで、拾い直せる) */
  discard(id: string, count = 1): boolean {
    const p = this.player;
    if (p.dead || !Number.isInteger(count) || count < 1 || count > this.discardableCount(id)) return false;
    const drop = this.dropItem(id, count, Math.round(p.x), Math.round(p.y), true);
    if (!drop) return false;
    p.inv[id] -= count;
    this.events.log(count > 1 ? `${ITEMS[id].name}を${count}個捨てた` : `${ITEMS[id].name}を捨てた`);
    this.events.inventoryChanged();
    this.events.dirty();
    return true;
  }

  /**
   * 仲間が落ちたアイテムを拾う。魔法書は、その魔法をまだ覚えていない(または書の LV のほうが高い)なら1冊読んで覚える。
   * 残りは仲間の持ち物に入る(保存すると仲間のアカウントに書かれる)
   */
  private matePickUp(c: Companion, d: Drop): void {
    this.drops = this.drops.filter((o) => o !== d);
    c.pick = null;
    const item = ITEMS[d.id];
    let count = d.count;
    if (item.type === 'book' && isSpellId(item.spell) && this.levelOf(c, item.spell) < this.bookLevel(d.id)) {
      const s = MAGIC[item.spell];
      const level = Math.min(this.bookLevel(d.id), MAX_SPELL_LEVEL);
      if (!c.spells.includes(s.id)) c.spells.push(s.id);
      c.spellLevels = [...c.spellLevels.filter((l) => l.id !== s.id), { id: s.id, level }];
      count--;
      this.floatText(c.x, c.y, `${s.icon} ${spellLabel(s.id, level)}`, '#c4b5fd', 15, -18);
      this.events.log(`${c.name}が${item.name}を読んで、${s.icon} ${s.name}を覚えた！（LV${level}）`);
      this.events.sound?.('level_up');
    }
    if (count > 0) {
      c.inv[d.id] = (c.inv[d.id] ?? 0) + count;
      const name = `${item.name}${count > 1 ? `×${count}` : ''}`;
      this.floatText(d.x, d.y, name, '#fde68a', 14, -10);
      this.events.log(`${c.name}が${name}を拾った`);
    }
    this.events.inventoryChanged();
    this.events.dirty();
  }

  /** 落ちたアイテムを拾って、持ち物に入れる */
  private pickUp(d: Drop): void {
    const p = this.player;
    this.drops = this.drops.filter((o) => o !== d);
    p.target = null;
    p.inv[d.id] = (p.inv[d.id] ?? 0) + d.count;
    const name = `${ITEMS[d.id].name}${d.count > 1 ? `×${d.count}` : ''}`;
    this.floatText(d.x, d.y, name, '#fde68a', 14, -10);
    this.events.log(`${name}を拾った`);
    this.events.inventoryChanged();
    this.events.dirty();
  }

  /** 落ちてからの時間を進め、時間が来たアイテムを消す */
  private updateDrops(dt: number): void {
    for (const d of this.drops) d.t += dt;
    const gone = this.drops.filter((d) => d.t >= DROP_LIFE_SEC);
    if (!gone.length) return;
    this.drops = this.drops.filter((d) => d.t < DROP_LIFE_SEC);
    if (this.player.target?.kind === 'drop' && gone.includes(this.player.target)) this.player.target = null;
    if (this.hover?.kind === 'drop' && gone.includes(this.hover)) this.hover = null;
  }

  /** 叩いたときのゆれ・戻るときの濃さを進め、時間が来た置物を元に戻す。そのマスに誰かいる(通る)間は待つ */
  private updateBreakables(dt: number): void {
    for (const o of this.map.statics) {
      if (o.shake) o.shake = Math.max(0, o.shake - dt * 4);
      if (o.fade !== undefined && o.fade < 1) o.fade = Math.min(1, o.fade + dt * 2);
      if (!o.broken || o.respawnIn == null) continue;
      o.respawnIn -= dt;
      if (o.respawnIn > 0 || this.tileInUse(o.x, o.y)) continue;
      o.broken = false;
      o.respawnIn = null;
      o.fade = 0;
      this.map.solid[o.y][o.x] = true;
    }
  }

  private tileInUse(x: number, y: number): boolean {
    const on = (m: Mover) => (Math.round(m.x) === x && Math.round(m.y) === y) || m.path.some(([px, py]) => px === x && py === y);
    return on(this.player) || this.companions.some(on) || this.enemies.some((e) => e.alive && on(e));
  }

  private killEnemy(e: Enemy): void {
    const def = ENEMIES[e.type];
    const p = this.player;
    e.alive = false;
    e.respawn = def.respawn ?? 10;
    e.act = null;
    e.aggro = false;
    e.path = [];
    // 置物から出た敵を全部倒したら、その置物が元に戻るまでの時間を数え始める(front#264 / front#333)
    if (e.fromObject && !this.enemies.some((o) => o !== e && o.alive && o.fromObject === e.fromObject)) e.fromObject.respawnIn = BREAK_RESPAWN_SEC;
    for (let i = 0; i < 12; i++) {
      this.particles.push({ x: e.x, y: e.y, ox: 0, oy: -10, vx: randi(-70, 70), vy: randi(-160, -60), t: 0, color: i % 2 ? def.color : '#ffffff' });
    }
    // 経験値はパーティの人数(たおれている仲間も数える)で割り、切り上げた値を全員に入れる(front#358)。ゴールドは割らない
    const members = 1 + this.companions.length;
    const share = Math.ceil(def.exp / members);
    p.exp += share;
    p.gold += def.gold;
    if (p.target === e) p.target = null;
    if (this.selected === e) this.selected = null;
    for (const c of this.companions) if (c.target === e) c.target = null;
    this.floatText(e.x, e.y, `+${share} EXP`, '#a5f3fc', 13, -18);
    this.events.log(members > 1
      ? `${def.name}をたおした！ 経験値${def.exp}を${members}人で分けて+${share}・ゴールド+${def.gold}`
      : `${def.name}をたおした！ 経験値+${def.exp}・ゴールド+${def.gold}`);
    for (const c of this.companions) this.gainCompanionExp(c, share);
    for (const done of this.questLog.onDefeat(e.type, this.questEntries())) {
      this.events.log(`クエスト「${done.quest.title}」の目標を達成した。${done.giver}に報告しよう`);
    }
    // 落としたアイテムはフィールドに落ちる。クリックして拾う(front#276)
    if (def.drop && ITEMS[def.drop] && Math.random() < Math.min(1, def.dropRate * dropRateOf(p.stats))) {
      this.dropItem(def.drop, 1, Math.round(e.x), Math.round(e.y));
    }
    // 素材(front#277)はアイテムとは別に落とす。どちらも運が高いほど落ちやすい
    if (def.material && ITEMS[def.material] && Math.random() < Math.min(1, (def.materialRate ?? 0) * dropRateOf(p.stats))) {
      this.dropItem(def.material, 1, Math.round(e.x), Math.round(e.y));
    }
    // レベルが上がっても能力は自動では上がらず、ステータスのポイントをもらう(front#223)
    const levelBefore = p.level;
    while (p.exp >= this.nextExp()) {
      p.exp -= this.nextExp();
      p.level++;
      p.statPoints += STAT_POINTS_PER_LEVEL;
      p.hp = this.maxHp();
      p.mp = this.maxMp();
      this.events.log(`レベル${p.level}になった！ ステータスのポイントを${STAT_POINTS_PER_LEVEL}もらった`);
    }
    // レベルアップのエフェクト(「LEVEL UP!」の文字も描く)・効果音(front#335)。一度に2つ上がっても1回だけ
    if (p.level > levelBefore) {
      this.addPlayerFx('level');
      this.events.sound?.('level_up');
    }
    this.events.statsChanged();
    this.events.dirty();
  }

  /**
   * 仲間に経験値を入れる(front#358)。レベルが上がったら、もらったポイントをランダムに振り分ける(運は上限まで)。
   * HPは全回復する(たおれているときは、起き上がるまで0のまま)
   */
  private gainCompanionExp(c: Companion, exp: number): void {
    c.exp += exp;
    const got: Partial<Record<StatKey, number>> = {};
    const before = c.level;
    while (c.exp >= nextExpOf(c.level)) {
      c.exp -= nextExpOf(c.level);
      c.level++;
      for (let i = 0; i < STAT_POINTS_PER_LEVEL; i++) {
        const key = mateStatToRaise(c.stats);
        c.stats[key]++;
        got[key] = (got[key] ?? 0) + 1;
      }
    }
    if (c.level === before) return;
    if (!c.dead) {
      c.hp = this.maxHpOf(c);
      c.mp = maxMpOf(c.stats);
    }
    const text = STAT_KEYS.filter((k) => got[k]).map((k) => `${STAT_SHORT[k]}+${got[k]}`).join('・');
    // プレイヤーと同じレベルアップの光・「LEVEL UP!」の文字・効果音(front#391)
    this.addMateFx(c, 'level');
    this.events.sound?.('level_up');
    this.events.log(`${c.name}がレベル${c.level}になった！（${text}）`);
  }

  /** 敵の攻撃が f(プレイヤー・仲間。front#358)に当たった */
  private enemyAttack(e: Enemy, f: Fighter = this.player, lunge = true): void {
    const def = ENEMIES[e.type];
    if (lunge) e.lunge = 1;
    f.lastCombat = this.time;
    // 運が高いほど、敵の攻撃をよけやすい
    if (Math.random() < evadeRateOf(f.stats)) {
      this.floatText(f.x, f.y, 'MISS', '#a5f3fc', 15);
      return;
    }
    const dmg = Math.max(1, Math.round(def.atk - this.defOf(f) * 0.6 + randi(-1, 2)));
    f.hp -= dmg;
    f.hurt = 0.2;
    this.floatText(f.x, f.y, `-${dmg}`, '#ff6b6b', 17);
    if (f.hp <= 0) {
      if (f.kind === 'player') this.knockOut();
      else this.knockOutCompanion(f);
    }
    this.events.statsChanged();
  }

  /** 狙っていた敵・助けに行く仲間から外す(たおれた・いなくなったとき) */
  private releaseFoe(f: Fighter): void {
    for (const e of this.enemies) {
      if (e.foe === f) {
        e.foe = null;
        e.retarget = 0;
      }
    }
  }

  /** 仲間がたおれた(front#358)。1分のうちにいのちの羽を使ってもらえれば起き上がる */
  private knockOutCompanion(c: Companion): void {
    Object.assign(c, { hp: 0, dead: true, downT: DOWN_SEC, target: null, help: null, reviving: 0, path: [] });
    this.releaseFoe(c);
    this.events.log(`${c.name}がたおれた！（1分のうちに、いのちの羽を使えば起き上がる）`);
    if (this.fighters().every((f) => f.dead)) this.returnToTown('全員たおれてしまった…');
  }

  /**
   * プレイヤーがたおれた。起きている仲間がいれば、1分のあいだ起こしてもらうのを待つ(front#358)。
   * 仲間がいなければ、今までどおり復活地点に戻る
   */
  private knockOut(): void {
    const p = this.player;
    p.hp = 0;
    p.dead = true;
    p.target = null;
    p.path = [];
    this.releaseFoe(p);
    if (this.companions.some((c) => !c.dead)) {
      p.downT = DOWN_SEC;
      this.events.log('たおれてしまった…　仲間が助けてくれるのを待っている');
      this.events.waiting?.(true);
      return;
    }
    this.returnToTown('たおれてしまった…');
  }

  /** 待つのをやめて町(復活地点)に戻る(front#358)。仲間は集会場に戻る */
  giveUp(): void {
    if (this.player.dead && this.player.downT > 0) this.returnToTown('町に戻ることにした。');
  }

  // ゴールドを1割落として復活地点(front#337。まだなければ始まりの草原の村)に戻り、HPが全回復する。仲間は集会場に戻る(front#358)
  private returnToTown(message: string): void {
    const p = this.player;
    p.hp = 0;
    p.dead = true;
    p.downT = 0;
    p.target = null;
    p.path = [];
    this.events.waiting?.(false);
    const lost = Math.floor(p.gold * 0.1);
    p.gold -= lost;
    this.events.log(`${message}　${lost}ゴールドを落とした`);
    const left = this.companions;
    if (left.length) {
      this.events.companionsLeft?.(left, 'town');
      this.events.log(`${left.map((c) => c.name).join('・')}は集会場に戻っていった`);
    }
    this.companions = [];
    this.events.knockedOut(true);
    this.events.statsChanged();
    this.events.dirty();
    this.later(KNOCKOUT_MS, () => {
      this.events.knockedOut(false);
      const spot = this.respawnSpot();
      const back = this.respawn && spot.area.id === this.respawn.area ? 'ふっかつ地点' : '村';
      this.goArea(spot.area.id, spot.x, spot.y, () => {
        p.hp = this.maxHp();
        p.mp = this.maxMp();
        p.dead = false;
        this.events.log(`${back}にもどってきた。HP・MPが全回復した`);
        this.events.statsChanged();
      });
    });
  }

  /** たおれている人の残り時間を進める(front#358)。時間が来た仲間は集会場に戻り、プレイヤーは町に戻る */
  private updateDowned(dt: number): void {
    for (const c of [...this.companions]) {
      if (!c.dead || (c.downT -= dt) > 0) continue;
      this.events.companionsLeft?.([c], 'timeout');
      this.removeCompanion(c.userId);
      this.events.log(`間に合わなかった… ${c.name}は集会場に戻っていった（集会場でまた呼べる）`);
      this.events.dirty();
    }
    const p = this.player;
    if (p.dead && p.downT > 0 && (p.downT -= dt) <= 0) this.returnToTown('間に合わなかった…');
  }

  // ===== 毎フレームの更新 =====

  update(dt: number): void {
    this.time += dt;
    if (this.slide && (this.slide.t += dt / SLIDE_SEC) >= 1) {
      this.slide = null;
      this.transitioning = false;
    }
    this.updatePlayer(dt);
    // 会話・お店などを開いている間は、仲間・敵も止まり、たおれている時間も進まない(front#358)
    if (!this.transitioning && !this.locked) {
      this.companions.forEach((c) => this.updateCompanion(c, dt));
      this.enemies.forEach((e) => this.updateEnemy(e, dt));
      this.updateDowned(dt);
    }
    // 置物から出て倒された敵は、もう出てこないので消す(front#264)
    if (this.enemies.some((e) => !e.alive && (e.fromObject || e.gone))) this.enemies = this.enemies.filter((e) => e.alive || !(e.fromObject || e.gone));
    this.updateDisguises();
    this.updateBreakables(dt);
    this.updateDrops(dt);
    this.updateSpellFx(dt);
    for (const m of this.mateFx) m.fx.t += dt;
    if (this.mateFx.some((m) => m.fx.t > PLAYER_FX_SEC[m.fx.kind])) this.mateFx = this.mateFx.filter((m) => m.fx.t <= PLAYER_FX_SEC[m.fx.kind]);
    for (const f of this.floats) f.t += dt;
    while (this.floats.length && this.floats[0].t > 1.1) this.floats.shift();
    for (const p of this.particles) {
      p.t += dt;
      p.vy += 400 * dt;
      p.ox += p.vx * dt;
      p.oy += p.vy * dt;
    }
    while (this.particles.length && this.particles[0].t > 0.7) this.particles.shift();
    for (const f of this.playerFx) f.t += dt;
    for (let i = this.playerFx.length - 1; i >= 0; i--) if (this.playerFx[i].t > PLAYER_FX_SEC[this.playerFx[i].kind]) this.playerFx.splice(i, 1);
    if (this.clickMarker && (this.clickMarker.t += dt) > 0.6) this.clickMarker = null;

    const [px, py] = iso(this.player.x, this.player.y);
    this.camX = Math.round(this.viewW / 2 - px * this.zoom);
    this.camY = Math.round(this.viewH / 2 - (py - this.player.z * HZ - 20) * this.zoom);
  }

  private updatePlayer(dt: number): void {
    const p = this.player;
    p.atkCd -= dt;
    p.spellCd = Math.max(0, p.spellCd - dt);
    p.lunge = Math.max(0, p.lunge - dt * 5);
    p.hurt = Math.max(0, p.hurt - dt);
    if (p.dead || this.transitioning) return;
    this.regenMp(dt);

    const t = p.target;
    if (t) {
      if ((t.kind === 'enemy' && !t.alive) || (t.kind === 'static' && t.broken) || (t.kind === 'drop' && !this.drops.includes(t))) {
        p.target = null;
      } else if (t.kind === 'drop') {
        // 落ちたアイテムは、そのマスまで歩いて拾う(front#276)
        if (Math.round(p.x) === t.x && Math.round(p.y) === t.y && !p.path.length) this.pickUp(t);
        else if (!p.path.length && !this.pathTo(p, t.x, t.y)) p.target = null;
      } else {
        const d = cheb(p.x, p.y, t.x, t.y);
        const signLines = t.kind === 'static' ? this.signLines(t) : null;
        if (signLines && d <= 1.5 && !p.path.length) {
          // 看板・メッセージを表示する置物(front#333)のそばまで来たら読む(front#314)。セーブポイントは調べる(front#337)
          this.faceTo(p, t);
          p.target = null;
          const lines = t.kind === 'static' && t.type === SAVE_POINT ? this.touchSavePoint(t) : signLines;
          this.events.read?.(t.kind === 'static' && t.type !== 'sign' ? STATIC_NAMES[t.type] : '看板', lines);
        } else if (signLines) {
          if (!p.path.length) this.pathNear(p, t.x, t.y);
        } else if (t.kind === 'static' && d <= ATTACK_RANGE) {
          // 壊れる置物の隣まで来たら叩く(front#264)
          p.path = [];
          this.faceTo(p, t);
          if (p.atkCd <= 0) this.hitObject(t);
        } else if (t.kind === 'enemy' && d <= ATTACK_RANGE) {
          p.path = [];
          this.faceTo(p, t);
          if (p.atkCd <= 0) this.playerAttack(t);
        } else if (t.kind === 'npc' && d <= 1.5 && !p.path.length) {
          this.faceTo(p, t);
          p.target = null;
          this.startTalk(t);
        } else {
          p.repath -= dt;
          if (p.repath <= 0 || !p.path.length) {
            this.pathNear(p, Math.round(t.x), Math.round(t.y));
            p.repath = 0.35;
          }
        }
      }
    }
    const wasMoving = p.path.length > 0;
    p.moving = this.moveAlong(p, walkSpeedOf(p.stats), dt);
    this.settleZ(p, dt);
    if (wasMoving && !p.path.length) {
      this.events.dirty();
      // 歩いてきて、出口(端のマス)で止まったら、隣のエリア(front#234)・ほかのダンジョン(front#274)へ移る。
      // 着いたマスや、敵を追いかけて止まったマスでは移らない
      const [ex, ey] = [Math.round(p.x), Math.round(p.y)];
      const exit = p.target ? null : exitAt(this.maps, this.area, ex, ey);
      if (exit) {
        if (exit.link) this.goLink(exit);
        else this.goNeighbor(exit.side);
        return;
      }
    }

    // 戦っていないときは少しずつ回復する
    if (this.time - p.lastCombat > 4 && p.hp < this.maxHp()) {
      p.regen += dt;
      if (p.regen > 1.5) {
        p.regen = 0;
        p.hp = Math.min(this.maxHp(), p.hp + Math.max(1, Math.round(this.maxHp() * 0.03)));
        this.events.statsChanged();
      }
    }
  }

  /** MPは時間で少しずつ戻る(front#383)。戦っていないときは1.5秒ごとに最大MPの4%、戦っている間は3秒に1 */
  private regenMp(dt: number): void {
    const p = this.player;
    const max = this.maxMp();
    if (p.mp >= max) {
      p.mpRegen = 0;
      return;
    }
    p.mpRegen += (this.time - p.lastCombat > 4 ? (max * 0.04) / 1.5 : 1 / 3) * dt;
    if (p.mpRegen < 1) return;
    const n = Math.floor(p.mpRegen);
    p.mpRegen -= n;
    p.mp = Math.min(max, p.mp + n);
    this.events.statsChanged();
  }

  // ===== 仲間の動き(front#358) =====

  /**
   * 仲間を1人動かす。上から順に、できることを1つする。
   * 1) 誰かのHPが3割を切ったら、自分の持ち物の回復薬を使う
   * 2) 誰かがたおれたら、狙ってくる敵がいないときに、そばまで行っていのちの羽を使う
   * 3) プレイヤーが攻撃している敵・誰かを狙っている敵を攻撃する(プレイヤーから8マス以上離れた敵は追わない)
   * 4) プレイヤーの後ろについて歩く
   */
  private updateCompanion(c: Companion, dt: number): void {
    c.atkCd -= dt;
    c.itemCd -= dt;
    c.spellCd = Math.max(0, c.spellCd - dt);
    c.lunge = Math.max(0, c.lunge - dt * 5);
    c.hurt = Math.max(0, c.hurt - dt);
    if (c.dead) return;
    const p = this.player;
    const party = this.fighters();
    this.regenFighterMp(c, dt);

    // 1) 回復魔法(front#391)。2人以上が5割を切ればヒールオール、だれかが3割を切ればヒール。使えなければ回復薬
    const healed = c.spellCd <= 0 && this.mateHealSpell(c, party);
    const heal = this.healItemOf(c);
    if (!healed && heal && c.itemCd <= 0) {
      const low = party
        .filter((f) => !f.dead && f.hp < this.maxHpOf(f) * LOW_HP_RATE)
        .sort((a, b) => a.hp / this.maxHpOf(a) - b.hp / this.maxHpOf(b))[0];
      if (low) {
        c.inv[heal]--;
        this.applyItem(c, low, heal);
        c.itemCd = 1.5;
        this.events.dirty();
      }
    }

    // 2) いのちの羽
    const feather = this.reviveItemOf(c);
    const chased = this.enemies.some((e) => e.alive && e.aggro && e.foe === c);
    if (c.help && (!c.help.dead || chased || !feather)) c.help = null;
    if (!c.help) c.reviving = 0;
    if (!c.help && feather && !chased) {
      c.help = party
        .filter((f) => f.dead && !this.companions.some((o) => o !== c && o.help === f))
        .sort((a, b) => cheb(a.x, a.y, c.x, c.y) - cheb(b.x, b.y, c.x, c.y))[0] ?? null;
    }
    if (c.help && feather) {
      const h = c.help;
      if (cheb(c.x, c.y, h.x, h.y) <= 1.5 && !c.path.length) {
        // そばで少しのあいだ起こしてから、いのちの羽を使う
        this.faceTo(c, h);
        if ((c.reviving += dt) >= REVIVE_SEC) {
          c.inv[feather]--;
          this.applyItem(c, h, feather);
          c.help = null;
          c.reviving = 0;
          this.events.inventoryChanged();
          this.events.dirty();
        }
      } else {
        c.repath -= dt;
        if (c.repath <= 0 || !c.path.length) {
          if (!this.pathNear(c, Math.round(h.x), Math.round(h.y))) c.help = null;
          c.repath = 0.35;
        }
      }
      this.stepCompanion(c, dt, 1.2);
      return;
    }

    // 3) 攻撃
    const anchor: Mover = p.dead ? c : p;
    if (c.target && (!c.target.alive || cheb(c.target.x, c.target.y, anchor.x, anchor.y) >= LEASH)) c.target = null;
    if (!c.target) {
      const pt = p.target?.kind === 'enemy' ? p.target : null;
      c.target = this.enemies
        .filter((e) => e.alive && (e === pt || (e.aggro && !!e.foe)) && cheb(e.x, e.y, anchor.x, anchor.y) < LEASH)
        .sort((a, b) => cheb(a.x, a.y, c.x, c.y) - cheb(b.x, b.y, c.x, c.y))[0] ?? null;
    }
    const t = c.target;
    if (t) c.pick = null;
    // 落ちたアイテムを拾いに行く(front#391)。戦っていないときだけ
    const drop = t || p.dead ? null : this.matePickTarget(c);
    if (t) {
      // 魔法(front#391)。魔力が攻撃より高ければ魔法優先、そうでなければ通常攻撃優先
      const spell = this.mateAttackSpell(c, t);
      const inRange = !!spell && Math.hypot(t.x - c.x, t.y - c.y) <= spellRangeOf(c.stats);
      const magicFirst = c.stats.mag > c.stats.atk;
      if (spell && inRange && (magicFirst || spell === 'thunder')) {
        // 届く距離まで来たら止まって撃つ(サンダーは、通常攻撃優先でも敵がかたまっていれば撃つ)
        c.path = [];
        this.faceTo(c, t);
        if (c.spellCd <= 0) this.castAttack(c, spell, t);
      } else if (cheb(c.x, c.y, t.x, t.y) <= ATTACK_RANGE) {
        c.path = [];
        this.faceTo(c, t);
        if (c.atkCd <= 0) this.playerAttack(t, c);
      } else {
        c.repath -= dt;
        if (c.repath <= 0 || !c.path.length) {
          const reachable = this.pathNear(c, Math.round(t.x), Math.round(t.y));
          c.repath = 0.35;
          // 殴れない(近づけない)敵には、届けば攻撃魔法を撃つ
          if (!reachable && spell && inRange && c.spellCd <= 0) this.castAttack(c, spell, t);
        }
      }
    } else if (drop) {
      if (Math.round(c.x) === drop.x && Math.round(c.y) === drop.y && !c.path.length) {
        this.matePickUp(c, drop);
      } else {
        c.repath -= dt;
        if (c.repath <= 0 || !c.path.length) {
          if (!this.pathTo(c, drop.x, drop.y)) c.pick = null;
          c.repath = 0.35;
        }
      }
    } else if (!p.dead) {
      // 4) ついて歩く。プレイヤーから2マスより離れたら、プレイヤーのそばの空いているマスへ向かう
      const d = cheb(c.x, c.y, p.x, p.y);
      c.repath -= dt;
      if (d > 2 && (c.repath <= 0 || !c.path.length)) {
        const taken = new Set([`${Math.round(p.x)},${Math.round(p.y)}`]);
        for (const o of this.companions) if (o !== c && o.path.length) taken.add(o.path[o.path.length - 1].join(','));
        const [tx, ty] = this.freeSpotNear(Math.round(p.x), Math.round(p.y), taken);
        this.pathTo(c, tx, ty);
        c.repath = 0.5;
      }
    }
    // 離れていても、仲間自身の速さのまま歩く(front#377)
    this.stepCompanion(c, dt, 1);

    // 戦っていないときは少しずつ回復する(プレイヤーと同じ)
    if (this.time - c.lastCombat > 4 && c.hp < this.maxHpOf(c)) {
      c.regen += dt;
      if (c.regen > 1.5) {
        c.regen = 0;
        c.hp = Math.min(this.maxHpOf(c), c.hp + Math.max(1, Math.round(this.maxHpOf(c) * 0.03)));
      }
    }
  }

  /** MPは時間で少しずつ戻る(front#383 / front#391)。戦っていないときは1.5秒ごとに最大MPの4%、戦っている間は3秒に1 */
  private regenFighterMp(f: Fighter, dt: number): boolean {
    const max = maxMpOf(f.stats);
    if (f.mp >= max) {
      f.mpRegen = 0;
      return false;
    }
    f.mpRegen += (this.time - f.lastCombat > 4 ? (max * 0.04) / 1.5 : 1 / 3) * dt;
    if (f.mpRegen < 1) return false;
    const n = Math.floor(f.mpRegen);
    f.mpRegen -= n;
    f.mp = Math.min(max, f.mp + n);
    return true;
  }

  /** 仲間が使える魔法か(覚えていて、MPが足りる) */
  private mateCan(c: Companion, id: SpellId): boolean {
    return this.levelOf(c, id) > 0 && c.mp >= MAGIC[id].mp;
  }

  /** 仲間が撃つ攻撃魔法(front#391)。狙った敵のまわりに3体以上いればサンダー、そうでなければファイア → ブリザド。使えなければ null */
  private mateAttackSpell(c: Companion, t: Enemy): SpellId | null {
    const radius = MAGIC.thunder.radius ?? 1.5;
    const cluster = this.enemies.filter((e) => e.alive && !this.hiding(e) && Math.hypot(e.x - t.x, e.y - t.y) <= radius).length;
    if (cluster >= 3 && this.mateCan(c, 'thunder')) return 'thunder';
    if (this.mateCan(c, 'fire')) return 'fire';
    if (this.mateCan(c, 'blizzard')) return 'blizzard';
    return null;
  }

  /** 仲間の回復魔法(front#391)。使ったら true */
  private mateHealSpell(c: Companion, party: Fighter[]): boolean {
    const alive = party.filter((f) => !f.dead);
    const rate = (f: Fighter) => f.hp / this.maxHpOf(f);
    if (alive.filter((f) => rate(f) < 0.5).length >= 2 && this.mateCan(c, 'healall')) {
      this.castHeal(c, 'healall', alive);
      this.events.log(`${c.name}の${MAGIC.healall.icon} ${MAGIC.healall.name}！`);
      return true;
    }
    const low = alive.filter((f) => rate(f) < LOW_HP_RATE).sort((a, b) => rate(a) - rate(b))[0];
    if (low && this.mateCan(c, 'heal')) {
      this.castHeal(c, 'heal', [low]);
      this.events.log(`${c.name}の${MAGIC.heal.icon} ${MAGIC.heal.name}！ ${this.nameOf(low)}のHPが回復した`);
      return true;
    }
    return false;
  }

  /**
   * 仲間が拾いに行く落ちたアイテム(front#391)。落ちてから3秒たち(front#395)、仲間から4マス以内、プレイヤーから8マスより近いもの。
   * ほかの仲間が向かっているものは選ばない。今向かっているものがあれば、なくなるまでそれ
   */
  private matePickTarget(c: Companion): Drop | null {
    if (c.pick && this.drops.includes(c.pick)) return c.pick;
    const p = this.player;
    const taken = new Set(this.companions.filter((o) => o !== c).map((o) => o.pick));
    c.pick = this.drops
      .filter((d) => d.t >= MATE_PICK_DELAY && cheb(d.x, d.y, c.x, c.y) <= MATE_PICK_RANGE && cheb(d.x, d.y, p.x, p.y) < LEASH && !taken.has(d))
      .sort((a, b) => cheb(a.x, a.y, c.x, c.y) - cheb(b.x, b.y, c.x, c.y))[0] ?? null;
    return c.pick;
  }

  private stepCompanion(c: Companion, dt: number, rate: number): void {
    c.moving = this.moveAlong(c, walkSpeedOf(c.stats) * rate, dt);
    this.settleZ(c, dt);
  }

  /** 仲間の持ち物の回復薬(回復量がいちばん小さいもの)。なければ null */
  private healItemOf(c: Companion): string | null {
    // MPだけを回復する道具(front#383)は使わない
    const ids = Object.keys(c.inv).filter((id) => c.inv[id] > 0 && ITEMS[id]?.type === 'use' && !!ITEMS[id].heal);
    return ids.sort((a, b) => (ITEMS[a].heal ?? 0) - (ITEMS[b].heal ?? 0))[0] ?? null;
  }

  /** 仲間の持ち物のいのちの羽(復活の道具)。なければ null */
  private reviveItemOf(c: Companion): string | null {
    return Object.keys(c.inv).find((id) => c.inv[id] > 0 && ITEMS[id]?.type === 'revive') ?? null;
  }

  private startTalk(npc: Npc): void {
    npc.dir = this.player.x - this.player.y - (npc.x - npc.y) > 0 ? 1 : -1;
    // 「NPCに会う」クエストの相手なら、会えたことにする
    for (const done of this.questLog.onTalk(this.area.id, npc.name, this.questEntries())) {
      this.events.log(`${npc.name}に会えた。クエスト「${done.quest.title}」を${done.giver}に報告しよう`);
      this.events.statsChanged();
      this.events.dirty();
    }
    this.events.talk(npc);
  }

  // ===== クエスト(front#239) =====

  questEntries(): QuestEntry[] {
    return allQuests(this.maps);
  }

  /** NPCの頭の印(受けられる新しいクエストは「!」、報告できるクエストは「?」) */
  questMark(npc: RpgMapNpc): QuestMark {
    return this.questLog.markOf(npc, this.player.inv);
  }

  acceptQuest(quest: RpgQuest): void {
    if (this.questLog.stateOf(quest)) return;
    this.questLog.accept(quest);
    this.events.log(`クエスト「${quest.title}」を引き受けた`);
    this.events.statsChanged();
    this.events.dirty();
  }

  /** 報告して報酬をもらう(アイテムを集めるクエストは、そのアイテムを渡す)。達成していなければ何もしない */
  reportQuest(quest: RpgQuest): boolean {
    const p = this.player;
    if (!this.questLog.isCleared(quest, p.inv)) return false;
    if (quest.kind === 'collect') p.inv[quest.target] = Math.max(0, (p.inv[quest.target] ?? 0) - quest.count);
    p.gold += quest.rewardGold;
    for (const r of quest.rewardItems) if (ITEMS[r.itemId]) p.inv[r.itemId] = (p.inv[r.itemId] ?? 0) + r.count;
    this.questLog.complete(quest);
    const rewards = [
      ...(quest.rewardGold ? [`${quest.rewardGold}G`] : []),
      ...quest.rewardItems.filter((r) => ITEMS[r.itemId]).map((r) => `${ITEMS[r.itemId].name}×${r.count}`)
    ];
    this.events.log(`クエスト「${quest.title}」を達成した！${rewards.length ? ` ${rewards.join('・')} を手に入れた` : ''}`);
    this.events.statsChanged();
    this.events.inventoryChanged();
    this.events.dirty();
    return true;
  }

  private updateEnemy(e: Enemy, dt: number): void {
    const def = ENEMIES[e.type];
    const rooted = isRooted(def);
    e.flash = Math.max(0, e.flash - dt);
    // ブリザド(front#383)で遅くなっている間は、歩く速さと攻撃の間隔が半分
    e.slow = Math.max(0, (e.slow ?? 0) - dt);
    const pace = e.slow > 0 ? 0.5 : 1;
    e.lunge = Math.max(0, e.lunge - dt * 5);
    if (!e.alive) {
      // 置物から出た敵は出直さない(置物が元に戻る)(front#264)
      if (e.fromObject || e.gone) return;
      e.respawn -= dt;
      if (e.respawn <= 0 && e.disguise) {
        // 擬態している敵(front#333)は、擬態する敵を決め直す。外れたら、ただの置物に戻る(そのマスに誰かいる間は待つ)
        const o = e.disguise;
        if (this.tileInUse(o.x, o.y)) return;
        const id = pickMimic(objectSettingsOf(o).mimics);
        if (id && ENEMIES[id]) {
          this.placeMimic(o, id, e);
        } else {
          o.mimicked = false;
          this.map.solid[o.y][o.x] = true;
          e.gone = true;
        }
      } else if (e.respawn <= 0) {
        Object.assign(e, { alive: true, hp: def.hp, x: e.hx, y: e.hy, path: [], aggro: false, act: null });
        this.snapZ(e);
      }
      return;
    }
    // 狙う相手(front#358)。いちばん近い、たおれていない人(プレイヤー・仲間)。追いかけている間は2秒ごとに見直す
    if (e.foe && (e.foe.dead || (e.foe.kind === 'mate' && !this.companions.includes(e.foe)))) e.foe = null;
    e.retarget = (e.retarget ?? 0) - dt;
    if (!e.aggro || !e.foe || e.retarget <= 0) {
      e.foe = this.nearestFighter(e) ?? null;
      e.retarget = RETARGET_SEC;
    }
    const foe = e.foe;
    const dp = foe ? cheb(foe.x, foe.y, e.x, e.y) : Infinity;
    // 擬態している敵(front#333)は、視界がなくても隣まで来たら正体を現す
    const sight = e.disguise ? Math.max(1, def.sight) : def.sight;
    if (!e.aggro && sight && dp <= sight) {
      e.aggro = true;
      e.atkCd = 0.8;
    }
    if (e.aggro) {
      if (cheb(e.x, e.y, e.hx, e.hy) > LEASH || !foe) {
        // 出現位置から離れすぎたら、追いかけるのをやめて戻る(HPも戻る)
        e.aggro = false;
        e.hp = def.hp;
        e.path = [];
        e.act = null;
        this.pathTo(e, e.hx, e.hy);
      } else if (e.act) {
        e.atkCd -= dt * pace;
        this.updateAct(e, def, dt);
      } else if (isPassive(def)) {
        // 攻撃してこない形(闇の水晶 front#329)は、叩かれても浮いているだけ
      } else if (dp <= attackReach(def, ATTACK_RANGE)) {
        // 攻撃が届く距離なら止まり、攻撃の間隔ごとに攻撃する(炎・水などは離れたまま)
        e.path = [];
        this.faceTo(e, foe!);
        e.atkCd -= dt * pace;
        if (e.atkCd <= 0) {
          this.startAct(e, def);
          e.atkCd = def.interval;
        }
      } else if (rooted) {
        // 根を張っている敵は追いかけず、相手の方を向いて待つ
        this.faceTo(e, foe!);
      } else {
        e.repath -= dt;
        if (e.repath <= 0) {
          this.pathNear(e, Math.round(foe!.x), Math.round(foe!.y));
          e.repath = 0.5;
        }
      }
    } else if (!rooted && !disguiseOf(def) && !e.disguise) {
      // 化ける敵(front#270)は、宝箱・甲冑のふりをして、近づかれるまでその場にいる
      e.wander -= dt;
      if (e.wander <= 0 && !e.path.length) {
        const tx = e.hx + randi(-3, 3);
        const ty = e.hy + randi(-3, 3);
        if (this.map.walkable(tx, ty)) this.pathTo(e, tx, ty);
        e.wander = 2 + Math.random() * 3;
      }
    }
    if (rooted) e.path = [];
    e.moving = !e.act && !rooted && this.moveAlong(e, (e.aggro ? def.speed * 1.5 : def.speed) * pace, dt);
    this.settleZ(e, dt);
  }

  // ===== 敵の攻撃(front#229) =====

  /** 攻撃を始める。攻撃する場所・動く先は、始めたときの相手の位置で決める(ためている間に動けばよけられる) */
  private startAct(e: Enemy, def: EnemyDef): void {
    const p = e.foe ?? this.player;
    const spell = SPELLS.includes(def.attack);
    const tx = spell ? Math.round(p.x) : p.x;
    const ty = spell ? Math.round(p.y) : p.y;
    const [mx, my] = movesToTarget(def) && !isRooted(def) ? this.dashEnd(e, tx, ty, def.dash) : [e.x, e.y];
    e.act = { t: 0, hit: false, tx, ty, sx: e.x, sy: e.y, mx, my, foe: p };
  }

  /** e からいちばん近い、たおれていない人(front#358)。だれもいなければ undefined */
  private nearestFighter(e: { x: number; y: number }): Fighter | undefined {
    let best: Fighter | undefined;
    let bestD = Infinity;
    for (const f of this.fighters()) {
      const d = cheb(f.x, f.y, e.x, e.y);
      if (!f.dead && d < bestD) {
        best = f;
        bestD = d;
      }
    }
    return best;
  }

  /**
   * 体当たり・ジャンプで着く位置。相手の手前(0.7マス)まで、まっすぐ距離(dash マス)だけ進む。
   * 体当たりは通れないマス・崖の手前で止まり、ジャンプは着く場所が通れなければ、そのいちばん近くの通れる所に着く
   */
  private dashEnd(e: Enemy, tx: number, ty: number, dash: number): [number, number] {
    const dx = tx - e.x;
    const dy = ty - e.y;
    const dist = Math.hypot(dx, dy);
    const go = Math.max(0, Math.min(dash, dist - 0.7));
    if (dist < 0.01 || go <= 0) return [e.x, e.y];
    const ux = dx / dist;
    const uy = dy / dist;
    const def = ENEMIES[e.type];
    if (def.attack === 'jump') {
      const x = e.x + ux * go;
      const y = e.y + uy * go;
      if (this.map.walkable(Math.round(x), Math.round(y))) return [x, y];
      const [nx, ny] = this.map.nearestWalkable(Math.round(x), Math.round(y));
      return [nx, ny];
    }
    let [lx, ly] = [e.x, e.y];
    for (let d = 0.1; d <= go + 1e-6; d += 0.1) {
      const x = e.x + ux * d;
      const y = e.y + uy * d;
      const [ax, ay] = [Math.round(lx), Math.round(ly)];
      const [bx, by] = [Math.round(x), Math.round(y)];
      if ((ax !== bx || ay !== by) && (!this.map.walkable(bx, by) || !this.map.canStep(ax, ay, bx, by))) break;
      [lx, ly] = [x, y];
    }
    return [lx, ly];
  }

  private updateAct(e: Enemy, def: EnemyDef, dt: number): void {
    const a = e.act!;
    a.t += dt;
    const { duration, hitAt } = attackTiming(def);
    // 体当たり・ジャンプは、ためたあと当たる時までに着く位置へ動く
    if (movesToTarget(def) && a.t > def.charge) {
      const q = Math.min(1, (a.t - def.charge) / Math.max(0.01, hitAt - def.charge));
      e.x = a.sx + (a.mx - a.sx) * q;
      e.y = a.sy + (a.my - a.sy) * q;
    }
    if (!a.hit && a.t >= hitAt) {
      a.hit = true;
      // 当たる瞬間に鳴らす(よけられたときも)(front#278)
      this.events.sound?.(`attack_${def.attack}`);
      const melee = def.attack === 'tackle' || def.attack === 'claw' || def.attack === 'bite';
      // 範囲の攻撃(魔法陣・衝撃波・炎や水などマスに出す攻撃)は、範囲の中にいる全員に当たる。
      // ほかは狙っていた相手にだけ当たる(front#358)
      const area = def.attack === 'circle' || def.attack === 'shockwave' || SPELLS.includes(def.attack);
      const targets = area ? this.fighters() : [a.foe ?? this.player];
      for (const f of targets) {
        if (!f.dead && this.fighters().includes(f) && this.actHits(e, def, a, f)) this.enemyAttack(e, f, melee && !movesToTarget(def));
      }
    }
    if (a.t >= duration) e.act = null;
  }

  /** 攻撃が当たったか(当たる時に、相手 p がその場所にいるか) */
  private actHits(e: Enemy, def: EnemyDef, a: EnemyAct, p: Fighter): boolean {
    // 魔法陣(front#327)は、攻撃を始めたマスのまわり(範囲)にいても当たる
    if (def.attack === 'circle') return cheb(p.x, p.y, a.tx, a.ty) <= def.radius + 0.5;
    if (SPELLS.includes(def.attack)) return cheb(p.x, p.y, a.tx, a.ty) < 0.6;
    if (def.attack === 'shockwave') return cheb(p.x, p.y, e.x, e.y) <= def.radius + 0.5;
    if (movesToTarget(def)) return cheb(p.x, p.y, e.x, e.y) <= 1.0;
    return cheb(p.x, p.y, e.x, e.y) <= ATTACK_RANGE;
  }
}
