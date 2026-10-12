import { RpgEnemy } from '../models/rpg.models';

/**
 * RPGの敵(front#229)。種類ごとのデータ(マップ作成画面の「敵」タブで作る)と、体の絵・攻撃の動きの描き方を持つ。
 * ゲーム画面と「敵」タブのプレビューで同じ絵になるよう、描く関数はここにまとめる。
 * 形・攻撃の名前はAPI(RpgEnemyService)と合わせる。
 */

export type EnemyShape = 'slime' | 'mushroom' | 'wisp' | 'raptor' | 'golem' | 'ghost' | 'knight' | 'lord' | 'bat' | 'skeleton' | 'plant' | 'dragon';
export type EnemyAttack = 'tackle' | 'claw' | 'bite' | 'jump' | 'fire' | 'water' | 'wind' | 'thunder' | 'dark' | 'shockwave';

export type EnemyDef = Omit<RpgEnemy, 'sortOrder' | 'updatedAt'> & { shape: EnemyShape; attack: EnemyAttack };

export const ENEMY_SHAPES: [EnemyShape, string][] = [
  ['slime', 'スライム'], ['mushroom', 'キノコ'], ['wisp', '精霊'], ['raptor', 'ラプトル'],
  ['golem', 'ゴーレム'], ['ghost', 'ゴースト'], ['knight', '騎士'], ['lord', '魔導士'],
  ['bat', 'コウモリ'], ['skeleton', 'ガイコツ'], ['plant', 'ひとくいそう'], ['dragon', 'ドラゴン']
];

export interface AttackSpec {
  id: EnemyAttack;
  label: string;
  icon: string;
  // look: 動きだけが変わる(となりのマスを攻撃する) / rule: ゲームのきまりも変わる
  kind: 'look' | 'rule';
  desc: string;
}

export const ENEMY_ATTACKS: AttackSpec[] = [
  { id: 'tackle', label: '体当たり', icon: '💥', kind: 'rule', desc: '体をふるわせて力をためてから、まっすぐ突っ込む。ためている間に横へ動けば当たらない（距離1・ためる時間0なら、となりの相手に少し前に出てぶつかる）。' },
  { id: 'claw', label: 'ひっかき', icon: '🐾', kind: 'look', desc: 'となりのマスにいる相手を、爪でひっかく。白い爪あとが走る。' },
  { id: 'bite', label: 'かみつき', icon: '🦷', kind: 'look', desc: 'となりのマスにいる相手に、大きく飛びかかってかみつく。' },
  { id: 'jump', label: 'ジャンプ', icon: '⤴️', kind: 'rule', desc: '体をふるわせて力をためてから、跳び上がって相手の上に落ちる。着地で土ぼこりが立つ。ためている間に動けばよけられる。' },
  { id: 'fire', label: '炎', icon: '🔥', kind: 'rule', desc: '相手の足元の地面が赤く光り、下から火柱が噴き上がる。光ったマスから離れればよけられる。' },
  { id: 'water', label: '水', icon: '💧', kind: 'rule', desc: '相手の足元に水の輪が出て、少しあとに水柱が吹き上がる。輪が出たマスから離れればよけられる。' },
  { id: 'wind', label: '風', icon: '🌪️', kind: 'rule', desc: '相手のいたマスに竜巻が起こり、その場で回って消える（動かない）。できはじめたら離れればよけられる。' },
  { id: 'thunder', label: '雷', icon: '⚡', kind: 'rule', desc: '相手の頭の上に小さな雷雲が出て、少しあとに稲妻が落ちる。雲が出たマスから離れればよけられる。' },
  { id: 'dark', label: '暗黒', icon: '🌑', kind: 'rule', desc: '相手の足元に黒い影が広がり、少しあとに闇の柱が立ちのぼる。影が出たマスから離れればよけられる。' },
  { id: 'shockwave', label: '衝撃波', icon: '🌀', kind: 'rule', desc: '足元の地面が一瞬赤く光り、輪がすばやく広がる。範囲の中にいると、輪が届いたときに当たる。' }
];

// 離れたところ(相手の足元)に出す攻撃
export const SPELLS: EnemyAttack[] = ['fire', 'water', 'wind', 'thunder', 'dark'];

export const ENEMY_COLORS = [
  '#7ddc6f', '#6fb6ff', '#e85d75', '#7ef9ff', '#7fb069', '#a3acb6', '#f5f3ff', '#475569', '#6d28d9', '#fbbf24', '#f97316', '#ec4899', '#1f2937', '#8b5a2b',
  '#ef4444', '#fde047', '#ffffff', '#1e3a8a', '#14b8a6', '#a3e635', '#d6b98c'
];
export const ENEMY_DARKS = [
  '#3fa24a', '#2c74d6', '#b83a52', '#22b8c9', '#4f7a3d', '#6b7480', '#a78bfa', '#1f2937', '#2e1065', '#b45309', '#9a3412', '#9d174d', '#0b0f19', '#5b3a1f',
  '#991b1b', '#a16207', '#94a3b8', '#172554', '#0f766e', '#4d7c0f', '#8b6f47'
];

// 値の範囲(APIと合わせる)
export const ENEMY_LIMITS = {
  size: [0.8, 1.6], hp: [1, 99999], stat: [0, 9999], interval: [0.5, 5], speed: [0.5, 5], reward: [0, 99999],
  sight: [0, 8], respawn: [3, 600], dash: [1, 5], charge: [0, 2], range: [1, 5], radius: [1, 2]
} as const;

const base = { boss: false, attack: 'tackle' as EnemyAttack, dash: 1, charge: 0, range: 3, radius: 1 };

