import { RpgLook } from '../models/rpg.models';

/**
 * キャラクター(プレイヤー・村人)の見た目(front#224)。部品の一覧と、二頭身の描き方を持つ。
 * ゲーム画面・マップ作成画面・見た目を選ぶ欄で同じ絵になるよう、描く関数はここにまとめる。
 * 部品の名前はAPI(RpgLooks)と合わせる。
 */

// お団子・三つ編み・ウェーブ・サイドテールは front#362 で追加
export const HAIRS: [string, string][] = [
  ['short', 'ショート'], ['long', 'ロング'], ['ponytail', 'ポニーテール'], ['twintail', 'ツインテール'],
  ['bob', 'ボブ'], ['spiky', 'ツンツン'], ['bald', 'ぼうず'],
  ['bun', 'お団子'], ['braid', '三つ編み'], ['wavy', 'ウェーブ'], ['sidetail', 'サイドテール']
];
// 髪のトップ(前髪・頭の上)と後ろ(後ろ髪・結んだ髪)(front#370)。最初の「髪型に合わせる」は null
export const HAIR_TOPS: [string | null, string][] = [
  [null, '髪型に合わせる'], ['tufts', 'ぱらぱら'], ['sweep', '横分け'], ['straight', 'ぱっつん'],
  ['center', 'まん中分け'], ['point', 'とんがり'], ['spiky', 'ツンツン'], ['none', 'なし']
];
export const HAIR_BACKS: [string | null, string][] = [
  [null, '髪型に合わせる'], ['none', 'なし'], ['long', 'ロング'], ['bob', 'ボブ'], ['flip', '外ハネ'], ['ponytail', 'ポニーテール'],
  ['twintail', 'ツインテール'], ['sidetail', 'サイドテール'], ['bun', 'お団子'], ['braid', '三つ編み'], ['wavy', 'ウェーブ']
];
// 髪型ごとのトップ・後ろ(トップ・後ろを選んでいないときに使う)。載っていない髪型は、トップ まん中分け・後ろ 髪型と同じ名前
const TOP_OF_HAIR: Record<string, string> = { short: 'tufts', long: 'sweep', wavy: 'sweep', bob: 'straight', spiky: 'spiky', bald: 'none' };
const BACK_OF_HAIR: Record<string, string> = { short: 'none', spiky: 'none', bald: 'none' };

/** 描くときのトップ。選んでいなければ髪型どおり */
export function hairTopOf(L: RpgLook): string {
  return L.hairTop || TOP_OF_HAIR[L.hair] || 'center';
}

/** 描くときの後ろ。選んでいなければ髪型どおり */
export function hairBackOf(L: RpgLook): string {
  return L.hairBack || BACK_OF_HAIR[L.hair] || L.hair;
}

// 眉(front#362)。ふつう・太め・細めは、目の形(つり目・たれ目)に合わせて傾ける
export const BROWS: [string, string][] = [
  ['normal', 'ふつう'], ['thick', '太め'], ['thin', '細め'], ['arch', '山なり'],
  ['sharp', 'きりっ'], ['worried', 'こまり'], ['short', 'まろ'], ['none', 'なし']
];
export const EYES: [string, string][] = [
  ['normal', 'ふつう'], ['smile', 'にっこり'], ['sharp', 'つり目'], ['droopy', 'たれ目'],
  ['sleepy', 'ねむそう'], ['glasses', 'メガネ']
];
export const MOUTHS: [string, string][] = [['none', 'なし'], ['smile', 'にっこり'], ['open', 'ひらく'], ['flat', 'まっすぐ'], ['cat', 'ねこ口']];
// パーカー・セーラー服は front#362 で追加
export const CLOTHES: [string, string][] = [
  ['shirt', 'シャツ'], ['robe', 'ローブ'], ['armor', 'よろい'], ['dress', 'ワンピース'], ['vest', 'ベスト'],
  ['hoodie', 'パーカー'], ['sailor', 'セーラー服']
];

// 色の一覧(front#362)。2段に並べ、上下が同じ系統の色(上: 濃い / 下: 明るい)になるよう「上の段 → 下の段」の順に持つ。
// 左から 黒白 → 茶 → 赤 → 橙黄 → 緑 → 青 → 紫。一覧にない色もカスタムで選べる(肌の色を除く)
export const HAIR_COLORS = [
  '#1f2937', '#6b3f1f', '#dc2626', '#f08a4b', '#4b9e5f', '#2563eb', '#7c3aed',
  '#e5e7eb', '#8b5a2b', '#f472b6', '#fcd34d', '#a7f3d0', '#60a5fa', '#c4b5fd'
];
export const SKINS = ['#fce6d4', '#ffe0bd', '#f5c99b', '#d9a066', '#8d5a3b'];
export const EYE_COLORS = [
  '#1f2937', '#3b2f2f', '#dc2626', '#16a34a', '#2563eb', '#9333ea',
  '#64748b', '#d97706', '#f472b6', '#84cc16', '#0891b2', '#c084fc'
];
export const CLOTHES_COLORS = [
  '#1f2937', '#8b5a2b', '#ef4444', '#f08a4b', '#4b9e5f', '#3b82f6', '#8b5cf6',
  '#f8fafc', '#64748b', '#f9a8d4', '#facc15', '#10b981', '#7dd3fc', '#c4b5fd'
];
export const ACCENT_COLORS = [
  '#1f2937', '#8b5a2b', '#ef4444', '#f08a4b', '#4b9e5f', '#3b82f6', '#a78bfa',
  '#f8fafc', '#fbbf24', '#f9a8d4', '#fde68a', '#a7f3d0', '#93c5fd', '#ddd6fe'
];

