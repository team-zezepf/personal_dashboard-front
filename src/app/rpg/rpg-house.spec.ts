import { buildAreaMap } from './rpg-data';
import { DEFAULT_WALL, doorLabel, houseGeometry, housePieces, houseTiles, roofRise, wallColors, wallOpenings } from './rpg-house';
import { RpgMap } from '../models/rpg.models';

const sortTiles = (tiles: readonly (readonly [number, number])[]) => [...tiles].map((t) => t.join(',')).sort();

describe('rpg-house(家の形と向き。front#236)', () => {
  it('形ごとに占めるマス。左上の角が (0, 0) になる', () => {
    expect(sortTiles(houseTiles(0, 0, '1x1', 0))).toEqual(['0,0']);
    expect(sortTiles(houseTiles(0, 0, '2x1', 0))).toEqual(['0,0', '1,0']);
    expect(sortTiles(houseTiles(0, 0, '2x1', 1))).toEqual(['0,0', '0,1']);
    expect(sortTiles(houseTiles(0, 0, '2x2', 3))).toEqual(['0,0', '0,1', '1,0', '1,1']);
    // 形のない家・知らない形は1マス
    expect(sortTiles(houseTiles(5, 6, null, null))).toEqual(['5,6']);
    expect(sortTiles(houseTiles(5, 6, 'U', 0))).toEqual(['5,6']);
  });

  it('L字は2×2から1マス欠けた形で、回すと欠けるマスが回る(APIと同じ)', () => {
    const missing = [0, 1, 2, 3].map((r) => {
      const tiles = sortTiles(houseTiles(0, 0, 'L', r));
      return ['0,0', '0,1', '1,0', '1,1'].find((t) => !tiles.includes(t));
    });
    expect(missing).toEqual(['1,1', '1,0', '0,0', '0,1']);
  });

  it('扉は、向き0で右下にあり、回すと 右上 → 左上 → 左下 と回る', () => {
    expect([0, 1, 2, 3].map((r) => doorLabel(houseGeometry('2x1', r).door.normal))).toEqual(['右下', '右上', '左上', '左下']);
  });

  it('描く部品は奥のマスから並び、どのマスにも屋根があり、壁は手前を向いたものだけ', () => {
    for (const shape of ['1x1', '2x1', '2x2', 'L']) {
      for (let r = 0; r < 4; r++) {
        const geo = houseGeometry(shape, r);
        const pieces = housePieces(geo);
        expect(sortTiles(pieces.map((p) => p.tile))).toEqual(sortTiles(geo.tiles));
        const depths = pieces.map((p) => p.tile[0] + p.tile[1]);
        expect(depths).toEqual([...depths].sort((a, b) => a - b));
        for (const p of pieces) {
          expect(p.roof.length).toBeGreaterThan(0);
          expect(p.walls.every((w) => w.normal[0] >= 0 && w.normal[1] >= 0)).toBe(true);
        }
      }
    }
  });

  it('L字の屋根は6つの面(2本の棟が曲がり角でつながり、内側の角に谷ができる)', () => {
    const geo = houseGeometry('L', 0);
    expect(geo.roof).toHaveLength(6);
    // 曲がり角(0, 0)は、4つの面が集まる
    expect(geo.roof.filter((f) => f.points.some((p) => p.top && p.x === 0 && p.y === 0))).toHaveLength(4);
  });

  it('低い屋根は、ふつうの屋根よりつぶした高さになる(front#238)', () => {
    expect(roofRise(0.5)).toBe(34);
    expect(roofRise(0.5, true)).toBeLessThan(roofRise(0.5) / 2);
    // 幅の広い家(2×2)ほど高い
    expect(roofRise(1)).toBeGreaterThan(roofRise(0.5));
  });

  it('家が占めるマスは、すべて通れない', () => {
    const map: RpgMap = {
      id: 'a', name: 'a', dungeonId: 'a', gridX: 0, gridY: 0, width: 12, height: 12,
      ground: Array.from({ length: 12 }, () => 'g'.repeat(12)), heights: Array.from({ length: 12 }, () => '0'.repeat(12)),
      objects: [{ type: 'house', x: 3, y: 3, roof: null, torch: false, shape: 'L', rotation: 0 }],
      npcs: [], enemies: [], portals: [], startX: 6, startY: 6, sortOrder: 1
    };
    const area = buildAreaMap(map);
    expect([area.walkable(3, 3), area.walkable(4, 3), area.walkable(3, 4)]).toEqual([false, false, false]);
    expect(area.walkable(4, 4)).toBe(true);
  });
});

describe('rpg-house(壁の色と窓。front#250)', () => {
  it('壁の色がなければ今までの2色。選んだ色は横の面を少し暗くする', () => {
    expect(wallColors(null)).toEqual({ front: DEFAULT_WALL, side: '#e3cda8', door: '#9b6a3e' });
    expect(wallColors('#f8fafc')).toEqual({ front: '#f8fafc', side: 'rgb(223, 225, 227)', door: '#9b6a3e' });
  });

  it('壁が暗い色・扉の茶色に近い色のときは、扉をこげ茶にする', () => {
    expect(wallColors('#a9773f').door).toBe('#5b3a20');
    expect(wallColors('#1f2937').door).toBe('#5b3a20');
    expect(wallColors('#cbd5e1').door).toBe('#9b6a3e');
  });

  const openings = (shape: string, noWindow: boolean) => {
    const geo = houseGeometry(shape, 0);
    const walls = housePieces(geo).flatMap((p) => p.walls);
    return { walls, list: walls.flatMap((w) => wallOpenings(w, geo.door, wallColors(null), noWindow)) };
  };

  it('窓ありの家は、扉と重なる壁のほかはすべての壁に窓を付け、扉を1つ付ける', () => {
    const { walls, list } = openings('2x1', false);
    expect(list.filter((o) => o.color === '#9b6a3e')).toHaveLength(1);
    expect(list.filter((o) => o.color === '#7cc3ee')).toHaveLength(walls.length - 1);
  });

  it('窓なしの家は扉だけ付ける', () => {
    expect(openings('2x1', true).list.map((o) => o.color)).toEqual(['#9b6a3e']);
  });

  it('2×2 の家は、扉が2つの壁の境目にあっても扉を描き、その2つの壁の窓も残す', () => {
    const { walls, list } = openings('2x2', false);
    const doors = list.filter((o) => o.color === '#9b6a3e');
    // 境目の両側の壁に同じ扉を描く
    expect(doors).toHaveLength(2);
    const center = (o: { p1: readonly [number, number]; p2: readonly [number, number] }) => [(o.p1[0] + o.p2[0]) / 2, (o.p1[1] + o.p2[1]) / 2];
    expect(center(doors[0])[0]).toBeCloseTo(center(doors[1])[0]);
    expect(center(doors[0])[1]).toBeCloseTo(center(doors[1])[1]);
    expect(list.filter((o) => o.color === '#7cc3ee')).toHaveLength(walls.length);
    expect(openings('2x2', true).list.filter((o) => o.color === '#9b6a3e')).toHaveLength(2);
  });
});
