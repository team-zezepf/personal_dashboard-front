import { DEFAULT_SHORTCUTS, loadShortcuts, saveShortcuts, shortcutIndexOf, shortcutItems } from './rpg-shortcuts';

function memoryStorage(initial: Record<string, string> = {}): Storage {
  const data = { ...initial };
  return {
    getItem: (k: string) => data[k] ?? null,
    setItem: (k: string, v: string) => (data[k] = v),
    removeItem: (k: string) => delete data[k],
    clear: () => Object.keys(data).forEach((k) => delete data[k]),
    key: () => null,
    length: 0
  } as Storage;
}

describe('rpg-shortcuts(front#272)', () => {
  it('はじめは 1=回復薬・2=上回復薬・3〜5=なし。登録できるのは使う道具だけ', () => {
    expect(loadShortcuts(memoryStorage())).toEqual(['potion', 'hipotion', '', '', '']);
    expect(loadShortcuts(null)).toEqual(DEFAULT_SHORTCUTS);
    // MPを回復する道具(front#383)も登録できる
    expect(shortcutItems()).toEqual(['potion', 'hipotion', 'magic_water']);
  });

  it('魔法(front#383)は「spell:」を付けて登録でき、知らない魔法は、はじめの設定にする', () => {
    const storage = memoryStorage();
    saveShortcuts(storage, ['spell:fire', 'spell:meteor', 'potion', 'spell:heal', '']);
    expect(loadShortcuts(storage)).toEqual(['spell:fire', 'hipotion', 'potion', 'spell:heal', '']);
  });

  it('ブラウザに覚えた設定を読み直せる。知らない道具・装備・壊れた値は、はじめの設定にする', () => {
    const storage = memoryStorage();
    saveShortcuts(storage, ['hipotion', '', 'potion', 'potion', '']);
    expect(loadShortcuts(storage)).toEqual(['hipotion', '', 'potion', 'potion', '']);

    expect(loadShortcuts(memoryStorage({ rpgShortcuts: '["iron_sword", 3, "potion"]' }))).toEqual(['potion', 'hipotion', 'potion', '', '']);
    expect(loadShortcuts(memoryStorage({ rpgShortcuts: '{' }))).toEqual(DEFAULT_SHORTCUTS);
    expect(loadShortcuts(memoryStorage({ rpgShortcuts: '"potion"' }))).toEqual(DEFAULT_SHORTCUTS);
  });

  it('覚えられないブラウザでも、エラーにならない', () => {
    const broken = { setItem: () => { throw new Error('full'); } };
    expect(() => saveShortcuts(broken, DEFAULT_SHORTCUTS)).not.toThrow();
  });

  it('1〜5のキー(上の段・テンキーとも key は数字)だけがショートカット', () => {
    expect(['1', '2', '5'].map(shortcutIndexOf)).toEqual([0, 1, 4]);
    expect(['0', '6', 'a', 'F1', ''].map(shortcutIndexOf)).toEqual([-1, -1, -1, -1, -1]);
  });
});