// まだ「敵」タブで保存していないときの13種類(APIの default_enemies.json と同じ)
export const DEFAULT_ENEMIES: EnemyDef[] = [
  { ...base, id: 'slime', name: 'スライム', shape: 'slime', color: '#7ddc6f', dark: '#3fa24a', size: 1, hp: 22, atk: 8, def: 1, interval: 1.4, speed: 1.3, exp: 6, gold: 4, drop: 'potion', dropRate: 0.25, sight: 0, respawn: 10 },
  { ...base, id: 'blue', name: 'ブルースライム', shape: 'slime', color: '#6fb6ff', dark: '#2c74d6', size: 1.2, hp: 50, atk: 14, def: 5, interval: 1.3, speed: 1.6, exp: 16, gold: 10, drop: 'potion', dropRate: 0.35, sight: 2.5, respawn: 10 },
  { ...base, id: 'kinokon', name: 'キノコン', shape: 'mushroom', color: '#e85d75', dark: '#b83a52', size: 1, hp: 75, atk: 20, def: 8, interval: 1.5, speed: 1.2, exp: 26, gold: 15, drop: 'potion', dropRate: 0.35, sight: 0, respawn: 10 },
  { ...base, id: 'spirit', name: 'もりのせいれい', shape: 'wisp', color: '#7ef9ff', dark: '#22b8c9', size: 1, hp: 60, atk: 26, def: 6, interval: 1.2, speed: 2.2, exp: 32, gold: 18, drop: 'hipotion', dropRate: 0.2, sight: 3, respawn: 10 },
  { ...base, id: 'raptor', name: 'ラプトル', shape: 'raptor', color: '#7fb069', dark: '#4f7a3d', size: 1, hp: 130, atk: 34, def: 12, interval: 1.2, speed: 2.4, exp: 60, gold: 32, drop: 'hipotion', dropRate: 0.3, sight: 3.5, respawn: 10 },
  { ...base, id: 'golem', name: 'いわゴーレム', shape: 'golem', color: '#a3acb6', dark: '#6b7480', size: 1, hp: 240, atk: 42, def: 20, interval: 1.8, speed: 1.1, exp: 110, gold: 65, drop: 'hipotion', dropRate: 0.6, sight: 3, respawn: 10 },
  { ...base, id: 'ghost', name: 'ゴースト', shape: 'ghost', color: '#f5f3ff', dark: '#a78bfa', size: 1, hp: 170, atk: 48, def: 16, interval: 1.4, speed: 1.8, exp: 120, gold: 55, drop: 'hipotion', dropRate: 0.4, sight: 3, respawn: 10 },
  { ...base, id: 'knight', name: 'ダークナイト', shape: 'knight', color: '#475569', dark: '#334155', size: 1.15, hp: 320, atk: 62, def: 30, interval: 1.6, speed: 1.4, exp: 220, gold: 110, drop: 'hipotion', dropRate: 0.5, sight: 3, respawn: 10 },
  { ...base, id: 'darklord', name: '闇の魔導士', shape: 'lord', color: '#6d28d9', dark: '#1e1b4b', size: 1.45, hp: 900, atk: 85, def: 40, interval: 2, speed: 1.2, exp: 1000, gold: 500, drop: 'hipotion', dropRate: 1, sight: 4, respawn: 60, boss: true },
  // 後から足した形の敵(front#255)
  { ...base, id: 'nightbat', name: 'ナイトバット', shape: 'bat', color: '#6d28d9', dark: '#2e1065', size: 0.9, hp: 45, atk: 18, def: 3, interval: 1.1, speed: 2.6, exp: 14, gold: 8, drop: 'potion', dropRate: 0.3, sight: 3.5, respawn: 10, attack: 'bite' },
  { ...base, id: 'skeleton', name: 'ガイコツ兵', shape: 'skeleton', color: '#f5f3ff', dark: '#172554', size: 1, hp: 150, atk: 40, def: 14, interval: 1.4, speed: 1.5, exp: 80, gold: 40, drop: 'hipotion', dropRate: 0.4, sight: 3, respawn: 10, attack: 'claw' },
  { ...base, id: 'maneater', name: 'ひとくいそう', shape: 'plant', color: '#ec4899', dark: '#4d7c0f', size: 1.1, hp: 110, atk: 30, def: 10, interval: 1.6, speed: 0.5, exp: 40, gold: 22, drop: 'hipotion', dropRate: 0.3, sight: 0, respawn: 10, attack: 'bite' },
  { ...base, id: 'reddragon', name: 'レッドドラゴン', shape: 'dragon', color: '#ef4444', dark: '#991b1b', size: 1.4, hp: 650, atk: 58, def: 26, interval: 2.2, speed: 1.3, exp: 450, gold: 220, drop: 'hipotion', dropRate: 1, sight: 4, respawn: 60, boss: true, attack: 'fire' }
];

/**
 * 敵の種類(IDごと)。最初は9種類で、ゲーム・マップ作成画面がAPIから読んだ敵で setEnemies する。
 * 中身を入れ替えるだけで、この表を使っている所(ゲーム・描画・パレット)はそのまま新しい敵を使える
 */
const SHAPE_IDS = ENEMY_SHAPES.map(([id]) => id);
const ATTACK_IDS = ENEMY_ATTACKS.map((a) => a.id);

export const ENEMIES: Record<string, EnemyDef> = {};

export function setEnemies(list: (RpgEnemy | EnemyDef)[]): void {
  for (const key of Object.keys(ENEMIES)) delete ENEMIES[key];
  for (const e of list) {
    // 知らない形・攻撃(新しいAPIと古い画面の組み合わせなど)は、スライム・体当たりとして扱う
    const shape = (SHAPE_IDS as string[]).includes(e.shape) ? (e.shape as EnemyShape) : 'slime';
    const attack = (ATTACK_IDS as string[]).includes(e.attack) ? (e.attack as EnemyAttack) : 'tackle';
    const { sortOrder: _s, updatedAt: _u, ...rest } = e as RpgEnemy;
    ENEMIES[e.id] = { ...rest, shape, attack };
  }
}

setEnemies(DEFAULT_ENEMIES);

// 形ごとの、クリックで選べる高さ・足元の印の大きさ(大きさ 1 のとき)
const HIT_HEIGHT: Record<EnemyShape, number> = {
  slime: 28, mushroom: 36, wisp: 46, raptor: 40, golem: 62, ghost: 50, knight: 56, lord: 65, bat: 46, skeleton: 48, plant: 50, dragon: 68
};
const RING: Record<EnemyShape, number> = {
  slime: 1, mushroom: 1, wisp: 1, raptor: 1.2, golem: 1.5, ghost: 1, knight: 1, lord: 1, bat: 0.9, skeleton: 1, plant: 1.1, dragon: 1.6
};

export const hitHeightOf = (def: EnemyDef) => HIT_HEIGHT[def.shape] * def.size;
export const ringSizeOf = (def: EnemyDef) => RING[def.shape] * def.size;
// 横に長い形を「敵」タブの見本の枠に収めるための縮め方
export const thumbFitOf = (def: EnemyDef) => (def.shape === 'dragon' ? 0.72 : 1);
// 根を張っていて、その場から動かない形(front#255)。歩く速さの設定は使わない
export const isRooted = (def: Pick<EnemyDef, 'shape'>) => def.shape === 'plant';

// ===== 攻撃の長さ(秒)と当たる時(攻撃を始めてからの秒) =====

/** 体当たり・ジャンプで、相手まで動くか(距離1なら、その場で少し前に出るだけ) */
export const movesToTarget = (def: EnemyDef) => (def.attack === 'tackle' || def.attack === 'jump') && def.dash > 1;

export function attackTiming(def: EnemyDef): { duration: number; hitAt: number } {
  const c = def.charge;
  switch (def.attack) {
    case 'tackle': return def.dash > 1 ? { duration: c + 0.5, hitAt: c + 0.25 } : { duration: c + 0.35, hitAt: c };
    case 'jump': return { duration: c + 0.75, hitAt: c + 0.42 };
    case 'claw': return { duration: 0.55, hitAt: 0.22 };
    case 'bite': return { duration: 0.6, hitAt: 0.27 };
    case 'fire': return { duration: 1.0, hitAt: 0.45 };
    case 'water': return { duration: 0.9, hitAt: 0.45 };
    case 'wind': return { duration: 1.0, hitAt: 0.4 };
    case 'thunder': return { duration: 0.9, hitAt: 0.41 };
    case 'dark': return { duration: 1.0, hitAt: 0.45 };
    case 'shockwave': return { duration: 0.75, hitAt: 0.38 };
  }
}

/** 攻撃を始められる距離(マス)。この距離まで近づいたら、止まって攻撃する */
export function attackReach(def: EnemyDef, melee: number): number {
  if (SPELLS.includes(def.attack)) return Math.max(melee, def.range + 0.35);
  if (def.attack === 'shockwave') return Math.max(melee, def.radius + 0.35);
  if (movesToTarget(def)) return Math.max(melee, def.dash + 0.35);
  return melee;
}

// ===== 体の絵 =====

export interface EnemyPose {
  dir: number;
  time: number;
  moving?: boolean;
  // ダメージを受けたとき、白く光る
  flash?: boolean;
  // 襲ってきているとき、怒った顔にする
  aggro?: boolean;
  // 攻撃したときの前に出る量(0〜1)
  lunge?: number;
  // 揺れ方をずらす
  seed?: number;
}

function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.min(255, Math.round(v * f));
  return `rgb(${c(n >> 16)}, ${c((n >> 8) & 255)}, ${c(n & 255)})`;
}

function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (sh: number) => Math.round(((pa >> sh) & 255) * (1 - t) + ((pb >> sh) & 255) * t);
  return `rgb(${ch(16)}, ${ch(8)}, ${ch(0)})`;
}

