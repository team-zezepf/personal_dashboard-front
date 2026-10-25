import { areaDropMoves, signLinesOf } from './rpg-data';
import { blankMap } from './rpg-editor';

// エリアの配置(front#301)。d1 に「村(0, 0)・丘(1, 0)・湖(0, 1)」、d2 に「塔(5, 5)」
const area = (id: string, dungeonId: string, x: number, y: number) => blankMap(id, id, dungeonId, x, y, 10, 10);
const maps = [area('村', 'd1', 0, 0), area('丘', 'd1', 1, 0), area('湖', 'd1', 0, 1), area('塔', 'd2', 5, 5)];
const [village, hill] = maps;

describe('signLinesOf(front#314)', () => {
  const tower = { name: '闇の塔' };

  it('文章があれば、前後の空白・空の行を捨てた文章', () => {
    expect(signLinesOf(['  この先 霧の沼。 ', '', ' ', '足元に注意！'], tower)).toEqual(['この先 霧の沼。', '足元に注意！']);
  });

  it('文章がなく、ほかのダンジョンへの端を指すなら、行き先の案内', () => {
    expect(signLinesOf([], tower)).toEqual(['この先 闇の塔']);
    expect(signLinesOf(null, tower)).toEqual(['この先 闇の塔']);
    expect(signLinesOf([' ', ''], tower)).toEqual(['この先 闇の塔']);
  });

  it('文章がなく、指す端もなければ読めない(null)', () => {
    expect(signLinesOf(undefined, null)).toBeNull();
  });
});

describe('areaDropMoves', () => {
  it('ほかのエリアの上で離すと、2つのエリアの位置を入れ替える', () => {
    expect(areaDropMoves(maps, village, 1, 0)).toEqual([
      { id: '村', gridX: 1, gridY: 0 },
      { id: '丘', gridX: 0, gridY: 0 }
    ]);
  });

  it('ほかのエリアと接する空いたマスで離すと、そこへ移す', () => {
    expect(areaDropMoves(maps, hill, 1, 1)).toEqual([{ id: '丘', gridX: 1, gridY: 1 }]);
  });

  it('どのエリアとも接しない空いたマス・自分のマスには置けない', () => {
    expect(areaDropMoves(maps, hill, 3, 0)).toBeNull();
    // (2, 0) は丘自身としか接していない
    expect(areaDropMoves(maps, hill, 2, 0)).toBeNull();
    expect(areaDropMoves(maps, hill, 1, 0)).toBeNull();
  });

  it('ほかのダンジョンのエリアは、入れ替え・接する相手にならない', () => {
    expect(areaDropMoves(maps, village, 5, 4)).toBeNull();
    expect(areaDropMoves(maps, village, 5, 5)).toBeNull();
  });
});
