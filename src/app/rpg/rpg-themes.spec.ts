import { RpgTheme } from '../models/rpg.models';
import { DEFAULT_THEMES, THEMES, THEME_LIST, autoLiquidEdge, hexToHsl, hexToRgba, liquidEdgeOf, setThemes, themeOf, toThemeDef } from './rpg-data';

// ダンジョンの見た目(front#389)
describe('rpg-data の見た目(front#389)', () => {
  afterEach(() => setThemes(DEFAULT_THEMES));

  const snow = (): RpgTheme => ({ ...DEFAULT_THEMES[0], id: 'theme1', name: '雪原', liquidName: '氷', liquid: '#ffffff', liquidSway: 0, sortOrder: 6 });

  it('最初の見た目は5つで、谷は赤いホタル(火の粉)、森はホタル、塔は星、海は泡(front#421)', () => {
    expect(THEME_LIST.map((t) => t.label)).toEqual(['草原', '森', '谷', '塔', '海']);
    expect(THEMES['sea'].effect).toEqual({ kind: 'bubbles', color: '#e6fbff', alpha: 0.55 });
    expect(THEMES['sea'].liquidName).toBe('海');
    expect(THEMES['valley'].effect).toEqual({ kind: 'fireflies', color: '#ff5a1f', alpha: 0.5 });
    expect(THEMES['forest'].effect.kind).toBe('fireflies');
    expect(THEMES['tower'].effect.kind).toBe('stars');
    expect(THEMES['plain'].effect.kind).toBe('none');
  });

  it('APIの見た目を描画の形にする。水のマスは、ゆらぎがあれば明るさをゆらし、なければ同じ色', () => {
    const plain = toThemeDef(DEFAULT_THEMES[0]);
    expect(plain.label).toBe('草原');
    expect(plain.tile.stone).toHaveLength(3);
    expect(plain.liquid(0, 0, 0)).toBe('hsl(200, 78%, 56%)');
    expect(plain.wave).toBe('rgba(255,255,255,0.55)');
    const tower = toThemeDef(DEFAULT_THEMES[3]);
    expect(tower.liquid(3, 4, 10)).toBe('#000000');
    expect(tower.wave).toBeNull();
  });

  it('見た目を入れ替えると、作った見た目も選べる。知らない見た目は草原になる', () => {
    setThemes([...DEFAULT_THEMES, snow()]);
    expect(THEME_LIST.map((t) => t.id)).toEqual(['plain', 'forest', 'valley', 'tower', 'sea', 'theme1']);
    expect(themeOf('theme1').liquidName).toBe('氷');
    expect(themeOf('nothing').label).toBe('草原');
    // 草原を含まない一覧でも、草原は残す
    setThemes([snow()]);
    expect(themeOf('nothing').label).toBe('草原');
  });

  it('水のマスの段差の側面(front#415)は、選んだ2色がなければ水の色を暗くした色。陸の段差の側面とは別', () => {
    expect(autoLiquidEdge('#37ace6')).toEqual(['#2b86b3', '#226b8f']);
    expect(autoLiquidEdge('#000000')).toEqual(['#000000', '#000000']);
    const plain = DEFAULT_THEMES[0];
    expect(toThemeDef(plain).liquidEdge).toEqual(['#2b86b3', '#226b8f']);
    expect(toThemeDef(plain).edge).toEqual(['#a0754d', '#7f5a3a']);
    expect(liquidEdgeOf({ ...plain, liquidEdge: null })).toEqual(['#2b86b3', '#226b8f']);
    expect(toThemeDef({ ...plain, liquidEdge: ['#123456', '#654321'] }).liquidEdge).toEqual(['#123456', '#654321']);
    // 溶岩は、溶岩の色を暗くした色
    expect(toThemeDef(DEFAULT_THEMES[2]).liquidEdge).toEqual(autoLiquidEdge('#f94f06'));
  });

  it('色の変換', () => {
    expect(hexToHsl('#37ace6')).toEqual([200, 78, 56]);
    expect(hexToHsl('#000000')).toEqual([0, 0, 0]);
    expect(hexToRgba('#ff5a1f', 0.7)).toBe('rgba(255,90,31,0.7)');
  });
});
