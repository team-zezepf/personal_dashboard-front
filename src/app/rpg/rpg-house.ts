// RPGの家の形と向き(front#236)。占めるマス・壁・屋根の面・扉を、マップ上の位置(マスの単位)で求める。
// ゲームの描画・マップ作成画面・通れないマスの計算が同じ形を使うよう、ここにまとめる

export type HouseShape = '1x1' | '2x1' | '2x2' | 'L';
export const HOUSE_SHAPES: { id: HouseShape; label: string }[] = [
  { id: '1x1', label: '1×1' },
  { id: '2x1', label: '2×1' },
  { id: '2x2', label: '2×2' },
  { id: 'L', label: 'L字' }
];
export const HOUSE_ROTATIONS = 4;
export const DEFAULT_ROOF = '#e0605a';
// 屋根の色の見本(好きな色も選べる)
export const ROOF_COLORS = ['#e0605a', '#5b8def', '#45b36b', '#f2a33a', '#a78bfa', '#6b7280', '#8b5a2b'];
// 壁の色(front#250)。最初の色(クリーム)と見本(好きな色も選べる)
export const DEFAULT_WALL = '#f4e4c9';
export const WALL_COLORS: { color: string; label: string }[] = [
  { color: DEFAULT_WALL, label: 'クリーム' },
  { color: '#f8fafc', label: '白' },
  { color: '#cbd5e1', label: '灰の石' },
  { color: '#c2644a', label: 'レンガ' },
  { color: '#a9773f', label: '木' },
  { color: '#e2b86b', label: '黄土' },
  { color: '#bfd7ea', label: 'うす青' },
  { color: '#cfe3c1', label: 'うす緑' }
];
const DOOR = '#9b6a3e';
const DARK_DOOR = '#5b3a20';
const WINDOW = '#7cc3ee';

const rgbOf = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
};

/**
 * 壁の色(front#250)から、前向きの面(左下を向いた面)・横向きの面・扉の色を決める。
 * 横向きの面は少し暗くする(最初の色は今までと同じ2色)。扉は、壁が暗い色・扉の茶色に近い色のときだけこげ茶にする
 */
export function wallColors(wall?: string | null): { front: string; side: string; door: string } {
  const front = wall ?? DEFAULT_WALL;
  if (front.toLowerCase() === DEFAULT_WALL) return { front, side: '#e3cda8', door: DOOR };
  const [r, g, b] = rgbOf(front);
  const side = `rgb(${Math.round(r * 0.9)}, ${Math.round(g * 0.9)}, ${Math.round(b * 0.9)})`;
  const [dr, dg, db] = rgbOf(DOOR);
  const nearDoor = Math.hypot(r - dr, g - dg, b - db) < 90;
  const dark = (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.45;
  return { front, side, door: nearDoor || dark ? DARK_DOOR : DOOR };
}

type P = readonly [number, number];

/** 屋根の1つの面。eave は軒(高さ0)の点、ridge は棟(いちばん高い)の点。normal は面が向く向き */
export interface RoofFace {
  points: { x: number; y: number; top: boolean }[];
  normal: P;
}

export interface HouseGeometry {
  // 占めるマス(左上の角(x, y)からのずれ)
  tiles: P[];
  // 外まわりの壁(角の点の並び。マスの角は ±0.5 の位置)
  outline: P[];
  roof: RoofFace[];
  // 棟の高さ(家の幅の半分。マスの単位)
  ridge: number;
  // 扉のある壁の真ん中と、扉の向き
  door: { at: P; normal: P };
}

// 向き0の形。屋根は寄棟で、L字は2本の棟が曲がり角でつながり、内側の角に谷ができる
interface Base {
  tiles: P[];
  outline: P[];
  ridgePoints: P[];
  // 面: 外まわりの点の番号(o) と棟の点の番号(r)
  faces: { o: number[]; r: number[]; normal: P }[];
  ridge: number;
  door: { at: P; normal: P };
}

function rectBase(w: number, h: number): Base {
  const [x0, y0, x1, y1] = [-0.5, -0.5, w - 0.5, h - 0.5];
  const r = Math.min(w, h) / 2;
  const cy = (y0 + y1) / 2;
  // 長い向き(x)に棟を通す。正方形なら棟は1点(四角すい)
  const tiles: P[] = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) tiles.push([x, y]);
  return {
    tiles,
    outline: [[x0, y0], [x1, y0], [x1, y1], [x0, y1]],
    ridgePoints: [[x0 + r, cy], [x1 - r, cy]],
    faces: [
      { o: [0, 1], r: [1, 0], normal: [0, -1] },
      { o: [1, 2], r: [1], normal: [1, 0] },
      { o: [2, 3], r: [0, 1], normal: [0, 1] },
      { o: [3, 0], r: [0], normal: [-1, 0] }
    ],
    ridge: r,
    // 扉は右下の壁(今までの1×1の家と同じ)
    door: { at: [x1, cy], normal: [1, 0] }
  };
}

