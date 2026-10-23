import { RpgLook } from '../models/rpg.models';

/**
 * キャラクター(プレイヤー・村人)の見た目(front#224)。部品の一覧と、二頭身の描き方を持つ。
 * ゲーム画面・マップ作成画面・見た目を選ぶ欄で同じ絵になるよう、描く関数はここにまとめる。
 * 部品の名前はAPI(RpgLooks)と合わせる。
 */

export const HAIRS: [string, string][] = [
  ['short', 'ショート'], ['long', 'ロング'], ['ponytail', 'ポニーテール'], ['twintail', 'ツインテール'],
  ['bob', 'ボブ'], ['spiky', 'ツンツン'], ['bald', 'ぼうず']
];
export const EYES: [string, string][] = [
  ['normal', 'ふつう'], ['smile', 'にっこり'], ['sharp', 'つり目'], ['droopy', 'たれ目'],
  ['sleepy', 'ねむそう'], ['sparkle', 'キラキラ'], ['glasses', 'メガネ']
];
export const MOUTHS: [string, string][] = [['none', 'なし'], ['smile', 'にっこり'], ['open', 'ひらく'], ['flat', 'まっすぐ'], ['cat', 'ねこ口']];
export const CLOTHES: [string, string][] = [['shirt', 'シャツ'], ['robe', 'ローブ'], ['armor', 'よろい'], ['dress', 'ワンピース'], ['vest', 'ベスト']];

export const HAIR_COLORS = ['#6b3f1f', '#8b5a2b', '#1f2937', '#e5e7eb', '#fcd34d', '#f08a4b', '#dc2626', '#f472b6', '#4b9e5f', '#10b981', '#a7f3d0', '#60a5fa'];
export const SKINS = ['#fce6d4', '#ffe0bd', '#f5c99b', '#d9a066', '#8d5a3b'];
export const EYE_COLORS = ['#3b2f2f', '#1f2937', '#2563eb', '#0891b2', '#16a34a', '#d97706', '#dc2626', '#9333ea'];
export const CLOTHES_COLORS = ['#3b82f6', '#4b9e5f', '#f08a4b', '#8b5cf6', '#10b981', '#ef4444', '#64748b', '#f9a8d4', '#1f2937', '#f8fafc', '#8b5a2b', '#facc15'];
export const ACCENT_COLORS = ['#f8fafc', '#fbbf24', '#f08a4b', '#1f2937', '#ef4444', '#3b82f6', '#4b9e5f', '#8b5a2b', '#f9a8d4', '#a78bfa'];

// プレイヤーの最初の見た目(APIの RpgLook の初期値と同じ)
export const DEFAULT_LOOK: RpgLook = {
  hair: 'short', hairColor: '#6b3f1f', skin: '#ffe0bd', eyes: 'normal', eyeColor: '#3b2f2f',
  mouth: 'smile', clothes: 'shirt', clothesColor: '#3b82f6', accentColor: '#f8fafc'
};

/** 差し色は服の色と同じにならないようにする(白い服なら茶色) */
export function accentFor(clothesColor: string): string {
  return clothesColor.toLowerCase() === '#f8fafc' ? '#8b5a2b' : '#f8fafc';
}

/** 髪の色・服の色だけから見た目を作る(新しい村人など)。それ以外は最初の見た目 */
export function lookFromColors(hair: string, body: string): RpgLook {
  return { ...DEFAULT_LOOK, hairColor: hair, clothesColor: body, accentColor: accentFor(body) };
}

/** おまかせ(見た目を選ぶ欄の「おまかせ」) */
export function randomLook(rand: () => number = Math.random): RpgLook {
  const pick = <T>(list: T[]) => list[Math.floor(rand() * list.length)];
  const clothesColor = pick(CLOTHES_COLORS);
  let accentColor = pick(ACCENT_COLORS);
  if (accentColor === clothesColor) accentColor = accentFor(clothesColor);
  return {
    hair: pick(HAIRS)[0], hairColor: pick(HAIR_COLORS), skin: pick(SKINS), eyes: pick(EYES)[0], eyeColor: pick(EYE_COLORS),
    mouth: pick(MOUTHS)[0], clothes: pick(CLOTHES)[0], clothesColor, accentColor
  };
}

