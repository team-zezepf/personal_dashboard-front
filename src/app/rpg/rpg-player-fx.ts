import { PLAYER_FX_SEC, PlayerFx } from './rpg-game';

// プレイヤーのまわりのエフェクト(front#335)を描く。(x, y) はプレイヤーの足元の画面上の位置。
// 足元の光の輪・光の柱はプレイヤーの後ろ(back)、光る体・星・「＋」の粒は手前(front)、「LEVEL UP!」の文字はいちばん上(text)に描く

const easeOut = (k: number) => 1 - Math.pow(1 - k, 3);

// seed と番号から決まる 0〜1 の値(描くたびに粒が同じ位置になるように)
function rand(seed: number, i: number, k: number): number {
  const v = Math.sin(seed * 12.9898 + i * 78.233 + k * 37.719) * 43758.5453;
  return v - Math.floor(v);
}

/** 足元に広がる光の輪(床に寝た楕円)。k は 0〜1 */
function ring(ctx: CanvasRenderingContext2D, x: number, y: number, k: number, rgb: string, maxR: number): void {
  if (k <= 0 || k >= 1) return;
  const r = 6 + maxR * easeOut(k);
  ctx.strokeStyle = `rgba(${rgb},${(1 - k) * 0.95})`;
  ctx.lineWidth = 4 * (1 - k) + 1;
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * 0.42, 0, 0, Math.PI * 2);
  ctx.stroke();
}