// L字: (0,0)(1,0)(0,1) の3マス(右下の(1,1)が欠ける)
const L_BASE: Base = {
  tiles: [[0, 0], [1, 0], [0, 1]],
  outline: [[-0.5, -0.5], [1.5, -0.5], [1.5, 0.5], [0.5, 0.5], [0.5, 1.5], [-0.5, 1.5]],
  // 曲がり角(棟がつながる点)・横の棟の端・縦の棟の端
  ridgePoints: [[0, 0], [1, 0], [0, 1]],
  faces: [
    { o: [0, 1], r: [1, 0], normal: [0, -1] },
    { o: [1, 2], r: [1], normal: [1, 0] },
    // 内側の角(o3)から曲がり角(r0)への線が谷になる
    { o: [2, 3], r: [0, 1], normal: [0, 1] },
    { o: [3, 4], r: [2, 0], normal: [1, 0] },
    { o: [4, 5], r: [2], normal: [0, 1] },
    { o: [5, 0], r: [0, 2], normal: [-1, 0] }
  ],
  ridge: 0.5,
  door: { at: [1.5, 0], normal: [1, 0] }
};

function baseOf(shape: string): Base {
  switch (shape) {
    case '2x1': return rectBase(2, 1);
    case '2x2': return rectBase(2, 2);
    case 'L': return L_BASE;
    default: return rectBase(1, 1);
  }
}

/**
 * 家の形(shape)と向き(rotation: 0〜3。90°ずつ)から、占めるマス・壁・屋根・扉を求める。
 * 回したあとも、占めるマスのいちばん左上が(0, 0)になるようにずらす。知らない形は 1×1
 */
export function houseGeometry(shape: string | null | undefined, rotation: number | null | undefined): HouseGeometry {
  const base = baseOf(shape ?? '1x1');
  const turns = (((rotation ?? 0) % HOUSE_ROTATIONS) + HOUSE_ROTATIONS) % HOUSE_ROTATIONS;
  // (x, y) → (y, -x) を turns 回(画面では、扉が右下 → 右上 → 左上 → 左下 と回る)
  const turn = ([x, y]: P): P => {
    let p: P = [x, y];
    for (let i = 0; i < turns; i++) p = [p[1], -p[0]];
    return p;
  };
  const tiles0 = base.tiles.map(turn);
  const dx = -Math.min(...tiles0.map((t) => t[0]));
  const dy = -Math.min(...tiles0.map((t) => t[1]));
  const move = (p: P): P => {
    const [x, y] = turn(p);
    return [x + dx + 0, y + dy + 0];
  };
  const outline = base.outline.map(move);
  const ridgePoints = base.ridgePoints.map(move);
  return {
    tiles: tiles0.map(([x, y]) => [x + dx + 0, y + dy + 0] as P),
    outline,
    roof: base.faces.map((f) => ({
      points: [
        ...f.o.map((i) => ({ x: outline[i][0], y: outline[i][1], top: false })),
        ...f.r.map((i) => ({ x: ridgePoints[i][0], y: ridgePoints[i][1], top: true }))
      ],
      normal: turn(f.normal)
    })),
    ridge: base.ridge,
    door: { at: move(base.door.at), normal: turn(base.door.normal) }
  };
}

/** 屋根の棟の、軒からの高さ(画面上)。幅の広い家ほど高く、低い屋根(front#238)はつぶした形にする */
export function roofRise(ridge: number, low?: boolean | null): number {
  return (34 + (ridge - 0.5) * 28) * (low ? 0.45 : 1);
}

