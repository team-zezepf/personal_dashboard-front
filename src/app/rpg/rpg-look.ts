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

// #rrggbb の色を暗くする(陰・眉毛)
function shade(hex: string, factor: number): string {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.round(v * factor);
  return `rgb(${c(n >> 16)}, ${c((n >> 8) & 255)}, ${c(n & 255)})`;
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

/** 二頭身のキャラクターを、足元を (0, 0) として描く。位置・大きさは呼ぶ側で translate・scale する */
export function drawLook(c: CanvasRenderingContext2D, L: RpgLook, pose: LookPose): void {
  const d = pose.dir;
  const t = pose.time;
  const y0 = pose.moving ? -Math.abs(Math.sin(t * 10)) * 3 : Math.sin(t * 2 + (pose.phase ?? 0)) * 0.8;
  const f = d * 2.5;

  // 影・足
  c.fillStyle = 'rgba(0,0,0,0.18)';
  c.beginPath(); c.ellipse(0, 0, 13, 5, 0, 0, Math.PI * 2); c.fill();
  const step = pose.moving ? Math.sin(t * 14) * 2.5 : 0;
  c.fillStyle = '#5b4636';
  c.beginPath(); c.ellipse(-4, -2 - Math.max(0, step), 3.5, 2.5, 0, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.ellipse(4, -2 - Math.max(0, -step), 3.5, 2.5, 0, 0, Math.PI * 2); c.fill();

  // 剣(体の後ろに持つ)
  if (pose.sword) {
    const hx = d * 10;
    const hy = y0 - 12;
    c.strokeStyle = pose.swordColor ?? '#cbd5e1';
    c.lineWidth = 3.5;
    c.lineCap = 'round';
    c.beginPath(); c.moveTo(hx, hy); c.lineTo(hx + d * 9, hy - 16); c.stroke();
    c.strokeStyle = '#6b4a2b';
    c.lineWidth = 3;
    c.beginPath(); c.moveTo(hx - 3, hy + 1); c.lineTo(hx + 4 * d, hy - 1); c.stroke();
  }

  // 後ろ髪
  c.fillStyle = L.hairColor;
  if (L.hair === 'long') { c.beginPath(); c.roundRect(-14, y0 - 40, 28, 33, 10); c.fill(); }
  if (L.hair === 'bob') { c.beginPath(); c.roundRect(-15, y0 - 42, 30, 23, 10); c.fill(); }
  // ポニーテール・ツインテールは、結び目が細く、途中でふくらみ、毛先がとがる「しずく形」
  if (L.hair === 'ponytail') teardrop(c, -d * 9, y0 - 40, -d * 15, y0 - 18, 6.5, -d * 2.5);
  if (L.hair === 'twintail') {
    teardrop(c, -12, y0 - 37, -17, y0 - 14, 6, -2.5);
    teardrop(c, 12, y0 - 37, 17, y0 - 14, 6, 2.5);
  }

  drawClothes(c, L, y0, pose.hurt ? '#ff9b9b' : L.clothesColor);

  // 頭
  c.fillStyle = L.skin;
  c.strokeStyle = 'rgba(0,0,0,0.15)';
  c.lineWidth = 1;
  c.beginPath(); c.arc(0, y0 - 31, 12, 0, Math.PI * 2); c.fill(); c.stroke();

  // 前髪
  c.fillStyle = L.hairColor;
  if (L.hair === 'spiky') {
    // 毛先は少し高めにし、前髪の下のふちはほかの髪型と同じ高さ(眉毛が見える位置)にする
    c.beginPath(); c.moveTo(-13, y0 - 30.5);
    const pts = [[-14, -44], [-8, -41], [-5, -49], [0, -43.5], [5, -49], [8, -41], [14, -44], [13, -30.5]];
    for (const [px, py] of pts) c.lineTo(px, y0 + py);
    c.quadraticCurveTo(f * 2, y0 - 38, -13, y0 - 30.5); c.fill();
  } else if (L.hair !== 'bald') {
    c.beginPath(); c.arc(0, y0 - 32, 13, Math.PI, 0); c.lineTo(13, y0 - 30.5);
    c.quadraticCurveTo(f * 2, y0 - 38, -13, y0 - 30.5); c.closePath(); c.fill();
    // 横の髪。上は前髪とすき間なくつなげ、ボブは後ろ髪の丸い角からはみ出さないよう短くする
    if (L.hair === 'long') { c.fillRect(-13, y0 - 33, 3, 12); c.fillRect(10, y0 - 33, 3, 12); }
    if (L.hair === 'bob') { c.fillRect(-13, y0 - 33, 3, 8); c.fillRect(10, y0 - 33, 3, 8); }
  } else {
    c.fillStyle = 'rgba(255,255,255,0.5)';
    c.beginPath(); c.ellipse(-4, y0 - 38, 4, 2, -0.4, 0, Math.PI * 2); c.fill();
  }

  drawFace(c, L, y0, f);

  if (pose.slash && pose.slash > 0) {
    c.strokeStyle = `rgba(255,255,255,${pose.slash})`;
    c.lineWidth = 3;
    c.beginPath(); c.arc(d * 14, y0 - 16, 15, -1.2, 1.2); c.stroke();
  }
}

function drawFace(c: CanvasRenderingContext2D, L: RpgLook, y0: number, f: number): void {
  // 目
  const ex = [-4 + f, 4 + f];
  const ey = y0 - 27;
  c.fillStyle = L.eyeColor;
  c.strokeStyle = L.eyeColor;
  c.lineWidth = 1.5;
  c.lineCap = 'round';
  for (const x0 of ex) {
    if (L.eyes === 'smile') { c.beginPath(); c.arc(x0, ey + 1, 2.2, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); }
    else if (L.eyes === 'sleepy') { c.beginPath(); c.moveTo(x0 - 2.2, ey); c.lineTo(x0 + 2.2, ey); c.stroke(); }
    else {
      const big = L.eyes === 'sparkle';
      c.beginPath(); c.ellipse(x0, ey, big ? 2.4 : 1.8, big ? 3.2 : 2.6, 0, 0, Math.PI * 2); c.fill();
      if (big) {
        c.fillStyle = '#fff';
        c.beginPath(); c.arc(x0 - 0.8, ey - 1.2, 0.9, 0, Math.PI * 2); c.fill();
        c.fillStyle = L.eyeColor;
      }
    }
  }
  // 眉毛(髪の色を少し暗くした色。白っぽい髪でも見えるように)。つり目は外側を上げ、たれ目は外側を下げる
  c.strokeStyle = shade(L.hairColor, 0.85);
  c.lineWidth = 1.4;
  const tilt = L.eyes === 'sharp' ? 1.3 : L.eyes === 'droopy' ? -1.3 : 0;
  for (const [i, x0] of ex.entries()) {
    const out = i === 0 ? -1 : 1;
    const by = ey - 3.8;
    c.beginPath(); c.moveTo(x0 - out * 1.8, by + tilt * 0.6); c.lineTo(x0 + out * 2.2, by - tilt); c.stroke();
  }
  if (L.eyes === 'glasses') {
    // レンズは白で塗りつぶし、目は描かない(下に描いた目も白で隠れる)
    c.fillStyle = '#ffffff';
    for (const x0 of ex) { c.beginPath(); c.arc(x0, ey, 3.6, 0, Math.PI * 2); c.fill(); }
    c.strokeStyle = '#1f2937';
    c.lineWidth = 1.2;
    for (const x0 of ex) { c.beginPath(); c.arc(x0, ey, 3.6, 0, Math.PI * 2); c.stroke(); }
    c.beginPath(); c.moveTo(ex[0] + 3.6, ey); c.lineTo(ex[1] - 3.6, ey); c.stroke();
  }
  // ほっぺ
  c.fillStyle = 'rgba(255,120,120,0.35)';
  c.beginPath(); c.arc(-7 + f, y0 - 23, 2.3, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.arc(7 + f, y0 - 23, 2.3, 0, Math.PI * 2); c.fill();
  // 口
  const mx = f;
  const my = y0 - 22;
  c.strokeStyle = '#7c2d12';
  c.lineWidth = 1.2;
  if (L.mouth === 'smile') { c.beginPath(); c.arc(mx, my - 1.5, 2.2, 0.2 * Math.PI, 0.8 * Math.PI); c.stroke(); }
  if (L.mouth === 'open') { c.fillStyle = '#9f1239'; c.beginPath(); c.ellipse(mx, my, 1.8, 1.5, 0, 0, Math.PI * 2); c.fill(); }
  if (L.mouth === 'flat') { c.beginPath(); c.moveTo(mx - 2, my); c.lineTo(mx + 2, my); c.stroke(); }
  if (L.mouth === 'cat') { c.beginPath(); c.arc(mx - 1.4, my - 1, 1.4, 0, Math.PI); c.arc(mx + 1.4, my - 1, 1.4, 0, Math.PI); c.stroke(); }
}

// しずく形: 根元(rx, ry)は細く、途中で幅 w までふくらみ、毛先(tx, ty)でとがる。bend は毛先を横へ曲げる量
function teardrop(c: CanvasRenderingContext2D, rx: number, ry: number, tx: number, ty: number, w: number, bend: number): void {
  const lx = tx - rx;
  const ly = ty - ry;
  const len = Math.hypot(lx, ly);
  const nx = -ly / len;
  const ny = lx / len;
  const at = (k: number, side: number, off = 0): [number, number] => [rx + lx * k + nx * side + off, ry + ly * k + ny * side];
  c.beginPath();
  c.moveTo(...at(0, w * 0.3));
  c.bezierCurveTo(...at(0.3, w * 1.25), ...at(0.75, w * 0.95, bend * 0.5), tx + bend, ty);
  c.bezierCurveTo(...at(0.75, -w * 0.95, bend * 0.5), ...at(0.3, -w * 1.25), ...at(0, -w * 0.3));
  c.closePath();
  c.fill();
}

// 服の形(陰影を服の中だけに塗るため、形を何度も使う)
function clothesPath(c: CanvasRenderingContext2D, type: string, y0: number): void {
  c.beginPath();
  if (type === 'robe') {
    c.moveTo(-8, y0 - 20); c.lineTo(8, y0 - 20); c.lineTo(12, y0 - 1); c.lineTo(-12, y0 - 1); c.closePath();
  } else if (type === 'dress') {
    c.roundRect(-8, y0 - 20, 16, 9, 5);
    c.moveTo(-7, y0 - 12); c.lineTo(7, y0 - 12); c.lineTo(13, y0 - 3); c.lineTo(-13, y0 - 3); c.closePath();
  } else {
    c.roundRect(-9, y0 - 20, 18, 16, 6);
  }
}

// 服(形 → 陰影 → ふち → 差し色の飾り の順に重ねる)
function drawClothes(c: CanvasRenderingContext2D, L: RpgLook, y0: number, cc: string): void {
  const type = L.clothes;
  const ac = L.accentColor;
  clothesPath(c, type, y0);
  c.fillStyle = cc;
  c.fill();

  // 陰影(光は左上から。右側と下を暗く、左肩を明るく)
  c.save();
  clothesPath(c, type, y0);
  c.clip();
  const g = c.createLinearGradient(-12, 0, 12, 0);
  g.addColorStop(0, 'rgba(255,255,255,0.22)'); g.addColorStop(0.45, 'rgba(255,255,255,0)');
  g.addColorStop(0.6, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.22)');
  c.fillStyle = g;
  c.fillRect(-14, y0 - 21, 28, 21);
  const v = c.createLinearGradient(0, y0 - 20, 0, y0);
  v.addColorStop(0, 'rgba(255,255,255,0.18)'); v.addColorStop(0.35, 'rgba(255,255,255,0)'); v.addColorStop(1, 'rgba(0,0,0,0.16)');
  c.fillStyle = v;
  c.fillRect(-14, y0 - 21, 28, 21);
  c.restore();

  clothesPath(c, type, y0);
  c.strokeStyle = 'rgba(0,0,0,0.18)';
  c.lineWidth = 1;
  c.stroke();

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
    // 肩当てとベルト
    c.beginPath(); c.ellipse(-9, y0 - 17, 5, 4, 0, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(9, y0 - 17, 5, 4, 0, 0, Math.PI * 2); c.fill();
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
    clothesPath(c, type, y0);
    c.clip();
    c.fillRect(-10, y0 - 6.5, 20, 2.5);
    c.restore();
  }
}