function shadow(c: CanvasRenderingContext2D, rx: number, ry: number, a = 0.18): void {
  c.fillStyle = `rgba(0,0,0,${a})`;
  c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); c.fill();
}

function poly(c: CanvasRenderingContext2D, pts: [number, number][], fill: string): void {
  c.beginPath();
  pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.closePath();
  c.fillStyle = fill;
  c.fill();
}

function eyes(c: CanvasRenderingContext2D, x: number, y: number, gap: number, rx: number, ry: number, color = '#1f2937'): void {
  c.fillStyle = color;
  c.beginPath(); c.ellipse(x - gap, y, rx, ry, 0, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.ellipse(x + gap, y, rx, ry, 0, 0, Math.PI * 2); c.fill();
}

function angryBrows(c: CanvasRenderingContext2D, x: number, ey: number, s: number): void {
  c.strokeStyle = '#1f2937';
  c.lineWidth = 1.6;
  c.beginPath();
  c.moveTo(x - 8 * s, ey - 6 * s); c.lineTo(x - 3 * s, ey - 4 * s);
  c.moveTo(x + 8 * s, ey - 6 * s); c.lineTo(x + 3 * s, ey - 4 * s);
  c.stroke();
}

/** 敵の体を、足元を (0, 0) として描く(大きさはこの中で掛ける)。戻り値は頭の上の高さ(HPバー・名前を出す位置) */
export function drawEnemyBody(c: CanvasRenderingContext2D, def: EnemyDef, pose: EnemyPose): number {
  c.save();
  c.scale(def.size, def.size);
  let top: number;
  switch (def.shape) {
    case 'slime': top = drawSlime(c, def, pose); break;
    case 'mushroom': top = drawMushroom(c, def, pose); break;
    case 'wisp': top = drawWisp(c, def, pose); break;
    case 'raptor': top = drawRaptor(c, def, pose); break;
    case 'golem': top = drawGolem(c, def, pose); break;
    case 'ghost': top = drawGhost(c, def, pose); break;
    case 'knight': top = drawChibi(c, def, pose, false); break;
    case 'lord': top = drawChibi(c, def, pose, true); break;
    case 'bat': top = drawBat(c, def, pose); break;
    case 'skeleton': top = drawSkeleton(c, def, pose); break;
    case 'plant': top = drawPlant(c, def, pose); break;
    case 'dragon': top = drawDragon(c, def, pose); break;
  }
  c.restore();
  return top * def.size;
}

function drawSlime(c: CanvasRenderingContext2D, def: EnemyDef, p: EnemyPose): number {
  const t = p.time;
  const sq = Math.sin(t * 5 + (p.seed ?? 0)) * 0.07 + (p.moving ? Math.sin(t * 12) * 0.06 : 0);
  shadow(c, 14, 5);
  const rx = 15 * (1 + sq);
  const hgt = 20 * (1 - sq);
  const grd = c.createRadialGradient(-4, -hgt * 0.7, 2, 0, -hgt / 2, rx * 1.3);
  grd.addColorStop(0, '#ffffff');
  grd.addColorStop(0.25, def.color);
  grd.addColorStop(1, def.dark);
  c.fillStyle = p.flash ? '#ffffff' : grd;
  c.beginPath();
  c.moveTo(-rx, 0);
  c.bezierCurveTo(-rx, -hgt / 0.75, rx, -hgt / 0.75, rx, 0);
  c.closePath();
  c.fill();
  c.strokeStyle = 'rgba(0,0,0,0.2)';
  c.lineWidth = 1;
  c.stroke();
  const ey = -hgt * 0.5;
  const f = p.dir * 2.5;
  eyes(c, f, ey, 5, 2, 3);
  if (p.aggro) angryBrows(c, f, ey, 1);
  return hgt + 4;
}

function drawMushroom(c: CanvasRenderingContext2D, def: EnemyDef, p: EnemyPose): number {
  const hop = p.moving ? -Math.abs(Math.sin(p.time * 9)) * 5 : 0;
  const f = p.dir * 2;
  shadow(c, 13, 5);
  c.fillStyle = p.flash ? '#fff' : '#fff3e0';
  c.beginPath(); c.roundRect(-8, hop - 18, 16, 17, 6); c.fill();
  c.strokeStyle = 'rgba(0,0,0,0.15)';
  c.lineWidth = 1;
  c.stroke();
  eyes(c, f, hop - 10, 3.5, 1.6, 2.4);
  c.fillStyle = p.flash ? '#fff' : def.color;
  c.beginPath();
  c.moveTo(-18, hop - 15);
  c.bezierCurveTo(-18, hop - 40, 18, hop - 40, 18, hop - 15);
  c.closePath();
  c.fill();
  c.strokeStyle = def.dark;
  c.stroke();
  c.fillStyle = '#fff';
  for (const [dx, dy, r] of [[-8, -24, 3.2], [6, -28, 3.6], [1, -19, 2.2], [11, -19, 2]]) {
    c.beginPath(); c.arc(dx, hop + dy, r, 0, Math.PI * 2); c.fill();
  }
  if (p.aggro) angryBrows(c, f, hop - 10, 0.8);
  return 36 - hop;
}

function drawWisp(c: CanvasRenderingContext2D, def: EnemyDef, p: EnemyPose): number {
  const t = p.time;
  const fl = Math.sin(t * 3 + (p.seed ?? 0)) * 4;
  const cy = -28 + fl;
  shadow(c, 9, 3.5);
  for (let i = 1; i <= 3; i++) {
    c.globalAlpha = 0.35 - i * 0.08;
    c.fillStyle = def.color;
    c.beginPath();
    c.arc(-p.dir * i * 7, cy + i * 3 + Math.sin(t * 6 + i) * 2, 6 - i, 0, Math.PI * 2);
    c.fill();
  }
  c.globalAlpha = 1;
  const g = c.createRadialGradient(0, cy, 2, 0, cy, 22);
  g.addColorStop(0, 'rgba(255,255,255,0.9)');
  g.addColorStop(0.35, p.flash ? '#fff' : def.color);
  g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g;
  c.beginPath(); c.arc(0, cy, 22, 0, Math.PI * 2); c.fill();
  eyes(c, p.dir * 2, cy - 1, 3.5, 1.6, 2.4, shade(def.dark, 0.4));
  if (p.aggro) angryBrows(c, p.dir * 2, cy - 1, 0.7);
  return 46 - fl;
}

function drawRaptor(c: CanvasRenderingContext2D, def: EnemyDef, p: EnemyPose): number {
  const d = p.dir;
  const y = p.moving ? -Math.abs(Math.sin(p.time * 12)) * 3 : 0;
  const step = p.moving ? Math.sin(p.time * 14) * 4 : 0;
  shadow(c, 20, 6);
  const col = p.flash ? '#fff' : def.color;
  const dk = p.flash ? '#fff' : def.dark;
  c.strokeStyle = dk;
  c.lineWidth = 3.5;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(-3, y - 12); c.lineTo(-5 + step, -1);
  c.moveTo(4, y - 12); c.lineTo(5 - step, -1);
  c.stroke();
  poly(c, [[-d * 8, y - 22], [-d * 32, y - 26], [-d * 8, y - 13]], dk);
  c.fillStyle = col;
  c.beginPath(); c.ellipse(0, y - 18, 15, 9, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#efe7c0';
  c.beginPath(); c.ellipse(d * 3, y - 14, 9, 4.5, 0, 0, Math.PI * 2); c.fill();
  c.strokeStyle = dk;
  c.lineWidth = 2;
  for (let i = -1; i <= 1; i++) {
    c.beginPath(); c.moveTo(i * 5, y - 26); c.lineTo(i * 5 - d * 2, y - 21); c.stroke();
  }
  c.fillStyle = col;
  c.beginPath(); c.ellipse(d * 12, y - 26, 5, 8, d * 0.4, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.ellipse(d * 18, y - 33, 10, 6, 0, 0, Math.PI * 2); c.fill();
  poly(c, [[d * 18, y - 30], [d * 28, y - 30], [d * 18, y - 27]], '#fff');
  c.fillStyle = '#fff';
  c.beginPath(); c.arc(d * 19, y - 36, 2.6, 0, Math.PI * 2); c.fill();
  c.fillStyle = p.aggro ? '#dc2626' : '#1f2937';
  c.beginPath(); c.arc(d * 20, y - 36, 1.4, 0, Math.PI * 2); c.fill();
  return 42;
}

function drawGolem(c: CanvasRenderingContext2D, def: EnemyDef, p: EnemyPose): number {
  const bob = p.moving ? Math.abs(Math.sin(p.time * 6)) * -2 : 0;
  shadow(c, 24, 9, 0.2);
  const col = p.flash ? '#ffffff' : def.color;
  const d = p.flash ? '#ffffff' : def.dark;
  c.fillStyle = d;
  c.beginPath(); c.roundRect(-15, -14, 11, 14, 4); c.fill();
  c.beginPath(); c.roundRect(4, -14, 11, 14, 4); c.fill();
  c.fillStyle = col;
  c.beginPath(); c.roundRect(-20, -42 + bob, 40, 32, 10); c.fill();
  c.fillStyle = d;
  c.beginPath(); c.roundRect(-30, -38 + bob, 11, 22, 5); c.fill();
  c.beginPath(); c.roundRect(19, -38 + bob, 11, 22, 5); c.fill();
  c.fillStyle = col;
  c.beginPath(); c.roundRect(-12, -58 + bob, 24, 18, 6); c.fill();
  c.fillStyle = p.aggro ? '#ff7a2f' : '#ffd54a';
  c.fillRect(-7 + p.dir * 2, -52 + bob, 4, 4);
  c.fillRect(3 + p.dir * 2, -52 + bob, 4, 4);
  return 60;
}

function drawGhost(c: CanvasRenderingContext2D, def: EnemyDef, p: EnemyPose): number {
  const t = p.time;
  const fl = Math.sin(t * 2.5 + (p.seed ?? 0)) * 4;
  const y = -8 + fl;
  shadow(c, 12, 4, 0.12);
  c.globalAlpha = 0.88;
  const g = c.createLinearGradient(0, y - 40, 0, y);
  g.addColorStop(0, p.flash ? '#fff' : def.color);
  g.addColorStop(1, def.dark);
  c.fillStyle = g;
  c.beginPath();
  c.arc(0, y - 26, 14, Math.PI, 0);
  c.lineTo(14, y - 4);
  for (let i = 0; i < 4; i++) {
    const x0 = 14 - i * 7;
    const w = Math.sin(t * 6 + i) * 2;
    c.quadraticCurveTo(x0 - 3.5, y + 4 + w, x0 - 7, y - 4);
  }
  c.closePath();
  c.fill();
  c.globalAlpha = 1;
  eyes(c, p.dir * 2, y - 26, 5, 2.4, 3.6, '#1e1b4b');
  c.beginPath(); c.ellipse(p.dir * 2, y - 17, 2.5, 3, 0, 0, Math.PI * 2); c.fill();
  if (p.aggro) angryBrows(c, p.dir * 2, y - 26, 1);
  return 48 - fl;
}

// 騎士・魔導士(二頭身)。体=明るい色、髪=暗い色。目はいつも光る。魔導士は帽子・杖・オーラ、騎士は剣・羽飾り
function drawChibi(c: CanvasRenderingContext2D, def: EnemyDef, p: EnemyPose, lord: boolean): number {
  const t = p.time;
  const d = p.dir;
  const bob = p.moving ? -Math.abs(Math.sin(t * 10)) * 3 : Math.sin(t * 2 + (p.seed ?? 0)) * 0.8;
  const y0 = bob;
  const f = d * 2.5;
  if (lord) {
    const g = c.createRadialGradient(0, 0, 4, 0, 0, 30);
    g.addColorStop(0, `rgba(167,139,250,${0.6 + Math.sin(t * 3) * 0.2})`);
    g.addColorStop(1, 'rgba(167,139,250,0)');
    c.fillStyle = g;
    c.beginPath(); c.ellipse(0, 0, 30, 13, 0, 0, Math.PI * 2); c.fill();
  }
  shadow(c, 13, 5);
  const step = p.moving ? Math.sin(t * 14) * 2.5 : 0;
  c.fillStyle = '#5b4636';
  c.beginPath(); c.ellipse(-4, -2 - Math.max(0, step), 3.5, 2.5, 0, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.ellipse(4, -2 - Math.max(0, -step), 3.5, 2.5, 0, 0, Math.PI * 2); c.fill();
  c.lineCap = 'round';
  if (lord) {
    c.strokeStyle = '#3b2414';
    c.lineWidth = 3;
    c.beginPath(); c.moveTo(d * 11, y0 - 4); c.lineTo(d * 13, y0 - 46); c.stroke();
    c.save();
    c.shadowColor = '#e879f9';
    c.shadowBlur = 12;
    c.fillStyle = '#e879f9';
    c.beginPath(); c.arc(d * 13, y0 - 49, 4.5, 0, Math.PI * 2); c.fill();
    c.restore();
  } else {
    const hx = d * 10;
    const hy = y0 - 12;
    c.strokeStyle = '#94a3b8';
    c.lineWidth = 3.5;
    c.beginPath(); c.moveTo(hx, hy); c.lineTo(hx + d * 9, hy - 16); c.stroke();
    c.strokeStyle = '#6b4a2b';
    c.lineWidth = 3;
    c.beginPath(); c.moveTo(hx - 3, hy + 1); c.lineTo(hx + 4 * d, hy - 1); c.stroke();
  }
  c.fillStyle = p.flash ? '#ff9b9b' : def.color;
  c.beginPath(); c.roundRect(-9, y0 - 20, 18, 16, 6); c.fill();
  c.strokeStyle = 'rgba(0,0,0,0.15)';
  c.lineWidth = 1;
  c.stroke();
  c.fillStyle = lord ? '#ddd6fe' : '#1f2937';
  c.beginPath(); c.arc(0, y0 - 31, 12, 0, Math.PI * 2); c.fill(); c.stroke();
  c.fillStyle = def.dark;
  c.beginPath();
  c.arc(0, y0 - 32, 13, Math.PI, 0);
  c.lineTo(13, y0 - 29);
  c.quadraticCurveTo(f * 2, y0 - 36, -13, y0 - 29);
  c.closePath();
  c.fill();
  if (lord) {
    // 帽子は髪(暗い色)と体(明るい色)の間の色
    poly(c, [[-15, y0 - 38], [15, y0 - 38], [d * 8, y0 - 66]], mix(def.dark, def.color, 0.25));
    c.fillStyle = mix(def.dark, def.color, 0.4);
    c.beginPath(); c.ellipse(0, y0 - 38, 17, 4, 0, 0, Math.PI * 2); c.fill();
  } else {
    c.fillStyle = '#dc2626';
    c.beginPath(); c.ellipse(-d * 2, y0 - 48, 3.5, 8, -d * 0.3, 0, Math.PI * 2); c.fill();
  }
  c.save();
  const eye = lord ? '#e11d48' : '#f87171';
  c.shadowColor = eye;
  c.shadowBlur = 8;
  eyes(c, f, y0 - 27, 4, 1.8, 2.6, eye);
  c.restore();
  if (!lord && p.lunge && p.lunge > 0) {
    c.strokeStyle = `rgba(255,255,255,${p.lunge})`;
    c.lineWidth = 3;
    c.beginPath(); c.arc(d * 14, y0 - 16, 15, -1.2, 1.2); c.stroke();
  }
  return lord ? 66 : 54;
}

// コウモリ(front#255): 宙に浮いて羽ばたく。体=明るい色、羽=暗い色。襲ってくると羽ばたきが速くなる
function drawBat(c: CanvasRenderingContext2D, def: EnemyDef, p: EnemyPose): number {
  const t = p.time;
  const fl = Math.sin(t * 4 + (p.seed ?? 0)) * 3;
  const cy = -30 + fl;
  const flap = Math.sin(t * (p.moving || p.aggro ? 22 : 14));
  shadow(c, 10, 3.5, 0.14);
  const body = p.flash ? '#fff' : def.color;
  c.fillStyle = p.flash ? '#fff' : def.dark;
  for (const s of [-1, 1]) {
    c.beginPath();
    c.moveTo(s * 5, cy - 3);
    c.lineTo(s * 26, cy - 10 - flap * 9);
    c.quadraticCurveTo(s * 22, cy + 2 - flap * 3, s * 18, cy + 2 - flap * 2);
    c.quadraticCurveTo(s * 15, cy - 1, s * 12, cy + 4 - flap);
    c.quadraticCurveTo(s * 9, cy + 1, s * 5, cy + 4);
    c.closePath();
    c.fill();
  }
  c.fillStyle = body;
  c.beginPath(); c.ellipse(0, cy, 9, 10, 0, 0, Math.PI * 2); c.fill();
  poly(c, [[-7, cy - 6], [-4, cy - 16], [-2, cy - 8]], body);
  poly(c, [[7, cy - 6], [4, cy - 16], [2, cy - 8]], body);
  const f = p.dir * 2;
  eyes(c, f, cy - 2, 3.5, 1.8, 2.2, p.aggro ? '#dc2626' : '#fde047');
  poly(c, [[f - 3, cy + 4], [f - 1.5, cy + 7], [f, cy + 4]], '#fff');
  poly(c, [[f + 3, cy + 4], [f + 1.5, cy + 7], [f, cy + 4]], '#fff');
  if (p.aggro) angryBrows(c, f, cy - 2, 0.7);
  return 46 - fl;
}

// ガイコツ(front#255): 骨の剣を持った二頭身。骨=明るい色、ぼろ布・目の光=暗い色。歩くとカタカタ揺れる
function drawSkeleton(c: CanvasRenderingContext2D, def: EnemyDef, p: EnemyPose): number {
  const t = p.time;
  const d = p.dir;
  const rattle = p.moving ? Math.sin(t * 30) * 0.8 : 0;
  const y0 = p.moving ? -Math.abs(Math.sin(t * 10)) * 3 : Math.sin(t * 2 + (p.seed ?? 0)) * 0.8;
  const bone = p.flash ? '#fff' : def.color;
  const step = p.moving ? Math.sin(t * 14) * 3 : 0;
  shadow(c, 12, 4.5);
  c.strokeStyle = bone;
  c.lineCap = 'round';
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(-3, y0 - 8); c.lineTo(-4 + step, -1);
  c.moveTo(3, y0 - 8); c.lineTo(4 - step, -1);
  c.stroke();
  // 骨盤・背骨・あばら
  c.fillStyle = bone;
  c.beginPath(); c.roundRect(-6, y0 - 11, 12, 4, 2); c.fill();
  c.lineWidth = 2.5;
  c.beginPath(); c.moveTo(0, y0 - 10); c.lineTo(0, y0 - 24); c.stroke();
  c.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    const yy = y0 - 14 - i * 3.5;
    const w = 7 - i * 0.5;
    c.beginPath(); c.moveTo(-w, yy + 1); c.quadraticCurveTo(0, yy - 2, w, yy + 1); c.stroke();
  }
  // ぼろ布のマント
  c.globalAlpha = 0.85;
  poly(c, [[-8, y0 - 25], [8, y0 - 25], [10, y0 - 14], [6, y0 - 17], [3, y0 - 13], [0, y0 - 17], [-3, y0 - 13], [-6, y0 - 17], [-10, y0 - 14]], p.flash ? '#fff' : def.dark);
  c.globalAlpha = 1;
  // 腕と骨の剣。攻撃したときは剣を振る
  c.strokeStyle = bone;
  c.lineWidth = 2.5;
  c.beginPath(); c.moveTo(-d * 7, y0 - 22); c.lineTo(-d * 10, y0 - 12); c.stroke();
  c.save();
  c.translate(d * 7, y0 - 22);
  c.rotate(-d * (p.lunge ?? 0) * 1.2);
  c.beginPath(); c.moveTo(0, 0); c.lineTo(d * 4, 9); c.stroke();
  c.strokeStyle = '#cbd5e1';
  c.lineWidth = 3;
  c.beginPath(); c.moveTo(d * 4, 9); c.lineTo(d * 12, -8); c.stroke();
  c.strokeStyle = '#78716c';
  c.lineWidth = 2.5;
  c.beginPath(); c.moveTo(d, 8); c.lineTo(d * 7, 10); c.stroke();
  c.restore();
  // 頭の骨
  const hy = y0 - 35 + rattle;
  c.fillStyle = bone;
  c.beginPath(); c.arc(0, hy, 11, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.roundRect(-6 + d * 1.5, hy + 5, 12, 7, 3); c.fill();
  c.strokeStyle = 'rgba(0,0,0,0.18)';
  c.lineWidth = 1;
  c.beginPath(); c.arc(0, hy, 11, 0, Math.PI * 2); c.stroke();
  const f = d * 2.5;
  eyes(c, f, hy + 1, 4.2, 3, 3.4);
  c.save();
  const glow = p.aggro ? '#ef4444' : mix(def.dark, '#ffffff', 0.35);
  c.shadowColor = glow;
  c.shadowBlur = 8;
  eyes(c, f, hy + 1, 4.2, 1.2, 1.4, glow);
  c.restore();
  c.strokeStyle = 'rgba(0,0,0,0.4)';
  for (let i = -1; i <= 1; i++) {
    c.beginPath(); c.moveTo(f + i * 3, hy + 8); c.lineTo(f + i * 3, hy + 12); c.stroke();
  }
  return 48;
}

// ひとくいそう(front#255): 地面に根を張った植物で、その場から動かない。頭=明るい色、葉・茎=暗い色。口をパクパクさせる
function drawPlant(c: CanvasRenderingContext2D, def: EnemyDef, p: EnemyPose): number {
  const t = p.time;
  const d = p.dir;
  const lunge = p.lunge ?? 0;
  const sway = Math.sin(t * 2 + (p.seed ?? 0)) * 3 + d * lunge * 10;
  const open = lunge
    ? 0.9 * lunge + 0.1
    : p.aggro ? 0.45 + Math.abs(Math.sin(t * 9)) * 0.45 : 0.2 + Math.abs(Math.sin(t * 2.5)) * 0.25;
  const leaf = p.flash ? '#fff' : def.dark;
  shadow(c, 16, 5);
  c.fillStyle = leaf;
  for (const s of [-1, 1]) {
    c.beginPath();
    c.moveTo(0, -2);
    c.quadraticCurveTo(s * 14, -14, s * 20, -4);
    c.quadraticCurveTo(s * 12, 0, 0, -2);
    c.fill();
  }
  c.strokeStyle = leaf;
  c.lineWidth = 4;
  c.lineCap = 'round';
  const hx = sway + d * 3;
  const hy = -30;
  c.beginPath(); c.moveTo(0, -2); c.quadraticCurveTo(-d * 6, -16, hx, hy); c.stroke();
  // 頭(上あご・下あご)。向きに合わせて左右を反転する
  const a = open * 0.8;
  c.save();
  c.translate(hx, hy);
  c.scale(d, 1);
  for (const [s, rot] of [[-1, -a], [1, a * 0.6]]) {
    c.save();
    c.rotate(rot);
    c.fillStyle = p.flash ? '#fff' : def.color;
    c.beginPath(); c.moveTo(-6, 0); c.quadraticCurveTo(4, s * 16, 18, s); c.lineTo(-6, 0); c.fill();
    for (let i = 0; i < 4; i++) poly(c, [[-2 + i * 5, s * 0.5], [0.5 + i * 5, -s * 3.5], [3 + i * 5, s * 0.5]], '#fff');
    if (s < 0) {
      c.fillStyle = 'rgba(255,255,255,0.75)';
      for (const [dx, dy, r] of [[2, -8, 2.2], [9, -6, 1.6], [-2, -4, 1.4]]) {
        c.beginPath(); c.arc(dx, dy, r, 0, Math.PI * 2); c.fill();
      }
    }
    c.restore();
  }
  if (open > 0.25) {
    c.globalAlpha = Math.min(1, open);
    poly(c, [[-4, 0], [15, -open * 10], [15, open * 5]], '#7f1d1d');
    c.globalAlpha = 1;
  }
  c.rotate(-a);
  c.fillStyle = '#fff';
  c.beginPath(); c.arc(2, -11, 3.6, 0, Math.PI * 2); c.fill();
  c.fillStyle = p.aggro ? '#dc2626' : '#1f2937';
  c.beginPath(); c.arc(3, -11, 1.8, 0, Math.PI * 2); c.fill();
  if (p.aggro) {
    c.strokeStyle = '#1f2937';
    c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(-2, -16); c.lineTo(5, -14); c.stroke();
  }
  c.restore();
  return 50;
}

// ドラゴン(front#255): 翼としっぽのある四つ足の大型。体=明るい色、翼・背びれ・足=暗い色。攻撃のとき口から火の粉
function drawDragon(c: CanvasRenderingContext2D, def: EnemyDef, p: EnemyPose): number {
  const t = p.time;
  const d = p.dir;
  const bob = p.moving ? -Math.abs(Math.sin(t * 8)) * 2.5 : Math.sin(t * 2 + (p.seed ?? 0));
  const step = p.moving ? Math.sin(t * 12) * 3 : 0;
  const flap = Math.sin(t * (p.aggro ? 8 : 3));
  const col = p.flash ? '#fff' : def.color;
  const dk = p.flash ? '#fff' : def.dark;
  shadow(c, 28, 9, 0.2);
  // 奥の翼
  poly(c, [[-d * 2, bob - 34], [-d * 18, bob - 62 - flap * 6], [-d * 30, bob - 46 - flap * 4], [-d * 20, bob - 36]], p.flash ? '#fff' : shade(def.dark, 0.8));
  // しっぽ
  const tw = Math.sin(t * 3) * 4;
  c.strokeStyle = col;
  c.lineWidth = 7;
  c.lineCap = 'round';
  c.beginPath(); c.moveTo(-d * 12, bob - 18); c.quadraticCurveTo(-d * 28, bob - 14 + tw, -d * 36, bob - 26 + tw); c.stroke();
  poly(c, [[-d * 34, bob - 26 + tw], [-d * 44, bob - 30 + tw], [-d * 38, bob - 20 + tw]], dk);
  // 足(対角の足が同時に上がる)
  c.fillStyle = dk;
  for (const [x, s] of [[-10, 1], [-2, -1], [8, 1], [15, -1]]) {
    const up = Math.max(0, s * step);
    c.beginPath(); c.roundRect(d * x - 3.5, bob - 14 - up, 7, 14 + up - bob, 3); c.fill();
  }
  // 胴・お腹・背びれ
  c.fillStyle = col;
  c.beginPath(); c.ellipse(0, bob - 22, 22, 13, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = p.flash ? '#fff' : mix(def.color, '#fff7d6', 0.6);
  c.beginPath(); c.ellipse(d * 4, bob - 16, 13, 6, 0, 0, Math.PI * 2); c.fill();
  for (let i = -2; i <= 1; i++) poly(c, [[d * i * 7 - 3, bob - 33], [d * i * 7 - d * 2, bob - 41], [d * i * 7 + 3, bob - 33]], dk);
  // 首・頭・角
  c.fillStyle = col;
  c.beginPath(); c.ellipse(d * 18, bob - 34, 7, 12, d * 0.5, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.ellipse(d * 26, bob - 46, 12, 8, 0, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.ellipse(d * 35, bob - 43, 7, 5, 0, 0, Math.PI * 2); c.fill();
  poly(c, [[d * 20, bob - 52], [d * 14, bob - 62], [d * 24, bob - 53]], '#fef3c7');
  poly(c, [[d * 25, bob - 53], [d * 22, bob - 63], [d * 29, bob - 53]], '#fde68a');
  c.fillStyle = dk;
  c.beginPath(); c.arc(d * 39, bob - 45, 1.3, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#fff';
  c.beginPath(); c.ellipse(d * 27, bob - 48, 3.2, 2.8, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = p.aggro ? '#dc2626' : '#1f2937';
  c.beginPath(); c.ellipse(d * 28, bob - 48, 1.2, 2.3, 0, 0, Math.PI * 2); c.fill();
  if (p.aggro) {
    c.strokeStyle = '#1f2937';
    c.lineWidth = 1.8;
    c.beginPath(); c.moveTo(d * 23, bob - 53); c.lineTo(d * 31, bob - 51); c.stroke();
  }
  if (p.lunge) {
    for (let i = 0; i < 5; i++) {
      c.fillStyle = `rgba(255,${140 + i * 20},40,${p.lunge * (1 - i / 6)})`;
      c.beginPath(); c.arc(d * (44 + i * 6), bob - 42 + Math.sin(t * 20 + i) * 2, 3.5 - i * 0.4, 0, Math.PI * 2); c.fill();
    }
  }
  // 手前の翼
  const tipX = -d * 12;
  const tipY = bob - 66 - flap * 8;
  c.fillStyle = dk;
  c.beginPath();
  c.moveTo(-d * 2, bob - 30);
  c.lineTo(tipX, tipY);
  c.lineTo(-d * 30, bob - 50 - flap * 5);
  c.quadraticCurveTo(-d * 22, bob - 44, -d * 20, bob - 36);
  c.quadraticCurveTo(-d * 12, bob - 38, -d * 8, bob - 28);
  c.closePath();
  c.fill();
  c.strokeStyle = p.flash ? '#fff' : shade(def.dark, 0.7);
  c.lineWidth = 1.2;
  c.beginPath();
  c.moveTo(tipX, tipY); c.lineTo(-d * 20, bob - 36);
  c.moveTo(tipX, tipY); c.lineTo(-d * 8, bob - 28);
  c.stroke();
  return 68;
}

// ===== 攻撃の動き =====

export interface EffectFrame {
  attack: EnemyAttack;
  // 攻撃の進み(0〜1。attackTiming の長さに対する割合)
  k: number;
  time: number;
  // 敵の足元・相手(攻撃する場所)の足元の画面上の位置
  ex: number;
  ey: number;
  tx: number;
  ty: number;
  // 敵の向き(1: 右、-1: 左)
  dir: number;
  // 絵の大きさ(ゲームは 1、プレビューは拡大する)
  s: number;
  // 衝撃波の範囲の、画面上の半径(横方向)
  radiusPx: number;
  // 当たる時(attackTiming の hitAt / duration)。ジャンプの着地に使う
  hitK: number;
}

/** 体当たり・ジャンプで、ためているとき体をふるわせる量 */
export function chargeShake(def: EnemyDef, elapsed: number, time: number): number {
  return (def.attack === 'tackle' || def.attack === 'jump') && elapsed < def.charge ? Math.sin(time * 60) * 2.5 : 0;
}

/** ジャンプで跳んでいる高さ(画面上、上が正)。elapsed は攻撃を始めてからの秒 */
export function jumpHeight(def: EnemyDef, elapsed: number, s = 1): number {
  if (def.attack !== 'jump') return 0;
  const q = (elapsed - def.charge) / 0.42;
  return q > 0 && q < 1 ? Math.sin(q * Math.PI) * (def.dash > 1 ? 55 : 30) * s : 0;
}

/** 攻撃の演出(エフェクト)を描く。地面に出るもの・相手の上に出るものをまとめて描く */
export function drawAttackEffect(c: CanvasRenderingContext2D, f: EffectFrame): void {
  const { attack, k, time, ex, ey, tx, ty, dir: d, s } = f;
  if (attack === 'claw' && k > 0.3 && k < 0.8) {
    c.strokeStyle = `rgba(255,255,255,${1 - (k - 0.3) / 0.5})`;
    c.lineWidth = 3;
    c.lineCap = 'round';
    for (let i = -1; i <= 1; i++) {
      c.beginPath(); c.moveTo(tx - 14 * s + i * 7 * s, ty - 38 * s); c.lineTo(tx + 4 * s + i * 7 * s, ty - 8 * s); c.stroke();
    }
  }
  if (attack === 'bite' && k > 0.35 && k < 0.75) {
    const q = (k - 0.35) / 0.4;
    const open = (1 - q) * 10 * s;
    c.fillStyle = '#ffffff';
    for (const sgn of [-1, 1]) {
      c.beginPath();
      c.moveTo(tx - 12 * s, ty - 22 * s + sgn * open);
      c.lineTo(tx + 12 * s, ty - 22 * s + sgn * open);
      c.lineTo(tx, ty - 22 * s + sgn * (open - 8 * s));
      c.closePath();
      c.fill();
    }
  }
  if (attack === 'jump') drawJumpDust(c, f);
  if (attack === 'fire') drawFire(c, k, time, tx, ty, s);
  if (attack === 'water') drawWater(c, k, time, tx, ty, s);
  if (attack === 'wind') drawWind(c, k, time, tx, ty, s);
  if (attack === 'thunder') drawThunder(c, k, time, tx, ty, s);
  if (attack === 'dark') drawDark(c, k, time, tx, ty, s);
  if (attack === 'shockwave') drawShockwave(c, k, time, ex, ey, f.radiusPx);
  void d;
}

// 着地の土ぼこり(着地は k = hitAt / duration)
function drawJumpDust(c: CanvasRenderingContext2D, f: EffectFrame): void {
  const land = f.hitK;
  const span = Math.max(0.2, (1 - land) * 0.9);
  if (f.k < land || f.k > land + span) return;
  const q = (f.k - land) / span;
  c.fillStyle = `rgba(180,150,110,${0.6 * (1 - q)})`;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    c.beginPath();
    c.arc(f.ex + Math.cos(a) * 26 * f.s * q, f.ey + Math.sin(a) * 9 * f.s * q, (5 + 4 * q) * f.s, 0, Math.PI * 2);
    c.fill();
  }
}

const rnd = (j: number, m: number) => {
  const v = Math.sin(j * 12.9898 + m * 78.233) * 43758.5453;
  return v - Math.floor(v);
};

// 炎: 足元の地面が赤く光ってから、下から火柱が噴き上がる
function drawFire(c: CanvasRenderingContext2D, k: number, time: number, x: number, y: number, s: number): void {
  if (k < 0.35) {
    c.save(); c.translate(x, y); c.scale(1, 0.5);
    c.fillStyle = `rgba(239,68,68,${0.18 + Math.sin(time * 22) * 0.1})`;
    c.beginPath(); c.arc(0, 0, 28 * s, 0, Math.PI * 2); c.fill();
    c.restore();
    return;
  }
  if (k >= 0.9) return;
  const r = (k - 0.35) / 0.55;
  const hgt = Math.sin(Math.min(1, r * 1.8) * Math.PI * 0.5) * 72 * s * (r > 0.7 ? (1 - r) / 0.3 : 1);
  for (let j = 0; j < 50; j++) {
    const life = (time * 2.6 + rnd(j, 1)) % 1;
    const px = x + (rnd(j, 2) - 0.5) * 36 * s * (1 - life * 0.5) + Math.sin(time * 9 + j) * 2 * s;
    const py = y - life * hgt;
    const rr = (11 - life * 6) * s * (0.6 + rnd(j, 3) * 0.6);
    c.fillStyle = life < 0.3 ? 'rgba(255,214,90,0.8)' : life < 0.65 ? 'rgba(251,128,30,0.6)' : 'rgba(220,50,25,0.4)';
    c.beginPath(); c.arc(px, py, rr, 0, Math.PI * 2); c.fill();
  }
}

// 水: 足元に水の輪 → 水柱が吹き上がる → 崩れてしぶきになり、薄くなって消える
function drawWater(c: CanvasRenderingContext2D, k: number, time: number, x: number, y: number, s: number): void {
  if (k < 0.45) {
    const q = k / 0.45;
    c.save(); c.translate(x, y); c.scale(1, 0.5);
    c.strokeStyle = `rgba(96,165,250,${0.5 + Math.sin(time * 18) * 0.3})`;
    c.lineWidth = 3;
    c.beginPath(); c.arc(0, 0, 26 * s * (0.6 + q * 0.4), 0, Math.PI * 2); c.stroke();
    c.fillStyle = 'rgba(96,165,250,0.18)';
    c.fill();
    c.restore();
    return;
  }
  const q = (k - 0.45) / 0.55;
  const up = q < 0.3 ? q / 0.3 : q < 0.6 ? 1 - (q - 0.3) / 0.3 : 0;
  if (up > 0) {
    const hgt = up * 70 * s;
    const g = c.createLinearGradient(0, y - hgt, 0, y);
    g.addColorStop(0, 'rgba(219,234,254,0.95)');
    g.addColorStop(1, 'rgba(59,130,246,0.85)');
    c.fillStyle = g;
    c.beginPath(); c.ellipse(x, y - hgt / 2, 13 * s, hgt / 2, 0, 0, Math.PI * 2); c.fill();
  }
  if (q > 0.3) {
    const r = (q - 0.3) / 0.7;
    c.save();
    c.globalAlpha = 1 - r;
    c.fillStyle = 'rgba(147,197,253,0.9)';
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const py = Math.min(y, y - 70 * s + Math.sin(a) * 6 * s + r * r * 80 * s - (1 - r) * 10 * s);
      c.beginPath(); c.arc(x + Math.cos(a) * 26 * s * r, py, 3 * s, 0, Math.PI * 2); c.fill();
    }
    c.translate(x, y); c.scale(1, 0.5);
    c.fillStyle = 'rgba(96,165,250,0.35)';
    c.beginPath(); c.arc(0, 0, 22 * s * (1 + r * 0.3), 0, Math.PI * 2); c.fill();
    c.restore();
  }
}

// 風: 相手のいたマスに竜巻が起こり、その場で大きくなって消える
function drawWind(c: CanvasRenderingContext2D, k: number, time: number, x: number, y: number, s: number): void {
  const grow = Math.min(1, k / 0.35);
  const fade = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
  c.save();
  c.globalAlpha = Math.max(0, fade);
  c.save(); c.translate(x, y); c.scale(1, 0.5);
  c.strokeStyle = 'rgba(167,243,208,0.7)';
  c.lineWidth = 2;
  c.beginPath(); c.arc(0, 0, 30 * s, time * 6, time * 6 + Math.PI * 1.4); c.stroke();
  c.restore();
  const layers = Math.max(1, Math.round(9 * grow));
  c.lineWidth = 2.5;
  for (let i = 0; i < layers; i++) {
    const yy = y - i * 8 * s;
    const w = (6 + i * 3.4) * s * (0.6 + grow * 0.4);
    const sway = Math.sin(time * 12 + i * 0.7) * 5 * s;
    c.strokeStyle = `rgba(220,245,235,${0.9 - i * 0.06})`;
    c.beginPath(); c.ellipse(x + sway, yy, w, w * 0.32, 0, 0, Math.PI * 2); c.stroke();
  }
  c.fillStyle = 'rgba(74,222,128,0.85)';
  for (let i = 0; i < 4; i++) {
    const a = time * 9 + i * 1.6;
    const h2 = ((time * 0.8 + i / 4) % 1) * 64 * s * grow;
    c.beginPath(); c.ellipse(x + Math.cos(a) * (12 + h2 / (4 * s)) * s * 0.6, y - h2, 3 * s, 1.6 * s, a, 0, Math.PI * 2); c.fill();
  }
  c.restore();
}

// 雷: 頭の上に雷雲 → 太い稲妻が落ち、まわりが一瞬白く光る → 足元に火花
function drawThunder(c: CanvasRenderingContext2D, k: number, time: number, x: number, y: number, s: number): void {
  const cyc = y - 95 * s;
  const fade = k > 0.8 ? 1 - (k - 0.8) / 0.2 : 1;
  c.save();
  c.globalAlpha = Math.max(0, Math.min(1, k / 0.15) * fade);
  c.fillStyle = k < 0.45 ? '#64748b' : '#475569';
  for (const [ox, oy, r] of [[-14, 2, 11], [0, -4, 14], [14, 2, 11], [-6, 6, 10], [8, 6, 10]]) {
    c.beginPath(); c.arc(x + ox * s, cyc + oy * s, r * s, 0, Math.PI * 2); c.fill();
  }
  if (k < 0.45) {
    c.fillStyle = `rgba(253,224,71,${0.3 + Math.sin(time * 30) * 0.3})`;
    c.beginPath(); c.arc(x, cyc, 8 * s, 0, Math.PI * 2); c.fill();
    c.save(); c.translate(x, y); c.scale(1, 0.5);
    c.fillStyle = 'rgba(30,41,59,0.25)';
    c.beginPath(); c.arc(0, 0, 22 * s, 0, Math.PI * 2); c.fill();
    c.restore();
  }
  c.restore();
  if (k >= 0.45 && k < 0.7) {
    // まわりが一瞬白く光る
    if (k < 0.52) {
      const g = c.createRadialGradient(x, y - 40 * s, 10 * s, x, y - 40 * s, 160 * s);
      g.addColorStop(0, 'rgba(255,255,255,0.5)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g;
      c.beginPath(); c.arc(x, y - 40 * s, 160 * s, 0, Math.PI * 2); c.fill();
    }
    const pts: [number, number][] = [[0, 0], [-7, 22], [5, 28], [-4, 52], [8, 58], [0, 82]];
    const top = cyc + 8 * s;
    const scaleY = (y - top) / 82;
    c.lineJoin = 'round';
    for (const [w, col] of [[14, 'rgba(253,224,71,0.45)'], [6, '#fffbe6']] as [number, string][]) {
      c.strokeStyle = col;
      c.lineWidth = w * Math.max(0.6, s / 2.2);
      c.beginPath();
      pts.forEach(([px, py], i) => (i ? c.lineTo(x + px * s, top + py * scaleY) : c.moveTo(x + px * s, top + py * scaleY)));
      c.stroke();
    }
  }
  if (k >= 0.5 && k < 0.85) {
    const q = (k - 0.5) / 0.35;
    c.strokeStyle = `rgba(253,224,71,${1 - q})`;
    c.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const r1 = 8 * s + q * 20 * s;
      const r2 = r1 + 7 * s;
      c.beginPath();
      c.moveTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1 * 0.5);
      c.lineTo(x + Math.cos(a) * r2, y + Math.sin(a) * r2 * 0.5);
      c.stroke();
    }
  }
}

// 暗黒: 足元に黒い影が広がる → 闇の柱が立ちのぼり、紫の煙が渦を巻いて消える
function drawDark(c: CanvasRenderingContext2D, k: number, time: number, x: number, y: number, s: number): void {
  c.save(); c.translate(x, y); c.scale(1, 0.5);
  if (k < 0.45) {
    const q = k / 0.45;
    const r = 28 * s * (0.4 + q * 0.6);
    const g = c.createRadialGradient(0, 0, 2, 0, 0, r);
    g.addColorStop(0, 'rgba(10,5,25,0.85)');
    g.addColorStop(0.75, 'rgba(46,16,101,0.6)');
    g.addColorStop(1, 'rgba(147,51,234,0)');
    c.fillStyle = g;
    c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill();
    c.strokeStyle = `rgba(192,132,252,${0.4 + Math.sin(time * 16) * 0.3})`;
    c.lineWidth = 2;
    c.beginPath(); c.arc(0, 0, r, time * 4, time * 4 + Math.PI * 1.3); c.stroke();
  } else {
    const q = (k - 0.45) / 0.55;
    c.globalAlpha = q > 0.6 ? Math.max(0, 1 - (q - 0.6) / 0.4) : 1;
    c.fillStyle = 'rgba(10,5,25,0.7)';
    c.beginPath(); c.arc(0, 0, 28 * s, 0, Math.PI * 2); c.fill();
  }
  c.restore();
  if (k < 0.45) return;
  const q = (k - 0.45) / 0.55;
  const up = Math.min(1, q / 0.3);
  const fade = q > 0.6 ? Math.max(0, 1 - (q - 0.6) / 0.4) : 1;
  const hgt = up * 80 * s;
  c.save();
  c.globalAlpha = fade;
  const g = c.createLinearGradient(0, y - hgt, 0, y);
  g.addColorStop(0, 'rgba(88,28,135,0)');
  g.addColorStop(0.3, 'rgba(59,7,100,0.75)');
  g.addColorStop(1, 'rgba(10,5,25,0.95)');
  c.fillStyle = g;
  c.beginPath(); c.ellipse(x, y - hgt / 2, 15 * s, hgt / 2 + 1, 0, 0, Math.PI * 2); c.fill();
  for (let i = 0; i < 10; i++) {
    const life = (time * 1.8 + i / 10) % 1;
    const a = time * 6 + i * 2.4;
    c.fillStyle = `rgba(168,85,247,${0.55 * (1 - life)})`;
    c.beginPath(); c.arc(x + Math.cos(a) * 16 * s * (0.5 + life * 0.5), y - life * hgt, (3 + life * 4) * s, 0, Math.PI * 2); c.fill();
  }
  c.restore();
}

// 衝撃波: 足元が一瞬赤く光り、輪がすばやく広がって薄くなる
function drawShockwave(c: CanvasRenderingContext2D, k: number, time: number, x: number, y: number, r: number): void {
  c.save(); c.translate(x, y); c.scale(1, 0.5);
  if (k < 0.25) {
    c.fillStyle = `rgba(239,68,68,${0.15 + Math.sin(time * 20) * 0.08})`;
    c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill();
  } else {
    const q = Math.min(1, (k - 0.25) / 0.35);
    c.strokeStyle = `rgba(255,255,255,${Math.max(0, 1 - (k - 0.25) / 0.75)})`;
    c.lineWidth = 6;
    c.beginPath(); c.arc(0, 0, r * q, 0, Math.PI * 2); c.stroke();
  }
  c.restore();
}