// #rrggbb を [r, g, b] にする
function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
}

// #rrggbb の色を暗くする(陰・眉毛)
function shade(hex: string, factor: number): string {
  const [r, g, b] = rgb(hex);
  return `rgb(${Math.round(r * factor)}, ${Math.round(g * factor)}, ${Math.round(b * factor)})`;
}

// #rrggbb の色を白に近づける(瞳の下の明るいところ)
function lighten(hex: string, k: number): string {
  const [r, g, b] = rgb(hex);
  const m = (v: number) => Math.round(v + (255 - v) * k);
  return `rgb(${m(r)}, ${m(g)}, ${m(b)})`;
}

export interface LookPose {
  // 向き(1: 右、-1: 左)
  dir: number;
  // 経過時間(秒)。歩く・揺れる動きに使う
  time: number;
  moving?: boolean;
  // 揺れ方をずらす(村人ごとに少しずつ違う動きにする)
  phase?: number;
  // ダメージを受けたとき、服を赤くする
  hurt?: boolean;
  // 剣を持つ(プレイヤー)
  sword?: boolean;
  swordColor?: string;
  // 攻撃したときの斬撃(0〜1)
  slash?: number;
}

// 陰影をかける範囲 [左, 上, 右, 下]
type Box = [number, number, number, number];

// 手の位置。side は -1: 左手 / 1: 右手
interface Hand { side: number; x: number; y: number }

/**
 * 形を塗り、光(左上から)と陰(右・下)を形の中だけに重ねて、ふちを描く(front#361)。
 * 服・髪で同じ陰影にする。edge はふちの濃さ、width はふちの太さ
 */
function fillShaded(c: CanvasRenderingContext2D, path: Path2D, color: string, box: Box, edge = 0.18, width = 1): void {
  const [x0, y0, x1, y1] = box;
  c.fillStyle = color;
  c.fill(path);
  c.save();
  c.clip(path);
  const g = c.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, 'rgba(255,255,255,0.22)'); g.addColorStop(0.45, 'rgba(255,255,255,0)');
  g.addColorStop(0.6, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.22)');
  c.fillStyle = g;
  c.fillRect(x0, y0, x1 - x0, y1 - y0);
  const v = c.createLinearGradient(0, y0, 0, y1);
  v.addColorStop(0, 'rgba(255,255,255,0.16)'); v.addColorStop(0.35, 'rgba(255,255,255,0)'); v.addColorStop(1, 'rgba(0,0,0,0.16)');
  c.fillStyle = v;
  c.fillRect(x0, y0, x1 - x0, y1 - y0);
  c.restore();
  c.strokeStyle = `rgba(0,0,0,${edge})`;
  c.lineWidth = width;
  c.stroke(path);
}

