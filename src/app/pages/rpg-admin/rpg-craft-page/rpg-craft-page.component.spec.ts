import { RpgCraft, RpgEnemy } from '../../../models/rpg.models';
import { DEFAULT_ENEMIES } from '../../../rpg/rpg-enemy';
import { dropsOf, problemsOf } from './rpg-craft-page.component';

const enemies = DEFAULT_ENEMIES as unknown as RpgEnemy[];

const sword = (over: Partial<RpgCraft> = {}): RpgCraft => ({
  id: 'craft1', name: '雷の剣', icon: '⚡', type: 'weapon', power: 30, gold: 600,
  materials: [{ itemId: 'golem_stone', count: 3 }], sortOrder: 1, ...over
});

describe('合成タブのチェック(front#288)', () => {
  it('素材を落とす敵と確率を返す(スライムゼリーはスライム・ブルースライム)', () => {
    expect(dropsOf('slime_jelly', enemies)).toEqual([
      { name: 'スライム', rate: 0.5 },
      { name: 'ブルースライム', rate: 0.6 }
    ]);
    expect(dropsOf('nothing', enemies)).toEqual([]);
  });

  it('問題がなければ空', () => {
    expect(problemsOf(sword(), [], enemies)).toEqual([]);
  });

  it('名前がない・素材がない・同じ素材が2回・落とす敵がいない素材は、保存できない(ng)', () => {
    const texts = (c: RpgCraft) => problemsOf(c, [], enemies).filter((p) => p.ng).map((p) => p.text);

    expect(texts(sword({ name: ' ' }))).toEqual(['名前を入れてください。']);
    expect(texts(sword({ materials: [] }))).toEqual(['素材が1つもありません。']);
    expect(texts(sword({ materials: [{ itemId: 'honey', count: 1 }, { itemId: 'honey', count: 2 }] }))).toEqual([
      '「はちみつ」が2回入っています。1つにまとめてください。'
    ]);
    // 毒の花びらは、ひとくいそうが落とすのでOK。落とす敵を消すと作れない
    expect(texts(sword({ materials: [{ itemId: 'poison_petal', count: 1 }] }))).toEqual([]);
    const noPlant = enemies.filter((e) => e.material !== 'poison_petal');
    expect(problemsOf(sword({ materials: [{ itemId: 'poison_petal', count: 1 }] }), [], noPlant).map((p) => p.ng)).toEqual([true]);
  });

  it('もっと強くて安い装備・同じ強さの装備があるときは、注意だけ(保存できる)', () => {
    const others = [
      { name: '鋼の剣', power: 32, gold: 420, type: 'weapon' as const },
      { name: '星の剣', power: 30, gold: null, type: 'weapon' as const },
      // 防具は比べない
      { name: '魔法の鎧', power: 40, gold: 10, type: 'armor' as const }
    ];
    const problems = problemsOf(sword(), others, enemies);

    expect(problems.every((p) => !p.ng)).toBe(true);
    expect(problems.map((p) => p.text)).toEqual([
      '「鋼の剣」（攻撃+32・420G）のほうが強くて安いため、作る意味が薄くなります。',
      '攻撃+30 の装備がほかにもあります。'
    ]);
  });
});
