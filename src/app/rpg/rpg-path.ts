const DIRS: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

// チェビシェフ距離(斜めも1マスと数える)。「隣にいるか」の判定に使う
export const cheb = (ax: number, ay: number, bx: number, by: number) => Math.max(Math.abs(ax - bx), Math.abs(ay - by));

// 斜め移動ありのときの、障害物がない場合の最短距離(A*の見積もり)
export function octile(ax: number, ay: number, bx: number, by: number): number {
  const dx = Math.abs(ax - bx);
  const dy = Math.abs(ay - by);
  return Math.max(dx, dy) + 0.414 * Math.min(dx, dy);
}

/**
 * A*で、(sx, sy) から isGoal を満たすマスまでの道順を探す。width はマップの幅(マスの番号を作るのに使う)。
 * 戻り値は通るマスの並び(出発地点は含まない)。たどり着けなければ null。
 * 斜めに進むのは、その両隣のマスがどちらも通れるときだけ(角をすり抜けない)。
 */
export function findPath(
  walkable: (x: number, y: number) => boolean,
  sx: number,
  sy: number,
  isGoal: (x: number, y: number) => boolean,
  h: (x: number, y: number) => number,
  width: number
): [number, number][] | null {
  if (isGoal(sx, sy)) return [];
  const key = (x: number, y: number) => y * width + x;
  const start = key(sx, sy);
  const g = new Map<number, number>([[start, 0]]);
  const came = new Map<number, number>();
  const closed = new Set<number>();
  const open: { x: number; y: number; f: number }[] = [{ x: sx, y: sy, f: h(sx, sy) }];

  while (open.length) {
    // マップは最大40×40と小さいので、優先度付きキューを使わず線形に最小を探す
    let best = 0;
    for (let i = 1; i < open.length; i++) if (open[i].f < open[best].f) best = i;
    const cur = open.splice(best, 1)[0];
    const ck = key(cur.x, cur.y);
    if (closed.has(ck)) continue;
    closed.add(ck);

    if (isGoal(cur.x, cur.y)) {
      const path: [number, number][] = [];
      for (let k = ck; k !== start; k = came.get(k)!) path.push([k % width, Math.floor(k / width)]);
      return path.reverse();
    }
    for (const [dx, dy] of DIRS) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      if (!walkable(nx, ny)) continue;
      if (dx && dy && (!walkable(cur.x + dx, cur.y) || !walkable(cur.x, cur.y + dy))) continue;
      const nk = key(nx, ny);
      if (closed.has(nk)) continue;
      const ng = g.get(ck)! + (dx && dy ? 1.414 : 1);
      if (ng < (g.get(nk) ?? Infinity)) {
        g.set(nk, ng);
        came.set(nk, ck);
        open.push({ x: nx, y: ny, f: ng + h(nx, ny) });
      }
    }
  }
  return null;
}
