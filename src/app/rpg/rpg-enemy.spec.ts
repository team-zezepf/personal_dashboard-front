import { RpgEnemy } from '../models/rpg.models';
import { DEFAULT_ENEMIES, ENEMIES, attackReach, attackTiming, movesToTarget, setEnemies } from './rpg-enemy';

describe('rpg-enemy', () => {
  afterEach(() => setEnemies(DEFAULT_ENEMIES));

  it('最初は今の9種類で、すべて今と同じ体当たり(距離1・ためる時間0)', () => {
    expect(Object.keys(ENEMIES)).toEqual(['slime', 'blue', 'kinokon', 'spirit', 'raptor', 'golem', 'ghost', 'knight', 'darklord']);
    expect(Object.values(ENEMIES).every((e) => e.attack === 'tackle' && e.dash === 1 && e.charge === 0)).toBe(true);
  });

  it('APIの敵で入れ替える。知らない形・攻撃は、スライム・体当たりとして扱う', () => {
    const odd = { ...DEFAULT_ENEMIES[0], id: 'odd', shape: 'dragon', attack: 'laser', sortOrder: 1, updatedAt: null } as unknown as RpgEnemy;
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
