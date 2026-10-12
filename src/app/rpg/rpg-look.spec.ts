import { CLOTHES, DEFAULT_LOOK, EYES, HAIRS, MOUTHS, lookFromColors, randomLook } from './rpg-look';

describe('rpg-look', () => {
  it('髪の色・服の色だけから作る見た目は、差し色が服の色と同じにならない', () => {
    expect(lookFromColors('#dc2626', '#3b82f6')).toEqual({ ...DEFAULT_LOOK, hairColor: '#dc2626', clothesColor: '#3b82f6', accentColor: '#f8fafc' });
    // 白い服なら差し色は茶色
    expect(lookFromColors('#dc2626', '#F8FAFC').accentColor).toBe('#8b5a2b');
  });

  it('おまかせは、知っている部品だけを使い、差し色を服の色と同じにしない', () => {
    const ids = (list: [string, string][]) => list.map(([id]) => id);
    // 服の色(白)と差し色(白)が同じになる乱数も試す。服の色 → 差し色 の順に選ぶ
    const sequence = (values: number[]) => () => values.shift() ?? 0;
    const rands = [sequence([0.8, 0]), () => 0.999, Math.random];
    for (const rand of rands) {
      const look = randomLook(rand);
      expect(ids(HAIRS)).toContain(look.hair);
      expect(ids(EYES)).toContain(look.eyes);
      expect(ids(MOUTHS)).toContain(look.mouth);
      expect(ids(CLOTHES)).toContain(look.clothes);
      expect(look.accentColor).not.toBe(look.clothesColor);
    }
    expect(randomLook(sequence([0.8, 0]))).toMatchObject({ clothesColor: '#f8fafc', accentColor: '#8b5a2b' });
  });
});