// プレイヤーの最初の見た目(APIの RpgLook の初期値と同じ)
export const DEFAULT_LOOK: RpgLook = {
  hair: 'short', hairColor: '#6b3f1f', skin: '#ffe0bd', eyes: 'normal', eyeColor: '#3b2f2f',
  mouth: 'smile', clothes: 'shirt', clothesColor: '#3b82f6', accentColor: '#f8fafc', brows: 'normal', browColor: null,
  hairTop: null, hairBack: null
};

/** 差し色は服の色と同じにならないようにする(白い服なら茶色) */
export function accentFor(clothesColor: string): string {
  return clothesColor.toLowerCase() === '#f8fafc' ? '#8b5a2b' : '#f8fafc';
}

// ===== 装備の見た目(front#431) =====

/** 武器・防具の見た目。shape は武器なら WEAPON_SHAPES、防具なら服の形(CLOTHES)。color・accent は #rrggbb */
export interface EquipLook {
  shape: string;
  color: string;
  accent: string;
}

/** 武器の形。剣・杖とも2種類 */
export const WEAPON_SHAPES: [WeaponShape, string][] = [['sword', '片手剣'], ['greatsword', '大剣'], ['staff', '玉の杖'], ['moonstaff', '三日月の杖']];
export type WeaponShape = 'sword' | 'greatsword' | 'staff' | 'moonstaff';

/** 防具でだけ着られる服。プレイヤーの「見た目を変える」では選べない(村人は選べる) */
export const GEAR_ONLY_CLOTHES = ['robe', 'armor'];
/** プレイヤーが「見た目を変える」で選べる服 */
export const PLAYER_CLOTHES: [string, string][] = CLOTHES.filter(([id]) => !GEAR_ONLY_CLOTHES.includes(id));

/**
 * 防具を着たときの見た目(プレイヤー・仲間)。防具に見た目があれば、服の形・色は防具のものにする。
 * 見た目のない防具なら選んだ服のまま。ただし防具でだけ着られる服(前に選んでいたローブ・よろい)はシャツにする
 */
export function wearArmor(L: RpgLook, armor: EquipLook | null | undefined): RpgLook {
  if (armor) return { ...L, clothes: armor.shape, clothesColor: armor.color, accentColor: armor.accent };
  return GEAR_ONLY_CLOTHES.includes(L.clothes) ? { ...L, clothes: 'shirt' } : L;
}

/** 武器を持たせるときの LookPose の値。見た目のない武器は、今までどおり fallback の色の片手剣 */
export function weaponPose(weapon: EquipLook | null | undefined, fallback: string): Pick<LookPose, 'sword' | 'swordColor' | 'weaponShape' | 'weaponAccent'> {
  if (!weapon || !WEAPON_SHAPES.some(([id]) => id === weapon.shape)) return { sword: true, swordColor: fallback };
  return { sword: true, swordColor: weapon.color, weaponShape: weapon.shape as WeaponShape, weaponAccent: weapon.accent };
}

/** 髪の色・服の色だけから見た目を作る(新しい村人など)。それ以外は最初の見た目 */
export function lookFromColors(hair: string, body: string): RpgLook {
  return { ...DEFAULT_LOOK, hairColor: hair, clothesColor: body, accentColor: accentFor(body) };
}

