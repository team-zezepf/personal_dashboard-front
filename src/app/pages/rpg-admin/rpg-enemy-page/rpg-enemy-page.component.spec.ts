import { moveItem } from './rpg-enemy-page.component';

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
