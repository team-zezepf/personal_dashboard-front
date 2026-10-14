import { BREAK_HITS, ENEMIES, G, HZ, ITEMS, STATIC_NAMES, StaticObj, TH, TW, exitAt, shelfFace, signExit, staticDepth, swordColorOf } from './rpg-data';
import { DEFAULT_ROOF, HousePiece, houseGeometry, housePieces, roofRise, wallColors, wallOpenings } from './rpg-house';
import { AreaSlide, DROP_BLINK_SEC, DROP_LIFE_SEC, Drop, Enemy, Npc, Player, RpgGame, iso } from './rpg-game';
import { LookPose, drawLook, lookFromColors } from './rpg-look';
import { RpgLook } from '../models/rpg.models';
import { SPELLS, attackTiming, chargeShake, disguiseOf, drawAttackEffect, drawEnemyBody, jumpHeight, ringSizeOf } from './rpg-enemy';
import { SIGN_BANDS, drawArmor, drawBarrel, drawBones, drawBookshelf, drawCandle, drawChest, drawGrave, drawPot, drawSign } from './rpg-props';

type Pt = [number, number];

// 壁(front#268)の高さ。床のマスの縦の6つぶんほど
const WALL_HEIGHT = 200;

// #rrggbb の色を暗くする(家の屋根の影の面)
export function shade(hex: string, factor: number): string {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.round(v * factor);
  return `rgb(${c(n >> 16)}, ${c((n >> 8) & 255)}, ${c(n & 255)})`;
}

// スライドの始めはゆっくり、途中は速く、終わりはゆっくり(0〜1)
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

/**
 * スライドで、前のエリアの画面が押し出されて動く量(画面上)。
 * 画面の外まで出きる長さの半分にし、前の画面は薄くしながら動かす(新しいエリアが早くから見えるように)
 */
function slideVector(slide: AreaSlide, w: number, h: number): [number, number] {
  const [sx, sy] = iso(slide.side[0], slide.side[1]);
  const len = Math.hypot(sx, sy);
  const [ux, uy] = [sx / len, sy / len];
  const distance = (Math.abs(ux) * w + Math.abs(uy) * h) * 0.5;
  return [ux * distance, uy * distance];
}

/**
 * RPGの画面を Canvas 2D に描く。絵は図形だけの仮の絵(あとでドット絵に差し替えられるよう、描き分けは種類ごとの関数にしておく)。
 * 地面 → 置物・人・敵(奥から手前の順) → 数字・演出の順に重ねる。
 */
export class RpgRenderer {
  private game!: RpgGame;
  // ホタルの位置はマップの広さに対する割合(0〜1)で持つ
  private readonly fireflies = Array.from({ length: 40 }, () => ({ x: Math.random(), y: Math.random(), ph: Math.random() * 6 }));
  private readonly stars = Array.from({ length: 90 }, () => ({ x: Math.random(), y: Math.random(), ph: Math.random() * 6, r: Math.random() * 1.4 + 0.4 }));
  // 家の形・向きごとの部品(front#236。毎回求めないよう、覚えておく)
  private readonly houses = new Map<string, { pieces: HousePiece[]; ridge: number; door: { at: readonly [number, number]; normal: readonly [number, number] } }>();
  // 隣のエリアへスライドしている間、新しいエリアをずらして描く量(画面上の位置)
  private shift: [number, number] = [0, 0];

  constructor(private ctx: CanvasRenderingContext2D) {}

  private get time(): number {
    return this.game.time;
  }

