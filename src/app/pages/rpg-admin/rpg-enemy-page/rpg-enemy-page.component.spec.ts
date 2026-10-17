import { RpgEnemy } from '../../../models/rpg.models';
import { moveItem, staleEnemies } from './rpg-enemy-page.component';

describe('敵の並び替え(front#299)', () => {
  const list = ['a', 'b', 'c', 'd'];

  it('前へ動かす・後ろへ動かす', () => {
    expect(moveItem(list, 'd', 'b', false)).toEqual(['a', 'd', 'b', 'c']);
    expect(moveItem(list, 'a', 'c', true)).toEqual(['b', 'c', 'a', 'd']);
  });

  it('先頭・最後へ動かす', () => {
    expect(moveItem(list, 'c', 'a', false)).toEqual(['c', 'a', 'b', 'd']);
    expect(moveItem(list, 'b', 'd', true)).toEqual(['a', 'c', 'd', 'b']);
  });

  it('自分の上やとなりに落としたときは、並びが変わらない', () => {
    expect(moveItem(list, 'b', 'b', true)).toBe(list);
    expect(moveItem(list, 'b', 'c', false)).toEqual(list);
    expect(moveItem(list, 'b', 'a', true)).toEqual(list);
  });

  it('元の並びは変えない', () => {
    moveItem(list, 'd', 'a', false);
    expect(list).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('読み込んだあとにほかで変えられた敵(front#312)', () => {
  const enemy = (id: string, name: string, updatedAt: string | null) => ({ id, name, updatedAt }) as RpgEnemy;
  const row = (id: string, name: string, updatedAt: string | null, isNew = false) => ({ def: { id, name }, isNew, updatedAt });

  it('読み込んだときと更新日時が同じ敵は、ほかで変えられていない(まだ保存していない敵は、どちらも更新日時なし)', () => {
    const current = [enemy('slime', 'スライム', null), enemy('throneguard', 'ケルベロス', '2026-10-16T23:21:34')];
    expect(staleEnemies([row('slime', 'スライム', null), row('throneguard', 'ケルベロス', '2026-10-16T23:21:34')], current)).toEqual([]);
  });

  it('読み込んだあとに保存された敵・消された敵を返し、今の内容も付ける', () => {
    const now = enemy('throneguard', 'ケルベロス', '2026-10-16T23:21:34');
    const rows = [row('throneguard', '玉座の番人', '2026-10-16T21:02:04'), row('slime', 'スライム', null), row('gone', '消えた敵', '2026-10-01T00:00:00')];
    expect(staleEnemies(rows, [now, enemy('slime', 'スライム', '2026-10-17T00:39:10')])).toEqual([
      { id: 'throneguard', name: '玉座の番人', now },
      { id: 'slime', name: 'スライム', now: enemy('slime', 'スライム', '2026-10-17T00:39:10') },
      { id: 'gone', name: '消えた敵', now: null }
    ]);
  });

  it('まだ保存していない新しい敵は確かめない', () => {
    expect(staleEnemies([row('new-1', '新しい敵', null, true)], [])).toEqual([]);
  });
});
