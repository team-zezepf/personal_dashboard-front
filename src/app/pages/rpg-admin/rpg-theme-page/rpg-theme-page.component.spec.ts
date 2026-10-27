import { DEFAULT_THEMES } from '../../../rpg/rpg-data';
import { themeProblems, toThemeInput } from './rpg-theme-page.component';

// 見た目タブ(front#389)
describe('見た目タブのチェック・保存の形(front#389)', () => {
  const plain = DEFAULT_THEMES[0];

  it('名前・水のマスの呼び名がない・長すぎるときは保存できない', () => {
    expect(themeProblems(plain)).toEqual([]);
    expect(themeProblems({ ...plain, name: ' ' })).toEqual(['見た目の名前は1〜20文字にしてください。']);
    expect(themeProblems({ ...plain, liquidName: 'あ'.repeat(11) })).toEqual(['水のマスの呼び名は1〜10文字にしてください。']);
  });

  it('新しい見た目は id を null にし、名前の前後の空白を除いて送る(更新日時は送らない)', () => {
    const input = toThemeInput({ theme: { ...plain, id: 'new-1', name: ' 雪原 ', updatedAt: '2026-10-27T00:00:00' }, isNew: true });
    expect(input.id).toBeNull();
    expect(input.name).toBe('雪原');
    expect('updatedAt' in input).toBe(false);
    expect(input.effect).toEqual(plain.effect);
    expect(toThemeInput({ theme: plain, isNew: false }).id).toBe('plain');
  });
});