  draw(game: RpgGame, dpr: number): void {
    this.game = game;
    const ctx = this.ctx;
    const w = game.viewW;
    const h = game.viewH;
    const pal = game.theme;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, pal.sky[0]);
    sky.addColorStop(1, pal.sky[1]);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
    if (pal.stars) {
      for (const s of this.stars) {
        ctx.globalAlpha = 0.5 + Math.sin(this.time * 2 + s.ph) * 0.4;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(s.x * w, s.y * h, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // 隣のエリアへスライドしている間は、新しいエリアを進む向きから滑り込ませる(front#234)
    const slide = game.slide;
    const [vx, vy] = slide ? slideVector(slide, w, h) : [0, 0];
    const eased = slide ? easeInOut(slide.t) : 1;
    this.shift = [vx * (1 - eased), vy * (1 - eased)];
    // 前のエリアの画面を、進む向きと反対へ押し出す。新しいエリアの下に描き、空の色の境目が目立たないよう、だんだん薄くする
    if (slide?.image) {
      ctx.globalAlpha = 1 - eased;
      ctx.drawImage(slide.image, this.shift[0] - vx, this.shift[1] - vy, w, h);
      ctx.globalAlpha = 1;
    }

    ctx.save();
    ctx.translate(game.camX + this.shift[0], game.camY + this.shift[1]);
    ctx.scale(game.zoom, game.zoom);
    this.drawGround();
    // 高いマスがあるときは、マスを描き終えてから重ねる(高いマスの下に隠れないように)
    if (!game.map.hasHeights) this.drawCursorTile();
    this.drawEntities();
    this.drawAttacks();
    if (game.map.hasHeights) this.drawCursorTile();
    if (pal.fireflies) this.drawFireflies();
    // 看板(front#274)の上に、行き先のダンジョンの名前
    for (const o of game.map.statics) {
      if (o.type !== 'sign') continue;
      const exit = signExit(game.maps, game.area, o.x, o.y);
      if (!exit) continue;
      const [sx, sy] = this.at(o.x, o.y);
      if (this.onScreen(sx, sy, 80)) this.label(`▶ ${game.dungeonOf(exit.to).name}`, sx, sy - 52, 'rgba(124,58,237,0.88)');
    }
    this.drawEffects();
    ctx.restore();
    this.shift = [0, 0];

    if (pal.vignette) {
      const v = ctx.createRadialGradient(w / 2, h / 2 + 20, 120, w / 2, h / 2 + 20, Math.max(w, h) * 0.7);
      v.addColorStop(0, 'rgba(0,0,0,0)');
      v.addColorStop(1, pal.vignette);
      ctx.fillStyle = v;
      ctx.fillRect(0, 0, w, h);
    }
  }

  // マップ上の位置(cx, cy)が画面に映るか。margin はその位置から絵がはみ出す大きさ。
  // 50×50 マスのマップでも、画面の外のマスを描かないことで重くならないようにする
  private onScreen(cx: number, cy: number, margin: number): boolean {
    const g = this.game;
    const x = cx * g.zoom + g.camX + this.shift[0];
    const y = cy * g.zoom + g.camY + this.shift[1];
    const m = margin * g.zoom;
    return x > -m && x < g.viewW + m && y > -m && y < g.viewH + m;
  }

  // ===== 地面 =====

  private diamond(cx: number, cy: number, s = 1): void {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(cx, cy - (TH / 2) * s);
    ctx.lineTo(cx + (TW / 2) * s, cy);
    ctx.lineTo(cx, cy + (TH / 2) * s);
    ctx.lineTo(cx - (TW / 2) * s, cy);
    ctx.closePath();
  }

  private poly(points: Pt[], fill: string | CanvasGradient): void {
    const ctx = this.ctx;
    ctx.beginPath();
    points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  }

  // 高いマスがあるときは、高さの分だけ上にずらした位置(front#225)
  private at(x: number, y: number): [number, number] {
    const [cx, cy] = iso(x, y);
    return [cx, cy - this.game.map.heightAt(Math.round(x), Math.round(y)) * HZ];
  }

  // 0段のマスを先に描く。高いマスは、手前のものを隠せるよう置物・人・敵と一緒に奥から順に描く(drawEntities)
  private drawGround(): void {
    const { map, area } = this.game;
    for (let s = 0; s < map.w + map.h - 1; s++) {
      for (let x = 0; x < map.w; x++) {
        const y = s - x;
        if (y < 0 || y >= map.h || map.heights[y][x] > 0) continue;
        this.drawTile(x, y);
      }
    }
    this.drawExits();
  }

  // 隣のエリアへの出口(隣にエリアがある側の、端の通れるマス)に、進む向きの矢印を出す(front#234)。
  // ほかのダンジョンへの出口(front#274)は紫に光らせる
  private drawExits(): void {
    const { map, area, maps } = this.game;
    const ctx = this.ctx;
    const alpha = 0.6 + Math.sin(this.time * 3) * 0.2;
    const edges: [number, number][] = [];
    for (let x = 0; x < map.w; x++) edges.push([x, 0], [x, map.h - 1]);
    for (let y = 1; y < map.h - 1; y++) edges.push([0, y], [map.w - 1, y]);
    for (const [x, y] of edges) {
      if (!map.walkable(x, y)) continue;
      const exit = exitAt(maps, area, x, y);
      if (!exit) continue;
      const side = exit.side;
      const [cx, cy] = this.at(x, y);
      if (!this.onScreen(cx, cy, TW)) continue;
      this.diamond(cx, cy, 0.86);
      ctx.fillStyle = exit.link ? `rgba(216,180,254,${alpha * 0.55})` : `rgba(180,248,255,${alpha * 0.45})`;
      ctx.fill();
      // 矢印(画面上の進む向き)
      const [sx, sy] = iso(side[0], side[1]);
      const len = Math.hypot(sx, sy);
      const [ux, uy] = [sx / len, sy / len];
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.beginPath();
      ctx.moveTo(cx + ux * 9, cy + uy * 9);
      ctx.lineTo(cx - ux * 5 - uy * 7, cy - uy * 5 + ux * 7);
      ctx.lineTo(cx - ux * 5 + uy * 7, cy - uy * 5 - ux * 7);
      ctx.closePath();
      ctx.fill();
    }
  }

  // 1マス分の地面。高いマスは、上の面と手前の2つの側面(土台)を描く
  private drawTile(x: number, y: number): void {
    const ctx = this.ctx;
    const map = this.game.map;
    const pal = this.game.theme;
    const g = map.ground[y][x];
    if (g === G.VOID) return;
    const lift = map.heights[y][x] * HZ;
    const [cx, cy0] = iso(x, y);
    const cy = cy0 - lift;
    if (!this.onScreen(cx, cy0, TW + lift)) return;
    // 手前の側面。島のふち(手前が「なし」)なら、さらに下まで伸ばす
    const left = lift + (map.isVoid(x, y + 1) ? 22 : 0);
    const right = lift + (map.isVoid(x + 1, y) ? 22 : 0);
    if (left > 0) this.poly([[cx - TW / 2, cy], [cx, cy + TH / 2], [cx, cy + TH / 2 + left], [cx - TW / 2, cy + left]], pal.edge[0]);
    if (right > 0) this.poly([[cx, cy + TH / 2], [cx + TW / 2, cy], [cx + TW / 2, cy + right], [cx, cy + TH / 2 + right]], pal.edge[1]);
    if (lift > 0) {
      // 段の境目の線
      ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      ctx.lineWidth = 1;
      for (let i = 1; i * HZ <= lift; i++) {
        ctx.beginPath();
        ctx.moveTo(cx - TW / 2, cy + i * HZ);
        ctx.lineTo(cx, cy + TH / 2 + i * HZ);
        ctx.lineTo(cx + TW / 2, cy + i * HZ);
        ctx.stroke();
      }
    }

    let color: string;
    if (g === G.WATER || g === G.BRIDGE) color = pal.liquid(x, y, this.time);
    else if (g === G.PATH) color = pal.path[(x + y) % 2];
    else if (g === G.SAND) color = pal.sand;
    else if (g === G.TILE) color = pal.tile.grout;
    else if (g === G.BRICK) color = pal.brick.mortar;
    else color = pal.grass[(x * 7 + y * 13) % 3];
    this.diamond(cx, cy);
    ctx.fillStyle = color;
    ctx.fill();
    if (g === G.TILE) this.drawStoneTile(cx, cy, x, y);
    else if (g === G.BRICK) this.drawBrick(cx, cy, x, y);
    this.diamond(cx, cy);
    // 高いマスほど、上の面を少し明るくする
    if (lift > 0) {
      ctx.fillStyle = `rgba(255,255,255,${(lift / HZ) * 0.06})`;
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    ctx.lineWidth = 1;
    ctx.stroke();

    if (g === G.WATER && pal.wave) {
      ctx.strokeStyle = pal.wave;
      ctx.lineWidth = 1.5;
      const o = Math.sin(this.time * 1.5 + x + y * 2) * 6;
      ctx.beginPath();
      ctx.moveTo(cx - 10 + o, cy - 2);
      ctx.lineTo(cx + 2 + o, cy - 2);
      ctx.stroke();
    } else if (g === G.BRIDGE) {
      this.diamond(cx, cy, 0.86);
      ctx.fillStyle = '#b8834f';
      ctx.fill();
      ctx.strokeStyle = '#8a5d33';
      ctx.lineWidth = 1;
      for (let i = -3; i <= 3; i++) {
        ctx.beginPath();
        ctx.moveTo(cx + i * 7 - 10, cy + i * 3.5 + 5);
        ctx.lineTo(cx + i * 7 + 10, cy + i * 3.5 - 5);
        ctx.stroke();
      }
    } else if (g === G.FLOWER) {
      this.drawFlower(cx, cy, x, y);
    }
  }

  // マスの上の面の中の点。u は x の向き(画面の右下)、v は y の向き(画面の左下)に 0〜1
  private tilePoint(cx: number, cy: number, u: number, v: number): Pt {
    return [cx + ((u - v) * TW) / 2, cy - TH / 2 + ((u + v) * TH) / 2];
  }

  private tileQuad(cx: number, cy: number, u0: number, v0: number, u1: number, v1: number, fill: string): void {
    const pt = (u: number, v: number) => this.tilePoint(cx, cy, u, v);
    this.poly([pt(u0, v0), pt(u1, v0), pt(u1, v1), pt(u0, v1)], fill);
  }

  // タイル(石畳, front#254)。目地の色の上に、2×2の石を少しすき間をあけて並べる。石ごとに色を少し変える
  private drawStoneTile(cx: number, cy: number, x: number, y: number): void {
    const ctx = this.ctx;
    const { stone } = this.game.theme.tile;
    const gap = 0.035;
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 2; j++) {
        const u0 = i / 2 + gap;
        const v0 = j / 2 + gap;
        const u1 = (i + 1) / 2 - gap;
        this.tileQuad(cx, cy, u0, v0, u1, (j + 1) / 2 - gap, stone[(x * 2 + i + (y * 2 + j) * 3) % 3]);
        // 石の奥側のふちを少し明るく
        ctx.beginPath();
        ctx.moveTo(...this.tilePoint(cx, cy, u0, v0 + 0.02));
        ctx.lineTo(...this.tilePoint(cx, cy, u1, v0 + 0.02));
        ctx.stroke();
      }
    }
  }

  // レンガ(front#254)。y の向きに4段、x の向きに長いレンガを段ごとに半分ずらして積む。ずれ方はとなりのマスとつながる
  private drawBrick(cx: number, cy: number, x: number, y: number): void {
    const { brick } = this.game.theme.brick;
    const rows = 4;
    const gap = 0.03;
    for (let r = 0; r < rows; r++) {
      const v0 = r / rows + gap;
      const v1 = (r + 1) / rows - gap;
      const shift = ((y * rows + r) % 2) * 0.25;
      for (let k = -1; k < 2; k++) {
        const u0 = Math.max(0, k / 2 + shift) + gap;
        const u1 = Math.min(1, (k + 1) / 2 + shift) - gap;
        if (u1 > u0) this.tileQuad(cx, cy, u0, v0, u1, v1, brick[(x * 3 + k + y * 5 + r * 7 + 9) % 3]);
      }
    }
  }

  private drawFlower(cx: number, cy: number, x: number, y: number): void {
    const ctx = this.ctx;
    const pal = this.game.theme;
    if (pal.flower === 'flower' || pal.flower === 'glow') {
      for (let i = 0; i < 3; i++) {
        const c = pal.flowers[(x + y + i) % 3];
        const px = cx - 10 + i * 9;
        const py = cy - 3 + (i % 2) * 6;
        if (pal.flower === 'glow') {
          const g = ctx.createRadialGradient(px, py, 0, px, py, 8);
          g.addColorStop(0, c);
          g.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.globalAlpha = 0.35 + Math.sin(this.time * 2 + x + i) * 0.2;
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(px, py, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.arc(px, py, 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (pal.flower === 'tuft') {
      ctx.strokeStyle = pal.flowers[(x + y) % 3];
      ctx.lineWidth = 1.6;
      for (let i = 0; i < 3; i++) {
        const px = cx - 8 + i * 7;
        const py = cy + 2;
        ctx.beginPath();
        ctx.moveTo(px, py); ctx.lineTo(px - 3, py - 7);
        ctx.moveTo(px, py); ctx.lineTo(px + 1, py - 9);
        ctx.moveTo(px, py); ctx.lineTo(px + 4, py - 6);
        ctx.stroke();
      }
    } else {
      ctx.strokeStyle = 'rgba(20,16,35,0.55)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(cx - 14, cy - 2); ctx.lineTo(cx - 4, cy + 1); ctx.lineTo(cx + 2, cy - 4); ctx.lineTo(cx + 12, cy - 1);
      ctx.moveTo(cx - 4, cy + 1); ctx.lineTo(cx - 2, cy + 7);
      ctx.stroke();
    }
  }

  // マウスの下の通れるマスを明るくし、クリックした場所に印を出す
  private drawCursorTile(): void {
    const ctx = this.ctx;
    const game = this.game;
    if (game.mouse && !game.hover && !game.locked) {
      const [tx, ty] = game.screenToTile(game.mouse.x, game.mouse.y);
      if (game.map.walkable(tx, ty)) {
        const [cx, cy] = this.at(tx, ty);
        this.diamond(cx, cy);
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fill();
      }
    }
    if (game.clickMarker) {
      const [cx, cy] = this.at(game.clickMarker.x, game.clickMarker.y);
      this.diamond(cx, cy, 1 - game.clickMarker.t);
      ctx.strokeStyle = `rgba(255,255,255,${1 - game.clickMarker.t / 0.6})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  // ===== 置物・人・敵 =====

  private drawEntities(): void {
    const game = this.game;
    const map = game.map;
    type Drawable = StaticObj | (typeof game.npcs)[number] | Enemy | typeof game.player | Drop;
    // 壊れている置物は描かない(front#264)。落ちたアイテム(front#276)は同じマスの人・敵より奥に描く
    const list: Drawable[] = [...map.statics.filter((o) => !o.broken), ...game.drops, ...game.npcs, ...game.enemies.filter((e) => e.alive), game.player];
    // 奥(x + y が小さい)から順に描く。同じ奥行きなら置物・落ちたアイテムを先に。大きな家は、いちばん手前のマスで並べる
    const depth = (o: Drawable) => (o.kind === 'static' ? staticDepth(o) : o.x + o.y);
    const order = (o: Drawable) => (o.kind === 'static' ? 0 : o.kind === 'drop' ? 1 : 2);
    list.sort((a, b) => depth(a) - depth(b) || order(a) - order(b));
    if (!map.hasHeights) {
      for (const o of list) this.drawEntity(o);
      return;
    }
    // 高いマスがあるときは、奥の斜めの列から順に「高いマス → その列に立っているもの」を描く。
    // 手前の高いマスがあとから描かれて、奥のものを隠す(front#225)
    const rows: Drawable[][] = Array.from({ length: map.w + map.h - 1 }, () => []);
    for (const o of list) {
      const s = Math.min(rows.length - 1, Math.max(0, o.kind === 'static' ? depth(o) : Math.round(o.x) + Math.round(o.y)));
      rows[s].push(o);
    }
    for (let s = 0; s < rows.length; s++) {
      for (let x = 0; x < map.w; x++) {
        const y = s - x;
        if (y < 0 || y >= map.h || map.heights[y][x] === 0) continue;
        this.drawTile(x, y);
      }
      for (const o of rows[s]) this.drawEntity(o);
    }
  }

  private drawEntity(o: StaticObj | Npc | Enemy | Player | Drop): void {
    const game = this.game;
    if (o.kind === 'drop') return this.drawDrop(o);
    const [sx, sy0] = iso(o.x, o.y);
    // 立っているマスの高さの分だけ上に描く(置物はマスの高さ、人・敵は登り降りの途中の高さ)
    const sy = sy0 - (o.kind === 'static' ? game.map.heightAt(o.x, o.y) : o.z) * HZ;
    // 火山などの大きな置物・頭の上の名前も入るよう、広めに見る
    if (!this.onScreen(sx, sy, o.kind === 'static' && o.type === 'wall' ? WALL_HEIGHT + 40 : 160)) return;
    if (o.kind === 'static') this.drawStaticState(o, sx, sy);
    else if (o.kind === 'npc') {
      this.drawLook(sx, sy, o.look ?? lookFromColors(o.hair, o.body), { dir: o.dir, time: this.time, phase: o.x });
      this.label(o.name, sx, sy - 56, game.hover === o ? 'rgba(96,118,224,0.95)' : undefined);
      // 受けられる新しいクエストは「!」、報告できるクエストは「?」(front#239)
      const mark = game.questMark(o);
      if (mark) this.drawNotice(sx, sy - 78 + Math.sin(this.time * 4) * 3, mark);
    } else if (o.kind === 'enemy') this.drawEnemy(o, sx, sy);
    else if (!game.hidePlayer) this.drawPlayer(sx, sy);
  }

  // 落ちたアイテム(front#276)。最初の0.5秒で落ちた場所から弧をえがいて飛び出し、そのあとは足元を光らせて小さく上下する。
  // 消える前の DROP_BLINK_SEC 秒は点滅する。マウスの下・拾いに向かっているときは名前を出す
  private drawDrop(d: Drop): void {
    const ctx = this.ctx;
    const game = this.game;
    if (DROP_LIFE_SEC - d.t < DROP_BLINK_SEC && Math.floor(d.t * 6) % 2) return;
    const k = Math.min(1, d.t / 0.5);
    const [fx, fy] = this.at(d.fromX, d.fromY);
    const [tx, ty] = this.at(d.x, d.y);
    const cx = fx + (tx - fx) * k;
    const cy = fy + (ty - fy) * k - Math.sin(Math.PI * k) * 28;
    if (!this.onScreen(cx, cy, 60)) return;
    const glow = ctx.createRadialGradient(cx, cy, 1, cx, cy, 14);
    glow.addColorStop(0, `rgba(255,236,150,${0.55 + Math.sin(this.time * 4) * 0.15})`);
    glow.addColorStop(1, 'rgba(255,236,150,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 16, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    const bob = k < 1 ? 0 : Math.sin(this.time * 3 + d.x) * 2;
    ctx.font = '15px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#000';
    ctx.fillText(ITEMS[d.id]?.icon ?? '❔', cx, cy - 4 + bob);
    if (game.hover === d || game.player.target === d) {
      this.label(`${ITEMS[d.id]?.name ?? ''}${d.count > 1 ? `×${d.count}` : ''}`, cx, cy - 30);
    }
  }

  // 壊れる置物は、叩かれるとゆれ・ひびが入り、元に戻るときはだんだん濃くなる。狙っている・マウスの下なら名前を出す(front#264)
  private drawStaticState(o: StaticObj, sx: number, sy: number): void {
    const ctx = this.ctx;
    const game = this.game;
    const dx = o.shake ? Math.sin(this.time * 60) * 3 * o.shake : 0;
    ctx.save();
    if (o.fade !== undefined && o.fade < 1) ctx.globalAlpha = o.fade;
    this.drawStatic(o, sx + dx, sy);
    if (o.hits && (o.type === 'rock' || o.type === 'crystal')) this.drawCracks(o, sx + dx, sy);
    ctx.restore();
    if (BREAK_HITS[o.type] && (game.hover === o || game.player.target === o)) {
      const labelY = o.type === 'armor' ? 62 : o.type === 'crystal' ? 44 : 32;
      this.label(STATIC_NAMES[o.type], sx, sy - labelY, game.player.target === o ? 'rgba(220,38,38,0.85)' : undefined);
    }
  }

  // 叩いた回数だけ、岩・水晶にひびを入れる
  private drawCracks(o: StaticObj, cx: number, cy: number): void {
    const ctx = this.ctx;
    ctx.strokeStyle = o.type === 'crystal' ? 'rgba(14,116,144,0.9)' : 'rgba(31,41,55,0.75)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    const top = o.type === 'crystal' ? -26 : -16;
    ctx.moveTo(cx - 3, cy + top);
    ctx.lineTo(cx + 2, cy + top + 7);
    ctx.lineTo(cx - 1, cy + top + 13);
    if ((o.hits ?? 0) > 1) {
      ctx.moveTo(cx + 6, cy + top + 2);
      ctx.lineTo(cx + 9, cy + top + 10);
    }
    ctx.stroke();
  }

  private drawStatic(o: StaticObj, sx: number, sy: number): void {
    switch (o.type) {
      case 'grass': return this.drawGrass(sx, sy);
      case 'chest': return drawChest(this.ctx, sx, sy, o.hits ?? 0);
      case 'wall': return this.drawWall(sx, sy, o);
      case 'armor': return drawArmor(this.ctx, sx, sy, o.hits ?? 0, this.time);
      case 'barrel': return drawBarrel(this.ctx, sx, sy);
      case 'pot': return drawPot(this.ctx, sx, sy);
      case 'bones': return drawBones(this.ctx, sx, sy);
      case 'bookshelf': return drawBookshelf(this.ctx, sx, sy, shelfFace(this.game.map, o), o.x * 7 + o.y * 13);
      case 'candle': return drawCandle(this.ctx, sx, sy, this.time);
      case 'grave': return drawGrave(this.ctx, sx, sy);
      case 'sign': {
        // 看板(front#274)は、いちばん近いほかのダンジョンへの端を指し、行き先のダンジョンの色の帯を入れる
        const exit = signExit(this.game.maps, this.game.area, o.x, o.y);
        return drawSign(this.ctx, sx, sy, exit?.side ?? null, exit ? SIGN_BANDS[this.game.dungeonOf(exit.to).theme] ?? null : null);
      }
      case 'tree': return this.drawTree(sx, sy);
      case 'rock': return this.drawRock(sx, sy);
      case 'house': return this.drawHouse(o, sx, sy);
      case 'cliff': return this.drawCliff(sx, sy, o);
      case 'fern': return this.drawFern(sx, sy);
      case 'crystal': return this.drawCrystal(sx, sy);
      case 'pillar': return this.drawPillar(sx, sy, o);
      case 'volcano': return this.drawVolcano(sx, sy);
    }
  }

  private drawNotice(x: number, y: number, mark: '!' | '?'): void {
    const ctx = this.ctx;
    ctx.fillStyle = mark === '!' ? '#ffd54a' : '#60a5fa';
    ctx.beginPath();
    ctx.arc(x, y, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = mark === '!' ? '#7a5c00' : '#ffffff';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(mark, x, y + 1);
  }

  private shadow(sx: number, sy: number, rx: number, ry: number, alpha = 0.18): void {
    const ctx = this.ctx;
    ctx.fillStyle = `rgba(0,0,0,${alpha})`;
    ctx.beginPath();
    ctx.ellipse(sx, sy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawTree(cx: number, cy: number): void {
    const ctx = this.ctx;
    const p = this.game.theme.tree;
    const s = p.scale;
    this.shadow(cx, cy, 18 * s, 7 * s);
    ctx.fillStyle = p.trunk;
    ctx.fillRect(cx - 4 * s, cy - 22 * s, 8 * s, 22 * s);
    const blobs: [number, number, number, number][] = [[0, -40, 18, 0], [-11, -30, 13, 1], [11, -30, 13, 1], [-4, -45, 10, 2]];
    for (const [ox, oy, r, c] of blobs) {
      ctx.fillStyle = p.leaves[c];
      ctx.beginPath();
      ctx.arc(cx + ox * s, cy + oy * s, r * s, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawRock(cx: number, cy: number): void {
    const [dark, light] = this.game.theme.rock;
    this.shadow(cx, cy, 15, 6, 0.15);
    this.poly([[cx - 14, cy], [cx - 10, cy - 14], [cx + 2, cy - 18], [cx + 13, cy - 9], [cx + 14, cy]], dark);
    this.poly([[cx - 10, cy - 14], [cx + 2, cy - 18], [cx + 13, cy - 9], [cx, cy - 8]], light);
  }

  private drawCliff(cx: number, cy: number, o: StaticObj): void {
    const h = 36 + ((o.x * 5 + o.y * 3) % 4) * 6;
    const L: Pt = [cx - 30, cy];
    const B: Pt = [cx, cy + 15];
    const R: Pt = [cx + 30, cy];
    this.poly([L, B, [cx, cy + 15 - h], [cx - 26, cy - h + 8]], '#a47148');
    this.poly([B, R, [cx + 26, cy - h + 10], [cx, cy + 15 - h]], '#7d5232');
    this.poly([[cx - 26, cy - h + 8], [cx, cy + 15 - h], [cx + 26, cy - h + 10], [cx + 4, cy - h - 4]], '#c08a5a');
  }

  // 草むら(front#264)。細い葉を束ねて、風で少しゆらす
  private drawGrass(cx: number, cy: number): void {
    const ctx = this.ctx;
    this.shadow(cx, cy, 14, 5, 0.15);
    ctx.lineCap = 'round';
    for (let i = -4; i <= 4; i++) {
      const sway = Math.sin(this.time * 2 + cx * 0.1 + i) * 1.5;
      ctx.strokeStyle = i % 2 ? '#4f9a3c' : '#6cb84f';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(cx + i * 2.6, cy);
      ctx.quadraticCurveTo(cx + i * 3.4, cy - 10, cx + i * 4.2 + sway, cy - 20 + Math.abs(i) * 1.5);
      ctx.stroke();
    }
  }

  // 壁(front#268)。マスいっぱいの石積みのブロックで、色はテーマのタイルの石と同じ。
  // 上の面は少し明るく、手前の2つの面にはレンガの目地を描く(段ごとに縦の目地を半分ずらす)。となりに並べるとひと続きに見える
  private drawWall(cx: number, cy: number, o: StaticObj): void {
    const ctx = this.ctx;
    const { stone, grout } = this.game.theme.tile;
    const h = WALL_HEIGHT;
    const top: Pt[] = [[cx, cy - TH / 2 - h], [cx + TW / 2, cy - h], [cx, cy + TH / 2 - h], [cx - TW / 2, cy - h]];
    this.poly([[cx - TW / 2, cy - h], [cx, cy + TH / 2 - h], [cx, cy + TH / 2], [cx - TW / 2, cy]], shade(stone[(o.x + o.y) % 3], 0.78));
    this.poly([[cx, cy + TH / 2 - h], [cx + TW / 2, cy - h], [cx + TW / 2, cy], [cx, cy + TH / 2]], shade(stone[(o.x + o.y + 1) % 3], 0.62));
    this.poly(top, shade(stone[2], 1.08));
    ctx.save();
    ctx.strokeStyle = grout;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.7;
    const rows = Math.round(h / 10);
    for (const [ax, ay, bx, by] of [[cx - TW / 2, cy, cx, cy + TH / 2], [cx, cy + TH / 2, cx + TW / 2, cy]]) {
      ctx.beginPath();
      for (let r = 1; r < rows; r++) {
        const dz = (h / rows) * r;
        ctx.moveTo(ax, ay - dz);
        ctx.lineTo(bx, by - dz);
      }
      for (let r = 0; r < rows; r++) {
        const z0 = (h / rows) * r;
        const z1 = (h / rows) * (r + 1);
        for (const k of r % 2 ? [0.25, 0.75] : [0.5]) {
          const px = ax + (bx - ax) * k;
          const py = ay + (by - ay) * k;
          ctx.moveTo(px, py - z0);
          ctx.lineTo(px, py - z1);
        }
      }
      ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(...top[3]);
    ctx.lineTo(...top[2]);
    ctx.lineTo(...top[1]);
    ctx.stroke();
  }

  private drawFern(cx: number, cy: number): void {
    const ctx = this.ctx;
    this.shadow(cx, cy, 14, 5, 0.15);
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI + 0.35 + i * 0.4 + Math.sin(this.time * 1.5 + cx) * 0.04;
      ctx.save();
      ctx.translate(cx, cy - 2);
      ctx.rotate(a);
      ctx.fillStyle = i % 2 ? '#5f8f3a' : '#76a84a';
      ctx.beginPath();
      ctx.ellipse(13, 0, 13, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawCrystal(cx: number, cy: number): void {
    const ctx = this.ctx;
    this.shadow(cx, cy, 12, 5, 0.15);
    ctx.save();
    ctx.shadowColor = '#7ef9ff';
    ctx.shadowBlur = 10 + Math.sin(this.time * 2 + cx) * 6;
    this.poly([[cx - 6, cy], [cx - 9, cy - 18], [cx - 2, cy - 30], [cx + 3, cy - 18], [cx + 1, cy]], '#7ef9ff');
    this.poly([[cx + 1, cy], [cx + 3, cy - 18], [cx + 10, cy - 22], [cx + 9, cy - 4]], '#3fd3e6');
    this.poly([[cx - 2, cy - 30], [cx + 3, cy - 18], [cx - 4, cy - 16]], '#d8fdff');
    ctx.restore();
  }

  private drawPillar(cx: number, cy: number, o: StaticObj): void {
    const ctx = this.ctx;
    this.shadow(cx, cy, 16, 7, 0.3);
    this.poly([[cx - 14, cy - 2], [cx, cy + 5], [cx + 14, cy - 2], [cx + 14, cy - 8], [cx - 14, cy - 8]], '#3a3650');
    ctx.fillStyle = '#6b6785';
    ctx.fillRect(cx - 10, cy - 64, 10, 58);
    ctx.fillStyle = '#57536e';
    ctx.fillRect(cx, cy - 64, 10, 58);
    this.poly([[cx - 14, cy - 64], [cx, cy - 70], [cx + 14, cy - 64], [cx, cy - 58]], '#7e7a99');
    if (o.torch) {
      const fy = cy - 76;
      const fl = Math.sin(this.time * 14 + cx) * 2;
      const g = ctx.createRadialGradient(cx, fy, 2, cx, fy, 40);
      g.addColorStop(0, 'rgba(255,170,60,0.45)');
      g.addColorStop(1, 'rgba(255,170,60,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(cx, fy, 40, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ff7a1a';
      ctx.beginPath(); ctx.ellipse(cx, fy, 6, 10 + fl, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffe066';
      ctx.beginPath(); ctx.ellipse(cx, fy + 3, 3, 5 + fl / 2, 0, 0, Math.PI * 2); ctx.fill();
    }
  }

  private drawVolcano(cx: number, cy: number): void {
    const ctx = this.ctx;
    const g = ctx.createLinearGradient(0, cy - 100, 0, cy + 20);
    g.addColorStop(0, '#5b3a29');
    g.addColorStop(1, '#8a5a3c');
    this.poly([[cx - 90, cy + 20], [cx - 18, cy - 96], [cx + 18, cy - 96], [cx + 90, cy + 20]], g);
    this.poly([[cx, cy - 96], [cx + 18, cy - 96], [cx + 90, cy + 20], [cx + 20, cy + 36]], 'rgba(0,0,0,0.15)');
    ctx.fillStyle = '#ff6a1a';
    ctx.beginPath(); ctx.ellipse(cx, cy - 96, 18, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ff7a1a';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy - 92); ctx.quadraticCurveTo(cx - 20, cy - 60, cx - 30, cy - 40);
    ctx.moveTo(cx + 6, cy - 92); ctx.quadraticCurveTo(cx + 14, cy - 70, cx + 22, cy - 56);
    ctx.stroke();
    for (let i = 0; i < 5; i++) {
      const k = (this.time * 0.25 + i / 5) % 1;
      ctx.fillStyle = `rgba(90,80,80,${0.45 * (1 - k)})`;
      ctx.beginPath();
      ctx.arc(cx + Math.sin(k * 5 + i) * 10 + k * 30, cy - 104 - k * 90, 10 + k * 22, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /**
   * 家(front#236)。形(1×1・2×1・2×2・L字)と向きは rpg-house.ts で求め、(cx, cy) は占めるマスのいちばん左上。
   * 屋根は寄棟で、マスごとの部品(壁 → 屋根)を奥のマスから順に描く(L字の谷や棟の重なりが正しくなる)
   */
  private drawHouse(o: StaticObj, cx: number, cy: number): void {
    const key = `${o.shape ?? '1x1'}:${o.rotation ?? 0}`;
    let house = this.houses.get(key);
    if (!house) {
      const geo = houseGeometry(o.shape, o.rotation);
      house = { pieces: housePieces(geo), ridge: geo.ridge, door: geo.door };
      this.houses.set(key, house);
    }
    const wall = 34;
    const top = wall + roofRise(house.ridge, o.lowRoof);
    const roof = o.roof ?? DEFAULT_ROOF;
    const at = ([x, y]: readonly [number, number], z = 0): Pt => {
      const [sx, sy] = iso(x, y);
      return [cx + sx, cy + sy - z];
    };
    // 壁の色と窓の有無(front#250)
    const colors = wallColors(o.wall);
    const ctx = this.ctx;
    for (const piece of house.pieces) {
      for (const w of piece.walls) {
        this.poly([at(w.a), at(w.b), at(w.b, wall), at(w.a, wall)], w.normal[1] === 1 ? colors.front : colors.side);
        // 壁の1マス分に、窓と扉
        for (const op of wallOpenings(w, house.door, colors, o.noWindow)) {
          this.poly([at(op.p1, op.z0), at(op.p2, op.z0), at(op.p2, op.z1), at(op.p1, op.z1)], op.color);
        }
      }
      for (const f of piece.roof) {
        // 左下を向いた面がいちばん明るい
        const k = f.normal[1] === 1 ? 1 : f.normal[0] === 1 ? 0.86 : f.normal[1] === -1 ? 0.78 : 0.82;
        const color = k === 1 ? roof : shade(roof, k);
        this.poly(f.points.map((p) => at([p.x, p.y], wall + p.z * (top - wall))), color);
        // マスごとに切り分けたつなぎ目に、すき間が見えないようにする
        ctx.strokeStyle = color;
        ctx.lineWidth = 0.8;
        ctx.lineJoin = 'round';
        ctx.stroke();
      }
    }
  }

  // プレイヤー・村人(見た目を選べるキャラクター。front#224)
  private drawLook(sx: number, sy: number, look: RpgLook, pose: LookPose): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(sx, sy);
    drawLook(ctx, look, pose);
    ctx.restore();
  }

  private drawPlayer(sx: number, sy: number): void {
    const p = this.game.player;
    const ctx = this.ctx;
    if (p.dead) ctx.globalAlpha = 0.45;
    this.drawLook(sx + p.lunge * 7 * p.dir, sy, p.look, {
      dir: p.dir,
      time: this.time,
      moving: p.moving,
      hurt: p.hurt > 0,
      sword: true,
      swordColor: swordColorOf(p.weapon),
      slash: p.lunge
    });
    ctx.globalAlpha = 1;
  }

  private drawEnemy(e: Enemy, sx: number, sy: number): void {
    const ctx = this.ctx;
    const def = ENEMIES[e.type];
    const game = this.game;
    const targeted = game.player.target === e;
    const ring = ringSizeOf(def);
    if (targeted) {
      ctx.strokeStyle = `rgba(239,68,68,${0.6 + Math.sin(this.time * 6) * 0.3})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(sx, sy, 20 * ring, 8 * ring, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    const elapsed = e.act?.t ?? 0;
    const x = sx + e.lunge * 5 * e.dir + (e.act ? chargeShake(def, elapsed, this.time) : 0);
    const y = sy - (e.act ? jumpHeight(def, elapsed) : 0);
    ctx.save();
    ctx.translate(x, y);
    const top = drawEnemyBody(ctx, def, {
      dir: e.dir, time: this.time, moving: e.moving, flash: e.flash > 0, aggro: e.aggro, lunge: e.lunge, seed: e.seed
    });
    ctx.restore();
    const hovered = game.hover === e;
    const barY = y - top;
    // ふりをしている化ける敵(front#270)は、置物と同じように名前だけを出す
    const disguise = e.aggro ? null : disguiseOf(def);
    if (disguise) {
      if (targeted || hovered) this.label(disguise, sx, barY - 10, targeted ? 'rgba(220,38,38,0.85)' : undefined);
    } else if (targeted || hovered || e.hp < def.hp || def.boss) {
      this.hpBar(sx, barY - 10, e.hp / def.hp);
      if (targeted || hovered || def.boss) this.label(def.name, sx, barY - 22, e.aggro || def.boss ? 'rgba(220,38,38,0.85)' : undefined);
    }
  }

  // 敵の攻撃の演出(炎・水・爪あとなど)。人・敵の上に重ねる(front#229)
  private drawAttacks(): void {
    const game = this.game;
    const p = game.player;
    for (const e of game.enemies) {
      if (!e.alive || !e.act) continue;
      const def = ENEMIES[e.type];
      const { duration, hitAt } = attackTiming(def);
      const [ex, ey] = this.at(e.x, e.y);
      const spell = SPELLS.includes(def.attack);
      const [tx, ty] = spell ? this.at(e.act.tx, e.act.ty) : this.at(p.x, p.y);
      if (!this.onScreen(ex, ey, 300) && !this.onScreen(tx, ty, 200)) continue;
      drawAttackEffect(this.ctx, {
        attack: def.attack, k: Math.min(1, e.act.t / duration), time: this.time, ex, ey, tx, ty, dir: e.dir, s: 1,
        radiusPx: (def.radius + 0.5) * (TW / 2) * 1.4, hitK: hitAt / duration
      });
    }
  }

  private drawFireflies(): void {
    const ctx = this.ctx;
    const { w, h } = this.game.map;
    for (const f of this.fireflies) {
      const [sx, sy] = iso(f.x * w + Math.sin(this.time * 0.5 + f.ph) * 0.6, f.y * h + Math.cos(this.time * 0.4 + f.ph) * 0.6);
      ctx.globalAlpha = 0.45 + Math.sin(this.time * 3 + f.ph) * 0.45;
      ctx.fillStyle = '#e6ffb3';
      ctx.beginPath();
      ctx.arc(sx, sy - 30 - Math.sin(this.time + f.ph) * 12, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // ===== 文字・演出 =====

  private label(text: string, x: number, y: number, bg = 'rgba(17,24,39,0.6)'): void {
    const ctx = this.ctx;
    ctx.font = 'bold 11px "Yu Gothic", Meiryo, sans-serif';
    const w = ctx.measureText(text).width + 12;
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.roundRect(x - w / 2, y - 9, w, 17, 8); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
  }

  private hpBar(x: number, y: number, ratio: number): void {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(17,24,39,0.6)';
    ctx.beginPath(); ctx.roundRect(x - 18, y, 36, 6, 3); ctx.fill();
    ctx.fillStyle = ratio > 0.3 ? '#4ade80' : '#f87171';
    ctx.beginPath(); ctx.roundRect(x - 17, y + 1, 34 * Math.max(0, ratio), 4, 2); ctx.fill();
  }

  private drawEffects(): void {
    const ctx = this.ctx;
    for (const p of this.game.particles) {
      const [sx, sy] = this.at(p.x, p.y);
      ctx.globalAlpha = 1 - p.t / 0.7;
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(sx + p.ox, sy + p.oy, 3, 0, Math.PI * 2); ctx.fill();
    }
    for (const f of this.game.floats) {
      const [sx, sy] = this.at(f.x, f.y);
      ctx.globalAlpha = Math.max(0, 1 - f.t / 1.1);
      ctx.font = `800 ${f.size}px "Segoe UI", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(17,24,39,0.75)';
      const y = sy - 50 + f.oy - f.t * 34;
      ctx.strokeText(f.text, sx, y);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, sx, y);
    }
    ctx.globalAlpha = 1;
  }
}