/** 二頭身のキャラクターを、足元を (0, 0) として描く。位置・大きさは呼ぶ側で translate・scale する */
export function drawLook(c: CanvasRenderingContext2D, L: RpgLook, pose: LookPose): void {
  const d = pose.dir;
  const t = pose.time;
  const y0 = pose.moving ? -Math.abs(Math.sin(t * 10)) * 3 : Math.sin(t * 2 + (pose.phase ?? 0)) * 0.8;
  const f = d * 2.5;
  const swing = pose.moving ? Math.sin(t * 14) : 0;
  const cc = pose.hurt ? '#ff9b9b' : L.clothesColor;

  // 影・靴(靴に小さなツヤ)
  c.fillStyle = 'rgba(0,0,0,0.18)';
  c.beginPath(); c.ellipse(0, 0, 13, 5, 0, 0, Math.PI * 2); c.fill();
  const step = swing * 2.5;
  for (const [sx, lift] of [[-4, Math.max(0, step)], [4, Math.max(0, -step)]]) {
    c.fillStyle = '#5b4636';
    c.beginPath(); c.ellipse(sx, -2 - lift, 3.5, 2.5, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.25)';
    c.beginPath(); c.ellipse(sx - 1, -3 - lift, 1.4, 0.8, 0, 0, Math.PI * 2); c.fill();
  }

  // 手の位置(歩くと前後に振る)。剣は向いている側の手で握る
  const hands: Hand[] = [-1, 1].map((side) => ({ side, x: side * 10.6, y: y0 - 8.6 + side * swing * 0.9 }));
  const front = hands[d > 0 ? 1 : 0];
  if (pose.sword) drawSword(c, front.x, front.y, d, pose.swordColor ?? '#cbd5e1');

  // 後ろ髪(髪のふちは服より細く)
  const back = backHair(L, y0, d);
  if (back) fillShaded(c, back, L.hairColor, [-20, y0 - 50, 20, y0], 0.14, 0.5);
  hairTies(c, L, y0, d);

  drawClothes(c, L, y0, cc);
  drawArms(c, L, hands, cc, y0);
  drawClothesOver(c, L, y0);

  // 頭
  c.fillStyle = L.skin;
  c.strokeStyle = 'rgba(0,0,0,0.15)';
  c.lineWidth = 1;
  c.beginPath(); c.arc(0, y0 - 31, 12, 0, Math.PI * 2); c.fill(); c.stroke();

  // 前髪
  if (L.hair === 'bald') {
    c.fillStyle = 'rgba(255,255,255,0.5)';
    c.beginPath(); c.ellipse(-4, y0 - 38, 4, 2, -0.4, 0, Math.PI * 2); c.fill();
  } else {
    const fr = frontHair(L, y0, f, d);
    fillShaded(c, fr, L.hairColor, [-15, y0 - 50, 15, y0 - 15], 0.14, 0.5);
    // ツヤ: 頭の丸みにそって白い帯を入れる(前髪の中だけ)
    c.save();
    c.clip(fr);
    c.strokeStyle = 'rgba(255,255,255,0.38)';
    c.lineWidth = 1.8;
    c.lineCap = 'round';
    c.beginPath(); c.arc(-1 + f * 0.3, y0 - 33, 9.2, Math.PI * 1.13, Math.PI * 1.6); c.stroke();
    c.restore();
  }

  drawFace(c, L, y0, f);

  if (pose.slash && pose.slash > 0) {
    c.strokeStyle = `rgba(255,255,255,${pose.slash})`;
    c.lineWidth = 3;
    c.beginPath(); c.arc(d * 14, y0 - 16, 15, -1.2, 1.2); c.stroke();
  }
}

// 剣: 握っている手の位置から、斜め上へ伸ばす(手は剣のあとに描くので、柄を握って見える)
function drawSword(c: CanvasRenderingContext2D, hx: number, hy: number, d: number, color: string): void {
  // 刃の向き(ux, uy)と、つばの向き(px, py: 刃に直角)
  const ux = d * 0.47, uy = -0.88;
  const px = 0.88, py = d * 0.47;
  c.lineCap = 'round';
  c.strokeStyle = '#6b4a2b'; c.lineWidth = 2.4;
  c.beginPath(); c.moveTo(hx - ux * 2.5, hy - uy * 2.5); c.lineTo(hx + ux * 1.5, hy + uy * 1.5); c.stroke();
  const bx = hx + ux * 2.2, by = hy + uy * 2.2;
  c.strokeStyle = color; c.lineWidth = 3.4;
  c.beginPath(); c.moveTo(bx, by); c.lineTo(bx + ux * 17, by + uy * 17); c.stroke();
  c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = 1;
  c.beginPath(); c.moveTo(bx - px * 0.6, by - py * 0.6); c.lineTo(bx + ux * 15 - px * 0.6, by + uy * 15 - py * 0.6); c.stroke();
  c.strokeStyle = '#a16207'; c.lineWidth = 2.4;
  c.beginPath(); c.moveTo(bx - px * 3.6, by - py * 3.6); c.lineTo(bx + px * 3.6, by + py * 3.6); c.stroke();
}

