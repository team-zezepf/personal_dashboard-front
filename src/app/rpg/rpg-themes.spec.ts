import { RpgTheme } from '../models/rpg.models';
import { DEFAULT_THEMES, THEMES, THEME_LIST, hexToHsl, hexToRgba, setThemes, themeOf, toThemeDef } from './rpg-data';

// ダンジョンの見た目(front#389)
describe('rpg-data の見た目(front#389)', () => {
  afterEach(() => setThemes(DEFAULT_THEMES));

  const snow = (): RpgTheme => ({ ...DEFAULT_THEMES[0], id: 'theme1', name: '雪原', liquidName: '氷', liquid: '#ffffff', liquidSway: 0, sortOrder: 5 });

  it('最初の見た目は4つで、谷は赤いホタル(火の粉)、森はホタル、塔は星', () => {
    expect(THEME_LIST.map((t) => t.label)).toEqual(['草原', '森', '谷', '塔']);
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
    expect(THEME_LIST.map((t) => t.id)).toEqual(['plain', 'forest', 'valley', 'tower', 'theme1']);
    expect(themeOf('theme1').liquidName).toBe('氷');
    expect(themeOf('nothing').label).toBe('草原');
    // 草原を含まない一覧でも、草原は残す
    setThemes([snow()]);
    expect(themeOf('nothing').label).toBe('草原');
  });

  it('色の変換', () => {
    expect(hexToHsl('#37ace6')).toEqual([200, 78, 56]);
    expect(hexToHsl('#000000')).toEqual([0, 0, 0]);
    expect(hexToRgba('#ff5a1f', 0.7)).toBe('rgba(255,90,31,0.7)');
  });
});
