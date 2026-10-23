import { ACCENT_COLORS, BROWS, CLOTHES, CLOTHES_COLORS, DEFAULT_LOOK, EYES, EYE_COLORS, HAIRS, HAIR_COLORS, MOUTHS, lookFromColors, randomLook } from './rpg-look';

describe('rpg-look', () => {
  it('髪の色・服の色だけから作る見た目は、差し色が服の色と同じにならない', () => {
    expect(lookFromColors('#dc2626', '#3b82f6')).toEqual({ ...DEFAULT_LOOK, hairColor: '#dc2626', clothesColor: '#3b82f6', accentColor: '#f8fafc' });
    // 白い服なら差し色は茶色
    expect(lookFromColors('#dc2626', '#F8FAFC').accentColor).toBe('#8b5a2b');
  });

  it('おまかせは、知っている部品だけを使い、差し色を服の色と同じにしない。眉の色は髪に合わせる(front#362)', () => {
    const ids = (list: [string, string][]) => list.map(([id]) => id);
    // 服の色(白)と差し色(白)が同じになる乱数も試す。服の色 → 差し色 の順に選ぶ(白はどちらも一覧の8番目)
    const sequence = (values: number[]) => () => values.shift() ?? 0;
    const rands = [sequence([0.5, 0.5]), () => 0.999, Math.random];
    for (const rand of rands) {
      const look = randomLook(rand);
      expect(ids(HAIRS)).toContain(look.hair);
      expect(ids(EYES)).toContain(look.eyes);
      expect(ids(MOUTHS)).toContain(look.mouth);
      expect(ids(CLOTHES)).toContain(look.clothes);
      expect(ids(BROWS)).toContain(look.brows);
      expect(look.browColor).toBeNull();
      expect(look.accentColor).not.toBe(look.clothesColor);
    }
    expect(randomLook(sequence([0.5, 0.5]))).toMatchObject({ clothesColor: '#f8fafc', accentColor: '#8b5a2b' });
  });

  it('front#362 新しい髪型・服・眉を選べ、マント・エプロンは見た目では選べない', () => {
    const ids = (list: [string, string][]) => list.map(([id]) => id);
    expect(ids(HAIRS)).toEqual(expect.arrayContaining(['bun', 'braid', 'wavy', 'sidetail']));
    expect(ids(CLOTHES)).toEqual(expect.arrayContaining(['hoodie', 'sailor']));
    expect(ids(CLOTHES)).not.toContain('cape');
    expect(ids(CLOTHES)).not.toContain('apron');
    expect(ids(BROWS)).toEqual(['normal', 'thick', 'thin', 'arch', 'sharp', 'worried', 'short', 'none']);
    // キラキラは「ふつう」と差が小さいので選べなくした(front#371)
    expect(ids(EYES)).not.toContain('sparkle');
  });

  it('front#362 色の一覧は2段で、同じ色が重ならない', () => {
    // 髪・服・差し色は7列×2段、目は6列×2段
    for (const [list, cols] of [[HAIR_COLORS, 7], [CLOTHES_COLORS, 7], [ACCENT_COLORS, 7], [EYE_COLORS, 6]] as const) {
      expect(list.length).toBe(cols * 2);
      expect(new Set(list).size).toBe(list.length);
    }
    // 最初の見た目の色は一覧にある(選ばれた状態で表示される)
    expect(HAIR_COLORS).toContain(DEFAULT_LOOK.hairColor);
    expect(EYE_COLORS).toContain(DEFAULT_LOOK.eyeColor);
    expect(CLOTHES_COLORS).toContain(DEFAULT_LOOK.clothesColor);
    expect(ACCENT_COLORS).toContain(DEFAULT_LOOK.accentColor);
  });
});