// 腕と手。袖の色は服の色(ベストは中に着ているシャツの色)
function drawArms(c: CanvasRenderingContext2D, L: RpgLook, hands: Hand[], cc: string, y0: number): void {
  const sleeve = L.clothes === 'vest' ? L.accentColor : cc;
  c.lineCap = 'round';
  for (const h of hands) {
    const sx = h.side * 8.3;
    const sy = y0 - 18;
    const ex = h.x - h.side * 0.3;
    const ey = h.y - 1.6;
    // ふち → 袖 → 袖の陰(外側を少し暗く)
    c.strokeStyle = 'rgba(0,0,0,0.2)'; c.lineWidth = 5.4;
    c.beginPath(); c.moveTo(sx, sy); c.lineTo(ex, ey); c.stroke();
    c.strokeStyle = sleeve; c.lineWidth = 4.2;
    c.beginPath(); c.moveTo(sx, sy); c.lineTo(ex, ey); c.stroke();
    c.strokeStyle = 'rgba(0,0,0,0.12)'; c.lineWidth = 1.4;
    c.beginPath(); c.moveTo(sx + h.side * 1.4, sy + 0.5); c.lineTo(h.x + h.side * 1.1, h.y - 1.8); c.stroke();
    // 手
    c.fillStyle = L.skin; c.strokeStyle = 'rgba(0,0,0,0.2)'; c.lineWidth = 0.9;
    c.beginPath(); c.arc(h.x, h.y, 2.4, 0, Math.PI * 2); c.fill(); c.stroke();
  }
}

// しずく形: 根元(rx, ry)は細く、途中で幅 w までふくらみ、毛先(tx, ty)でとがる。bend は毛先を横へ曲げる量
function teardrop(p: Path2D, rx: number, ry: number, tx: number, ty: number, w: number, bend: number): void {
  const lx = tx - rx;
  const ly = ty - ry;
  const len = Math.hypot(lx, ly);
  const nx = -ly / len;
  const ny = lx / len;
  const at = (k: number, side: number, off = 0): [number, number] => [rx + lx * k + nx * side + off, ry + ly * k + ny * side];
  p.moveTo(...at(0, w * 0.3));
  p.bezierCurveTo(...at(0.3, w * 1.25), ...at(0.75, w * 0.95, bend * 0.5), tx + bend, ty);
  p.bezierCurveTo(...at(0.75, -w * 0.95, bend * 0.5), ...at(0.3, -w * 1.25), ...at(0, -w * 0.3));
  p.closePath();
}

// 後ろ髪の形。後ろ髪のない髪型は null
function backHair(L: RpgLook, y0: number, d: number): Path2D | null {
  const p = new Path2D();
  switch (L.hair) {
    case 'long': p.roundRect(-14, y0 - 40, 28, 33, 10); break;
    case 'bob': p.roundRect(-15, y0 - 42, 30, 23, 10); break;
    case 'ponytail': teardrop(p, -d * 9, y0 - 40, -d * 15, y0 - 18, 6.5, -d * 2.5); break;
    case 'twintail':
      teardrop(p, -12, y0 - 37, -17, y0 - 14, 6, -2.5);
      teardrop(p, 12, y0 - 37, 17, y0 - 14, 6, 2.5);
      break;
    default: return null;
  }
  return p;
}

// ポニーテール・ツインテールの結び目(髪の色を暗くした小さなゴム)
function hairTies(c: CanvasRenderingContext2D, L: RpgLook, y0: number, d: number): void {
  const ties: Record<string, [number, number][]> = {
    ponytail: [[-d * 9, y0 - 40]],
    twintail: [[-12, y0 - 37], [12, y0 - 37]]
  };
  const list = ties[L.hair];
  if (!list) return;
  c.fillStyle = shade(L.hairColor, 0.55);
  for (const [x, y] of list) { c.beginPath(); c.arc(x, y, 2, 0, Math.PI * 2); c.fill(); }
}