/** おまかせ(見た目を選ぶ欄の「おまかせ」)。clothes は選ぶ服の一覧(プレイヤーは PLAYER_CLOTHES。front#431) */
export function randomLook(rand: () => number = Math.random, clothes: [string, string][] = CLOTHES): RpgLook {
  const pick = <T>(list: T[]) => list[Math.floor(rand() * list.length)];
  const clothesColor = pick(CLOTHES_COLORS);
  let accentColor = pick(ACCENT_COLORS);
  if (accentColor === clothesColor) accentColor = accentFor(clothesColor);
  return {
    hair: pick(HAIRS)[0], hairColor: pick(HAIR_COLORS), skin: pick(SKINS), eyes: pick(EYES)[0], eyeColor: pick(EYE_COLORS),
    mouth: pick(MOUTHS)[0], clothes: pick(clothes)[0], clothesColor, accentColor,
    // 眉の色は髪の色に合わせる
    brows: pick(BROWS)[0], browColor: null,
    // 髪のトップ・後ろは髪型に合わせる(front#370)
    hairTop: null, hairBack: null
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
  // 武器の形(front#431)。なければ片手剣。swordColor は刃・杖の色、weaponAccent は つば・杖の先(玉・三日月)の色
  weaponShape?: WeaponShape;
  weaponAccent?: string;
  // 攻撃したときの斬撃(0〜1)
  slash?: number;
}

// 陰影をかける範囲 [左, 上, 右, 下]
type Box = [number, number, number, number];

// 手の位置。side は -1: 左手 / 1: 右手。back は体の後ろに回した腕(向いている側。front#373)
interface Hand { side: number; back: boolean; x: number; y: number }

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

  // 手の位置(歩くと前後に振る)。向いている側の腕は体の後ろに回して少し内側に寄せ(front#373)、剣はその手で握る
  const hands: Hand[] = [-1, 1].map((side) => ({
    side, back: side === d, x: side * (side === d ? 9.2 : 10.6), y: y0 - 8.6 + side * swing * 0.9
  }));
  const holder = hands.find((h) => h.back) ?? hands[1];
  const shape = pose.weaponShape ?? 'sword';
  if (pose.sword && (shape === 'staff' || shape === 'moonstaff')) drawStaff(c, holder.x, holder.y, d, pose.swordColor ?? '#8b5a2b', pose.weaponAccent ?? '#60a5fa', t, shape === 'moonstaff');
  else if (pose.sword && shape === 'greatsword') drawGreatsword(c, holder.x, holder.y, d, pose.swordColor ?? '#cbd5e1', pose.weaponAccent ?? '#a16207');
  else if (pose.sword) drawSword(c, holder.x, holder.y, d, pose.swordColor ?? '#cbd5e1', pose.weaponAccent);

  // 後ろ髪(髪のふちは服より細く)
  inHairSpace(c, d, () => {
    const back = backHair(L, y0, d);
    if (back) fillShaded(c, back, L.hairColor, [-20, y0 - 50, 20, y0], 0.14, 0.5);
    hairTies(c, L, y0, d);
  });

  // 体の後ろの腕 → 服 → 手前の腕
  drawArms(c, L, hands.filter((h) => h.back), cc, y0);
  drawClothes(c, L, y0, cc);
  drawArms(c, L, hands.filter((h) => !h.back), cc, y0);
  drawClothesOver(c, L, y0);

  // 頭。向いている側のほっぺ〜あごを少しだけ前に出し、向きが分かるようにする(front#372)
  const head = headPath(y0, d);
  c.fillStyle = L.skin;
  c.strokeStyle = 'rgba(0,0,0,0.15)';
  c.lineWidth = 1;
  c.fill(head);
  c.stroke(head);

  // 前髪
  if (hairTopOf(L) === 'none') {
    c.fillStyle = 'rgba(255,255,255,0.5)';
    c.beginPath(); c.ellipse(-4, y0 - 38, 4, 2, -0.4, 0, Math.PI * 2); c.fill();
  } else {
    inHairSpace(c, d, () => {
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
    });
  }

  drawFace(c, L, y0, f);
  // 三つ編みは肩から前へ垂らすので、体・顔の手前に描く
  if (hairBackOf(L) === 'braid') inHairSpace(c, d, () => drawBraid(c, L, y0, d));

  if (pose.slash && pose.slash > 0) {
    c.strokeStyle = `rgba(255,255,255,${pose.slash})`;
    c.lineWidth = 3;
    c.beginPath(); c.arc(d * 14, y0 - 16, 15, -1.2, 1.2); c.stroke();
  }
}

// 頭の輪郭(front#405)。真ん丸ではなく、縦長の卵形にして、ほっぺから下をすぼめて あご にする。
// 顔は向いている側(d)に寄って見えるので、向いている側は少し広く、後ろ側は細くする。
// あごも向いている側へ少し寄せ、向いている側のほっぺは少しふっくらさせる(front#372)
const HEAD_RY = 12;
const HEAD_RX_FRONT = 10.6;
const HEAD_RX_BACK = 9.2;