// ===== 描くための部品 =====
// 壁は角から少し内側、軒は少し外側に出す(マスの単位。今までの1×1の家とほぼ同じ大きさ)
const WALL_INSET = 0.08;
const EAVE = 0.02;

export interface HouseWall {
  a: P;
  b: P;
  normal: P;
}

export interface HouseRoofPiece {
  // z は 0 が軒、1 が棟の高さ
  points: { x: number; y: number; z: number }[];
  normal: P;
}

/** 壁の扉・窓。p1・p2 は壁に沿った左右の端(マスの単位)、z0・z1 は下・上の高さ(画面上) */
export interface WallOpening {
  p1: P;
  p2: P;
  z0: number;
  z1: number;
  color: string;
}

/**
 * 壁の1マス分に付ける窓と扉。窓は壁の真ん中、扉は扉の位置(door.at)に付ける(扉と重なる窓は付けない)。
 * 2×2 の家のように扉が2つの壁の境目にあるときは、両方の壁に描く(あとから描く壁が前の扉の半分を隠さないように)。
 * 窓なし(front#250)の家は扉だけ付ける
 */
export function wallOpenings(w: HouseWall, door: { at: P; normal: P }, colors: { door: string }, noWindow?: boolean | null): WallOpening[] {
  const len = Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]);
  const d = [(w.b[0] - w.a[0]) / len, (w.b[1] - w.a[1]) / len];
  // 扉の位置を壁の線に重ねたときの、a からの距離と、線からのずれ
  const t = (door.at[0] - w.a[0]) * d[0] + (door.at[1] - w.a[1]) * d[1];
  const off = Math.abs((door.at[0] - w.a[0]) * d[1] - (door.at[1] - w.a[1]) * d[0]);
  const hasDoor = door.normal[0] === w.normal[0] && door.normal[1] === w.normal[1] && off < 0.2 && t > -0.01 && t < len + 0.01;
  const at = (k: number, hw: number, z0: number, z1: number, color: string): WallOpening => ({
    p1: [w.a[0] + d[0] * (k - hw), w.a[1] + d[1] * (k - hw)],
    p2: [w.a[0] + d[0] * (k + hw), w.a[1] + d[1] * (k + hw)],
    z0, z1, color
  });
  const result: WallOpening[] = [];
  if (!noWindow && !(hasDoor && Math.abs(t - len / 2) < 0.3)) result.push(at(len / 2, 0.13, 13, 25, WINDOW));
  if (hasDoor) result.push(at(t, 0.15, 0, 22, colors.door));
  return result;
}

/** 1マス分の部品。奥のマスから順に描けば、手前の壁・屋根が奥のものを正しく隠す */
export interface HousePiece {
  tile: P;
  walls: HouseWall[];
  roof: HouseRoofPiece[];
}

// 角の点を、となりの2つの壁の向きにずらす(d > 0 で外側)
function offsetCorner(outline: P[], i: number, d: number): P {
  const n = outline.length;
  const a = edgeNormal(outline, (i + n - 1) % n);
  const b = edgeNormal(outline, i);
  return [outline[i][0] + (a[0] + b[0]) * d, outline[i][1] + (a[1] + b[1]) * d];
}

// 外まわりの i 番目の壁(点 i → i+1)の外向きの向き
function edgeNormal(outline: P[], i: number): P {
  const [a, b] = [outline[i], outline[(i + 1) % outline.length]];
  return [Math.sign(b[1] - a[1]) + 0, -Math.sign(b[0] - a[0]) + 0];
}

type P3 = { x: number; y: number; z: number };

// 多角形を、x・y の範囲で切り取る(z は辺に沿って比べて求める。面は平らなので正しい)
function clip(points: P3[], min: P, max: P): P3[] {
  let out = points;
  const planes: [(p: P3) => number][] = [[(p) => p.x - min[0]], [(p) => max[0] - p.x], [(p) => p.y - min[1]], [(p) => max[1] - p.y]];
  for (const [inside] of planes) {
    const input = out;
    out = [];
    for (let i = 0; i < input.length; i++) {
      const cur = input[i];
      const prev = input[(i + input.length - 1) % input.length];
      const [dc, dp] = [inside(cur), inside(prev)];
      if (dc >= 0) {
        if (dp < 0) out.push(lerp(prev, cur, dp / (dp - dc)));
        out.push(cur);
      } else if (dp >= 0) {
        out.push(lerp(prev, cur, dp / (dp - dc)));
      }
    }
    if (!out.length) break;
  }
  return out;
}

