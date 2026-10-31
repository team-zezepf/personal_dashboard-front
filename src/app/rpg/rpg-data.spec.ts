import { RpgMap } from '../models/rpg.models';
import { DEFAULT_CRAFTS, DEFAULT_ITEMS, DEFAULT_THEMES, ITEMS, StaticObj, StaticType, areaDropMoves, buildAreaMap, fenceLinks, heightFromChar, heightToChar, setCrafts, setItems, signLinesOf, toItemDef, toThemeDef, treeKindOf, weaponPoseOf, wornLook } from './rpg-data';
import { DEFAULT_LOOK } from './rpg-look';
import { blankMap } from './rpg-editor';

// エリアの配置(front#301)。d1 に「村(0, 0)・丘(1, 0)・湖(0, 1)」、d2 に「塔(5, 5)」
const area = (id: string, dungeonId: string, x: number, y: number) => blankMap(id, id, dungeonId, x, y, 10, 10);
const maps = [area('村', 'd1', 0, 0), area('丘', 'd1', 1, 0), area('湖', 'd1', 0, 1), area('塔', 'd2', 5, 5)];
const [village, hill] = maps;

describe('木の種類(front#447)', () => {
  it('ベースの木の種類で描く。なし・知らない値は広葉樹(今の木)', () => {
    const plain = DEFAULT_THEMES[0];
    expect(toThemeDef(plain).tree.kind).toBe('broadleaf');
    for (const kind of ['conifer', 'palm', 'bare'] as const) expect(toThemeDef({ ...plain, treeKind: kind }).tree.kind).toBe(kind);
    expect(treeKindOf(null)).toBe('broadleaf');
    expect(treeKindOf('cactus')).toBe('broadleaf');
  });
});

describe('柵のつながり(front#451)', () => {
  const fence = (type: StaticType, x: number, y: number, mimicked = false): StaticObj => ({ kind: 'static', type, x, y, mimicked });
  it('上下左右のとなりの同じ種類の柵とだけつながる(斜め・ほかの種類・擬態している敵とはつながらない)', () => {
    const statics = [
      fence('fence_wood', 2, 2), fence('fence_wood', 1, 2), fence('fence_wood', 2, 3),
      fence('fence_iron', 3, 2), fence('fence_wood', 3, 3), fence('fence_wood', 2, 1, true)
    ];
    expect(fenceLinks({ statics }, statics[0])).toEqual({ xm: true, xp: false, ym: false, yp: true });
    expect(fenceLinks({ statics }, statics[3])).toEqual({ xm: false, xp: false, ym: false, yp: false });
  });
});

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

describe('地面の高さ −5〜5段(front#412)', () => {
  it('0〜5は数字、マイナスは a〜e(a=−1 … e=−5)で読み書きする。範囲の外・知らない文字は収める・0段にする', () => {
    expect(['0', '5', 'a', 'e', '6', 'f', '-', undefined].map(heightFromChar)).toEqual([0, 5, -1, -5, 5, 0, 0, 0]);
    expect([0, 5, -1, -5, 7, -9].map(heightToChar)).toEqual(['0', '5', 'a', 'e', '5', 'e']);
  });

  it('土台の段は、いちばん低い段(0段より低いマスがなければ0)', () => {
    const map = (heights: string[]) => buildAreaMap({
      id: 'm', name: 'm', dungeonId: 'd', gridX: 0, gridY: 0, width: 3, height: 2, ground: ['ggg', 'ggg'], heights,
      objects: [], npcs: [], enemies: [], links: [], sortOrder: 0
    } as RpgMap);
    expect(map(['000', '000']).hasHeights).toBe(false);
    expect(map(['012', '000']).base).toBe(0);
    const pit = map(['0ab', '50c']);
    expect([pit.hasHeights, pit.base, pit.heightAt(1, 0), pit.heightAt(0, 1)]).toEqual([true, -3, -1, 5]);
    // 差が1段までなら登り降りできる(マイナスでも同じ)
    expect(pit.canStep(1, 0, 2, 0)).toBe(true);
    expect(pit.canStep(0, 0, 0, 1)).toBe(false);
  });
});

describe('装備の見た目(front#431)', () => {
  afterEach(() => {
    setItems(DEFAULT_ITEMS);
    setCrafts(DEFAULT_CRAFTS);
  });

  it('武器・防具は、形・色がそろっていれば見た目を持つ。ほかの種類・形のないものは持たない', () => {
    const base = { id: 'x', name: 'x', icon: 'x', inShop: false, sortOrder: 1 };
    expect(toItemDef({ ...base, type: 'weapon', atk: 5, lookShape: 'staff', lookColor: '#8b5a2b', lookAccent: '#60a5fa' }).look).toEqual({ shape: 'staff', color: '#8b5a2b', accent: '#60a5fa' });
    expect(toItemDef({ ...base, type: 'weapon', atk: 5, lookShape: null, lookColor: '#8b5a2b', lookAccent: '#60a5fa' }).look).toBeUndefined();
    expect(toItemDef({ ...base, type: 'use', heal: 5, lookShape: 'sword', lookColor: '#8b5a2b', lookAccent: '#60a5fa' }).look).toBeUndefined();
  });

  it('最初のアイテム・合成の装備には初期の見た目がある(布の服はなし)', () => {
    expect(ITEMS['steel_sword'].look?.shape).toBe('greatsword');
    expect(ITEMS['star_robe'].look).toEqual({ shape: 'robe', color: '#1e3a8a', accent: '#fde047' });
    expect(ITEMS['dragon_sword'].look?.shape).toBe('greatsword');
    expect(ITEMS['cloth'].look).toBeUndefined();
  });

  it('装備している武器・防具の見た目で描く値を作る。見た目のない武器は今までの色の片手剣', () => {
    expect(weaponPoseOf('steel_sword')).toEqual({ sword: true, swordColor: '#e2e8f0', weaponShape: 'greatsword', weaponAccent: '#1f2937' });
    expect(wornLook(DEFAULT_LOOK, 'magic_armor')).toMatchObject({ clothes: 'armor', clothesColor: '#3b82f6', accentColor: '#facc15' });
    expect(wornLook(DEFAULT_LOOK, 'cloth')).toBe(DEFAULT_LOOK);

    setItems(DEFAULT_ITEMS.map((i) => (i.id === 'iron_sword' ? { ...i, lookShape: null, lookColor: null, lookAccent: null } : i)));
    expect(weaponPoseOf('iron_sword')).toEqual({ sword: true, swordColor: '#cbd5e1' });
  });
});
