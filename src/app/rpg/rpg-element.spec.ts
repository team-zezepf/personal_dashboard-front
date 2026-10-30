import { beats, elementLabel, elementOrInitial, enemyElementRate, playerElementRate } from './rpg-element';

describe('属性(front#437)', () => {
  it('火→木・水→火・木→水・光⇄闇 の向きにだけ強い', () => {
    expect([beats('fire', 'wood'), beats('water', 'fire'), beats('wood', 'water'), beats('light', 'dark'), beats('dark', 'light')]).toEqual([true, true, true, true, true]);
    // 逆向き・同じ属性・関係ない属性・属性なしは強くない
    expect([beats('wood', 'fire'), beats('fire', 'fire'), beats('fire', 'light'), beats('fire', null), beats(null, 'wood')]).toEqual([false, false, false, false, false]);
  });

  it('プレイヤー・仲間はキャラの属性・魔法の属性が有利なら 1.2 倍ずつ(両方なら 1.44 倍)。不利でも減らない', () => {
    expect(playerElementRate('wood', 'water')).toBe(1.2);
    expect(playerElementRate('fire', 'water')).toBe(1);
    expect(playerElementRate('wood', 'fire')).toBe(1);
    expect(playerElementRate('wood', null)).toBe(1);
    expect(playerElementRate('fire', 'water', 'fire')).toBe(1);
    expect(playerElementRate('fire', 'wood', 'water')).toBe(1.2);
    expect(playerElementRate('water', 'fire', 'water')).toBeCloseTo(1.44);
  });

  it('敵は敵の属性が有利なら 1.5 倍。属性なしの敵はそのまま', () => {
    expect(enemyElementRate('fire', 'wood')).toBe(1.5);
    expect(enemyElementRate('water', 'wood')).toBe(1);
    expect(enemyElementRate(null, 'wood')).toBe(1);
  });

  it('前のセーブデータ・知らない値は木。表示は「🔥火」、属性なしは「なし」', () => {
    expect([elementOrInitial(undefined), elementOrInitial(null), elementOrInitial('wind'), elementOrInitial('dark')]).toEqual(['wood', 'wood', 'wood', 'dark']);
    expect([elementLabel('fire'), elementLabel(null)]).toEqual(['🔥火', 'なし']);
  });
});
