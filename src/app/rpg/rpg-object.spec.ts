import { RpgMapObject } from '../models/rpg.models';
import { setObjectDefs } from './rpg-data';
import { applyDraft, baseOf, defInputOf, draftOfDef, draftOfObject, draftProblem } from './rpg-object';

describe('置物の設定の下書き(front#333)', () => {
  afterEach(() => setObjectDefs([]));

  it('置いた置物の下書きは、決めていない項目を null(デフォルトのまま)にし、書き戻すと決めた項目だけを持つ', () => {
    const o: RpgMapObject = { type: 'barrel', x: 1, y: 1, torch: false };
    const d = draftOfObject(o);
    expect(d).toMatchObject({ color: null, items: null, enemies: null, mimics: null, hitMaterial: null, showMessage: false });
    d.items = [{ id: 'potion', count: 2, chance: 0.5 }];
    applyDraft(o, d);
    expect(o).toEqual({ type: 'barrel', x: 1, y: 1, torch: false, items: [{ id: 'potion', count: 2, chance: 0.5 }] });
  });

  it('メッセージを表示すると、壊す・擬態に関わる設定を消し、色とメッセージだけを持つ', () => {
    const o: RpgMapObject = { type: 'barrel', x: 1, y: 1, torch: false, items: [], mimics: [{ id: 'slime', chance: 1 }], hitMaterial: 'wood' };
    const d = draftOfObject(o);
    Object.assign(d, { showMessage: true, lines: '古いたるだ。\n中は空っぽ。', color: '#ff0000', dark: '#330000' });
    applyDraft(o, d);
    expect(o).toEqual({ type: 'barrel', x: 1, y: 1, torch: false, color: '#ff0000', dark: '#330000', showMessage: true, lines: ['古いたるだ。', '中は空っぽ。'] });
  });

  it('看板は向きと文章だけを持つ', () => {
    const o: RpgMapObject = { type: 'sign', x: 1, y: 1, torch: false };
    const d = draftOfObject(o);
    Object.assign(d, { signDir: 'nw', lines: 'この先 谷', color: '#ff0000' });
    applyDraft(o, d);
    expect(o).toEqual({ type: 'sign', x: 1, y: 1, torch: false, signDir: 'nw', lines: ['この先 谷'] });
    d.signDir = null;
    applyDraft(o, d);
    expect(o.signDir).toBeUndefined();
  });

  it('デフォルトの下書き・保存に送るもの・「デフォルトのまま」を外したときの値', () => {
    setObjectDefs([{ type: 'pot', color: '#123456', dark: null, items: [{ id: 'potion', count: 1, chance: 1 }], enemies: [], mimics: [], hitMaterial: null, updatedAt: 'u1' }]);
    const d = draftOfDef(undefined);
    expect(d).toMatchObject({ items: [], enemies: [], mimics: [], color: null, hitMaterial: null });
    expect(defInputOf('pot', d, 'u1')).toEqual({ type: 'pot', color: null, dark: null, items: [], enemies: [], mimics: [], hitMaterial: null, expectedUpdatedAt: 'u1' });
    // 外したときは、種類のデフォルト(決めていなければ今の色・今の音)を入れる
    expect(baseOf('pot')).toMatchObject({ color: '#123456', items: [{ id: 'potion', count: 1, chance: 1 }], hitMaterial: 'stone' });
    expect(baseOf('rock').color).toBeTruthy();
  });

  it('擬態の確率の合計が100%を超えると決められない', () => {
    const d = draftOfDef(undefined);
    d.mimics = [{ id: 'slime', chance: 0.6 }, { id: 'rat', chance: 0.4 }];
    expect(draftProblem(d)).toBeNull();
    d.mimics.push({ id: 'skeleton', chance: 0.001 });
    expect(draftProblem(d)).toContain('100%');
  });
});
