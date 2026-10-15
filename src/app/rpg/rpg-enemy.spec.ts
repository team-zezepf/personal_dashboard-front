import { RpgEnemy } from '../models/rpg.models';
import {
  DEFAULT_ENEMIES, ENEMIES, ENEMY_SHAPES, attackReach, attackTiming, disguiseOf, drawEnemyBody, isRooted, movesToTarget, setEnemies
} from './rpg-enemy';

describe('rpg-enemy', () => {
  afterEach(() => setEnemies(DEFAULT_ENEMIES));

  it('最初は18種類で、前からある9種類は今と同じ体当たり(距離1・ためる時間0)', () => {
    expect(Object.keys(ENEMIES)).toEqual([
      'slime', 'blue', 'kinokon', 'spirit', 'raptor', 'golem', 'ghost', 'knight', 'darklord', 'nightbat', 'skeleton', 'maneater', 'reddragon',
      'mimic', 'livingarmor', 'hornrabbit', 'mitsubachin', 'hikarislime'
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
    expect(Object.values(ENEMIES).filter(isRooted).map((e) => e.id)).toEqual(['maneater']);
  });

  it('ミミック・リビングアーマーは宝箱・甲冑にばける形で、ばけている間もばけていない間も描ける(front#270)', () => {
    expect(ENEMY_SHAPES.slice(12, 14)).toEqual([['mimic', 'ミミック'], ['livingarmor', 'リビングアーマー']]);
    expect(Object.values(ENEMIES).map((e) => [e.id, disguiseOf(e)]).filter(([, d]) => d)).toEqual([['mimic', '宝箱'], ['livingarmor', '甲冑']]);
    expect(Object.values(ENEMIES).filter(isRooted).map((e) => e.id)).toEqual(['maneater']);
    const c = new Proxy({}, { get: (_t, key) => (key === 'createRadialGradient' || key === 'createLinearGradient' ? () => ({ addColorStop: () => undefined }) : () => undefined), set: () => true }) as unknown as CanvasRenderingContext2D;
    for (const def of [ENEMIES['mimic'], ENEMIES['livingarmor']]) {
      for (const pose of [{}, { flash: true }, { aggro: true, moving: true }, { aggro: true, lunge: 0.6 }, { aggro: true, flash: true }]) {
        expect(drawEnemyBody(c, def, { dir: -1, time: 1.3, ...pose })).toBeGreaterThan(0);
      }
    }
  });

  it('つのウサギ・ミツバチンの形と光る敵を、どの状態でも描ける。スライムは、まれにヒカリスライムに入れかわる(front#284)', () => {
    expect(ENEMY_SHAPES.slice(14)).toEqual([['rabbit', 'うさぎ'], ['bee', 'はち']]);
    expect([ENEMIES['slime'].rareVariant, ENEMIES['slime'].rareRate]).toEqual(['hikarislime', 0.02]);
    expect(ENEMIES['hikarislime'].glow).toBe(true);
    const c = new Proxy({}, { get: (_t, key) => (key === 'createRadialGradient' || key === 'createLinearGradient' ? () => ({ addColorStop: () => undefined }) : () => undefined), set: () => true }) as unknown as CanvasRenderingContext2D;
    for (const def of [ENEMIES['hornrabbit'], ENEMIES['mitsubachin'], ENEMIES['hikarislime']]) {
      for (const pose of [{}, { moving: true }, { aggro: true, lunge: 0.6 }, { flash: true }]) {
        expect(drawEnemyBody(c, def, { dir: -1, time: 1.3, ...pose })).toBeGreaterThan(0);
      }
    }
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
