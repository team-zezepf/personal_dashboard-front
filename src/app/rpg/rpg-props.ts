import { TH, TW } from './rpg-data';

/**
 * 置物の絵のうち、ゲーム画面の描画(RpgRenderer)の外からも使うもの(front#270)。
 * 宝箱・甲冑はミミック・リビングアーマー(rpg-enemy.ts)の「ふり」にも使うので、色を変えられるようにしてある。
 * どれも足元(マスのまんなか)を (cx, cy) として描く
 */

type Pt = [number, number];

export function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.min(255, Math.round(v * f));
  return `rgb(${c(n >> 16)}, ${c((n >> 8) & 255)}, ${c(n & 255)})`;
}

export function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (sh: number) => Math.round(((pa >> sh) & 255) * (1 - t) + ((pb >> sh) & 255) * t);
  return `rgb(${ch(16)}, ${ch(8)}, ${ch(0)})`;
}

function poly(c: CanvasRenderingContext2D, pts: Pt[], fill: string): void {
  c.beginPath();
  pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.closePath();
  c.fillStyle = fill;
  c.fill();
}

function shadow(c: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, a: number): void {
  c.fillStyle = `rgba(0,0,0,${a})`;
  c.beginPath();
  c.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  c.fill();
}

// マスの上の点(u は x の向き(右下)、v は y の向き(左下)に 0〜1、z は高さ)
function boxPoint(cx: number, cy: number, u: number, v: number, z: number): Pt {
  return [cx + ((u - v) * TW) / 2, cy - TH / 2 + ((u + v) * TH) / 2 - z];
}

// 0〜1 の決まった乱数(本の並びを毎回同じにする)
function rnd(n: number): number {
  const s = Math.sin(n * 12.9898) * 43758.5453;
  return s - Math.floor(s);
}

// 宝箱(front#266)。y の向きに長い箱で、正面(錠前)は右下の面。ふたはかまぼこ形で、金の帯を巻く。
// wood は箱の正面の色(ほかの面・ふたは、この色を明るく・暗くした色)
export function drawChest(c: CanvasRenderingContext2D, cx: number, cy: number, hits: number, wood = '#a8682f'): void {
  shadow(c, cx, cy + 2, 18, 7, 0.18);
  const [a, b, p, q] = [0.34, 0.66, 0.24, 0.76];
  const H = 11;
  const K = 7;
  const P = (u: number, v: number, z: number) => boxPoint(cx, cy, u, v, z);
  const lidAt = (s: number, v: number) => P(a + (b - a) * s, v, H + Math.sin(Math.PI * s) * K);
  const arch = (v: number, n = 10) => Array.from({ length: n + 1 }, (_, i) => lidAt(i / n, v));
  poly(c, [P(b, p, 0), P(b, q, 0), P(b, q, H), P(b, p, H)], wood);
  poly(c, [P(a, q, 0), P(b, q, 0), P(b, q, H), P(a, q, H)], shade(wood, 0.82));
  // ふたの上の面は細い帯に分け、奥から順に塗る(上・右下を向いた帯ほど明るい)。境目の線が見えないよう同じ色でふちどる
  const front = arch(q);
  const back = arch(p);
  for (let i = 0; i < front.length - 1; i++) {
    const col = shade(wood, 1.167 * (0.75 + 0.25 * Math.sin(Math.PI * (i / (front.length - 1) + 0.15))));
    poly(c, [front[i], front[i + 1], back[i + 1], back[i]], col);
    c.strokeStyle = col;
    c.lineWidth = 0.7;
    c.stroke();
  }
  poly(c, [...front, P(a, q, H)], shade(wood, 0.93));
  // 金の帯。ふたの奥側は見えない裏側に回り込んでいるので、表面が手前を向いているところ
  // (視線の向き (1, 1, 32) との内積が正)だけに描く
  const facing = (s: number) => -K * Math.PI * Math.cos(Math.PI * s) + (b - a) * 32 > 0;
  c.strokeStyle = '#f2c14e';
  c.lineWidth = 2;
  c.lineJoin = 'round';
  for (const v of [p + 0.1, q - 0.1]) {
    const band = Array.from({ length: 41 }, (_, i) => i / 40).filter(facing).map((s) => lidAt(s, v));
    c.beginPath();
    band.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.lineTo(...P(b, v, 0));
    c.stroke();
  }
  const [lx, ly] = P(b, 0.5, H - 1);
  c.fillStyle = '#f2c14e';
  c.beginPath(); c.roundRect(lx - 3, ly - 1, 6, 7, 1.5); c.fill();
  c.fillStyle = '#5b3a12';
  c.beginPath(); c.arc(lx, ly + 2, 1.1, 0, Math.PI * 2); c.fill();
  c.fillRect(lx - 0.5, ly + 2, 1, 2.4);
  c.strokeStyle = 'rgba(60,30,10,0.4)';
  c.lineWidth = 1;
  c.beginPath(); c.moveTo(...P(a, q, H)); c.lineTo(...P(b, q, H)); c.lineTo(...P(b, p, H)); c.stroke();
  if (hits) {
    const [x0, y0] = P(b, 0.36, H - 2);
    c.strokeStyle = 'rgba(40,20,5,0.8)';
    c.beginPath(); c.moveTo(x0, y0); c.lineTo(x0 - 3, y0 + 4); c.lineTo(x0 - 1, y0 + 8); c.stroke();
  }
}

