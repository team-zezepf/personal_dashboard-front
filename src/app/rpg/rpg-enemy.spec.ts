import { RpgEnemy } from '../models/rpg.models';
import {
  ATTACK_ELEMENTS, DEFAULT_ENEMIES, ENEMIES, ENEMY_ATTACKS, ENEMY_SHAPES, EnemyAttack, LV2_ATTACKS, SPELLS, attackReach, attackTiming, castOf, disguiseOf, drawAttackEffect, drawEnemyBody, guardRateOf, hitMaterialOf, isPassive, isRooted, movesToTarget, setEnemies
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

  it('属性の攻撃は 炎・水・風・雷・闇 × LV1/LV2 で、前からある攻撃のIDはそのまま使う(front#435)', () => {
    expect(ATTACK_ELEMENTS.map((e) => [e.label, ...e.levels])).toEqual([
      ['炎', 'fire', 'blaze'], ['水', 'water', 'splash'], ['風', 'wind', 'gale'], ['雷', 'spark', 'thunder'], ['闇', 'dark', 'circle']
    ]);
    for (const e of ATTACK_ELEMENTS) {
      expect(e.levels.map((id) => ENEMY_ATTACKS.find((a) => a.id === id))).toEqual([
        expect.objectContaining({ element: e.id, level: 1, label: `${e.label} LV1` }),
        expect.objectContaining({ element: e.id, level: 2, label: `${e.label} LV2` })
      ]);
    }
    expect(LV2_ATTACKS).toEqual(['blaze', 'splash', 'gale', 'thunder', 'circle']);
    expect([...SPELLS].sort()).toEqual(ATTACK_ELEMENTS.flatMap((e) => e.levels).sort());
  });

  it('LV1 は前の約1.5倍の長さ、LV2 は魔法陣が出て約0.38秒で当たる。詠唱の強さは当たったあと弱まる(front#435)', () => {
    const at = (attack: EnemyAttack) => {
      const { hitAt, duration } = attackTiming({ ...ENEMIES['darklord'], attack });
      return [hitAt, duration].map((v) => Math.round(v * 100) / 100);
    };
    expect(at('fire')).toEqual([0.69, 1.54]);
    expect(at('spark')).toEqual([0.69, 1.38]);
    for (const attack of LV2_ATTACKS) expect(at(attack)[0]).toBe(0.38);
    expect(at('circle')).toEqual([0.38, 1.0]);
    // 敵のふつうの攻撃は変えない
    expect(at('claw')).toEqual([0.22, 0.55]);
    const def = { ...ENEMIES['darklord'], attack: 'circle' as const, range: 3, radius: 1 };
    expect(attackReach(def, 1)).toBeCloseTo(3.35);
    expect([castOf(def, 0), castOf(def, 0.3), castOf(def, 0.9)]).toEqual([0, 1, 0]);
    expect(castOf({ ...def, attack: 'tackle' }, 0.3)).toBe(0);
  });

  it('属性の攻撃はどの進み・範囲でも描ける。LV2 は「魔法陣を出す」を外すと魔法陣だけ描かない。プレイヤーのサンダーは前の雷雲のまま(front#435)', () => {
    // 呼ばれた描き方を数える canvas。fillRect は魔法陣のルーンの印だけが使う
    const calls: Record<string, number> = {};
    const c = new Proxy({}, {
      get: (_t, key: string) => (key === 'createRadialGradient' || key === 'createLinearGradient' ? () => ({ addColorStop: () => undefined }) : () => { calls[key] = (calls[key] ?? 0) + 1; }),
      set: () => true
    }) as unknown as CanvasRenderingContext2D;
    const draw = (attack: EnemyAttack, k: number, extra: { radius?: number; circle?: boolean; player?: boolean } = {}) => {
      const { hitAt, duration } = attackTiming({ ...ENEMIES['darklord'], attack });
      drawAttackEffect(c, { attack, k, time: 1.3, ex: 0, ey: 0, tx: 100, ty: 50, dir: 1, s: 1, radiusPx: 40, radius: extra.radius ?? 1, hitK: hitAt / duration, circle: extra.circle, player: extra.player });
    };
    const count = (key: string, f: () => void) => {
      for (const k of Object.keys(calls)) delete calls[k];
      f();
      return calls[key] ?? 0;
    };
    for (const attack of SPELLS) {
      for (const radius of [0, 1, 2]) {
        for (const k of [0, 0.1, 0.3, 0.5, 0.6, 0.8, 1]) expect(() => draw(attack, k, { radius })).not.toThrow();
      }
    }
    for (const attack of LV2_ATTACKS) {
      expect(count('fillRect', () => draw(attack, 0.3))).toBeGreaterThan(0);
      expect(count('fillRect', () => draw(attack, 0.3, { circle: false }))).toBe(0);
      // 魔法陣を出さなくても、攻撃そのものは描く
      expect(count('beginPath', () => draw(attack, 0.5, { circle: false }))).toBeGreaterThan(0);
    }
    // プレイヤーのサンダー: 雷雲(丸5つ)を描き、魔法陣は出さない
    expect(count('fillRect', () => draw('thunder', 0.3, { player: true }))).toBe(0);
    expect(count('arc', () => draw('thunder', 0.3, { player: true }))).toBeGreaterThanOrEqual(5);
  });

  it('魔法陣を出す(magicCircle)は、前のAPIのデータにはないので出す(front#435)', () => {
    const { magicCircle: _m, ...old } = DEFAULT_ENEMIES[0];
    setEnemies([{ ...old, id: 'old', attack: 'splash' }, { ...old, id: 'off', attack: 'splash', magicCircle: false }]);
    expect([ENEMIES['old'].magicCircle, ENEMIES['off'].magicCircle]).toEqual([true, false]);
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
