import { areaDropMoves } from './rpg-data';
import { blankMap } from './rpg-editor';

// エリアの配置(front#301)。d1 に「村(0, 0)・丘(1, 0)・湖(0, 1)」、d2 に「塔(5, 5)」
const area = (id: string, dungeonId: string, x: number, y: number) => blankMap(id, id, dungeonId, x, y, 10, 10);
const maps = [area('村', 'd1', 0, 0), area('丘', 'd1', 1, 0), area('湖', 'd1', 0, 1), area('塔', 'd2', 5, 5)];
const [village, hill] = maps;

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
