import { RpgDungeon, RpgLook, RpgMap, RpgMapNpc, RpgQuest, RpgSave, RpgSaveInput } from '../models/rpg.models';
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
  MAX_LUCK,
  OBJECT_HIT_MATERIAL,
  RECIPES,
  Recipe,
  STATIC_NAMES,
  STAT_POINTS_PER_LEVEL,
  Side,
  StatKey,
  StaticObj,
  Stats,
  ThemeDef,
  ZERO_STATS,
  arrivalOf,
  attackIntervalOf,
  baseAtkOf,
  baseDefOf,
  buildAreaMap,
  critRateOf,
  dropRateOf,
  evadeRateOf,
  exitAt,
  healRateOf,
  linkArrival,
  maxHpOf,
  neighborOf,
  nextExpOf,
  signExit,
  signLinesOf,
  themeOf,
  totalStatPointsOf,
  walkSpeedOf
} from './rpg-data';
import { DEFAULT_LOOK } from './rpg-look';
import { EnemyDef, SPELLS, attackReach, attackTiming, disguiseOf, hitHeightOf, hitMaterialOf, isRooted, movesToTarget, ringSizeOf } from './rpg-enemy';
import { cheb, findPath, octile } from './rpg-path';

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
}

export interface FloatText {
  x: number;
  y: number;
  text: string;
  color: string;
  size: number;
  oy: number;
  t: number;
}

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
}

const ATTACK_RANGE = 1.35;
const LEASH = 8;
const FADE_MS = 380;
const KNOCKOUT_MS = 1500;
// 隣のエリアへスライドする時間(秒)
const SLIDE_SEC = 0.45;
// たおれたときに戻るエリア(なければ並び順で最初のエリア)
const HOME_AREA = 'plain';