// 甲冑(front#266)。台座の上に立つ鎧で、斜め右正面(画面の右下)を向く: 兜のすき間・胸当ては右に寄り、右手に槍を持つ。
// 鎧は台座より2割小さく描き、プレイヤーと同じくらいの背の高さにする。叩くたびにへこむ。
// mid は鎧のふつうの面の色(明るい面・暗い面は、この色から作る)、plume は羽飾りの色
export function drawArmor(
  c: CanvasRenderingContext2D, cx: number, cy: number, hits: number, time: number, mid = '#94a3b8', plume = '#dc2626'
): void {
  // いつもの色のときは、front#266 で決めた色のまま
  const [steel, dark, deep, hi] =
    mid === '#94a3b8'
      ? ['#cbd5e1', '#64748b', '#475569', '#f1f5f9']
      : [mix(mid, '#ffffff', 0.45), shade(mid, 0.68), shade(mid, 0.48), mix(mid, '#ffffff', 0.85)];
  shadow(c, cx, cy + 2, 16, 6, 0.22);
  poly(c, [[cx - 14, cy], [cx, cy + 7], [cx + 14, cy], [cx, cy - 7]], '#8b8fa3');
  poly(c, [[cx - 14, cy], [cx, cy + 7], [cx, cy + 11], [cx - 14, cy + 4]], '#6b6f82');
  poly(c, [[cx, cy + 7], [cx + 14, cy], [cx + 14, cy + 4], [cx, cy + 11]], '#585c6e');
  const y0 = cy - 2;
  const f = 3;
  c.save();
  c.translate(cx, y0);
  c.scale(0.8, 0.8);
  c.translate(-cx, -y0);
  c.strokeStyle = '#7c5a3a';
  c.lineWidth = 2.2;
  c.lineCap = 'round';
  c.beginPath(); c.moveTo(cx + 13, y0 + 2); c.lineTo(cx + 15, y0 - 58); c.stroke();
  poly(c, [[cx + 15, y0 - 66], [cx + 12, y0 - 57], [cx + 18, y0 - 57]], hi);
  poly(c, [[cx + 15, y0 - 66], [cx + 15, y0 - 57], [cx + 18, y0 - 57]], mid);
  c.fillStyle = dark;
  c.beginPath(); c.roundRect(cx - 7, y0 - 16, 6, 16, 2); c.fill();
  c.fillStyle = mid;
  c.beginPath(); c.roundRect(cx + 1, y0 - 16, 6, 16, 2); c.fill();
  c.fillStyle = deep;
  c.beginPath(); c.ellipse(cx - 4, y0 - 1, 4.5, 2.4, 0, 0, Math.PI * 2); c.ellipse(cx + 5, y0, 4.5, 2.4, 0, 0, Math.PI * 2); c.fill();
  poly(c, [[cx - 9, y0 - 20], [cx + 10, y0 - 20], [cx + 8, y0 - 13], [cx - 8, y0 - 13]], dark);
  c.fillStyle = mid;
  c.beginPath(); c.roundRect(cx - 10, y0 - 38, 20, 19, 6); c.fill();
  c.fillStyle = steel;
  c.beginPath(); c.roundRect(cx - 4 + f, y0 - 37, 12, 17, 5); c.fill();
  c.strokeStyle = hi;
  c.lineWidth = 1.5;
  c.beginPath(); c.moveTo(cx + 2 + f, y0 - 35); c.lineTo(cx + 2 + f, y0 - 23); c.stroke();
  c.fillStyle = dark;
  c.beginPath(); c.ellipse(cx - 10, y0 - 35, 5.5, 4.5, -0.3, 0, Math.PI * 2); c.fill();
  c.fillStyle = steel;
  c.beginPath(); c.ellipse(cx + 11, y0 - 35, 5.5, 4.5, 0.3, 0, Math.PI * 2); c.fill();
  c.fillStyle = dark;
  c.beginPath(); c.roundRect(cx - 13, y0 - 33, 5, 14, 2); c.fill();
  c.fillStyle = mid;
  c.beginPath(); c.roundRect(cx + 10, y0 - 33, 5, 13, 2); c.fill();
  c.fillStyle = deep;
  c.beginPath(); c.arc(cx + 13.5, y0 - 19, 3, 0, Math.PI * 2); c.fill();
  c.fillStyle = mid;
  c.beginPath(); c.arc(cx + 1, y0 - 46, 9.5, 0, Math.PI * 2); c.fill();
  c.fillStyle = steel;
  c.beginPath(); c.arc(cx + 3, y0 - 47, 7.5, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#1e293b';
  c.fillRect(cx - 1 + f, y0 - 48, 9, 2.2);
  c.fillRect(cx + 3 + f, y0 - 48, 1.5, 6);
  c.fillStyle = plume;
  c.beginPath();
  c.moveTo(cx + 1, y0 - 55);
  c.quadraticCurveTo(cx - 6, y0 - 66 + Math.sin(time * 2 + cx) * 1.5, cx - 13, y0 - 55);
  c.quadraticCurveTo(cx - 6, y0 - 59, cx + 1, y0 - 53);
  c.fill();
  if (hits) {
    c.strokeStyle = 'rgba(30,41,59,0.8)';
    c.lineWidth = 1.3;
    c.beginPath();
    c.moveTo(cx + 4, y0 - 33); c.lineTo(cx + 7, y0 - 29); c.lineTo(cx + 5, y0 - 25);
    if (hits > 1) { c.moveTo(cx - 6, y0 - 30); c.lineTo(cx - 3, y0 - 26); }
    c.stroke();
  }
  c.restore();
}

// たる(front#270)。木の板を縦に並べた、ふくらんだ筒。鉄の輪を2本巻き、上はふた
export function drawBarrel(c: CanvasRenderingContext2D, cx: number, cy: number): void {
  shadow(c, cx, cy + 1, 14, 6, 0.18);
  const r = 11;
  const h = 24;
  const ry = 5.5;
  const g = c.createLinearGradient(cx - r, 0, cx + r, 0);
  g.addColorStop(0, '#b77a3e');
  g.addColorStop(0.45, '#9a6230');
  g.addColorStop(1, '#6e4220');
  c.fillStyle = g;
  c.beginPath();
  c.moveTo(cx - r, cy - h);
  c.quadraticCurveTo(cx - r - 3, cy - h / 2, cx - r, cy);
  c.ellipse(cx, cy, r, ry, 0, Math.PI, 0, true);
  c.quadraticCurveTo(cx + r + 3, cy - h / 2, cx + r, cy - h);
  c.closePath();
  c.fill();
  // 板のすき間
  c.strokeStyle = 'rgba(60,30,10,0.35)';
  c.lineWidth = 1;
  for (const k of [-0.6, -0.2, 0.2, 0.6]) {
    const e = ry * Math.sqrt(1 - k * k);
    c.beginPath();
    c.moveTo(cx + k * r, cy - h + e);
    c.quadraticCurveTo(cx + k * (r + 3), cy - h / 2, cx + k * r, cy + e);
    c.stroke();
  }
  // 鉄の輪(手前の半分だけ見える)
  c.strokeStyle = '#4b5563';
  c.lineWidth = 2;
  for (const z of [5, h - 5]) {
    c.beginPath(); c.ellipse(cx, cy - z, r + 2.2, ry, 0, 0, Math.PI); c.stroke();
  }
  // ふた
  c.fillStyle = '#c99158';
  c.beginPath(); c.ellipse(cx, cy - h, r, ry, 0, 0, Math.PI * 2); c.fill();
  c.strokeStyle = '#8a5a2e';
  c.lineWidth = 1;
  c.beginPath(); c.ellipse(cx, cy - h, r - 2.5, ry - 1.3, 0, 0, Math.PI * 2); c.stroke();
  c.beginPath(); c.moveTo(cx - 6, cy - h - 2); c.lineTo(cx + 6, cy - h + 2); c.stroke();
}

// つぼ(front#270)。素焼きで、ふくらんだ胴・くびれた首・開いた口。胴にジグザグの模様
export function drawPot(c: CanvasRenderingContext2D, cx: number, cy: number): void {
  shadow(c, cx, cy + 1, 12, 5, 0.18);
  // 高さごとの半径
  const prof: Pt[] = [[0, 6], [3, 9.5], [9, 11.5], [15, 9], [19, 5], [21, 5.2], [23, 7]];
  const g = c.createLinearGradient(cx - 12, 0, cx + 12, 0);
  g.addColorStop(0, '#e08a52');
  g.addColorStop(0.4, '#c8693a');
  g.addColorStop(1, '#8f4322');
  c.fillStyle = g;
  c.beginPath();
  prof.forEach(([z, r], i) => (i ? c.lineTo(cx - r, cy - z) : c.moveTo(cx - r, cy - z)));
  for (let i = prof.length - 1; i >= 0; i--) c.lineTo(cx + prof[i][1], cy - prof[i][0]);
  c.closePath();
  c.fill();
  // 底の丸み
  c.beginPath(); c.ellipse(cx, cy, 6, 2.6, 0, 0, Math.PI); c.fill();
  c.strokeStyle = '#f6d3a8';
  c.lineWidth = 1.2;
  c.beginPath();
  for (let i = 0; i <= 8; i++) {
    const x = cx - 10 + i * 2.5;
    const y = cy - 10 + (i % 2 ? -2 : 1) + Math.abs(i - 4) * 0.2;
    if (i) c.lineTo(x, y);
    else c.moveTo(x, y);
  }
  c.stroke();
  c.fillStyle = 'rgba(255,240,220,0.35)';
  c.beginPath(); c.ellipse(cx - 5, cy - 11, 2, 4.5, 0.2, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#d27846';
  c.beginPath(); c.ellipse(cx, cy - 23, 7, 2.8, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#3f1d0c';
  c.beginPath(); c.ellipse(cx, cy - 23, 5, 1.8, 0, 0, Math.PI * 2); c.fill();
}

// 骨1本(両はしに丸いふくらみ)
function bone(c: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number): void {
  c.strokeStyle = '#e9e4d4';
  c.lineWidth = 2.6;
  c.lineCap = 'round';
  c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
  const a = Math.atan2(y2 - y1, x2 - x1);
  const nx = -Math.sin(a) * 1.6;
  const ny = Math.cos(a) * 1.6;
  c.fillStyle = '#e9e4d4';
  for (const [x, y] of [[x1, y1], [x2, y2]]) {
    c.beginPath(); c.arc(x + nx, y + ny, 1.9, 0, Math.PI * 2); c.arc(x - nx, y - ny, 1.9, 0, Math.PI * 2); c.fill();
  }
  c.strokeStyle = 'rgba(120,110,90,0.35)';
  c.lineWidth = 0.8;
  c.beginPath(); c.moveTo(x1 + nx * 0.6, y1 + ny * 0.6); c.lineTo(x2 + nx * 0.6, y2 + ny * 0.6); c.stroke();
}

// 骨の山(front#270)。骨を何本か重ね、てっぺんに頭の骨をのせる
export function drawBones(c: CanvasRenderingContext2D, cx: number, cy: number): void {
  shadow(c, cx, cy + 1, 15, 6, 0.18);
  c.fillStyle = '#7c7363';
  c.beginPath(); c.ellipse(cx, cy - 1, 13, 5, 0, 0, Math.PI * 2); c.fill();
  bone(c, cx - 12, cy - 1, cx + 6, cy - 5);
  bone(c, cx - 4, cy + 2, cx + 12, cy - 3);
  bone(c, cx - 10, cy - 7, cx + 2, cy + 1);
  bone(c, cx + 2, cy - 9, cx + 11, cy - 4);
  const hx = cx - 1;
  const hy = cy - 12;
  c.fillStyle = '#efeadb';
  c.beginPath(); c.arc(hx, hy, 6.5, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.roundRect(hx - 3.5, hy + 3, 7, 4.5, 1.5); c.fill();
  c.strokeStyle = 'rgba(0,0,0,0.18)';
  c.lineWidth = 1;
  c.beginPath(); c.arc(hx, hy, 6.5, 0, Math.PI * 2); c.stroke();
  c.fillStyle = '#2a2420';
  c.beginPath(); c.ellipse(hx - 2.6, hy + 0.5, 1.8, 2.1, 0, 0, Math.PI * 2); c.ellipse(hx + 2.6, hy + 0.5, 1.8, 2.1, 0, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.moveTo(hx, hy + 2.5); c.lineTo(hx - 0.8, hy + 4); c.lineTo(hx + 0.8, hy + 4); c.fill();
}

// 本棚(front#270)。背の高い木の棚で、4段に色とりどりの本を並べる。
// face が 'x' なら右下、'y' なら左下を向く(向きは置いた場所から決める: shelfFace)。seed で本の並びを変える
export function drawBookshelf(c: CanvasRenderingContext2D, cx: number, cy: number, face: 'x' | 'y', seed: number): void {
  // 左下を向くときは u と v を入れかえる
  const Q = (u: number, v: number, z: number) => (face === 'x' ? boxPoint(cx, cy, u, v, z) : boxPoint(cx, cy, v, u, z));
  const [a, b, p, q] = [0.22, 0.62, 0.06, 0.94];
  const H = 58;
  shadow(c, cx, cy + 2, 22, 9, 0.2);
  const wood = '#7a4b25';
  // 右下の面は暗く、左下の面は明るい(ほかの置物と同じ光の向き)
  const [frontCol, sideCol] = face === 'x' ? [shade(wood, 0.9), '#5e3a1c'] : [wood, shade('#5e3a1c', 0.85)];
  poly(c, [Q(a, q, 0), Q(b, q, 0), Q(b, q, H), Q(a, q, H)], sideCol);
  poly(c, [Q(b, p, 0), Q(b, q, 0), Q(b, q, H), Q(b, p, H)], frontCol);
  poly(c, [Q(a, p, H), Q(b, p, H), Q(b, q, H), Q(a, q, H)], '#94603a');
  const rows = 4;
  const fr = 3;
  const inner = (H - fr * 2) / rows;
  const colors = ['#b91c1c', '#1d4ed8', '#15803d', '#a16207', '#7e22ce', '#0f766e', '#be123c', '#334155'];
  let n = seed;
  for (let r = 0; r < rows; r++) {
    const z0 = fr + r * inner + 1.5;
    const z1 = z0 + inner - 3;
    const v0 = p + 0.05;
    const v1 = q - 0.05;
    poly(c, [Q(b, v0, z0), Q(b, v1, z0), Q(b, v1, z1), Q(b, v0, z1)], '#2b190c');
    let v = v0 + 0.01;
    while (v < v1 - 0.04) {
      const w = 0.045 + rnd(n++) * 0.04;
      const ht = (z1 - z0) * (0.6 + rnd(n++) * 0.35);
      // ところどころ、本のないすき間を空ける
      if (rnd(n++) < 0.12) {
        v += w;
        continue;
      }
      const col = colors[Math.floor(rnd(n++) * colors.length)];
      const vv = Math.min(v + w, v1 - 0.01);
      poly(c, [Q(b, v, z0), Q(b, vv, z0), Q(b, vv, z0 + ht), Q(b, v, z0 + ht)], face === 'x' ? shade(col, 0.85) : col);
      c.strokeStyle = 'rgba(255,255,255,0.35)';
      c.lineWidth = 0.7;
      c.beginPath(); c.moveTo(...Q(b, (v + vv) / 2, z0 + ht * 0.7)); c.lineTo(...Q(b, (v + vv) / 2, z0 + ht * 0.55)); c.stroke();
      v = vv + 0.004;
    }
    // 棚板
    poly(c, [Q(b, p, z0 - 1.5), Q(b, q, z0 - 1.5), Q(b, q, z0), Q(b, p, z0)], shade(wood, 1.1));
  }
  c.strokeStyle = 'rgba(0,0,0,0.3)';
  c.lineWidth = 1;
  c.beginPath(); c.moveTo(...Q(b, p, H)); c.lineTo(...Q(b, q, H)); c.lineTo(...Q(b, q, 0)); c.stroke();
}

// 燭台(front#270)。3本足の鉄の台に、ろうそくを3本立てる。火はゆれて、まわりを少し明るくする
export function drawCandle(c: CanvasRenderingContext2D, cx: number, cy: number, time: number): void {
  shadow(c, cx, cy + 1, 11, 4.5, 0.22);
  const iron = '#3f3f46';
  c.strokeStyle = iron;
  c.lineWidth = 2;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(cx, cy - 8); c.lineTo(cx - 9, cy + 1);
  c.moveTo(cx, cy - 8); c.lineTo(cx + 9, cy + 1);
  c.moveTo(cx, cy - 8); c.lineTo(cx + 1, cy + 4);
  c.stroke();
  c.lineWidth = 2.6;
  c.beginPath(); c.moveTo(cx, cy - 8); c.lineTo(cx, cy - 44); c.stroke();
  c.strokeStyle = '#71717a';
  c.lineWidth = 1;
  c.beginPath(); c.moveTo(cx - 0.6, cy - 10); c.lineTo(cx - 0.6, cy - 42); c.stroke();
  // 腕(左右に曲がって上がる)
  c.strokeStyle = iron;
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(cx, cy - 38); c.quadraticCurveTo(cx - 12, cy - 38, cx - 12, cy - 46);
  c.moveTo(cx, cy - 38); c.quadraticCurveTo(cx + 12, cy - 38, cx + 12, cy - 46);
  c.stroke();
  const tops: Pt[] = [];
  for (const [x, y, h] of [[cx - 12, cy - 46, 9], [cx, cy - 48, 12], [cx + 12, cy - 46, 8]]) {
    c.fillStyle = iron;
    c.beginPath(); c.ellipse(x, y, 4, 1.6, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#fef3c7';
    c.fillRect(x - 2, y - h, 4, h);
    c.fillStyle = '#fde68a';
    c.fillRect(x + 0.5, y - h, 1.5, h);
    c.fillStyle = '#fffbeb';
    c.beginPath(); c.ellipse(x, y - h, 2, 0.8, 0, 0, Math.PI * 2); c.fill();
    tops.push([x, y - h]);
  }
  const g = c.createRadialGradient(cx, cy - 56, 2, cx, cy - 56, 46);
  g.addColorStop(0, `rgba(255,190,90,${0.35 + Math.sin(time * 9 + cx) * 0.05})`);
  g.addColorStop(1, 'rgba(255,190,90,0)');
  c.fillStyle = g;
  c.beginPath(); c.arc(cx, cy - 56, 46, 0, Math.PI * 2); c.fill();
  tops.forEach(([x, y], i) => {
    const fl = Math.sin(time * 13 + i * 2 + cx) * 0.8;
    c.fillStyle = '#ff8a1f';
    c.beginPath(); c.ellipse(x + fl * 0.4, y - 4, 2.4, 4.2 + fl * 0.5, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#ffe066';
    c.beginPath(); c.ellipse(x + fl * 0.3, y - 3, 1.2, 2.4, 0, 0, Math.PI * 2); c.fill();
  });
}

// 墓石(front#270)。上が丸い石の板で、右下を向き、正面に十字を彫る。足元に土を盛る
export function drawGrave(c: CanvasRenderingContext2D, cx: number, cy: number): void {
  const [a, b, p, q] = [0.36, 0.54, 0.2, 0.8];
  const H = 20;
  const K = 9;
  const Q = (u: number, v: number, z: number) => boxPoint(cx, cy, u, v, z);
  shadow(c, cx, cy + 2, 18, 7, 0.18);
  // 土の盛り上がり(正面の前)と草
  const [mx, my] = Q(0.78, 0.5, 0);
  c.fillStyle = '#6b5440';
  c.beginPath(); c.ellipse(mx, my, 13, 6, -0.46, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#5c8a3a';
  for (let i = 0; i < 5; i++) {
    c.beginPath(); c.ellipse(mx - 9 + i * 4.5, my - 1 + (i % 2) * 2, 2, 1.2, 0, 0, Math.PI * 2); c.fill();
  }
  const archAt = (u: number, s: number) => Q(u, p + (q - p) * s, H + Math.sin(Math.PI * s) * K);
  const arch = (u: number, n = 12) => Array.from({ length: n + 1 }, (_, i) => archAt(u, i / n));
  // 左下の横の面
  poly(c, [Q(a, q, 0), Q(b, q, 0), Q(b, q, H), Q(a, q, H)], '#6b7280');
  // 上の丸い面(細い帯に分けて、奥から塗る)
  const fr = arch(b);
  const bk = arch(a);
  for (let i = 0; i < fr.length - 1; i++) {
    const col = shade('#b4bcc8', 0.8 + 0.2 * Math.sin(Math.PI * (i / (fr.length - 1) + 0.15)));
    poly(c, [fr[i], fr[i + 1], bk[i + 1], bk[i]], col);
    c.strokeStyle = col;
    c.lineWidth = 0.7;
    c.stroke();
  }
  // 正面
  poly(c, [Q(b, p, 0), Q(b, q, 0), ...arch(b).reverse()], '#9ca3af');
  c.strokeStyle = '#5b6370';
  c.lineWidth = 1.8;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(...Q(b, 0.5, 8)); c.lineTo(...Q(b, 0.5, 23));
  c.moveTo(...Q(b, 0.4, 18)); c.lineTo(...Q(b, 0.6, 18));
  c.stroke();
  // 苔
  const [kx, ky] = Q(b, 0.27, 3);
  c.fillStyle = 'rgba(92,138,58,0.7)';
  c.beginPath(); c.ellipse(kx, ky, 3.5, 2, -0.46, 0, Math.PI * 2); c.fill();
}

// 看板(front#274)の板に入れる、行き先のダンジョンの見た目(テーマ)ごとの色
export const SIGN_BANDS: Record<string, string> = { plain: '#4caf50', forest: '#1f6f50', valley: '#e08a2e', tower: '#6d28d9' };

// 看板(front#274)。柱に矢印の形の板が付いていて、矢印は side の端の画面の向き(右下・左上・左下・右上)を指す。
// band は行き先のダンジョンの色の帯(なければ、何も書いていない板)。板は上下対称なので、向きに合わせてそのまま回す
export function drawSign(c: CanvasRenderingContext2D, cx: number, cy: number, side: readonly [number, number] | null, band: string | null): void {
  shadow(c, cx, cy + 1, 10, 4, 0.18);
  c.fillStyle = '#7a4b25';
  c.fillRect(cx - 2, cy - 30, 4, 30);
  c.fillStyle = '#5e3a1c';
  c.fillRect(cx + 0.5, cy - 30, 1.5, 30);
  const [dx, dy] = side ?? [1, 0];
  c.save();
  c.translate(cx, cy - 30);
  c.rotate(Math.atan2((dx + dy) / 2, dx - dy));
  const w = 26;
  const h = 11;
  poly(c, [[-w / 2, -h / 2], [w / 2 - 6, -h / 2], [w / 2 + 2, 0], [w / 2 - 6, h / 2], [-w / 2, h / 2]], '#b07a43');
  c.strokeStyle = '#6b4423';
  c.lineWidth = 1.2;
  c.stroke();
  if (band) {
    c.fillStyle = band;
    c.fillRect(-w / 2 + 3, -2, w - 12, 4);
  } else {
    c.strokeStyle = 'rgba(80,50,20,0.35)';
    c.lineWidth = 0.8;
    c.beginPath();
    c.moveTo(-w / 2 + 3, -1.5); c.lineTo(w / 2 - 8, -1.5);
    c.moveTo(-w / 2 + 3, 2); c.lineTo(w / 2 - 10, 2);
    c.stroke();
  }
  c.restore();
  c.fillStyle = '#94603a';
  c.beginPath(); c.ellipse(cx, cy - 30, 2.4, 1.2, 0, 0, Math.PI * 2); c.fill();
}

// ===== 牢獄の置物(front#321) =====

// 鉄格子の高さ。人の背より少し高く、壁(200)よりずっと低い
export const BARS_HEIGHT = 72;

// 鉄格子(front#321)。マスのまんなかの線に沿って鉄の棒を8本立て、下・まんなか・上に横木を通す。
// along が 'x' なら x の向き(右下へ)、'y' なら y の向き(左下へ)に並ぶ(向きは置いた場所から決める: barsAlong)。
// 棒のすき間から向こうが見えるよう、面は塗らない
export function drawBars(c: CanvasRenderingContext2D, cx: number, cy: number, along: 'x' | 'y'): void {
  const at = (t: number, z: number) => (along === 'x' ? boxPoint(cx, cy, t, 0.5, z) : boxPoint(cx, cy, 0.5, t, z));
  const line = (a: Pt, b: Pt, color: string, width: number) => {
    c.strokeStyle = color;
    c.lineWidth = width;
    c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke();
  };
  // 床の影
  line([at(0, 0)[0], at(0, 0)[1] + 2], [at(1, 0)[0], at(1, 0)[1] + 2], 'rgba(0,0,0,0.3)', 5);
  const rail = (z: number, w: number) => {
    line(at(0, z), at(1, z), '#1f1d2b', w + 1.5);
    const [a, b] = [at(0, z), at(1, z)];
    line([a[0], a[1] - 0.6], [b[0], b[1] - 0.6], '#6b6880', w - 1);
  };
  c.lineCap = 'butt';
  rail(2, 4);
  for (let i = 0; i < 8; i++) {
    const t = 0.0625 + i * 0.125;
    const [x0, y0] = at(t, 0);
    const [x1, y1] = at(t, BARS_HEIGHT - 2);
    line([x0, y0], [x1, y1], '#1f1d2b', 3.4);
    line([x0 - 0.6, y0], [x1 - 0.6, y1], '#8a879c', 1.2);
    // 棒の先のとがり
    poly(c, [[x1 - 2.2, y1], [x1, y1 - 6], [x1 + 2.2, y1]], '#3a374d');
  }
  rail(BARS_HEIGHT * 0.55, 3.5);
  rail(BARS_HEIGHT - 6, 4);
}

// 鎖の輪を、縦・横を交互にして並べる
function chainLinks(c: CanvasRenderingContext2D, pts: Pt[]): void {
  pts.forEach(([x, y], i) => {
    const [rx, ry] = i % 2 ? [2, 3] : [3.6, 1.8];
    for (const [color, w] of [['#1f1d2b', 2.6], ['#9ca3af', 1]] as const) {
      c.strokeStyle = color;
      c.lineWidth = w;
      c.beginPath(); c.ellipse(x, y, rx, ry, 0.4, 0, Math.PI * 2); c.stroke();
    }
  });
}

// 2次ベジエ曲線の上に n 個の点
function curvePoints(a: Pt, ctrl: Pt, b: Pt, n: number): Pt[] {
  return Array.from({ length: n }, (_, i) => {
    const s = i / (n - 1);
    return [(1 - s) ** 2 * a[0] + 2 * (1 - s) * s * ctrl[0] + s * s * b[0], (1 - s) ** 2 * a[1] + 2 * (1 - s) * s * ctrl[1] + s * s * b[1]] as Pt;
  });
}

// 鎖の杭(front#321)。床に打った鉄の杭(上に輪)から、鎖が2本床をはって、半分開いた手かせにつながる
export function drawShackle(c: CanvasRenderingContext2D, cx: number, cy: number): void {
  shadow(c, cx, cy + 2, 16, 6, 0.2);
  chainLinks(c, curvePoints([cx - 2, cy - 10], [cx - 12, cy - 2], [cx - 19, cy + 5], 7));
  chainLinks(c, curvePoints([cx + 2, cy - 10], [cx + 10, cy + 2], [cx + 17, cy + 3], 7));
  for (const [x, y] of [[cx - 22, cy + 7], [cx + 20, cy + 4]]) {
    for (const [color, w] of [['#1f1d2b', 4], ['#6b7280', 2]] as const) {
      c.strokeStyle = color;
      c.lineWidth = w;
      c.beginPath(); c.ellipse(x, y, 6, 3, 0, 0.3, Math.PI * 1.7); c.stroke();
    }
  }
  const g = c.createLinearGradient(cx - 4, 0, cx + 4, 0);
  g.addColorStop(0, '#6b6880');
  g.addColorStop(1, '#25222f');
  c.fillStyle = g;
  c.fillRect(cx - 3.5, cy - 20, 7, 20);
  c.fillStyle = '#3a374d';
  c.beginPath(); c.ellipse(cx, cy, 5.5, 2.5, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#8a879c';
  c.beginPath(); c.ellipse(cx, cy - 20, 4.5, 2, 0, 0, Math.PI * 2); c.fill();
  for (const [color, w] of [['#1f1d2b', 3], ['#9ca3af', 1.2]] as const) {
    c.strokeStyle = color;
    c.lineWidth = w;
    c.beginPath(); c.arc(cx, cy - 25, 5, 0, Math.PI * 2); c.stroke();
  }
}

// 木のおけ(front#321)。下が少しすぼまった木のおけに、鉄のたが2本と取っ手。中は暗い水
export function drawBucket(c: CanvasRenderingContext2D, cx: number, cy: number): void {
  shadow(c, cx, cy + 1, 12, 5, 0.18);
  const [rt, rb, h, ry] = [10, 8, 16, 4.5];
  const g = c.createLinearGradient(cx - rt, 0, cx + rt, 0);
  g.addColorStop(0, '#b47d45');
  g.addColorStop(0.45, '#966131');
  g.addColorStop(1, '#6a4120');
  c.fillStyle = g;
  c.beginPath();
  c.moveTo(cx - rt, cy - h);
  c.lineTo(cx - rb, cy);
  c.ellipse(cx, cy, rb, ry * 0.8, 0, Math.PI, 0, true);
  c.lineTo(cx + rt, cy - h);
  c.closePath();
  c.fill();
  // 板のすき間
  c.strokeStyle = 'rgba(60,30,10,0.35)';
  c.lineWidth = 1;
  for (const k of [-0.5, 0, 0.5]) {
    c.beginPath(); c.moveTo(cx + k * rt, cy - h + ry * 0.8); c.lineTo(cx + k * rb, cy + ry * 0.7); c.stroke();
  }
  // たが(手前の半分だけ見える)
  c.strokeStyle = '#3f3f46';
  c.lineWidth = 1.8;
  for (const [z, r] of [[3, rb + 0.6], [h - 3, rt - 0.2]]) {
    c.beginPath(); c.ellipse(cx, cy - z, r, ry * 0.85, 0, 0, Math.PI); c.stroke();
  }
  c.fillStyle = '#c99158';
  c.beginPath(); c.ellipse(cx, cy - h, rt, ry, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#1e293b';
  c.beginPath(); c.ellipse(cx, cy - h + 0.6, rt - 2, ry - 1.4, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = 'rgba(148,163,184,0.5)';
  c.beginPath(); c.ellipse(cx - 2, cy - h, 3, 1, 0, 0, Math.PI * 2); c.fill();
  c.strokeStyle = '#3f3f46';
  c.lineWidth = 1.6;
  c.beginPath(); c.moveTo(cx - rt, cy - h); c.quadraticCurveTo(cx - 4, cy - h - 13, cx + rt, cy - h); c.stroke();
}
