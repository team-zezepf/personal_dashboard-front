import { RpgSave, RpgSaveInput } from '../models/rpg.models';
import {
  AREAS,
  AreaDef,
  AreaId,
  AreaMap,
  ENEMIES,
  ITEMS,
  NpcDef,
  TH,
  TW,
  baseAtkOf,
  baseDefOf,
  buildAreaMap,
  isAreaId,
  maxHpOf,
  nextExpOf
} from './rpg-data';
import { cheb, findPath, octile } from './rpg-path';

export interface Mover {
  x: number;
  y: number;
  // これから通るマス(先頭が次に向かうマス)
  path: [number, number][];
  // 画面上の向き(右なら1、左なら-1)
  dir: 1 | -1;
  moving: boolean;
}

export interface Npc extends NpcDef, Mover {
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
  seed: number;
}

export interface Player extends Mover {
  kind: 'player';
  target: Npc | Enemy | null;
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
  // 新しいエリアに入った(暗転が明けたとき)
  areaEntered(area: AreaDef): void;
  // たおれた(true)/村に戻った(false)
  knockedOut(on: boolean): void;
}

const PLAYER_SPEED = 4.2;
const ATTACK_RANGE = 1.35;
const LEASH = 8;
const FADE_MS = 380;
const KNOCKOUT_MS = 1500;
const HOME: { area: AreaId; x: number; y: number } = { area: 'plain', x: 6, y: 7 };

const randi = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));
export const iso = (x: number, y: number): [number, number] => [((x - y) * TW) / 2, ((x + y) * TH) / 2];

/**
 * RPGの状態と動き(移動・会話・戦闘・アイテム・エリア移動)。描画は RpgRenderer が行う。
 * 1人用なので計算はすべてここで行い、APIへはセーブデータ(toSaveInput)だけを送る。
 */
export class RpgGame {
  area: AreaDef = AREAS.plain;
  map: AreaMap = buildAreaMap(AREAS.plain);
  npcs: Npc[] = [];
  enemies: Enemy[] = [];
  readonly player: Player = {
    kind: 'player', x: HOME.x, y: HOME.y, path: [], dir: 1, moving: false, target: null, repath: 0, atkCd: 0, lunge: 0, hurt: 0,
    level: 1, exp: 0, hp: maxHpOf(1), gold: 30, weapon: 'wood_sword', armor: 'cloth',
    inv: { potion: 3, wood_sword: 1, cloth: 1 }, lastCombat: -99, regen: 0, dead: false
  };

  time = 0;
  readonly floats: FloatText[] = [];
  readonly particles: Particle[] = [];
  clickMarker: { x: number; y: number; t: number } | null = null;

  // 画面の大きさとカメラ(プレイヤーが中央に来る位置)
  viewW = 0;
  viewH = 0;
  camX = 0;
  camY = 0;
  mouse: { x: number; y: number } | null = null;
  hover: Npc | Enemy | null = null;

  // 会話・お店を開いている間はクリックで動かない
  locked = false;
  transitioning = false;
  // 話しかけて「!」を消した村人(エリアを出入りしても消えたままにする)
  private talkedTo = new Set<string>();
  private timers: ReturnType<typeof setTimeout>[] = [];

  constructor(private events: RpgGameEvents) {
    this.loadArea('plain');
  }

  dispose(): void {
    this.timers.forEach(clearTimeout);
    this.timers = [];
  }

