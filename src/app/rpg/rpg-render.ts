import { AREAS, ENEMIES, G, ITEMS, N, StaticObj, TH, TW } from './rpg-data';
import { Enemy, RpgGame, iso } from './rpg-game';

type Pt = [number, number];

interface ChibiOptions {
  body: string;
  hair: string;
  dir: number;
  moving?: boolean;
  phase?: number;
  hurt?: boolean;
  skin?: string;
  eye?: string;
  glowEyes?: boolean;
  hat?: 'wizard' | 'plume';
  sword?: boolean;
  swordColor?: string;
  staff?: boolean;
  aura?: boolean;
  scale?: number;
  slash?: number;
}

const ARMOR_COLORS: Record<string, string> = {
  star_robe: '#8b5cf6',
  leather: '#a16207',
  chain_mail: '#64748b',
  magic_armor: '#0ea5e9'
};

/**
 * RPGの画面を Canvas 2D に描く。絵は図形だけの仮の絵(あとでドット絵に差し替えられるよう、描き分けは種類ごとの関数にしておく)。
 * 地面 → 置物・人・敵(奥から手前の順) → 数字・演出の順に重ねる。
 */
export class RpgRenderer {
  private game!: RpgGame;
  private readonly fireflies = Array.from({ length: 40 }, () => ({ x: Math.random() * N, y: Math.random() * N, ph: Math.random() * 6 }));
  private readonly stars = Array.from({ length: 90 }, () => ({ x: Math.random(), y: Math.random(), ph: Math.random() * 6, r: Math.random() * 1.4 + 0.4 }));

  constructor(private ctx: CanvasRenderingContext2D) {}

  private get time(): number {
    return this.game.time;
  }

