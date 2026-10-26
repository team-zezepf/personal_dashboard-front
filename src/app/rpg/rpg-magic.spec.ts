import { ZERO_STATS } from './rpg-data';
import { SPELLS, SPELL_IDS, isSpellId, levelRateOf, maxMpOf, spellLabel, spellHealOf, spellOfShortcut, spellPowerOf, spellRangeOf, spellShortcut } from './rpg-magic';

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

  it('魔法の LV(front#387)の倍率は LV1 ×1.0 から1つ上がるごとに +0.5。LV5 まで', () => {
    expect([1, 2, 3, 4, 5].map(levelRateOf)).toEqual([1, 1.5, 2, 2.5, 3]);
    expect(levelRateOf(9)).toBe(3);
    expect(levelRateOf(0)).toBe(1);
    expect(spellLabel('fire', 2)).toBe('ファイア LV2');
  });
});
