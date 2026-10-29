import { PLAYER_CLOTHES, WEAPON_SHAPES, drawLook, wearArmor, weaponPose } from './rpg-look';
import { ACCENT_COLORS, BROWS, HAIR_BACKS, HAIR_TOPS, hairBackOf, hairTopOf, CLOTHES, CLOTHES_COLORS, DEFAULT_LOOK, EYES, EYE_COLORS, HAIRS, HAIR_COLORS, MOUTHS, lookFromColors, randomLook } from './rpg-look';

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

describe('rpg-look 髪のトップ・後ろ(front#370)', () => {
  it('選んでいなければ髪型どおりのトップ・後ろになる', () => {
    expect([hairTopOf(DEFAULT_LOOK), hairBackOf(DEFAULT_LOOK)]).toEqual(['tufts', 'none']);
    expect([hairTopOf({ ...DEFAULT_LOOK, hair: 'long' }), hairBackOf({ ...DEFAULT_LOOK, hair: 'long' })]).toEqual(['sweep', 'long']);
    expect([hairTopOf({ ...DEFAULT_LOOK, hair: 'bob' }), hairBackOf({ ...DEFAULT_LOOK, hair: 'bob' })]).toEqual(['straight', 'bob']);
    expect([hairTopOf({ ...DEFAULT_LOOK, hair: 'ponytail' }), hairBackOf({ ...DEFAULT_LOOK, hair: 'ponytail' })]).toEqual(['center', 'ponytail']);
    expect([hairTopOf({ ...DEFAULT_LOOK, hair: 'bald' }), hairBackOf({ ...DEFAULT_LOOK, hair: 'bald' })]).toEqual(['none', 'none']);
  });

  it('選んだトップ・後ろは髪型より優先する。トップ・後ろの一覧の名前は API と同じで、最初は「髪型に合わせる」', () => {
    expect(hairTopOf({ ...DEFAULT_LOOK, hair: 'bob', hairTop: 'point' })).toBe('point');
    expect(hairBackOf({ ...DEFAULT_LOOK, hair: 'bob', hairBack: 'flip' })).toBe('flip');
    expect(HAIR_TOPS.map(([id]) => id)).toEqual([null, 'tufts', 'sweep', 'straight', 'center', 'point', 'spiky', 'none']);
    expect(HAIR_BACKS.map(([id]) => id)).toEqual([null, 'none', 'long', 'bob', 'flip', 'ponytail', 'twintail', 'sidetail', 'bun', 'braid', 'wavy']);
    // 髪型どおりのトップ・後ろは、必ず一覧にある
    for (const [hair] of HAIRS) {
      expect(HAIR_TOPS.map(([id]) => id)).toContain(hairTopOf({ ...DEFAULT_LOOK, hair }));
      expect(HAIR_BACKS.map(([id]) => id)).toContain(hairBackOf({ ...DEFAULT_LOOK, hair }));
    }
  });

  it('おまかせでは、トップ・後ろは髪型に合わせる(null)', () => {
    expect(randomLook()).toMatchObject({ hairTop: null, hairBack: null });
  });

  describe('装備の見た目(front#431)', () => {
    const armor = { shape: 'robe', color: '#1e3a8a', accent: '#fde047' };

    it('見た目のある防具を着ると、服の形・色・飾りの色は防具のものになる。見た目のない防具なら選んだ服のまま', () => {
      const look = { ...DEFAULT_LOOK, clothes: 'hoodie', clothesColor: '#ef4444', accentColor: '#f8fafc' };
      expect(wearArmor(look, armor)).toMatchObject({ clothes: 'robe', clothesColor: '#1e3a8a', accentColor: '#fde047', hair: look.hair });
      expect(wearArmor(look, null)).toBe(look);
    });

    it('前に選んでいたローブ・よろいは、見た目のない防具のときはシャツにする', () => {
      expect(wearArmor({ ...DEFAULT_LOOK, clothes: 'robe' }, null).clothes).toBe('shirt');
      expect(wearArmor({ ...DEFAULT_LOOK, clothes: 'armor' }, undefined).clothes).toBe('shirt');
    });

    it('プレイヤーの服からローブ・よろいを外す。おまかせでも選ばない', () => {
      expect(PLAYER_CLOTHES.map(([id]) => id)).toEqual(['shirt', 'dress', 'vest', 'hoodie', 'sailor']);
      for (let i = 0; i < 20; i++) expect(['robe', 'armor']).not.toContain(randomLook(() => (i % 10) / 10, PLAYER_CLOTHES).clothes);
    });

    it('武器は片手剣・大剣・玉の杖・三日月の杖。見た目のない武器・知らない形は、今までの色の片手剣', () => {
      expect(WEAPON_SHAPES.map(([id]) => id)).toEqual(['sword', 'greatsword', 'staff', 'moonstaff']);
      expect(weaponPose({ shape: 'staff', color: '#8b5a2b', accent: '#60a5fa' }, '#c08a52')).toEqual({ sword: true, swordColor: '#8b5a2b', weaponShape: 'staff', weaponAccent: '#60a5fa' });
      expect(weaponPose(undefined, '#c08a52')).toEqual({ sword: true, swordColor: '#c08a52' });
      expect(weaponPose({ shape: 'axe', color: '#000000', accent: '#000000' }, '#cbd5e1')).toEqual({ sword: true, swordColor: '#cbd5e1' });
    });

    it('どの武器の形・どの防具の服でも描ける(描くときにエラーにならない)', () => {
      const cv = document.createElement('canvas');
      const c = cv.getContext('2d');
      if (!c) return;
      for (const [shape] of WEAPON_SHAPES) {
        expect(() => drawLook(c, wearArmor(DEFAULT_LOOK, armor), { dir: -1, time: 1, ...weaponPose({ shape, color: '#cbd5e1', accent: '#a16207' }, '#000000') })).not.toThrow();
      }
    });
  });
});