  draw(game: RpgGame, dpr: number): void {
    this.game = game;
    const ctx = this.ctx;
    const w = game.viewW;
    const h = game.viewH;
    const pal = game.area.pal;
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

    ctx.save();
    ctx.translate(game.camX, game.camY);
    this.drawGround();
    this.drawCursorTile();
    this.drawEntities();
    if (pal.fireflies) this.drawFireflies();
    for (const p of game.area.portals) {
      const [sx, sy] = iso(p.x, p.y);
      this.label(`▶ ${AREAS[p.to].name}`, sx, sy - 48, 'rgba(124,58,237,0.88)');
    }
    this.drawEffects();
    ctx.restore();

    if (pal.vignette) {
      const v = ctx.createRadialGradient(w / 2, h / 2 + 20, 120, w / 2, h / 2 + 20, Math.max(w, h) * 0.7);
      v.addColorStop(0, 'rgba(0,0,0,0)');
      v.addColorStop(1, pal.vignette);
      ctx.fillStyle = v;
      ctx.fillRect(0, 0, w, h);
    }
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

  private drawGround(): void {
    const ctx = this.ctx;
    const { map, area } = this.game;
    const pal = area.pal;
    for (let s = 0; s < N * 2 - 1; s++) {
      for (let x = 0; x < N; x++) {
        const y = s - x;
        if (y < 0 || y >= N) continue;
        const g = map.ground[y][x];
        if (g === G.VOID) continue;
        const [cx, cy] = iso(x, y);
        // 島のふち(手前の側面)
        if (map.isVoid(x, y + 1)) this.poly([[cx - TW / 2, cy], [cx, cy + TH / 2], [cx, cy + TH / 2 + 22], [cx - TW / 2, cy + 22]], pal.edge[0]);
        if (map.isVoid(x + 1, y)) this.poly([[cx, cy + TH / 2], [cx + TW / 2, cy], [cx + TW / 2, cy + 22], [cx, cy + TH / 2 + 22]], pal.edge[1]);

        let color: string;
        if (g === G.WATER || g === G.BRIDGE) color = pal.liquid(x, y, this.time);
        else if (g === G.PATH) color = pal.path[(x + y) % 2];
        else if (g === G.SAND) color = pal.sand;
        else color = pal.grass[(x * 7 + y * 13) % 3];
        this.diamond(cx, cy);
        ctx.fillStyle = color;
        ctx.fill();
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
    }
    if (area.decal) this.drawMagicCircle(...iso(...area.decal));
    for (const p of area.portals) this.drawPortal(...iso(p.x, p.y));
  }

  private drawFlower(cx: number, cy: number, x: number, y: number): void {
    const ctx = this.ctx;
    const pal = this.game.area.pal;
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

  private drawPortal(cx: number, cy: number): void {
    const ctx = this.ctx;
    const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, 32);
    g.addColorStop(0, 'rgba(216,180,254,0.95)');
    g.addColorStop(1, 'rgba(216,180,254,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 32, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 3; i++) {
      const k = (this.time * 0.7 + i / 3) % 1;
      ctx.strokeStyle = `rgba(255,255,255,${(1 - k) * 0.85})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy - k * 30, 22 * (1 - k * 0.4), 10 * (1 - k * 0.4), 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  private drawMagicCircle(cx: number, cy: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, 0.5);
    ctx.strokeStyle = `rgba(167,139,250,${0.55 + Math.sin(this.time * 2) * 0.2})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(0, 0, 70, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 56, 0, Math.PI * 2); ctx.stroke();
    ctx.rotate(this.time * 0.3);
    ctx.beginPath();
    for (let i = 0; i <= 5; i++) {
      const a = (i * Math.PI * 4) / 5 - Math.PI / 2;
      if (i) ctx.lineTo(Math.cos(a) * 56, Math.sin(a) * 56);
      else ctx.moveTo(Math.cos(a) * 56, Math.sin(a) * 56);
    }
    ctx.stroke();
    ctx.restore();
  }

  // マウスの下の通れるマスを明るくし、クリックした場所に印を出す
  private drawCursorTile(): void {
    const ctx = this.ctx;
    const game = this.game;
    if (game.mouse && !game.hover && !game.locked) {
      const [tx, ty] = game.screenToTile(game.mouse.x, game.mouse.y);
      if (game.map.walkable(tx, ty)) {
        const [cx, cy] = iso(tx, ty);
        this.diamond(cx, cy);
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fill();
      }
    }
    if (game.clickMarker) {
      const [cx, cy] = iso(game.clickMarker.x, game.clickMarker.y);
      this.diamond(cx, cy, 1 - game.clickMarker.t);
      ctx.strokeStyle = `rgba(255,255,255,${1 - game.clickMarker.t / 0.6})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  // ===== 置物・人・敵 =====

  private drawEntities(): void {
    const game = this.game;
    type Drawable = StaticObj | (typeof game.npcs)[number] | Enemy | typeof game.player;
    const list: Drawable[] = [...game.map.statics, ...game.npcs, ...game.enemies.filter((e) => e.alive), game.player];
    // 奥(x + y が小さい)から順に描く。同じ奥行きなら置物を先に
    list.sort((a, b) => a.x + a.y - (b.x + b.y) || (a.kind === 'static' ? -1 : 1));
    for (const o of list) {
      const [sx, sy] = iso(o.x, o.y);
      if (o.kind === 'static') this.drawStatic(o, sx, sy);
      else if (o.kind === 'npc') {
        this.drawChibi(sx, sy, { body: o.body, hair: o.hair, dir: o.dir, phase: o.x });
        this.label(o.name, sx, sy - 56, game.hover === o ? 'rgba(96,118,224,0.95)' : undefined);
        if (o.notice) this.drawNotice(sx, sy - 78 + Math.sin(this.time * 4) * 3);
      } else if (o.kind === 'enemy') this.drawEnemy(o, sx, sy);
      else this.drawPlayer(sx, sy);
    }
  }

  private drawStatic(o: StaticObj, sx: number, sy: number): void {
    switch (o.type) {
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

  private drawNotice(x: number, y: number): void {
    const ctx = this.ctx;
    ctx.fillStyle = '#ffd54a';
    ctx.beginPath();
    ctx.arc(x, y, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7a5c00';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('!', x, y + 1);
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
    const p = this.game.area.tree;
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
    const [dark, light] = this.game.area.rock;
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

  private drawHouse(o: StaticObj, cx: number, cy: number): void {
    const h = 34;
    const s = 0.82;
    const L: Pt = [cx - (TW / 2) * s, cy];
    const R: Pt = [cx + (TW / 2) * s, cy];
    const B: Pt = [cx, cy + (TH / 2) * s];
    const T: Pt = [cx, cy - (TH / 2) * s];
    const up = ([x, y]: Pt, d: number): Pt => [x, y - d];
    this.poly([L, B, up(B, h), up(L, h)], '#f4e4c9');
    this.poly([B, R, up(R, h), up(B, h)], '#e3cda8');
    this.poly([[cx - 22, cy - 8], [cx - 12, cy - 3], [cx - 12, cy - 15], [cx - 22, cy - 20]], '#7cc3ee');
    this.poly([[cx + 8, cy + 9], [cx + 17, cy + 4.5], [cx + 17, cy - 13], [cx + 8, cy - 8.5]], '#9b6a3e');
    const e = 1.18;
    const apex: Pt = [cx, cy - h - 34];
    const eave = ([x, y]: Pt): Pt => [cx + (x - cx) * e, cy - h + (y - cy) * e];
    const roof = o.roof ?? '#e0605a';
    const roofDark = o.roofDark ?? '#c24a45';
    this.poly([eave(T), eave(L), apex], roofDark);
    this.poly([eave(T), eave(R), apex], roofDark);
    this.poly([eave(L), eave(B), apex], roof);
    this.poly([eave(B), eave(R), apex], roofDark);
  }

  // 二頭身のキャラクター(プレイヤー・村人・ダークナイト・闇の魔導士)
  private drawChibi(sx: number, sy: number, o: ChibiOptions): void {
    const ctx = this.ctx;
    const sc = o.scale ?? 1;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.scale(sc, sc);
    const bob = o.moving ? -Math.abs(Math.sin(this.time * 10)) * 3 : Math.sin(this.time * 2 + (o.phase ?? 0)) * 0.8;
    if (o.aura) {
      const g = ctx.createRadialGradient(0, 0, 4, 0, 0, 30);
      g.addColorStop(0, `rgba(167,139,250,${0.6 + Math.sin(this.time * 3) * 0.2})`);
      g.addColorStop(1, 'rgba(167,139,250,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(0, 0, 30, 13, 0, 0, Math.PI * 2); ctx.fill();
    }
    this.shadow(0, 0, 13, 5);
    const step = o.moving ? Math.sin(this.time * 14) * 2.5 : 0;
    ctx.fillStyle = '#5b4636';
    ctx.beginPath(); ctx.ellipse(-4, -2 - Math.max(0, step), 3.5, 2.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(4, -2 - Math.max(0, -step), 3.5, 2.5, 0, 0, Math.PI * 2); ctx.fill();
    const y0 = bob;
    const f = o.dir * 2.5;

    if (o.sword) {
      const hx = o.dir * 10;
      const hy = y0 - 12;
      ctx.strokeStyle = o.swordColor ?? '#cbd5e1';
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + o.dir * 9, hy - 16); ctx.stroke();
      ctx.strokeStyle = '#6b4a2b';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(hx - 3, hy + 1); ctx.lineTo(hx + 4 * o.dir, hy - 1); ctx.stroke();
    }
    if (o.staff) {
      ctx.strokeStyle = '#3b2414';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(o.dir * 11, y0 - 4); ctx.lineTo(o.dir * 13, y0 - 46); ctx.stroke();
      ctx.save();
      ctx.shadowColor = '#e879f9';
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#e879f9';
      ctx.beginPath(); ctx.arc(o.dir * 13, y0 - 49, 4.5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = o.hurt ? '#ff9b9b' : o.body;
    ctx.beginPath(); ctx.roundRect(-9, y0 - 20, 18, 16, 6); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = o.skin ?? '#ffe0bd';
    ctx.beginPath(); ctx.arc(0, y0 - 31, 12, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = o.hair;
    ctx.beginPath();
    ctx.arc(0, y0 - 32, 13, Math.PI, 0);
    ctx.lineTo(13, y0 - 29);
    ctx.quadraticCurveTo(f * 2, y0 - 36, -13, y0 - 29);
    ctx.closePath();
    ctx.fill();
    if (o.hat === 'wizard') {
      this.poly([[-15, y0 - 38], [15, y0 - 38], [o.dir * 8, y0 - 66]], '#2e1065');
      ctx.fillStyle = '#4c1d95';
      ctx.beginPath(); ctx.ellipse(0, y0 - 38, 17, 4, 0, 0, Math.PI * 2); ctx.fill();
    } else if (o.hat === 'plume') {
      ctx.fillStyle = '#dc2626';
      ctx.beginPath(); ctx.ellipse(-o.dir * 2, y0 - 48, 3.5, 8, -o.dir * 0.3, 0, Math.PI * 2); ctx.fill();
    }
    if (o.glowEyes) {
      ctx.save();
      ctx.shadowColor = o.eye ?? '#fff';
      ctx.shadowBlur = 8;
    }
    ctx.fillStyle = o.eye ?? '#3b2f2f';
    ctx.beginPath(); ctx.ellipse(-4 + f, y0 - 27, 1.8, 2.6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(4 + f, y0 - 27, 1.8, 2.6, 0, 0, Math.PI * 2); ctx.fill();
    if (o.glowEyes) {
      ctx.restore();
    } else {
      ctx.fillStyle = 'rgba(255,120,120,0.35)';
      ctx.beginPath(); ctx.arc(-7 + f, y0 - 23, 2.3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(7 + f, y0 - 23, 2.3, 0, Math.PI * 2); ctx.fill();
    }
    if (o.slash && o.slash > 0) {
      ctx.strokeStyle = `rgba(255,255,255,${o.slash})`;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(o.dir * 14, y0 - 16, 15, -1.2, 1.2); ctx.stroke();
    }
    ctx.restore();
  }

  private drawPlayer(sx: number, sy: number): void {
    const p = this.game.player;
    const ctx = this.ctx;
    if (p.dead) ctx.globalAlpha = 0.45;
    const weapon = ITEMS[p.weapon];
    const swordColor =
      p.weapon === 'star_sword' ? '#fde047' : p.weapon === 'mithril_sword' ? '#a5f3fc' : (weapon?.atk ?? 0) >= 6 ? '#cbd5e1' : '#c08a52';
    this.drawChibi(sx + p.lunge * 7 * p.dir, sy, {
      body: ARMOR_COLORS[p.armor] ?? '#3b82f6',
      hair: '#6b3f1f',
      dir: p.dir,
      moving: p.moving,
      hurt: p.hurt > 0,
      sword: true,
      swordColor,
      slash: p.lunge
    });
    ctx.globalAlpha = 1;
  }

  private drawEnemy(e: Enemy, sx: number, sy: number): void {
    const ctx = this.ctx;
    const def = ENEMIES[e.type];
    const game = this.game;
    const targeted = game.player.target === e;
    if (targeted) {
      ctx.strokeStyle = `rgba(239,68,68,${0.6 + Math.sin(this.time * 6) * 0.3})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(sx, sy, 20 * def.size, 8 * def.size, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    const x = sx + e.lunge * 5 * e.dir;
    let top: number;
    switch (def.draw) {
      case 'slime': top = this.drawSlime(e, x, sy); break;
      case 'mushroom': top = this.drawMushroom(e, x, sy); break;
      case 'wisp': top = this.drawWisp(e, x, sy); break;
      case 'raptor': top = this.drawRaptor(e, x, sy); break;
      case 'golem': top = this.drawGolem(e, x, sy); break;
      case 'ghost': top = this.drawGhost(e, x, sy); break;
      case 'knight':
        this.drawChibi(x, sy, { body: '#475569', hair: '#334155', skin: '#1f2937', eye: '#f87171', glowEyes: true, hat: 'plume',
          sword: true, swordColor: '#94a3b8', dir: e.dir, moving: e.moving, hurt: e.flash > 0, scale: def.size, slash: e.lunge });
        top = 62;
        break;
      case 'lord':
        this.drawChibi(x, sy, { body: '#6d28d9', hair: '#1e1b4b', skin: '#ddd6fe', eye: '#e11d48', glowEyes: true, hat: 'wizard',
          staff: true, aura: true, dir: e.dir, moving: e.moving, hurt: e.flash > 0, scale: def.size });
        top = 96;
        break;
    }
    const hovered = game.hover === e;
    if (targeted || hovered || e.hp < def.hp || def.boss) {
      this.hpBar(sx, sy - top - 10, e.hp / def.hp);
      if (targeted || hovered || def.boss) this.label(def.name, sx, sy - top - 22, e.aggro || def.boss ? 'rgba(220,38,38,0.85)' : undefined);
    }
  }

  private angryBrows(x: number, ey: number, s: number): void {
    const ctx = this.ctx;
    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(x - 8 * s, ey - 6 * s); ctx.lineTo(x - 3 * s, ey - 4 * s);
    ctx.moveTo(x + 8 * s, ey - 6 * s); ctx.lineTo(x + 3 * s, ey - 4 * s);
    ctx.stroke();
  }

  private eyes(x: number, y: number, gap: number, rx: number, ry: number, color = '#1f2937'): void {
    const ctx = this.ctx;
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.ellipse(x - gap, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + gap, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
  }

  private drawSlime(e: Enemy, sx: number, sy: number): number {
    const ctx = this.ctx;
    const def = ENEMIES[e.type];
    const s = def.size;
    const sq = Math.sin(this.time * 5 + e.seed) * 0.07 + (e.moving ? Math.sin(this.time * 12) * 0.06 : 0);
    this.shadow(sx, sy, 14 * s, 5 * s);
    const rx = 15 * s * (1 + sq);
    const hgt = 20 * s * (1 - sq);
    const grd = ctx.createRadialGradient(sx - 4 * s, sy - hgt * 0.7, 2, sx, sy - hgt / 2, rx * 1.3);
    grd.addColorStop(0, '#ffffff');
    grd.addColorStop(0.25, def.color);
    grd.addColorStop(1, def.dark);
    ctx.fillStyle = e.flash > 0 ? '#ffffff' : grd;
    ctx.beginPath();
    ctx.moveTo(sx - rx, sy);
    ctx.bezierCurveTo(sx - rx, sy - hgt / 0.75, sx + rx, sy - hgt / 0.75, sx + rx, sy);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();
    const ey = sy - hgt * 0.5;
    const f = e.dir * 2.5;
    this.eyes(sx + f, ey, 5 * s, 2 * s, 3 * s);
    if (e.aggro) this.angryBrows(sx + f, ey, s);
    return hgt + 4;
  }

  private drawMushroom(e: Enemy, sx: number, sy: number): number {
    const ctx = this.ctx;
    const def = ENEMIES[e.type];
    const hop = e.moving ? -Math.abs(Math.sin(this.time * 9)) * 5 : 0;
    const y = sy + hop;
    const f = e.dir * 2;
    this.shadow(sx, sy, 13, 5);
    ctx.fillStyle = e.flash > 0 ? '#fff' : '#fff3e0';
    ctx.beginPath(); ctx.roundRect(sx - 8, y - 18, 16, 17, 6); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();
    this.eyes(sx + f, y - 10, 3.5, 1.6, 2.4);
    ctx.fillStyle = e.flash > 0 ? '#fff' : def.color;
    ctx.beginPath();
    ctx.moveTo(sx - 18, y - 15);
    ctx.bezierCurveTo(sx - 18, y - 40, sx + 18, y - 40, sx + 18, y - 15);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = def.dark;
    ctx.stroke();
    ctx.fillStyle = '#fff';
    for (const [dx, dy, r] of [[-8, -24, 3.2], [6, -28, 3.6], [1, -19, 2.2], [11, -19, 2]]) {
      ctx.beginPath(); ctx.arc(sx + dx, y + dy, r, 0, Math.PI * 2); ctx.fill();
    }
    if (e.aggro) this.angryBrows(sx + f, y - 10, 0.8);
    return 36 - hop;
  }

  private drawWisp(e: Enemy, sx: number, sy: number): number {
    const ctx = this.ctx;
    const def = ENEMIES[e.type];
    const fl = Math.sin(this.time * 3 + e.seed) * 4;
    const cy = sy - 28 + fl;
    this.shadow(sx, sy, 9, 3.5);
    for (let i = 1; i <= 3; i++) {
      ctx.fillStyle = `rgba(126,249,255,${0.35 - i * 0.08})`;
      ctx.beginPath();
      ctx.arc(sx - e.dir * i * 7, cy + i * 3 + Math.sin(this.time * 6 + i) * 2, 6 - i, 0, Math.PI * 2);
      ctx.fill();
    }
    const g = ctx.createRadialGradient(sx, cy, 2, sx, cy, 22);
    g.addColorStop(0, 'rgba(255,255,255,0.9)');
    g.addColorStop(0.35, e.flash > 0 ? '#fff' : def.color);
    g.addColorStop(1, 'rgba(126,249,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(sx, cy, 22, 0, Math.PI * 2); ctx.fill();
    this.eyes(sx + e.dir * 2, cy - 1, 3.5, 1.6, 2.4, '#0f3f46');
    return 46 - fl;
  }

  private drawRaptor(e: Enemy, sx: number, sy: number): number {
    const ctx = this.ctx;
    const def = ENEMIES[e.type];
    const d = e.dir;
    const y = sy + (e.moving ? -Math.abs(Math.sin(this.time * 12)) * 3 : 0);
    const step = e.moving ? Math.sin(this.time * 14) * 4 : 0;
    this.shadow(sx, sy, 20, 6);
    const c = e.flash > 0 ? '#fff' : def.color;
    const dk = e.flash > 0 ? '#fff' : def.dark;
    ctx.strokeStyle = dk;
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(sx - 3, y - 12); ctx.lineTo(sx - 5 + step, sy - 1);
    ctx.moveTo(sx + 4, y - 12); ctx.lineTo(sx + 5 - step, sy - 1);
    ctx.stroke();
    this.poly([[sx - d * 8, y - 22], [sx - d * 32, y - 26], [sx - d * 8, y - 13]], dk);
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.ellipse(sx, y - 18, 15, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#efe7c0';
    ctx.beginPath(); ctx.ellipse(sx + d * 3, y - 14, 9, 4.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = dk;
    ctx.lineWidth = 2;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath(); ctx.moveTo(sx + i * 5, y - 26); ctx.lineTo(sx + i * 5 - d * 2, y - 21); ctx.stroke();
    }
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.ellipse(sx + d * 12, y - 26, 5, 8, d * 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(sx + d * 18, y - 33, 10, 6, 0, 0, Math.PI * 2); ctx.fill();
    this.poly([[sx + d * 18, y - 30], [sx + d * 28, y - 30], [sx + d * 18, y - 27]], '#fff');
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(sx + d * 19, y - 36, 2.6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = e.aggro ? '#dc2626' : '#1f2937';
    ctx.beginPath(); ctx.arc(sx + d * 20, y - 36, 1.4, 0, Math.PI * 2); ctx.fill();
    return 42;
  }

  private drawGolem(e: Enemy, sx: number, sy: number): number {
    const ctx = this.ctx;
    const def = ENEMIES[e.type];
    const bob = e.moving ? Math.abs(Math.sin(this.time * 6)) * -2 : 0;
    this.shadow(sx, sy, 24, 9, 0.2);
    const c = e.flash > 0 ? '#ffffff' : def.color;
    const d = e.flash > 0 ? '#ffffff' : def.dark;
    ctx.fillStyle = d;
    ctx.beginPath(); ctx.roundRect(sx - 15, sy - 14, 11, 14, 4); ctx.fill();
    ctx.beginPath(); ctx.roundRect(sx + 4, sy - 14, 11, 14, 4); ctx.fill();
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.roundRect(sx - 20, sy - 42 + bob, 40, 32, 10); ctx.fill();
    ctx.fillStyle = d;
    ctx.beginPath(); ctx.roundRect(sx - 30, sy - 38 + bob, 11, 22, 5); ctx.fill();
    ctx.beginPath(); ctx.roundRect(sx + 19, sy - 38 + bob, 11, 22, 5); ctx.fill();
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.roundRect(sx - 12, sy - 58 + bob, 24, 18, 6); ctx.fill();
    ctx.fillStyle = e.aggro ? '#ff7a2f' : '#ffd54a';
    ctx.fillRect(sx - 7 + e.dir * 2, sy - 52 + bob, 4, 4);
    ctx.fillRect(sx + 3 + e.dir * 2, sy - 52 + bob, 4, 4);
    return 60;
  }

  private drawGhost(e: Enemy, sx: number, sy: number): number {
    const ctx = this.ctx;
    const def = ENEMIES[e.type];
    const fl = Math.sin(this.time * 2.5 + e.seed) * 4;
    const y = sy - 8 + fl;
    this.shadow(sx, sy, 12, 4, 0.12);
    ctx.globalAlpha = 0.88;
    const g = ctx.createLinearGradient(0, y - 40, 0, y);
    g.addColorStop(0, e.flash > 0 ? '#fff' : def.color);
    g.addColorStop(1, def.dark);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(sx, y - 26, 14, Math.PI, 0);
    ctx.lineTo(sx + 14, y - 4);
    for (let i = 0; i < 4; i++) {
      const x0 = sx + 14 - i * 7;
      const w = Math.sin(this.time * 6 + i) * 2;
      ctx.quadraticCurveTo(x0 - 3.5, y + 4 + w, x0 - 7, y - 4);
    }
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    this.eyes(sx + e.dir * 2, y - 26, 5, 2.4, 3.6, '#1e1b4b');
    ctx.beginPath(); ctx.ellipse(sx + e.dir * 2, y - 17, 2.5, 3, 0, 0, Math.PI * 2); ctx.fill();
    return 48 - fl;
  }

  private drawFireflies(): void {
    const ctx = this.ctx;
    for (const f of this.fireflies) {
      const [sx, sy] = iso(f.x + Math.sin(this.time * 0.5 + f.ph) * 0.6, f.y + Math.cos(this.time * 0.4 + f.ph) * 0.6);
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
      const [sx, sy] = iso(p.x, p.y);
      ctx.globalAlpha = 1 - p.t / 0.7;
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(sx + p.ox, sy + p.oy, 3, 0, Math.PI * 2); ctx.fill();
    }
    for (const f of this.game.floats) {
      const [sx, sy] = iso(f.x, f.y);
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