function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rot: number): void {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = rot + (i * Math.PI) / 4;
    const rr = i % 2 ? r * 0.35 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function plus(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  ctx.fillRect(x - s, y - s * 0.32, s * 2, s * 0.64);
  ctx.fillRect(x - s * 0.32, y - s, s * 0.64, s * 2);
}

/** プレイヤーの後ろ: 足元の光の輪・レベルアップの光の柱 */
export function drawPlayerFxBack(ctx: CanvasRenderingContext2D, list: readonly PlayerFx[], x: number, y: number): void {
  ctx.save();
  for (const f of list) {
    if (f.kind === 'level') {
      ring(ctx, x, y, f.t / 0.7, '255,214,90', 70);
      ring(ctx, x, y, (f.t - 0.18) / 0.7, '255,240,170', 52);
      const pk = f.t / 1.1;
      if (pk < 1) {
        const h = 190 * easeOut(Math.min(1, pk * 2.2));
        const w = 34 * (1 - pk * 0.55);
        const a = pk < 0.15 ? pk / 0.15 : 1 - (pk - 0.15) / 0.85;
        const g = ctx.createLinearGradient(0, y, 0, y - h);
        g.addColorStop(0, `rgba(255,220,100,${0.75 * a})`);
        g.addColorStop(0.6, `rgba(255,236,160,${0.45 * a})`);
        g.addColorStop(1, 'rgba(255,250,220,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(x - w, y);
        ctx.lineTo(x - w * 0.6, y - h);
        ctx.lineTo(x + w * 0.6, y - h);
        ctx.lineTo(x + w, y);
        ctx.ellipse(x, y, w, w * 0.42, 0, 0, Math.PI);
        ctx.fill();
        // 柱の芯
        ctx.fillStyle = `rgba(255,255,240,${0.6 * a})`;
        ctx.fillRect(x - w * 0.18, y - h * 0.95, w * 0.36, h * 0.95);
      }
    } else {
      ring(ctx, x, y, f.t / 0.6, '110,240,150', 46);
      ring(ctx, x, y, (f.t - 0.15) / 0.6, '190,255,210', 32);
    }
  }
  ctx.restore();
}

/** プレイヤーの手前: 体が光る・星のきらめき・「＋」と光の粒 */
export function drawPlayerFxFront(ctx: CanvasRenderingContext2D, list: readonly PlayerFx[], x: number, y: number): void {
  ctx.save();
  for (const f of list) {
    const level = f.kind === 'level';
    // 体が光る(レベルアップは白く一瞬、回復はやわらかい緑)
    const gd = level ? 0.5 : 0.7;
    const gk = f.t / gd;
    if (gk < 1) {
      const a = (gk < 0.2 ? gk / 0.2 : 1 - (gk - 0.2) / 0.8) * (level ? 0.9 : 0.55);
      const rgb = level ? '255,255,230' : '110,240,150';
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(x, y - 32, 2, x, y - 32, 34);
      g.addColorStop(0, `rgba(${rgb},${a})`);
      g.addColorStop(1, `rgba(${rgb},0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(x, y - 32, 22, 34, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    if (level) {
      ctx.lineWidth = 1;
      for (let i = 0; i < 26; i++) {
        const tt = f.t - rand(f.seed, i, 0) * 0.5;
        const q = tt / 1.1;
        if (tt <= 0 || q >= 1) continue;
        const ang = rand(f.seed, i, 1) * Math.PI * 2;
        const r = 8 + rand(f.seed, i, 2) * 26;
        const v = 70 + rand(f.seed, i, 3) * 80;
        const s = 3 + rand(f.seed, i, 4) * 4;
        const rot = rand(f.seed, i, 5) * 6;
        const sx = x + Math.cos(ang) * (r + q * 18);
        const sy = y - 10 - v * tt + Math.sin(ang) * r * 0.4;
        ctx.fillStyle = `rgba(255,${210 + Math.round(40 * Math.sin(rot))},110,${1 - q})`;
        ctx.strokeStyle = `rgba(180,110,0,${(1 - q) * 0.6})`;
        star(ctx, sx, sy, s * (1 - q * 0.4) * (0.8 + 0.3 * Math.sin(tt * 18 + rot)), rot + tt * 4);
      }
    } else {
      const n = f.big ? 22 : 13;
      for (let i = 0; i < n; i++) {
        const tt = f.t - rand(f.seed, i, 0) * 0.45;
        const q = tt / 0.75;
        if (tt <= 0 || q >= 1) continue;
        const v = 45 + rand(f.seed, i, 3) * 40;
        const s = 3 + rand(f.seed, i, 4) * 3;
        const px = x + (rand(f.seed, i, 1) - 0.5) * 40 + Math.sin(tt * 5 + rand(f.seed, i, 5) * 6) * 4;
        const py = y - 16 - rand(f.seed, i, 2) * 40 - v * tt;
        const a = q < 0.2 ? q / 0.2 : 1 - (q - 0.2) / 0.8;
        if (i % 2 === 0) {
          ctx.fillStyle = `rgba(255,255,255,${a})`;
          plus(ctx, px, py, s + 2.6);
          ctx.fillStyle = `rgba(34,197,94,${a})`;
          plus(ctx, px, py, s + 1.2);
        } else {
          const g = ctx.createRadialGradient(px, py, 0, px, py, s * 1.6);
          g.addColorStop(0, `rgba(220,255,230,${a})`);
          g.addColorStop(0.5, `rgba(74,222,128,${a * 0.8})`);
          g.addColorStop(1, 'rgba(120,245,160,0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(px, py, s * 1.6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }
  ctx.restore();
}

/** いちばん上: 「LEVEL UP!」。ぽんと跳ねてから、ふわっと消える */
export function drawPlayerFxText(ctx: CanvasRenderingContext2D, list: readonly PlayerFx[], x: number, y: number): void {
  for (const f of list) {
    if (f.kind !== 'level') continue;
    const tt = f.t;
    const dur = PLAYER_FX_SEC.level;
    const pop = tt < 0.25 ? easeOut(tt / 0.25) * 1.25 : tt < 0.4 ? 1.25 - ((tt - 0.25) / 0.15) * 0.25 : 1;
    const a = tt > dur - 0.5 ? 1 - (tt - (dur - 0.5)) / 0.5 : 1;
    ctx.save();
    ctx.translate(x, y - 96 - Math.min(tt, dur) * 14);
    ctx.scale(pop, pop);
    ctx.globalAlpha = Math.max(0, a);
    ctx.font = '900 30px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#7a4b00';
    ctx.strokeText('LEVEL UP!', 0, 0);
    const g = ctx.createLinearGradient(0, -24, 0, 4);
    g.addColorStop(0, '#fff7c2');
    g.addColorStop(0.5, '#ffd54a');
    g.addColorStop(1, '#f59e0b');
    ctx.fillStyle = g;
    ctx.fillText('LEVEL UP!', 0, 0);
    ctx.restore();
  }
}