// 髪は丸い頭(横幅 12)に合わせて描いてあるので、顔幅に合わせて横に縮めて描く(front#407)。
// 頭は向いている側が少し広いので、縮める中心も向いている側へ少し寄せる
const HAIR_SX = 0.88;
function inHairSpace(c: CanvasRenderingContext2D, d: number, draw: () => void): void {
  const cx = d * (HEAD_RX_FRONT - HEAD_RX_BACK) / 2;
  c.save();
  c.translate(cx, 0);
  c.scale(HAIR_SX, 1);
  c.translate(-cx, 0);
  draw();
  c.restore();
}
function headPath(y0: number, d: number): Path2D {
  const p = new Path2D();
  const cy = y0 - 31;
  // 卵形からすぼめ始める高さ(中心から下へ)
  const sy = 1;
  const k = Math.sqrt(1 - (sy / HEAD_RY) ** 2);
  const t = Math.asin(sy / HEAD_RY);
  // あご(少し丸みを残す)
  const chinX = d * 2;
  const chinY = cy + 13.4;
  // 右を向いているときは、上 → 左(後ろ) → あご → 右(前) → 上 の順に描く
  const backward = d > 0;
  const backAt = d > 0 ? Math.PI - t : t;
  const frontAt = d > 0 ? t : Math.PI - t;
  p.moveTo(0, cy - HEAD_RY);
  p.ellipse(0, cy, HEAD_RX_BACK, HEAD_RY, 0, -Math.PI / 2, backAt, backward);
  // 後ろ側: ほっぺ → あご
  const bx = -d * HEAD_RX_BACK * k;
  p.bezierCurveTo(bx, cy + 6.5, -d * 5, cy + 11.8, chinX - d * 1.8, chinY - 0.3);
  p.quadraticCurveTo(chinX, chinY + 0.4, chinX + d * 1.8, chinY - 0.5);
  // 向いている側: あご → ほっぺ(少しふっくら)
  const fx = d * HEAD_RX_FRONT * k;
  p.bezierCurveTo(d * 8.2, cy + 11.8, fx + d * 0.4, cy + 7, fx, cy + sy);
  p.ellipse(0, cy, HEAD_RX_FRONT, HEAD_RY, 0, frontAt, -Math.PI / 2, backward);
  p.closePath();
  return p;
}

// 剣: 握っている手の位置から、斜め上へ伸ばす(手は剣のあとに描くので、柄を握って見える)
function drawSword(c: CanvasRenderingContext2D, hx: number, hy: number, d: number, color: string, guard = '#a16207'): void {
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
  c.strokeStyle = guard; c.lineWidth = 2.4;
  c.beginPath(); c.moveTo(bx - px * 3.6, by - py * 3.6); c.lineTo(bx + px * 3.6, by + py * 3.6); c.stroke();
}

