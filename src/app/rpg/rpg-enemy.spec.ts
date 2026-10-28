import { RpgEnemy } from '../models/rpg.models';
import {
  DEFAULT_ENEMIES, ENEMIES, ENEMY_ATTACKS, ENEMY_SHAPES, SPELLS, attackReach, attackTiming, castOf, disguiseOf, drawAttackEffect, drawEnemyBody, guardRateOf, hitMaterialOf, isPassive, isRooted, movesToTarget, setEnemies
} from './rpg-enemy';

describe('rpg-enemy', () => {
  afterEach(() => setEnemies(DEFAULT_ENEMIES));

  it('最初は25種類で、前からある9種類は今と同じ体当たり(距離1・ためる時間0)', () => {
    expect(Object.keys(ENEMIES)).toEqual([
      'slime', 'blue', 'kinokon', 'spirit', 'raptor', 'golem', 'ghost', 'knight', 'darklord', 'nightbat', 'skeleton', 'maneater', 'reddragon',
      'mimic', 'livingarmor', 'hornrabbit', 'mitsubachin', 'hikarislime', 'rat', 'jailer', 'captiveghost',
      'grimoire', 'shadow', 'wardcrystal', 'gargoyle'
    ]);
    expect(Object.values(ENEMIES).slice(0, 9).every((e) => e.attack === 'tackle' && e.dash === 1 && e.charge === 0)).toBe(true);
    expect(Object.values(ENEMIES).slice(9, 13).map((e) => e.shape)).toEqual(['bat', 'skeleton', 'plant', 'dragon']);
  });

  it('コウモリ・ガイコツ・ひとくいそう・ドラゴンの形を選べ、どの状態でも描ける。ひとくいそうだけ根を張って動かない(front#255)', () => {
    expect(ENEMY_SHAPES.slice(8, 12)).toEqual([['bat', 'コウモリ'], ['skeleton', 'ガイコツ'], ['plant', 'ひとくいそう'], ['dragon', 'ドラゴン']]);
    // 描くだけ確かめる、何もしない canvas
    const c = new Proxy({}, { get: (_t, key) => (key === 'createRadialGradient' || key === 'createLinearGradient' ? () => ({ addColorStop: () => undefined }) : () => undefined), set: () => true }) as unknown as CanvasRenderingContext2D;
    for (const def of Object.values(ENEMIES).slice(9, 13)) {
      for (const pose of [{ moving: true }, { aggro: true, lunge: 0.6 }, { flash: true }]) {
        expect(drawEnemyBody(c, def, { dir: -1, time: 1.3, ...pose })).toBeGreaterThan(0);
      }
    }
    expect(Object.values(ENEMIES).filter(isRooted).map((e) => e.id)).toEqual(['maneater', 'wardcrystal']);
  });

  it('ミミック・リビングアーマーは宝箱・甲冑にばける形で、ばけている間もばけていない間も描ける(front#270)', () => {
    expect(ENEMY_SHAPES.slice(12, 14)).toEqual([['mimic', 'ミミック'], ['livingarmor', 'リビングアーマー']]);
    expect(Object.values(ENEMIES).map((e) => [e.id, disguiseOf(e)]).filter(([, d]) => d)).toEqual([['mimic', '宝箱'], ['livingarmor', '甲冑'], ['gargoyle', '石像']]);
    expect(Object.values(ENEMIES).filter(isRooted).map((e) => e.id)).toEqual(['maneater', 'wardcrystal']);
    const c = new Proxy({}, { get: (_t, key) => (key === 'createRadialGradient' || key === 'createLinearGradient' ? () => ({ addColorStop: () => undefined }) : () => undefined), set: () => true }) as unknown as CanvasRenderingContext2D;
    for (const def of [ENEMIES['mimic'], ENEMIES['livingarmor']]) {
      for (const pose of [{}, { flash: true }, { aggro: true, moving: true }, { aggro: true, lunge: 0.6 }, { aggro: true, flash: true }]) {
        expect(drawEnemyBody(c, def, { dir: -1, time: 1.3, ...pose })).toBeGreaterThan(0);
      }
    }
  });

  it('つのウサギ・ミツバチンの形と光る敵を、どの状態でも描ける。スライムは、まれにヒカリスライムに入れかわる(front#284)', () => {
    expect(ENEMY_SHAPES.slice(14, 16)).toEqual([['rabbit', 'うさぎ'], ['bee', 'はち']]);
    expect(ENEMIES['hikarislime'].glow).toBe(true);
    const c = new Proxy({}, { get: (_t, key) => (key === 'createRadialGradient' || key === 'createLinearGradient' ? () => ({ addColorStop: () => undefined }) : () => undefined), set: () => true }) as unknown as CanvasRenderingContext2D;
    for (const def of [ENEMIES['hornrabbit'], ENEMIES['mitsubachin'], ENEMIES['hikarislime']]) {
      for (const pose of [{}, { moving: true }, { aggro: true, lunge: 0.6 }, { flash: true }]) {
        expect(drawEnemyBody(c, def, { dir: -1, time: 1.3, ...pose })).toBeGreaterThan(0);
      }
    }
  });

  it('ケルベロスの形を選べ、どの状態・どの向きでも描ける(front#306)', () => {
    expect(ENEMY_SHAPES.slice(16, 17)).toEqual([['cerberus', 'ケルベロス']]);
    const c = new Proxy({}, { get: (_t, key) => (key === 'createRadialGradient' || key === 'createLinearGradient' ? () => ({ addColorStop: () => undefined }) : () => undefined), set: () => true }) as unknown as CanvasRenderingContext2D;
    const def = { ...ENEMIES['knight'], shape: 'cerberus' as const, attack: 'fire' as const, size: 1.45 };
    for (const dir of [1, -1]) {
      for (const pose of [{}, { moving: true }, { aggro: true }, { aggro: true, lunge: 0.6 }, { flash: true }]) {
        expect(drawEnemyBody(c, def, { dir, time: 1.3, ...pose })).toBeGreaterThan(0);
      }
    }
  });

  it('ネズミの形を選べ、どの状態・どの向きでも描ける。牢獄の敵は、ネズミ・騎士・ゴーストの形で素材を落とす(front#321)', () => {
    expect(ENEMY_SHAPES.slice(17, 18)).toEqual([['rat', 'ネズミ']]);
    expect(['rat', 'jailer', 'captiveghost'].map((id) => [ENEMIES[id].shape, ENEMIES[id].material])).toEqual([
      ['rat', 'rat_tail'], ['knight', 'rusty_key'], ['ghost', 'iron_chain']
    ]);
    const c = new Proxy({}, { get: (_t, key) => (key === 'createRadialGradient' || key === 'createLinearGradient' ? () => ({ addColorStop: () => undefined }) : () => undefined), set: () => true }) as unknown as CanvasRenderingContext2D;
    for (const dir of [1, -1]) {
      for (const pose of [{}, { moving: true }, { aggro: true }, { aggro: true, lunge: 0.6 }, { flash: true }]) {
        expect(drawEnemyBody(c, ENEMIES['rat'], { dir, time: 1.3, ...pose })).toBeGreaterThan(0);
      }
    }
  });

  it('闇の魔導士(魔導士の形)は、どの状態・向きでも描け、背が高くなった(front#327)', () => {
    const c = new Proxy({}, { get: (_t, key) => (key === 'createRadialGradient' || key === 'createLinearGradient' ? () => ({ addColorStop: () => undefined }) : () => undefined), set: () => true }) as unknown as CanvasRenderingContext2D;
    for (const dir of [1, -1]) {
      for (const pose of [{}, { moving: true }, { aggro: true }, { aggro: true, cast: 1 }, { flash: true }]) {
        expect(drawEnemyBody(c, ENEMIES['darklord'], { dir, time: 1.3, ...pose })).toBeGreaterThan(80 * ENEMIES['darklord'].size);
      }
    }
    // 騎士(二頭身)は今までどおり
    expect(drawEnemyBody(c, ENEMIES['knight'], { dir: 1, time: 1.3 })).toBe(54 * ENEMIES['knight'].size);
  });

  it('魔法陣は離れたところへの攻撃で、0.53秒で当たり 0.93秒で終わる。詠唱の強さは当たったあと弱まる。範囲0〜2で描ける(front#327)', () => {
    expect(ENEMY_ATTACKS.at(-1)).toMatchObject({ id: 'circle', label: '魔法陣', kind: 'rule' });
    expect(SPELLS).toContain('circle');
    const def = { ...ENEMIES['darklord'], attack: 'circle' as const, range: 3, radius: 1 };
    const { duration, hitAt } = attackTiming(def);
    expect([hitAt, duration].map((v) => Math.round(v * 100) / 100)).toEqual([0.53, 0.93]);
    expect(attackReach(def, 1)).toBeCloseTo(3.35);
    expect([castOf(def, 0), castOf(def, 0.3), castOf(def, 0.9)]).toEqual([0, 1, 0]);
    expect(castOf({ ...def, attack: 'tackle' }, 0.3)).toBe(0);
    const c = new Proxy({}, { get: (_t, key) => (key === 'createRadialGradient' || key === 'createLinearGradient' ? () => ({ addColorStop: () => undefined }) : () => undefined), set: () => true }) as unknown as CanvasRenderingContext2D;
    for (const radius of [0, 1, 2]) {
      for (const k of [0.1, 0.5, 0.6, 0.8, 1]) {
        expect(() => drawAttackEffect(c, { attack: 'circle', k, time: 1, ex: 0, ey: 0, tx: 100, ty: 50, dir: 1, s: 1, radiusPx: 40, radius, hitK: hitAt / duration })).not.toThrow();
      }
    }
  });

  it('魔導書・影・結晶・ガーゴイルの形を選べ、どの状態・向きでも描ける。結晶は動かず攻撃せず、ガーゴイルは石像にばける(front#329)', () => {
    expect(ENEMY_SHAPES.slice(18, 22)).toEqual([['grimoire', '魔導書'], ['shade', '影'], ['wardcrystal', '結晶'], ['gargoyle', 'ガーゴイル']]);
    expect(['grimoire', 'shadow', 'wardcrystal', 'gargoyle'].map((id) => [ENEMIES[id].shape, ENEMIES[id].material])).toEqual([
      ['grimoire', 'cursed_page'], ['shade', 'shadow_shard'], ['wardcrystal', 'dark_crystal'], ['gargoyle', 'gargoyle_wing']
    ]);
    expect(Object.values(ENEMIES).filter(isPassive).map((e) => e.id)).toEqual(['wardcrystal']);
    expect(disguiseOf(ENEMIES['gargoyle'])).toBe('石像');
    expect(['grimoire', 'shadow', 'wardcrystal', 'gargoyle'].map((id) => hitMaterialOf(ENEMIES[id]))).toEqual(['soft', 'soft', 'stone', 'stone']);
    const c = new Proxy({}, { get: (_t, key) => (key === 'createRadialGradient' || key === 'createLinearGradient' ? () => ({ addColorStop: () => undefined }) : () => undefined), set: () => true }) as unknown as CanvasRenderingContext2D;
    for (const id of ['grimoire', 'shadow', 'wardcrystal', 'gargoyle']) {
      for (const dir of [1, -1]) {
        for (const pose of [{}, { moving: true }, { aggro: true }, { aggro: true, lunge: 0.6 }, { flash: true }]) {
          expect(drawEnemyBody(c, ENEMIES[id], { dir, time: 1.3, ...pose })).toBeGreaterThan(0);
        }
      }
    }
    // 影の分身は、魔導士より背が低い(冠・角・杖がない)
    expect(drawEnemyBody(c, ENEMIES['shadow'], { dir: 1, time: 0 }) / ENEMIES['shadow'].size).toBeLessThan(drawEnemyBody(c, ENEMIES['darklord'], { dir: 1, time: 0 }) / ENEMIES['darklord'].size);
  });

  it('カニ・クラゲ・魚人・イカの形を選べ、どの状態・向きでも描ける。叩いた音はカニが岩・クラゲとイカが柔らかいもの(front#421)', () => {
    expect(ENEMY_SHAPES.slice(22)).toEqual([['crab', 'カニ'], ['jellyfish', 'クラゲ'], ['fishman', '魚人'], ['kraken', 'イカ']]);
    const sea = (['crab', 'jellyfish', 'fishman', 'kraken'] as const).map((shape) => ({ ...ENEMIES['slime'], id: shape, shape, color: '#38bdf8', dark: '#0369a1' }));
    expect(sea.map((e) => hitMaterialOf(e))).toEqual(['stone', 'soft', 'flesh', 'soft']);
    expect(sea.map((e) => disguiseOf(e))).toEqual([null, null, null, null]);
    expect(sea.some(isPassive)).toBe(false);
    const c = new Proxy({}, { get: (_t, key) => (key === 'createRadialGradient' || key === 'createLinearGradient' ? () => ({ addColorStop: () => undefined }) : () => undefined), set: () => true }) as unknown as CanvasRenderingContext2D;
    for (const e of sea) {
      for (const dir of [1, -1]) {
        for (const pose of [{}, { moving: true }, { aggro: true }, { aggro: true, lunge: 0.6 }, { flash: true }]) {
          expect(drawEnemyBody(c, e, { dir, time: 1.3, ...pose })).toBeGreaterThan(0);
        }
      }
    }
    // イカ(クラーケン)はボス向けの大きな形で、カニより背が高い
    expect(drawEnemyBody(c, sea[3], { dir: 1, time: 0 })).toBeGreaterThan(drawEnemyBody(c, sea[0], { dir: 1, time: 0 }));
  });

  it('守る敵の数ごとの、ボスに与えるダメージの割合。最初の敵では闇の水晶だけが守る(front#330)', () => {
    expect([0, 1, 2, 3, 4, 5].map(guardRateOf)).toEqual([1, 0.75, 0.5, 0.25, 0, 0]);
    expect(Object.values(ENEMIES).filter((e) => e.guard).map((e) => e.id)).toEqual(['wardcrystal']);
  });

  it('APIの敵で入れ替える。知らない形・攻撃は、スライム・体当たりとして扱う', () => {
    const odd = { ...DEFAULT_ENEMIES[0], id: 'odd', shape: 'unicorn', attack: 'laser', sortOrder: 1, updatedAt: null } as unknown as RpgEnemy;
    setEnemies([odd]);

    expect(Object.keys(ENEMIES)).toEqual(['odd']);
    expect(ENEMIES['odd']).toMatchObject({ shape: 'slime', attack: 'tackle' });
    expect('sortOrder' in ENEMIES['odd']).toBe(false);
  });

  it('攻撃が届く距離: 炎などは射程、衝撃波は範囲、体当たり・ジャンプは距離(1ならとなり)', () => {
    const base = DEFAULT_ENEMIES[0];
    expect(attackReach({ ...base, attack: 'fire', range: 4 }, 1.35)).toBeCloseTo(4.35);
    expect(attackReach({ ...base, attack: 'fire', range: 1 }, 1.35)).toBeCloseTo(1.35);
    expect(attackReach({ ...base, attack: 'shockwave', radius: 2 }, 1.35)).toBeCloseTo(2.35);
    expect(attackReach({ ...base, attack: 'jump', dash: 3 }, 1.35)).toBeCloseTo(3.35);
    expect(attackReach({ ...base, attack: 'tackle', dash: 1 }, 1.35)).toBe(1.35);
    expect(attackReach({ ...base, attack: 'claw' }, 1.35)).toBe(1.35);
  });

  it('ためる時間のぶん、当たるのが遅くなる', () => {
    const base = DEFAULT_ENEMIES[0];
    expect(attackTiming({ ...base, attack: 'tackle', dash: 1, charge: 0 }).hitAt).toBe(0);
    expect(attackTiming({ ...base, attack: 'tackle', dash: 3, charge: 1 })).toEqual({ duration: 1.5, hitAt: 1.25 });
    expect(movesToTarget({ ...base, attack: 'jump', dash: 1 })).toBe(false);
    expect(movesToTarget({ ...base, attack: 'jump', dash: 2 })).toBe(true);
  });
});