const randi = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));
export const iso = (x: number, y: number): [number, number] => [((x - y) * TW) / 2, ((x + y) * TH) / 2];

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
  // area が入っているダンジョン。見た目(theme)・BGM・推奨レベルはダンジョンで決まる
  dungeon!: RpgDungeon;
  theme!: ThemeDef;
  map!: AreaMap;
  npcs: Npc[] = [];
  enemies: Enemy[] = [];
  readonly player: Player = {
    kind: 'player', x: 0, y: 0, z: 0, path: [], dir: 1, moving: false, target: null, repath: 0, atkCd: 0, lunge: 0, hurt: 0,
    level: 1, exp: 0, hp: maxHpOf(ZERO_STATS), gold: 30, weapon: 'wood_sword', armor: 'cloth',
    inv: { potion: 3, wood_sword: 1, cloth: 1 }, stats: { ...ZERO_STATS }, statPoints: 0, look: { ...DEFAULT_LOOK }, lastCombat: -99, regen: 0, dead: false
  };

  time = 0;
  readonly floats: FloatText[] = [];
  readonly particles: Particle[] = [];
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
  private timers: ReturnType<typeof setTimeout>[] = [];

  /** maps は全エリアのマップのデータ(並び順)。1つ以上あること。dungeons は全ダンジョン */
  constructor(private events: RpgGameEvents, public maps: RpgMap[], public dungeons: RpgDungeon[] = []) {
    const home = this.homeArea();
    this.loadMap(home);
    this.player.x = home.startX;
    this.player.y = home.startY;
    this.snapZ(this.player);
  }

  mapById(id: string | null): RpgMap | undefined {
    return this.maps.find((m) => m.id === id);
  }

  /** エリアが入っているダンジョン(見つからなければ、エリアの名前で最初の見た目のダンジョンとして扱う) */
  /** 看板をクリックしたときに出す文(front#314)。看板でない・読めない看板は null */
  signLines(o: StaticObj): string[] | null {
    if (o.type !== 'sign') return null;
    const exit = signExit(this.maps, this.area, o.x, o.y);
    return signLinesOf(o.lines, exit ? this.dungeonOf(exit.to) : null);
  }

  dungeonOf(area: RpgMap): RpgDungeon {
    return this.dungeons.find((d) => d.id === area.dungeonId) ?? { id: area.dungeonId, name: area.name, recommendedLevel: 1, theme: 'plain', sortOrder: 0 };
  }

  private homeArea(): RpgMap {
    return this.mapById(HOME_AREA) ?? this.maps[0];
  }

  dispose(): void {
    this.timers.forEach(clearTimeout);
    this.timers = [];
  }

  // ===== 能力値 =====
  maxHp = () => maxHpOf(this.player.stats);
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
    this.loadMap(this.mapById(save.area) ?? this.homeArea());
    const [x, y] = this.map.walkable(save.x, save.y) ? [save.x, save.y] : [this.area.startX, this.area.startY];
    p.x = x;
    p.y = y;
    this.snapZ(p);
    p.path = [];
    p.target = null;
    this.events.statsChanged();
    this.events.inventoryChanged();
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
      quests: this.questLog.toList()
    };
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
    for (const [key, v] of entries) p.stats[key] += v;
    p.statPoints -= total;
    // 最大HPが増えた分は、今のHPにも足す
    p.hp += this.maxHp() - beforeMaxHp;
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
    this.floats.length = 0;
    this.particles.length = 0;
    this.drops = [];
    this.clickMarker = null;
    this.hover = null;
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
      // 着く位置が通れなければ(マップを作り直したときなど)、出発地点に立つ
      const [tx, ty] = this.map.walkable(x, y) ? [x, y] : [dest.startX, dest.startY];
      this.player.x = tx;
      this.player.y = ty;
      this.snapZ(this.player);
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
   * 端のつながり(front#274)の出口(x, y)から、ほかのダンジョンのエリアへ移る。
   * 今までのポータルと同じく画面が暗くなって移り、ダンジョンの名前が出る。着くのは、行き先のこちらへ戻る端
   */
  goLink(exit: AreaExit, x: number, y: number): void {
    const [ax, ay] = linkArrival(this.maps, this.area, exit.side, x, y, exit.to, buildAreaMap(exit.to));
    this.goArea(exit.to.id, ax, ay);
  }

  /**
   * 端の出口(x, y)から、side の向きに隣り合うエリアへ移る(front#234)。
   * 画面は進む向きにスライドし、ダンジョン名は出さない(BGMも変えない)
   */
  goNeighbor(side: Side, x: number, y: number): void {
    const dest = neighborOf(this.maps, this.area, side);
    if (this.transitioning || !dest) return;
    const image = this.events.captureScreen();
    this.player.path = [];
    this.player.target = null;
    this.loadMap(dest);
    const [ax, ay] = arrivalOf(side, dest, x, y);
    // 着くマスが通れなければ近くの通れるマス、それもなければ出発地点に立つ
    const [nx, ny] = this.map.nearestWalkable(ax, ay);
    const [tx, ty] = this.map.walkable(nx, ny) ? [nx, ny] : [dest.startX, dest.startY];
    this.player.x = tx;
    this.player.y = ty;
    this.snapZ(this.player);
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
      if ((!BREAK_HITS[o.type] || o.broken) && !this.signLines(o)) continue;
      const [sx, sy0] = iso(o.x, o.y);
      const sy = sy0 - this.map.heightAt(o.x, o.y) * HZ;
      const ht = o.type === 'armor' ? 52 : o.type === 'sign' ? 46 : o.type === 'crystal' ? 34 : o.type === 'barrel' || o.type === 'pot' ? 28 : 24;
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

  mouseMove(mx: number, my: number): void {
    this.mouse = { x: mx, y: my };
    this.hover = this.locked ? null : this.pickEntity(mx, my);
  }

  mouseLeave(): void {
    this.mouse = null;
    this.hover = null;
  }

  click(mx: number, my: number): void {
    if (this.locked || this.player.dead || this.transitioning) return;
    const hit = this.pickEntity(mx, my);
    if (hit) {
      this.player.target = hit;
      this.player.repath = 0;
      return;
    }
    const [tx, ty] = this.screenToTile(mx, my);
    if (!this.map.walkable(tx, ty)) return;
    this.player.target = null;
    if (this.pathTo(this.player, tx, ty)) this.clickMarker = { x: tx, y: ty, t: 0 };
  }

  // ===== 持ち物・お店 =====

  useItem(id: string): void {
    const item = ITEMS[id];
    const p = this.player;
    if (!item || item.type !== 'use' || !this.owned(id) || p.dead) return;
    if (p.hp >= this.maxHp()) {
      this.events.log('HPは満タンだ');
      return;
    }
    p.inv[id]--;
    const before = p.hp;
    p.hp = Math.min(this.maxHp(), p.hp + Math.round((item.heal ?? 0) * healRateOf(p.stats)));
    this.floatText(p.x, p.y, `+${p.hp - before}`, '#4ade80', 17);
    this.events.log(`${item.name}を使った。HPが${p.hp - before}回復した`);
    this.events.statsChanged();
    this.events.inventoryChanged();
    this.events.dirty();
  }

  /** ショートカットキー(front#272)に登録した道具を使う。持っていなければログで知らせる */
  useShortcut(id: string): void {
    const item = ITEMS[id];
    if (!item || item.type !== 'use') return;
    if (!this.owned(id)) {
      this.events.log(`${item.name}を持っていない`);
      return;
    }
    this.useItem(id);
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

  /** 道具屋で買う。装備は1つまで */
  buy(id: string): boolean {
    const item = ITEMS[id];
    if (!item || item.price === undefined || this.player.gold < item.price) return false;
    if (item.type !== 'use' && this.owned(id)) return false;
    this.player.gold -= item.price;
    this.player.inv[id] = (this.player.inv[id] ?? 0) + 1;
    this.events.log(`${item.name}を買った（-${item.price}G）`);
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

  private playerAttack(e: Enemy): void {
    const def = ENEMIES[e.type];
    const p = this.player;
    p.atkCd = attackIntervalOf(p.stats);
    p.lunge = 1;
    p.lastCombat = this.time;
    let dmg = Math.max(1, Math.round(this.atk() - def.def * 0.6 + randi(-2, 2)));
    const crit = Math.random() < critRateOf(p.stats);
    if (crit) dmg = Math.round(dmg * 1.6);
    e.hp -= dmg;
    e.flash = 0.12;
    this.events.sound?.(`hit_${hitMaterialOf(def)}`);
    if (!e.aggro) {
      e.aggro = true;
      e.atkCd = 0.6;
    }
    this.floatText(e.x, e.y, crit ? `${dmg}!` : `${dmg}`, crit ? '#ffd54a' : '#ffffff', crit ? 22 : 17);
    if (e.hp <= 0) this.killEnemy(e);
  }

  // ===== 壊れる置物(front#264) =====

  /** 壊れる置物を1回叩く。必要な回数を叩くと壊れる */
  private hitObject(o: StaticObj): void {
    const p = this.player;
    p.atkCd = attackIntervalOf(p.stats);
    p.lunge = 1;
    o.hits = (o.hits ?? 0) + 1;
    o.shake = 1;
    this.events.sound?.(`hit_${OBJECT_HIT_MATERIAL[o.type] ?? 'stone'}`);
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
      { grass: '#5cbf64', fern: '#76a84a', crystal: '#7ef9ff', chest: '#f2c14e', armor: '#cbd5e1', barrel: '#9a6230', pot: '#c8693a', bones: '#e9e4d4' }[o.type as string] ??
      this.theme.rock[1];
    for (let i = 0; i < 12; i++) {
      this.particles.push({ x: o.x, y: o.y, ox: 0, oy: -8, vx: randi(-70, 70), vy: randi(-150, -50), t: 0, color: i % 3 ? color : '#ffffff' });
    }
    const c = o.contents;
    if (c?.kind === 'item' && ITEMS[c.id]) {
      // 中のアイテムはフィールドに落ちる(front#276)。置物は元に戻るので、置物のマスには落とさない
      this.dropItem(c.id, c.count, o.x, o.y, true);
      o.respawnIn = BREAK_RESPAWN_SEC;
    } else if (c?.kind === 'enemy' && ENEMIES[c.id] && Math.random() < (c.chance ?? 1)) {
      // 中の敵は出る確率(front#284)で出る。出なければ中身なしと同じ
      const e: Enemy = {
        kind: 'enemy', type: c.id, x: o.x, y: o.y, z: this.map.heightAt(o.x, o.y), hx: o.x, hy: o.y, hp: ENEMIES[c.id].hp, alive: true, path: [], dir: -1,
        moving: false, wander: 0, repath: 0, atkCd: 0.8, flash: 0, lunge: 0, aggro: true, respawn: 0, seed: Math.random() * 6, act: null, fromObject: o
      };
      this.enemies.push(e);
      this.events.log(`${STATIC_NAMES[o.type]}の中から${ENEMIES[c.id].name}が現れた！`);
      // 出てきた敵をそのまま狙う。倒すまで置物は戻らない
      p.target = e;
      p.repath = 0;
      o.respawnIn = null;
    } else {
      o.respawnIn = BREAK_RESPAWN_SEC;
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
    return on(this.player) || this.enemies.some((e) => e.alive && on(e));
  }

  private killEnemy(e: Enemy): void {
    const def = ENEMIES[e.type];
    const p = this.player;
    e.alive = false;
    e.respawn = def.respawn ?? 10;
    e.act = null;
    e.aggro = false;
    e.path = [];
    // 置物から出た敵を倒したら、その置物が元に戻るまでの時間を数え始める(front#264)
    if (e.fromObject) e.fromObject.respawnIn = BREAK_RESPAWN_SEC;
    for (let i = 0; i < 12; i++) {
      this.particles.push({ x: e.x, y: e.y, ox: 0, oy: -10, vx: randi(-70, 70), vy: randi(-160, -60), t: 0, color: i % 2 ? def.color : '#ffffff' });
    }
    p.exp += def.exp;
    p.gold += def.gold;
    p.target = null;
    this.floatText(e.x, e.y, `+${def.exp} EXP`, '#a5f3fc', 13, -18);
    this.events.log(`${def.name}をたおした！ 経験値+${def.exp}・ゴールド+${def.gold}`);
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
    while (p.exp >= this.nextExp()) {
      p.exp -= this.nextExp();
      p.level++;
      p.statPoints += STAT_POINTS_PER_LEVEL;
      p.hp = this.maxHp();
      this.floatText(p.x, p.y, 'LEVEL UP!', '#ffd54a', 22, -24);
      this.events.log(`レベル${p.level}になった！ ステータスのポイントを${STAT_POINTS_PER_LEVEL}もらった`);
    }
    this.events.statsChanged();
    this.events.dirty();
  }

  private enemyAttack(e: Enemy, lunge = true): void {
    const def = ENEMIES[e.type];
    const p = this.player;
    if (lunge) e.lunge = 1;
    p.lastCombat = this.time;
    // 運が高いほど、敵の攻撃をよけやすい
    if (Math.random() < evadeRateOf(p.stats)) {
      this.floatText(p.x, p.y, 'MISS', '#a5f3fc', 15);
      return;
    }
    const dmg = Math.max(1, Math.round(def.atk - this.def() * 0.6 + randi(-1, 2)));
    p.hp -= dmg;
    p.hurt = 0.2;
    p.lastCombat = this.time;
    this.floatText(p.x, p.y, `-${dmg}`, '#ff6b6b', 17);
    if (p.hp <= 0) this.knockOut();
    this.events.statsChanged();
  }

  // たおれたら、ゴールドを1割落として始まりの草原の村に戻り、HPが全回復する
  private knockOut(): void {
    const p = this.player;
    p.hp = 0;
    p.dead = true;
    p.target = null;
    p.path = [];
    const lost = Math.floor(p.gold * 0.1);
    p.gold -= lost;
    this.events.log(`たおれてしまった…　${lost}ゴールドを落とした`);
    this.events.knockedOut(true);
    this.later(KNOCKOUT_MS, () => {
      this.events.knockedOut(false);
      const home = this.homeArea();
      this.goArea(home.id, home.startX, home.startY, () => {
        p.hp = this.maxHp();
        p.dead = false;
        this.events.log('村にもどってきた。HPが全回復した');
        this.events.statsChanged();
      });
    });
  }

  // ===== 毎フレームの更新 =====

  update(dt: number): void {
    this.time += dt;
    if (this.slide && (this.slide.t += dt / SLIDE_SEC) >= 1) {
      this.slide = null;
      this.transitioning = false;
    }
    this.updatePlayer(dt);
    if (!this.transitioning && !this.locked) this.enemies.forEach((e) => this.updateEnemy(e, dt));
    // 置物から出て倒された敵は、もう出てこないので消す(front#264)
    if (this.enemies.some((e) => !e.alive && e.fromObject)) this.enemies = this.enemies.filter((e) => e.alive || !e.fromObject);
    this.updateBreakables(dt);
    this.updateDrops(dt);
    for (const f of this.floats) f.t += dt;
    while (this.floats.length && this.floats[0].t > 1.1) this.floats.shift();
    for (const p of this.particles) {
      p.t += dt;
      p.vy += 400 * dt;
      p.ox += p.vx * dt;
      p.oy += p.vy * dt;
    }
    while (this.particles.length && this.particles[0].t > 0.7) this.particles.shift();
    if (this.clickMarker && (this.clickMarker.t += dt) > 0.6) this.clickMarker = null;

    const [px, py] = iso(this.player.x, this.player.y);
    this.camX = Math.round(this.viewW / 2 - px * this.zoom);
    this.camY = Math.round(this.viewH / 2 - (py - this.player.z * HZ - 20) * this.zoom);
  }

  private updatePlayer(dt: number): void {
    const p = this.player;
    p.atkCd -= dt;
    p.lunge = Math.max(0, p.lunge - dt * 5);
    p.hurt = Math.max(0, p.hurt - dt);
    if (p.dead || this.transitioning) return;

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
          // 看板のそばまで来たら読む(front#314)
          this.faceTo(p, t);
          p.target = null;
          this.events.read?.('看板', signLines);
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
        if (exit.link) this.goLink(exit, ex, ey);
        else this.goNeighbor(exit.side, ex, ey);
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
    const p = this.player;
    const rooted = isRooted(def);
    e.flash = Math.max(0, e.flash - dt);
    e.lunge = Math.max(0, e.lunge - dt * 5);
    if (!e.alive) {
      // 置物から出た敵は出直さない(置物が元に戻る)(front#264)
      if (e.fromObject) return;
      e.respawn -= dt;
      if (e.respawn <= 0) {
        Object.assign(e, { alive: true, hp: def.hp, x: e.hx, y: e.hy, path: [], aggro: false, act: null });
        this.snapZ(e);
      }
      return;
    }
    const dp = cheb(p.x, p.y, e.x, e.y);
    if (!e.aggro && def.sight && dp <= def.sight && !p.dead) {
      e.aggro = true;
      e.atkCd = 0.8;
    }
    if (e.aggro) {
      if (cheb(e.x, e.y, e.hx, e.hy) > LEASH || p.dead) {
        // 出現位置から離れすぎたら、追いかけるのをやめて戻る(HPも戻る)
        e.aggro = false;
        e.hp = def.hp;
        e.path = [];
        e.act = null;
        this.pathTo(e, e.hx, e.hy);
      } else if (e.act) {
        e.atkCd -= dt;
        this.updateAct(e, def, dt);
      } else if (dp <= attackReach(def, ATTACK_RANGE)) {
        // 攻撃が届く距離なら止まり、攻撃の間隔ごとに攻撃する(炎・水などは離れたまま)
        e.path = [];
        this.faceTo(e, p);
        e.atkCd -= dt;
        if (e.atkCd <= 0) {
          this.startAct(e, def);
          e.atkCd = def.interval;
        }
      } else if (rooted) {
        // 根を張っている敵は追いかけず、相手の方を向いて待つ
        this.faceTo(e, p);
      } else {
        e.repath -= dt;
        if (e.repath <= 0) {
          this.pathNear(e, Math.round(p.x), Math.round(p.y));
          e.repath = 0.5;
        }
      }
    } else if (!rooted && !disguiseOf(def)) {
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
    e.moving = !e.act && !rooted && this.moveAlong(e, e.aggro ? def.speed * 1.5 : def.speed, dt);
    this.settleZ(e, dt);
  }

  // ===== 敵の攻撃(front#229) =====

  /** 攻撃を始める。攻撃する場所・動く先は、始めたときの相手の位置で決める(ためている間に動けばよけられる) */
  private startAct(e: Enemy, def: EnemyDef): void {
    const p = this.player;
    const spell = SPELLS.includes(def.attack);
    const tx = spell ? Math.round(p.x) : p.x;
    const ty = spell ? Math.round(p.y) : p.y;
    const [mx, my] = movesToTarget(def) && !isRooted(def) ? this.dashEnd(e, tx, ty, def.dash) : [e.x, e.y];
    e.act = { t: 0, hit: false, tx, ty, sx: e.x, sy: e.y, mx, my };
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
    const p = this.player;
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
      if (!p.dead && this.actHits(e, def, a)) {
        const melee = def.attack === 'tackle' || def.attack === 'claw' || def.attack === 'bite';
        this.enemyAttack(e, melee && !movesToTarget(def));
      }
    }
    if (a.t >= duration) e.act = null;
  }

  /** 攻撃が当たったか(当たる時に、相手がその場所にいるか) */
  private actHits(e: Enemy, def: EnemyDef, a: EnemyAct): boolean {
    const p = this.player;
    if (SPELLS.includes(def.attack)) return cheb(p.x, p.y, a.tx, a.ty) < 0.6;
    if (def.attack === 'shockwave') return cheb(p.x, p.y, e.x, e.y) <= def.radius + 0.5;
    if (movesToTarget(def)) return cheb(p.x, p.y, e.x, e.y) <= 1.0;
    return cheb(p.x, p.y, e.x, e.y) <= ATTACK_RANGE;
  }
}