  // ===== 能力値 =====
  maxHp = () => maxHpOf(this.player.level);
  nextExp = () => nextExpOf(this.player.level);
  atk = () => baseAtkOf(this.player.level) + (ITEMS[this.player.weapon]?.atk ?? 0);
  def = () => baseDefOf(this.player.level) + (ITEMS[this.player.armor]?.def ?? 0);
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
    // たおれたまま保存されていたら、村で全回復した状態から始める
    p.hp = save.hp > 0 ? Math.min(save.hp, this.maxHp()) : this.maxHp();
    const areaId: AreaId = isAreaId(save.area) ? save.area : HOME.area;
    this.loadArea(areaId);
    const [x, y] = this.map.walkable(save.x, save.y) ? [save.x, save.y] : this.area.start;
    p.x = x;
    p.y = y;
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
      y
    };
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

  private loadArea(id: AreaId): void {
    this.area = AREAS[id];
    this.map = buildAreaMap(this.area);
    this.npcs = this.area.npcs.map((n) => ({
      ...n, kind: 'npc', path: [], dir: 1, moving: false, notice: !!n.notice && !this.talkedTo.has(n.name)
    }));
    this.enemies = this.area.spawns.map(([type, sx, sy]) => {
      const [x, y] = this.map.nearestWalkable(sx, sy);
      return {
        kind: 'enemy', type, x, y, hx: x, hy: y, hp: ENEMIES[type].hp, alive: true, path: [], dir: -1, moving: false,
        wander: Math.random() * 3, repath: 0, atkCd: 0, flash: 0, lunge: 0, aggro: false, respawn: 0, seed: Math.random() * 6
      };
    });
    this.floats.length = 0;
    this.particles.length = 0;
    this.clickMarker = null;
    this.hover = null;
  }

  goArea(id: AreaId, x: number, y: number, after?: () => void): void {
    if (this.transitioning) return;
    this.transitioning = true;
    this.player.path = [];
    this.player.target = null;
    this.events.fade(true);
    this.later(FADE_MS, () => {
      this.loadArea(id);
      this.player.x = x;
      this.player.y = y;
      after?.();
      this.transitioning = false;
      this.events.fade(false);
      this.events.areaEntered(this.area);
      this.events.log(`${this.area.name}にやってきた`);
      this.events.dirty();
    });
  }

  private later(ms: number, fn: () => void): void {
    this.timers.push(setTimeout(fn, ms));
  }

  // ===== 経路 =====

  private setPath(ent: Mover, isGoal: (x: number, y: number) => boolean, h: (x: number, y: number) => number): boolean {
    // 歩いている途中なら、向かっているマスから探し直す(マスの途中で向きを変えない)
    const moving = ent.path.length > 0;
    const [sx, sy] = moving ? ent.path[0] : [Math.round(ent.x), Math.round(ent.y)];
    const path = findPath((x, y) => this.map.walkable(x, y), sx, sy, isGoal, h);
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

  private faceTo(ent: Mover, t: { x: number; y: number }): void {
    const s = t.x - t.y - (ent.x - ent.y);
    if (Math.abs(s) > 0.05) ent.dir = s > 0 ? 1 : -1;
  }

  // ===== 入力 =====

  screenToTile(mx: number, my: number): [number, number] {
    const a = (mx - this.camX) / (TW / 2);
    const b = (my - this.camY) / (TH / 2);
    return [Math.round((a + b) / 2), Math.round((b - a) / 2)];
  }

  /** 画面上の位置にいる村人・敵(重なっていれば手前のもの) */
  pickEntity(mx: number, my: number): Npc | Enemy | null {
    const wx = mx - this.camX;
    const wy = my - this.camY;
    let best: Npc | Enemy | null = null;
    let bestDepth = -Infinity;
    for (const e of [...this.npcs, ...this.enemies.filter((e) => e.alive)]) {
      const [sx, sy] = iso(e.x, e.y);
      const def = e.kind === 'enemy' ? ENEMIES[e.type] : null;
      const hw = def ? 18 * def.size + 4 : 18;
      const ht = def ? def.hit : 50;
      if (wx > sx - hw && wx < sx + hw && wy > sy - ht && wy < sy + 8 && e.x + e.y > bestDepth) {
        bestDepth = e.x + e.y;
        best = e;
      }
    }
    return best;
  }

  /** 村人・敵の足元の画面上の位置(E2Eテストでクリックする位置を求めるのに使う) */
  screenPositionOf(e: { x: number; y: number }): [number, number] {
    const [sx, sy] = iso(e.x, e.y);
    return [sx + this.camX, sy + this.camY];
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
    p.hp = Math.min(this.maxHp(), p.hp + (item.heal ?? 0));
    this.floatText(p.x, p.y, `+${p.hp - before}`, '#4ade80', 17);
    this.events.log(`${item.name}を使った。HPが${p.hp - before}回復した`);
    this.events.statsChanged();
    this.events.inventoryChanged();
    this.events.dirty();
  }

  // [1]キー: 回復薬がなければ上回復薬を使う
  quickPotion(): void {
    this.useItem(this.owned('potion') ? 'potion' : 'hipotion');
  }

  equip(id: string): void {
    const item = ITEMS[id];
    if (!item || item.type === 'use' || !this.owned(id)) return;
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

  // ===== 戦闘 =====

  private floatText(x: number, y: number, text: string, color: string, size = 16, oy = 0): void {
    this.floats.push({ x, y, text, color, size, oy, t: 0 });
  }

  private playerAttack(e: Enemy): void {
    const def = ENEMIES[e.type];
    const p = this.player;
    p.atkCd = 0.85;
    p.lunge = 1;
    p.lastCombat = this.time;
    let dmg = Math.max(1, Math.round(this.atk() - def.def * 0.6 + randi(-2, 2)));
    const crit = Math.random() < 0.12;
    if (crit) dmg = Math.round(dmg * 1.6);
    e.hp -= dmg;
    e.flash = 0.12;
    if (!e.aggro) {
      e.aggro = true;
      e.atkCd = 0.6;
    }
    this.floatText(e.x, e.y, crit ? `${dmg}!` : `${dmg}`, crit ? '#ffd54a' : '#ffffff', crit ? 22 : 17);
    if (e.hp <= 0) this.killEnemy(e);
  }

  private killEnemy(e: Enemy): void {
    const def = ENEMIES[e.type];
    const p = this.player;
    e.alive = false;
    e.respawn = def.respawn ?? 10;
    e.aggro = false;
    e.path = [];
    for (let i = 0; i < 12; i++) {
      this.particles.push({ x: e.x, y: e.y, ox: 0, oy: -10, vx: randi(-70, 70), vy: randi(-160, -60), t: 0, color: i % 2 ? def.color : '#ffffff' });
    }
    p.exp += def.exp;
    p.gold += def.gold;
    p.target = null;
    this.floatText(e.x, e.y, `+${def.exp} EXP`, '#a5f3fc', 13, -18);
    this.events.log(`${def.name}をたおした！ 経験値+${def.exp}・ゴールド+${def.gold}`);
    if (Math.random() < def.drop.rate) {
      p.inv[def.drop.id] = (p.inv[def.drop.id] ?? 0) + 1;
      this.events.log(`${ITEMS[def.drop.id].name}を手に入れた！`);
      this.events.inventoryChanged();
    }
    while (p.exp >= this.nextExp()) {
      p.exp -= this.nextExp();
      p.level++;
      p.hp = this.maxHp();
      this.floatText(p.x, p.y, 'LEVEL UP!', '#ffd54a', 22, -24);
      this.events.log(`レベル${p.level}になった！ 最大HP・攻撃・防御が上がった`);
    }
    this.events.statsChanged();
    this.events.dirty();
  }

  private enemyAttack(e: Enemy): void {
    const def = ENEMIES[e.type];
    const p = this.player;
    const dmg = Math.max(1, Math.round(def.atk - this.def() * 0.6 + randi(-1, 2)));
    e.lunge = 1;
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
      this.goArea(HOME.area, HOME.x, HOME.y, () => {
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
    this.updatePlayer(dt);
    if (!this.transitioning) this.enemies.forEach((e) => this.updateEnemy(e, dt));
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
    this.camX = Math.round(this.viewW / 2 - px);
    this.camY = Math.round(this.viewH / 2 - py + 20);
  }

  private updatePlayer(dt: number): void {
    const p = this.player;
    p.atkCd -= dt;
    p.lunge = Math.max(0, p.lunge - dt * 5);
    p.hurt = Math.max(0, p.hurt - dt);
    if (p.dead || this.transitioning) return;

    const t = p.target;
    if (t) {
      if (t.kind === 'enemy' && !t.alive) {
        p.target = null;
      } else {
        const d = cheb(p.x, p.y, t.x, t.y);
        if (t.kind === 'enemy' && d <= ATTACK_RANGE) {
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
    p.moving = this.moveAlong(p, PLAYER_SPEED, dt);
    if (wasMoving && !p.path.length) this.events.dirty();

    // 光る場所(ポータル)の上で止まったらエリア移動
    if (!p.path.length) {
      const portal = this.area.portals.find((q) => Math.abs(p.x - q.x) < 0.1 && Math.abs(p.y - q.y) < 0.1);
      if (portal) this.goArea(portal.to, portal.tx, portal.ty);
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
    npc.notice = false;
    this.talkedTo.add(npc.name);
    npc.dir = this.player.x - this.player.y - (npc.x - npc.y) > 0 ? 1 : -1;
    this.events.talk(npc);
  }

  private updateEnemy(e: Enemy, dt: number): void {
    const def = ENEMIES[e.type];
    const p = this.player;
    e.flash = Math.max(0, e.flash - dt);
    e.lunge = Math.max(0, e.lunge - dt * 5);
    if (!e.alive) {
      e.respawn -= dt;
      if (e.respawn <= 0) Object.assign(e, { alive: true, hp: def.hp, x: e.hx, y: e.hy, path: [], aggro: false });
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
        this.pathTo(e, e.hx, e.hy);
      } else if (dp <= ATTACK_RANGE) {
        e.path = [];
        this.faceTo(e, p);
        e.atkCd -= dt;
        if (e.atkCd <= 0) {
          this.enemyAttack(e);
          e.atkCd = def.interval;
        }
      } else {
        e.repath -= dt;
        if (e.repath <= 0) {
          this.pathNear(e, Math.round(p.x), Math.round(p.y));
          e.repath = 0.5;
        }
      }
    } else {
      e.wander -= dt;
      if (e.wander <= 0 && !e.path.length) {
        const tx = e.hx + randi(-3, 3);
        const ty = e.hy + randi(-3, 3);
        if (this.map.walkable(tx, ty)) this.pathTo(e, tx, ty);
        e.wander = 2 + Math.random() * 3;
      }
    }
    e.moving = this.moveAlong(e, e.aggro ? def.speed * 1.5 : def.speed, dt);
  }
}
