import { cheb, findPath, octile } from './rpg-path';

// 文字列で書いた小さなマップ('#' は通れない)
function walkableOf(rows: string[]) {
  return (x: number, y: number) => y >= 0 && y < rows.length && x >= 0 && x < rows[y].length && rows[y][x] !== '#';
}

const goalAt = (gx: number, gy: number) => (x: number, y: number) => x === gx && y === gy;
const toward = (gx: number, gy: number) => (x: number, y: number) => octile(x, y, gx, gy);

describe('findPath', () => {
  it('障害物がなければ、斜めも使ってまっすぐ進む', () => {
    const walkable = walkableOf(['....', '....', '....', '....']);
    expect(findPath(walkable, 0, 0, goalAt(3, 3), toward(3, 3))).toEqual([[1, 1], [2, 2], [3, 3]]);
  });

  it('出発地点がゴールなら、道順は空', () => {
    const walkable = walkableOf(['..']);
    expect(findPath(walkable, 0, 0, goalAt(0, 0), toward(0, 0))).toEqual([]);
  });

  it('壁を回り込み、角を斜めにすり抜けない', () => {
    const walkable = walkableOf([
      '...',
      '.#.',
      '...'
    ]);
    const path = findPath(walkable, 0, 1, goalAt(2, 1), toward(2, 1))!;
    expect(path.at(-1)).toEqual([2, 1]);
    // 壁(1,1)の上下どちらかを、縦横の移動で回る
    expect(path).toHaveLength(4);
    for (const [x, y] of path) expect(walkable(x, y)).toBe(true);
  });

  it('たどり着けなければ null', () => {
    const walkable = walkableOf(['.#.', '.#.', '.#.']);
    expect(findPath(walkable, 0, 0, goalAt(2, 0), toward(2, 0))).toBeNull();
  });

  it('相手の隣のマスまでの道順を探せる', () => {
    const walkable = walkableOf(['.....']);
    const path = findPath(walkable, 0, 0, (x, y) => cheb(x, y, 4, 0) <= 1 && !(x === 4 && y === 0), toward(4, 0));
    expect(path).toEqual([[1, 0], [2, 0], [3, 0]]);
  });
});