// 前髪の形。髪型ごとに前髪の下のふちを変え、ロング・ボブ・ポニーテール・ツインテールは顔の横に髪を垂らす
function frontHair(L: RpgLook, y0: number, f: number, d: number): Path2D {
  const p = new Path2D();
  // 向いている側へ少しずらす
  const s = f * 0.8;
  const Y = (v: number) => y0 + v;
  if (L.hair === 'spiky') {
    p.moveTo(-13, Y(-30.5));
    const pts = [[-14, -44], [-8, -41], [-5, -49], [0, -43.5], [5, -49], [8, -41], [14, -44], [13, -30.5]];
    for (const [px, py] of pts) p.lineTo(px, Y(py));
    // 前髪の下のふちもギザギザにする
    const bottom = [[9, -33], [6, -32], [3, -35.5], [0, -33], [-3, -36], [-6, -32.5], [-9, -34.5]];
    for (const [px, py] of bottom) p.lineTo(px + s, Y(py));
    p.closePath();
    return p;
  }
  p.moveTo(-13, Y(-30.5));
  p.arc(0, Y(-32), 13, Math.PI, 0);
  p.lineTo(13, Y(-30.5));
  if (L.hair === 'short') {
    // 毛先が分かれた前髪
    const pts = [[10, -33.5], [8.5, -31.6], [5.5, -35.2], [3, -32.6], [0, -36], [-3, -32.8], [-6, -35.4], [-8.5, -31.8], [-10.5, -33.8]];
    for (const [px, py] of pts) p.lineTo(px + s, Y(py));
    p.lineTo(-13, Y(-30.5));
  } else if (L.hair === 'long') {
    // 横分け(向いている側へ流す)
    if (d > 0) {
      p.quadraticCurveTo(9, Y(-31), 3 + s, Y(-34.5));
      p.quadraticCurveTo(-5, Y(-39.5), -13, Y(-30.5));
    } else {
      p.quadraticCurveTo(5, Y(-39.5), -3 + s, Y(-34.5));
      p.quadraticCurveTo(-9, Y(-31), -13, Y(-30.5));
    }
  } else if (L.hair === 'bob') {
    // ぱっつん
    p.quadraticCurveTo(12.6, Y(-33.8), 10, Y(-33.8));
    p.lineTo(-10, Y(-33.8));
    p.quadraticCurveTo(-12.6, Y(-33.8), -13, Y(-30.5));
  } else {
    // ポニーテール・ツインテール: まん中分けで、おでこが少し見える
    p.quadraticCurveTo(8.5 + s, Y(-32.5), 1.2 + s, Y(-39.5));
    p.lineTo(-0.2 + s, Y(-39.5));
    p.quadraticCurveTo(-8.5 + s, Y(-32.5), -13, Y(-30.5));
  }
  p.closePath();
  // 顔の横に垂らす髪(len: 長さ。ショートは垂らさない)
  const len = L.hair === 'long' ? 17 : L.hair === 'bob' ? 10 : L.hair === 'short' ? 0 : 7;
  if (len > 0) {
    for (const side of [-1, 1]) {
      p.moveTo(side * 13.3, Y(-34));
      p.quadraticCurveTo(side * 14.6, Y(-34 + len * 0.55), side * 12.4, Y(-34 + len));
      p.lineTo(side * 10, Y(-34 + len - 3.5));
      p.quadraticCurveTo(side * 10.7, Y(-34 + len * 0.45), side * 10.2, Y(-33));
      p.closePath();
    }
  }
  return p;
}

