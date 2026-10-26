import { ZERO_STATS } from './rpg-data';
import { SPELLS, SPELL_IDS, isSpellId, maxMpOf, spellHealOf, spellOfShortcut, spellPowerOf, spellRangeOf, spellShortcut } from './rpg-magic';

describe('rpg-magic(front#383)', () => {
  const mag = (n: number) => ({ ...ZERO_STATS, mag: n });

  it('最大MP・威力・回復量は魔力で伸びる', () => {
    expect([maxMpOf(mag(0)), spellPowerOf(mag(0)), spellHealOf(mag(0))]).toEqual([20, 8, 15]);
    expect([maxMpOf(mag(12)), spellPowerOf(mag(12)), spellHealOf(mag(12))]).toEqual([68, 44, 51]);
  });

  it('攻撃魔法の届く距離は、魔力0で3マス → 99で7マス。それ以上は伸びない', () => {
    expect(spellRangeOf(mag(0))).toBe(3);
    expect(spellRangeOf(mag(99))).toBe(7);
    expect(spellRangeOf(mag(150))).toBe(7);
    expect(spellRangeOf(mag(50))).toBeCloseTo(5.02, 2);
  });

  it('魔法は攻撃3つ・回復2つ。ショートカットには「spell:」を付けて登録する', () => {
    expect(SPELL_IDS.map((id) => SPELLS[id].kind)).toEqual(['attack', 'attack', 'attack', 'heal', 'heal']);
    expect(SPELL_IDS.map((id) => SPELLS[id].mp)).toEqual([4, 6, 10, 5, 14]);
    expect(isSpellId('fire')).toBe(true);
    expect(isSpellId('toString')).toBe(false);
    expect(spellShortcut('thunder')).toBe('spell:thunder');
    expect(spellOfShortcut('spell:thunder')).toBe('thunder');
    expect(spellOfShortcut('spell:meteor')).toBeNull();
    expect(spellOfShortcut('potion')).toBeNull();
  });
});