// 腕と手。袖の色は服の色(ベストは中に着ているシャツの色)
function drawArms(c: CanvasRenderingContext2D, L: RpgLook, hands: Hand[], cc: string, y0: number): void {
  const sleeve = L.clothes === 'vest' ? L.accentColor : cc;
  c.lineCap = 'round';
  for (const h of hands) {
    // 体の後ろの腕は、肩も少し内側にする
    const sx = h.side * (h.back ? 6.8 : 8.3);
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

// 後ろ髪の形(front#370 で、髪型ではなく「後ろ」を見て描く)。後ろ髪のないときは null
function backHair(L: RpgLook, y0: number, d: number): Path2D | null {
  const p = new Path2D();
  switch (hairBackOf(L)) {
    case 'long': p.roundRect(-14, y0 - 40, 28, 33, 10); break;
    case 'bob': p.roundRect(-15, y0 - 42, 30, 23, 10); break;
    case 'flip':
      // 外ハネ: ボブの長さで、毛先が外へ跳ねる
      p.moveTo(0, y0 - 44.5);
      p.bezierCurveTo(-9.5, y0 - 44.5, -15, y0 - 40, -15, y0 - 33);
      p.quadraticCurveTo(-15, y0 - 27, -15.2, y0 - 24.5);
      p.quadraticCurveTo(-16.5, y0 - 23, -17.6, y0 - 21.6);
      p.quadraticCurveTo(-15, y0 - 22, -12, y0 - 22);
      p.lineTo(12, y0 - 22);
      p.quadraticCurveTo(15, y0 - 22, 17.6, y0 - 21.6);
      p.quadraticCurveTo(16.5, y0 - 23, 15.2, y0 - 24.5);
      p.quadraticCurveTo(15, y0 - 27, 15, y0 - 33);
      p.bezierCurveTo(15, y0 - 40, 9.5, y0 - 44.5, 0, y0 - 44.5);
      p.closePath();
      break;
    case 'ponytail': teardrop(p, -d * 9, y0 - 40, -d * 15, y0 - 18, 6.5, -d * 2.5); break;
    case 'twintail':
      teardrop(p, -12, y0 - 37, -17, y0 - 14, 6, -2.5);
      teardrop(p, 12, y0 - 37, 17, y0 - 14, 6, 2.5);
      break;
    case 'sidetail': teardrop(p, d * 11, y0 - 38, d * 17, y0 - 15, 6.5, d * 3); break;
    case 'bun': p.arc(0, y0 - 45.5, 6.5, 0, Math.PI * 2); break;
    case 'wavy':
      // ふちを小さく波打たせたロング。上は頭の丸みにそわせ(角を作らない)、すそは少しすぼめる
      p.moveTo(0, y0 - 44.5);
      p.bezierCurveTo(-9, y0 - 44.5, -15, y0 - 40, -15, y0 - 33);
      p.quadraticCurveTo(-17, y0 - 27, -14.5, y0 - 22);
      p.quadraticCurveTo(-16.5, y0 - 16, -13.5, y0 - 11.5);
      p.quadraticCurveTo(-13, y0 - 6.5, -9, y0 - 7.5);
      p.quadraticCurveTo(-5.5, y0 - 5.5, -3, y0 - 9);
      p.lineTo(3, y0 - 9);
      p.quadraticCurveTo(5.5, y0 - 5.5, 9, y0 - 7.5);
      p.quadraticCurveTo(13, y0 - 6.5, 13.5, y0 - 11.5);
      p.quadraticCurveTo(16.5, y0 - 16, 14.5, y0 - 22);
      p.quadraticCurveTo(17, y0 - 27, 15, y0 - 33);
      p.bezierCurveTo(15, y0 - 40, 9, y0 - 44.5, 0, y0 - 44.5);
      p.closePath();
      break;
    default: return null;
  }
  return p;
}

// ポニーテール・ツインテール・サイドテールの結び目(髪の色を暗くした小さなゴム)
function hairTies(c: CanvasRenderingContext2D, L: RpgLook, y0: number, d: number): void {
  const ties: Record<string, [number, number][]> = {
    ponytail: [[-d * 9, y0 - 40]],
    twintail: [[-12, y0 - 37], [12, y0 - 37]],
    sidetail: [[d * 11, y0 - 38]]
  };
  const list = ties[hairBackOf(L)];
  if (!list) return;
  c.fillStyle = shade(L.hairColor, 0.55);
  for (const [x, y] of list) { c.beginPath(); c.arc(x, y, 2, 0, Math.PI * 2); c.fill(); }
}

// 前髪の形(front#370 で、髪型ではなく「トップ」を見て描く)。顔の横に垂らす髪の長さは「後ろ」に合わせる
function frontHair(L: RpgLook, y0: number, f: number, d: number): Path2D {
  const p = new Path2D();
  // 向いている側へ少しずらす
  const s = f * 0.8;
  const Y = (v: number) => y0 + v;
  const top = hairTopOf(L);
  if (top === 'spiky') {
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
  if (top === 'tufts') {
    // ぱらぱら: 毛先が分かれた前髪
    const pts = [[10, -33.5], [8.5, -31.6], [5.5, -35.2], [3, -32.6], [0, -36], [-3, -32.8], [-6, -35.4], [-8.5, -31.8], [-10.5, -33.8]];
    for (const [px, py] of pts) p.lineTo(px + s, Y(py));
    p.lineTo(-13, Y(-30.5));
  } else if (top === 'sweep') {
    // 横分け(向いている側へ流す)
    if (d > 0) {
      p.quadraticCurveTo(9, Y(-31), 3 + s, Y(-34.5));
      p.quadraticCurveTo(-5, Y(-39.5), -13, Y(-30.5));
    } else {
      p.quadraticCurveTo(5, Y(-39.5), -3 + s, Y(-34.5));
      p.quadraticCurveTo(-9, Y(-31), -13, Y(-30.5));
    }
  } else if (top === 'straight') {
    // ぱっつん
    p.quadraticCurveTo(12.6, Y(-33.8), 10, Y(-33.8));
    p.lineTo(-10, Y(-33.8));
    p.quadraticCurveTo(-12.6, Y(-33.8), -13, Y(-30.5));
  } else if (top === 'point') {
    // とんがり: 両側からゆるやかに下がり、まん中で合わさる幅の広い「く」の字の前髪。
    // とがった先は両目のあいだまで下げる(front#393。目は y0-28.5 の左右4にあり、先はそのあいだなのでかからない)
    p.quadraticCurveTo(12.5, Y(-34.4), 9.5 + s, Y(-35.6));
    p.quadraticCurveTo(4.5 + s, Y(-34.4), 0.3 + s, Y(-29.6));
    p.quadraticCurveTo(-3.9 + s, Y(-34.4), -8.9 + s, Y(-35.6));
    p.quadraticCurveTo(-12.5, Y(-34.4), -13, Y(-30.5));
  } else {
    // まん中分け: おでこが少し見える
    p.quadraticCurveTo(8.5 + s, Y(-32.5), 1.2 + s, Y(-39.5));
    p.lineTo(-0.2 + s, Y(-39.5));
    p.quadraticCurveTo(-8.5 + s, Y(-32.5), -13, Y(-30.5));
  }
  p.closePath();
  // 顔の横に垂らす髪(len: 長さ)。後ろの髪に合わせ、後ろ髪がなければ垂らさない。ウェーブは波打たせる
  const back = hairBackOf(L);
  const len = back === 'long' || back === 'wavy' ? 17 : back === 'bob' || back === 'flip' ? 10 : back === 'none' ? 0 : 7;
  if (len > 0) {
    for (const side of [-1, 1]) {
      p.moveTo(side * 13.3, Y(-34));
      if (back === 'wavy') {
        p.quadraticCurveTo(side * 15.5, Y(-28), side * 13, Y(-24));
        p.quadraticCurveTo(side * 15, Y(-20), side * 12.6, Y(-34 + len));
      } else {
        p.quadraticCurveTo(side * 14.6, Y(-34 + len * 0.55), side * 12.4, Y(-34 + len));
      }
      p.lineTo(side * 10, Y(-34 + len - 3.5));
      p.quadraticCurveTo(side * 10.7, Y(-34 + len * 0.45), side * 10.2, Y(-33));
      p.closePath();
    }
  }
  return p;
}

// 三つ編み: 向きと反対側の肩から前へ垂らす(編み目を少しずつ小さくし、先にゴムと毛先)
function drawBraid(c: CanvasRenderingContext2D, L: RpgLook, y0: number, d: number): void {
  const x0 = -d * 10.5, yA = y0 - 30, x1 = -d * 12, yB = y0 - 10;
  const p = new Path2D();
  const n = 5;
  for (let i = 0; i < n; i++) {
    const k = i / (n - 1);
    const x = x0 + (x1 - x0) * k + Math.sin(i * 1.7) * 0.4;
    const y = yA + (yB - yA) * k;
    const r = 3.3 - k * 0.7;
    p.moveTo(x + r, y);
    p.ellipse(x, y, r, r * 0.8, i % 2 ? 0.4 : -0.4, 0, Math.PI * 2);
  }
  fillShaded(c, p, L.hairColor, [x1 - 5, yA - 4, x1 + 5, yB + 4], 0.2, 0.5);
  c.fillStyle = shade(L.hairColor, 0.55);
  c.beginPath(); c.arc(x1, yB + 2.4, 1.6, 0, Math.PI * 2); c.fill();
  c.fillStyle = L.hairColor;
  c.beginPath(); c.moveTo(x1 - 2, yB + 3.2); c.lineTo(x1 + 2, yB + 3.2); c.lineTo(x1, yB + 7); c.closePath(); c.fill();
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
    // キラキラ(sparkle)は選べなくした(front#371)。すでにキラキラの見た目は、ふつうの目として描く
    const rx = e === 'sharp' ? 1.7 : 1.9;
    const ry = e === 'sharp' ? 2.3 : 2.6;
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
    c.beginPath(); c.arc(x0 - rx * 0.35, ey - ry * 0.4, 0.8, 0, Math.PI * 2); c.fill();
    c.restore();
    // 上まぶたの細い線。ふつう・メガネ(と、以前のキラキラ)は瞳の丸みにそった弧(外側を少し長く)、
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
  drawBrows(c, L, ex, ey - 4.6);
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
  // ほっぺ(front#369 で少し小さく。front#405 で輪郭をすぼめたので少し内側に寄せ、あごを付けたので少し下げる)
  c.fillStyle = 'rgba(255,120,120,0.35)';
  c.beginPath(); c.ellipse(-6 + f, y0 - 22.8, 1.8, 1.2, 0, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.ellipse(6 + f, y0 - 22.8, 1.8, 1.2, 0, 0, Math.PI * 2); c.fill();
  // 口(front#368 で全体的に小さく。front#405 であごを付けたので少し下げる)
  const mx = f;
  const my = y0 - 21;
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

/**
 * 眉(front#362)。色を選んでいなければ髪の色を少し暗くした色(白っぽい髪でも見えるように)。by は眉の高さ。
 * ふつう・太め・細めは、つり目なら外側を上げ、たれ目なら外側を下げる
 */
function drawBrows(c: CanvasRenderingContext2D, L: RpgLook, ex: number[], by: number): void {
  const brows = L.brows ?? 'normal';
  if (brows === 'none') return;
  const color = L.browColor || shade(L.hairColor, 0.85);
  const eyeTilt = L.eyes === 'sharp' ? 1.1 : L.eyes === 'droopy' ? -1.1 : 0;
  const tilt = brows === 'sharp' ? 1.7 : brows === 'worried' ? -1.7 : eyeTilt;
  c.strokeStyle = color;
  c.fillStyle = color;
  c.lineCap = 'round';
  c.lineWidth = brows === 'thick' ? 2.2 : brows === 'thin' ? 0.8 : 1.2;
  for (const [i, x0] of ex.entries()) {
    // 外側の向き(-1: 左 / 1: 右)
    const out = i === 0 ? -1 : 1;
    c.beginPath();
    if (brows === 'short') {
      // まろ: 小さな楕円
      c.ellipse(x0 - out * 0.4, by - 0.6, 1.3, 0.9, 0, 0, Math.PI * 2);
      c.fill();
      continue;
    }
    if (brows === 'arch') {
      // 山なり: まん中より少し外側をいちばん高くする
      c.moveTo(x0 - out * 2, by + 0.6);
      c.quadraticCurveTo(x0 + out * 0.4, by - 2.4, x0 + out * 2.4, by + 0.8);
    } else {
      c.moveTo(x0 - out * 1.8, by + tilt * 0.6);
      c.lineTo(x0 + out * 2.2, by - tilt);
    }
    c.stroke();
  }
}

// 赤っぽい色か(セーラー服のスカーフを、えりと同じような色にしない)
function isRed(hex: string): boolean {
  const [r, g, b] = rgb(hex);
  return r > 180 && g < 120 && b < 120;
}

// 服の形
function clothesPath(type: string, y0: number): Path2D {
  const p = new Path2D();
  if (type === 'robe') {
    p.moveTo(-8, y0 - 20); p.lineTo(8, y0 - 20); p.lineTo(12, y0 - 1); p.lineTo(-12, y0 - 1); p.closePath();
  } else if (type === 'dress') {
    p.roundRect(-8, y0 - 20, 16, 9, 5);
    p.moveTo(-7, y0 - 12); p.lineTo(7, y0 - 12); p.lineTo(13, y0 - 3); p.lineTo(-13, y0 - 3); p.closePath();
  } else if (type === 'sailor') {
    // セーラー服の上着(スカートは drawClothes で描く)
    p.roundRect(-9, y0 - 20, 18, 11, 5);
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
  } else if (type === 'hoodie') {
    // パーカー: 首のまわりのフード・ひも(差し色)・ポケット
    c.fillStyle = shade(cc, 0.82);
    c.beginPath(); c.ellipse(0, y0 - 20.5, 10.5, 3.6, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = ac; c.lineWidth = 1; c.lineCap = 'round';
    for (const x of [-2.5, 2.5]) { c.beginPath(); c.moveTo(x, y0 - 18); c.lineTo(x * 1.1, y0 - 12.5); c.stroke(); }
    c.fillStyle = shade(cc, 0.86);
    c.beginPath(); c.roundRect(-6, y0 - 10.5, 12, 4.5, 2); c.fill();
  } else if (type === 'sailor') {
    // セーラー服: スカート・えり(差し色)・スカーフ
    const skirt = new Path2D();
    skirt.moveTo(-8.5, y0 - 10.5); skirt.lineTo(8.5, y0 - 10.5); skirt.lineTo(12, y0 - 3); skirt.lineTo(-12, y0 - 3); skirt.closePath();
    fillShaded(c, skirt, ac, [-14, y0 - 21, 14, y0]);
    c.strokeStyle = shade(ac, 0.7); c.lineWidth = 0.8;
    for (const x of [-5, 0, 5]) { c.beginPath(); c.moveTo(x, y0 - 10); c.lineTo(x * 1.35, y0 - 3.5); c.stroke(); }
    c.fillStyle = ac;
    c.beginPath(); c.moveTo(-8.5, y0 - 20); c.lineTo(8.5, y0 - 20); c.lineTo(6, y0 - 16.5); c.lineTo(0, y0 - 13); c.lineTo(-6, y0 - 16.5); c.closePath(); c.fill();
    c.fillStyle = cc;
    c.beginPath(); c.moveTo(-3.5, y0 - 20); c.lineTo(3.5, y0 - 20); c.lineTo(0, y0 - 15.5); c.closePath(); c.fill();
    c.fillStyle = isRed(ac) ? '#fbbf24' : '#ef4444';
    c.beginPath(); c.moveTo(-2.6, y0 - 15); c.lineTo(2.6, y0 - 15); c.lineTo(0, y0 - 11.5); c.closePath(); c.fill();
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

// 魔法の杖(front#431): 握っている手から、少し前に傾けて上へ伸ばす。先に光る玉と、玉を抱える飾り
function drawStaff(c: CanvasRenderingContext2D, hx: number, hy: number, d: number, color: string, orb: string, t: number, moon = false): void {
  const ux = d * 0.2, uy = -0.98;
  const bx = hx - ux * 7, by = hy - uy * 7;
  const tx = hx + ux * 27, ty = hy + uy * 27;
  c.lineCap = 'round';
  c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 3.6;
  c.beginPath(); c.moveTo(bx, by); c.lineTo(tx, ty); c.stroke();
  c.strokeStyle = color; c.lineWidth = 2.4;
  c.beginPath(); c.moveTo(bx, by); c.lineTo(tx, ty); c.stroke();
  c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 0.8;
  c.beginPath(); c.moveTo(bx - 0.6, by); c.lineTo(tx - 0.6, ty); c.stroke();
  const ox = tx + ux * 4, oy = ty + uy * 4;
  if (moon) {
    // 三日月の杖: 先に三日月(先の色)。三日月の内側に小さな光る玉
    const glow = 0.3 + 0.15 * Math.sin(t * 3);
    const g = c.createRadialGradient(ox, oy, 0, ox, oy, 9);
    g.addColorStop(0, hexA(orb, glow)); g.addColorStop(1, hexA(orb, 0));
    c.fillStyle = g; c.beginPath(); c.arc(ox, oy, 9, 0, Math.PI * 2); c.fill();
    const m = new Path2D();
    m.arc(ox, oy - 0.5, 6, Math.PI * 0.95, Math.PI * 2.05, true);
    m.arc(ox, oy - 2.6, 4.6, Math.PI * 2.0, Math.PI * 1.0, false);
    m.closePath();
    c.fillStyle = orb; c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 0.8;
    c.fill(m); c.stroke(m);
    c.fillStyle = '#fff';
    c.beginPath(); c.arc(ox, oy - 2.2, 1.4, 0, Math.PI * 2); c.fill();
    return;
  }
  // 玉を抱える飾り(杖の色)
  c.strokeStyle = color; c.lineWidth = 1.6;
  c.beginPath(); c.arc(ox, oy, 4.6, Math.PI * 0.15, Math.PI * 0.85); c.stroke();
  // 光る玉(ゆっくり明るさが変わる)
  const glow = 0.35 + 0.15 * Math.sin(t * 3);
  const g = c.createRadialGradient(ox, oy, 0, ox, oy, 8);
  g.addColorStop(0, hexA(orb, glow)); g.addColorStop(1, hexA(orb, 0));
  c.fillStyle = g; c.beginPath(); c.arc(ox, oy, 8, 0, Math.PI * 2); c.fill();
  c.fillStyle = orb; c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 0.8;
  c.beginPath(); c.arc(ox, oy, 3.2, 0, Math.PI * 2); c.fill(); c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.85)';
  c.beginPath(); c.arc(ox - 1, oy - 1.1, 1, 0, Math.PI * 2); c.fill();
}

function hexA(hex: string, a: number): string {
  const [r, g, b] = rgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

// 大剣(front#431): 片手剣より太く長い刃。刃の形を塗り、ふち・まん中の溝・広いつば・柄頭を描く
function drawGreatsword(c: CanvasRenderingContext2D, hx: number, hy: number, d: number, color: string, guard: string): void {
  const ux = d * 0.47, uy = -0.88;
  const px = 0.88, py = d * 0.47;
  c.lineCap = 'round';
  // 柄と柄頭
  c.strokeStyle = '#4a3420'; c.lineWidth = 2.6;
  c.beginPath(); c.moveTo(hx - ux * 3.5, hy - uy * 3.5); c.lineTo(hx + ux * 1.5, hy + uy * 1.5); c.stroke();
  c.fillStyle = guard;
  c.beginPath(); c.arc(hx - ux * 4.4, hy - uy * 4.4, 1.6, 0, Math.PI * 2); c.fill();
  // 刃(根元が太く、先がとがる)
  const bx = hx + ux * 2.4, by = hy + uy * 2.4;
  const L = 22, w = 2.7;
  const blade = new Path2D();
  blade.moveTo(bx - px * w, by - py * w);
  blade.lineTo(bx + ux * (L - 4) - px * w * 0.8, by + uy * (L - 4) - py * w * 0.8);
  blade.lineTo(bx + ux * L, by + uy * L);
  blade.lineTo(bx + ux * (L - 4) + px * w * 0.8, by + uy * (L - 4) + py * w * 0.8);
  blade.lineTo(bx + px * w, by + py * w);
  blade.closePath();
  c.fillStyle = color; c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 0.8;
  c.fill(blade); c.stroke(blade);
  // 光(片側)と、まん中の溝
  c.strokeStyle = 'rgba(255,255,255,0.65)'; c.lineWidth = 1;
  c.beginPath(); c.moveTo(bx - px * 1.6, by - py * 1.6); c.lineTo(bx + ux * (L - 5) - px * 1.4, by + uy * (L - 5) - py * 1.4); c.stroke();
  c.strokeStyle = 'rgba(0,0,0,0.18)'; c.lineWidth = 0.8;
  c.beginPath(); c.moveTo(bx + ux * 1.5, by + uy * 1.5); c.lineTo(bx + ux * (L - 6), by + uy * (L - 6)); c.stroke();
  // つば(広く、まん中に石)
  c.strokeStyle = guard; c.lineWidth = 2.8;
  c.beginPath(); c.moveTo(bx - px * 5.2, by - py * 5.2); c.lineTo(bx + px * 5.2, by + py * 5.2); c.stroke();
  c.fillStyle = '#fff'; c.globalAlpha = 0.8;
  c.beginPath(); c.arc(bx, by, 1, 0, Math.PI * 2); c.fill();
  c.globalAlpha = 1;
}