function drawFace(c: CanvasRenderingContext2D, L: RpgLook, y0: number, f: number): void {
  const ex = [-4 + f, 4 + f];
  const ey = y0 - 28.5;
  const e = L.eyes;
  c.lineCap = 'round';
  for (const [i, x0] of ex.entries()) {
    // 外側の向き(-1: 左目 / 1: 右目)
    const out = i === 0 ? -1 : 1;
    if (e === 'smile') {
      c.strokeStyle = '#2b2020'; c.lineWidth = 1.5;
      c.beginPath(); c.arc(x0, ey + 1, 2.3, Math.PI * 1.1, Math.PI * 1.9); c.stroke();
      continue;
    }
    const big = e === 'sparkle';
    const rx = big ? 2.1 : e === 'sharp' ? 1.7 : 1.9;
    const ry = big ? 2.85 : e === 'sharp' ? 2.3 : 2.6;
    c.save();
    // ねむそうな目は、瞳の上半分を隠す
    if (e === 'sleepy') { c.beginPath(); c.rect(x0 - 4, ey - 0.3, 8, 6); c.clip(); }
    // 瞳(上を暗く、下を明るく)とハイライト
    c.fillStyle = L.eyeColor;
    c.beginPath(); c.ellipse(x0, ey, rx, ry, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = shade(L.eyeColor, 0.5);
    c.beginPath(); c.ellipse(x0, ey - ry * 0.25, rx * 0.62, ry * 0.58, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = lighten(L.eyeColor, 0.45);
    c.beginPath(); c.ellipse(x0, ey + ry * 0.55, rx * 0.6, ry * 0.3, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#fff';
    c.beginPath(); c.arc(x0 - rx * 0.35, ey - ry * 0.4, big ? 1 : 0.8, 0, Math.PI * 2); c.fill();
    if (big) { c.beginPath(); c.arc(x0 + rx * 0.4, ey + ry * 0.35, 0.5, 0, Math.PI * 2); c.fill(); }
    c.restore();
    // 上まぶたの細い線。ふつう・キラキラ・メガネは瞳の丸みにそった弧(外側を少し長く)、
    // つり目は外側を上げ、たれ目は外側を下げる
    c.strokeStyle = '#2b2020'; c.lineWidth = 0.55;
    c.beginPath();
    if (e === 'normal' || e === 'sparkle' || e === 'glasses') {
      const [a0, a1] = out < 0 ? [1.02, 1.78] : [1.22, 1.98];
      c.ellipse(x0, ey + 0.2, rx + 0.6, ry + 0.3, 0, Math.PI * a0, Math.PI * a1);
    } else {
      const tilt = e === 'sharp' ? 1 : e === 'droopy' ? -0.9 : 0;
      const lid = e === 'sleepy' ? ey - 0.3 : ey - ry + 0.4;
      c.moveTo(x0 - out * (rx - 0.2), lid + 0.6 + tilt * 0.3);
      c.quadraticCurveTo(x0, lid - 0.7 - (e === 'sleepy' ? -0.5 : 0), x0 + out * (rx + 0.5), lid + 0.5 - tilt * 0.9);
    }
    c.stroke();
  }
  // 眉毛(髪の色を少し暗くした色。白っぽい髪でも見えるように)。つり目は外側を上げ、たれ目は外側を下げる
  c.strokeStyle = shade(L.hairColor, 0.85);
  c.lineWidth = 1.2;
  const tilt = e === 'sharp' ? 1.1 : e === 'droopy' ? -1.1 : 0;
  for (const [i, x0] of ex.entries()) {
    const out = i === 0 ? -1 : 1;
    const by = ey - 4.6;
    c.beginPath(); c.moveTo(x0 - out * 1.8, by + tilt * 0.6); c.lineTo(x0 + out * 2.2, by - tilt); c.stroke();
  }
  if (e === 'glasses') {
    // レンズは薄い白とツヤだけにして、レンズ越しに目が見えるようにする
    for (const x0 of ex) {
      c.fillStyle = 'rgba(255,255,255,0.22)';
      c.beginPath(); c.arc(x0, ey, 3.7, 0, Math.PI * 2); c.fill();
      c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 0.8;
      c.beginPath(); c.moveTo(x0 + 0.8, ey - 2.4); c.lineTo(x0 + 2.4, ey - 0.8); c.stroke();
    }
    c.strokeStyle = '#1f2937'; c.lineWidth = 1.1;
    for (const x0 of ex) { c.beginPath(); c.arc(x0, ey, 3.7, 0, Math.PI * 2); c.stroke(); }
    c.beginPath(); c.moveTo(ex[0] + 3.7, ey - 0.5); c.lineTo(ex[1] - 3.7, ey - 0.5); c.stroke();
  }
  // ほっぺ(front#369 で少し小さく)
  c.fillStyle = 'rgba(255,120,120,0.35)';
  c.beginPath(); c.ellipse(-7 + f, y0 - 23, 1.9, 1.25, 0, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.ellipse(7 + f, y0 - 23, 1.9, 1.25, 0, 0, Math.PI * 2); c.fill();
  // 口(front#368 で全体的に小さく)
  const mx = f;
  const my = y0 - 22;
  c.strokeStyle = '#7c2d12';
  c.lineWidth = 0.8;
  if (L.mouth === 'smile') { c.beginPath(); c.arc(mx, my - 1.1, 1.7, 0.2 * Math.PI, 0.8 * Math.PI); c.stroke(); }
  if (L.mouth === 'open') {
    c.fillStyle = '#9f1239'; c.beginPath(); c.ellipse(mx, my, 1.4, 1.2, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#fb7185'; c.beginPath(); c.ellipse(mx, my + 0.55, 0.8, 0.45, 0, 0, Math.PI * 2); c.fill();
  }
  if (L.mouth === 'flat') { c.beginPath(); c.moveTo(mx - 1.5, my); c.lineTo(mx + 1.5, my); c.stroke(); }
  // ねこ口は「ω」の2つの弧だけ(弧どうしを線でつながない)。目立ちすぎないよう、小さく・細く
  if (L.mouth === 'cat') {
    c.lineWidth = 0.6;
    for (const k of [-1, 1]) { c.beginPath(); c.arc(mx + k * 0.85, my - 0.8, 0.85, 0, Math.PI); c.stroke(); }
  }
}

// 服の形
function clothesPath(type: string, y0: number): Path2D {
  const p = new Path2D();
  if (type === 'robe') {
    p.moveTo(-8, y0 - 20); p.lineTo(8, y0 - 20); p.lineTo(12, y0 - 1); p.lineTo(-12, y0 - 1); p.closePath();
  } else if (type === 'dress') {
    p.roundRect(-8, y0 - 20, 16, 9, 5);
    p.moveTo(-7, y0 - 12); p.lineTo(7, y0 - 12); p.lineTo(13, y0 - 3); p.lineTo(-13, y0 - 3); p.closePath();
  } else {
    p.roundRect(-9, y0 - 20, 18, 16, 6);
  }
  return p;
}

// 服(形と陰影 → 差し色の飾り の順に重ねる)
function drawClothes(c: CanvasRenderingContext2D, L: RpgLook, y0: number, cc: string): void {
  const type = L.clothes;
  const ac = L.accentColor;
  fillShaded(c, clothesPath(type, y0), cc, [-14, y0 - 21, 14, y0]);

  c.fillStyle = ac;
  if (type === 'robe') {
    // 前のふちと帯
    c.beginPath(); c.moveTo(-8, y0 - 20); c.lineTo(-6, y0 - 20); c.lineTo(-9.5, y0 - 1); c.lineTo(-12, y0 - 1); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(8, y0 - 20); c.lineTo(6, y0 - 20); c.lineTo(9.5, y0 - 1); c.lineTo(12, y0 - 1); c.closePath(); c.fill();
    c.fillRect(-9.5, y0 - 12, 19, 2.6);
  } else if (type === 'dress') {
    // 裾のラインとリボン
    c.beginPath(); c.moveTo(-13, y0 - 3); c.lineTo(13, y0 - 3); c.lineTo(12.2, y0 - 5); c.lineTo(-12.2, y0 - 5); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(0, y0 - 17); c.lineTo(-4, y0 - 20); c.lineTo(-4, y0 - 14); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(0, y0 - 17); c.lineTo(4, y0 - 20); c.lineTo(4, y0 - 14); c.closePath(); c.fill();
  } else if (type === 'armor') {
    // ベルト(肩当ては腕の上に描く: drawClothesOver)
    c.fillStyle = shade(ac, 0.75);
    c.fillRect(-9, y0 - 9, 18, 3);
    c.fillStyle = '#fbbf24';
    c.fillRect(-2, y0 - 9, 4, 3);
  } else if (type === 'vest') {
    // 中に着たシャツ
    c.fillRect(-3, y0 - 20, 6, 16);
    c.fillStyle = shade(cc, 0.8);
    c.fillRect(-1, y0 - 20, 2, 16);
  } else {
    // シャツ: 襟と裾のライン
    c.beginPath(); c.moveTo(-4.5, y0 - 20); c.lineTo(0, y0 - 14.5); c.lineTo(4.5, y0 - 20); c.closePath(); c.fill();
    c.save();
    c.clip(clothesPath(type, y0));
    c.fillRect(-10, y0 - 6.5, 20, 2.5);
    c.restore();
  }
}

// 腕より手前に描くもの(よろいの肩当て)
function drawClothesOver(c: CanvasRenderingContext2D, L: RpgLook, y0: number): void {
  if (L.clothes !== 'armor') return;
  const pads = new Path2D();
  pads.ellipse(-9, y0 - 17, 5, 4, 0, 0, Math.PI * 2);
  pads.moveTo(14, y0 - 17);
  pads.ellipse(9, y0 - 17, 5, 4, 0, 0, Math.PI * 2);
  fillShaded(c, pads, L.accentColor, [-14, y0 - 21, 14, y0 - 13]);
}