const lerp = (a: P3, b: P3, t: number): P3 => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t });

/** 家を描くための部品を、奥のマスから順に返す(位置は家の左上の角(0, 0)から) */
export function housePieces(geo: HouseGeometry): HousePiece[] {
  const { tiles, outline } = geo;
  const has = (x: number, y: number) => tiles.some((t) => t[0] === x && t[1] === y);
  // 屋根の面(軒は外側にずらす)
  const faces = geo.roof.map((f) => {
    const eaves = f.points.filter((p) => !p.top);
    const ridges = f.points.filter((p) => p.top);
    const eaveIdx = eaves.map((p) => outline.findIndex((o) => o[0] === p.x && o[1] === p.y));
    return {
      normal: f.normal,
      points: [
        ...eaveIdx.map((i): P3 => {
          const [x, y] = offsetCorner(outline, i, EAVE);
          return { x, y, z: 0 };
        }),
        ...ridges.map((p): P3 => ({ x: p.x, y: p.y, z: 1 }))
      ]
    };
  });
  // 手前を向いた壁(右下・左下)を1マス分ずつに分ける
  const walls: HouseWall[] = [];
  for (let i = 0; i < outline.length; i++) {
    const normal = edgeNormal(outline, i);
    if (normal[0] < 0 || normal[1] < 0) continue;
    const a = offsetCorner(outline, i, -WALL_INSET);
    const b = offsetCorner(outline, (i + 1) % outline.length, -WALL_INSET);
    const len = Math.round(Math.hypot(outline[(i + 1) % outline.length][0] - outline[i][0], outline[(i + 1) % outline.length][1] - outline[i][1]));
    for (let k = 0; k < len; k++) {
      const t0 = k / len;
      const t1 = (k + 1) / len;
      walls.push({ a: [a[0] + (b[0] - a[0]) * t0, a[1] + (b[1] - a[1]) * t0], b: [a[0] + (b[0] - a[0]) * t1, a[1] + (b[1] - a[1]) * t1], normal });
    }
  }
  return [...tiles]
    .sort((p, q) => p[0] + p[1] - (q[0] + q[1]))
    .map((tile) => {
      const [tx, ty] = tile;
      // 家の外側の辺は、軒の分だけ広げて切り取る
      const min: P = [tx - 0.5 - (has(tx - 1, ty) ? 0 : EAVE), ty - 0.5 - (has(tx, ty - 1) ? 0 : EAVE)];
      const max: P = [tx + 0.5 + (has(tx + 1, ty) ? 0 : EAVE), ty + 0.5 + (has(tx, ty + 1) ? 0 : EAVE)];
      const roof = faces
        .map((f) => ({ normal: f.normal, points: clip(f.points, min, max) }))
        .filter((f) => f.points.length >= 3)
        // 奥を向いた面を先に描く
        .sort((a, b) => Number(b.normal[0] < 0 || b.normal[1] < 0) - Number(a.normal[0] < 0 || a.normal[1] < 0));
      const own = walls.filter((w) => {
        const mx = (w.a[0] + w.b[0]) / 2 - w.normal[0] * 0.5;
        const my = (w.a[1] + w.b[1]) / 2 - w.normal[1] * 0.5;
        return Math.round(mx) === tx && Math.round(my) === ty;
      });
      return { tile, walls: own, roof };
    });
}

/** 家が占めるマス(マップ上の位置) */
export function houseTiles(x: number, y: number, shape?: string | null, rotation?: number | null): [number, number][] {
  return houseGeometry(shape, rotation).tiles.map(([dx, dy]) => [x + dx, y + dy]);
}

/** 置物が占めるマス(家は形と向きで、ほかは1マス) */
export function objectTiles(o: { type: string; x: number; y: number; shape?: string | null; rotation?: number | null }): [number, number][] {
  return o.type === 'house' ? houseTiles(o.x, o.y, o.shape, o.rotation) : [[o.x, o.y]];
}

// 扉の向きの呼び名(画面上の向き)
export function doorLabel([nx, ny]: P): string {
  if (nx === 1) return '右下';
  if (nx === -1) return '左上';
  return ny === 1 ? '左下' : '右上';
}
