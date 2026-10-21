import { PendingImages } from './pending-images';

describe('PendingImages(保存するときにアップロードする画像。front#347)', () => {
  let created: string[];
  let revoked: string[];
  const original = { create: URL.createObjectURL, revoke: URL.revokeObjectURL };

  beforeEach(() => {
    created = [];
    revoked = [];
    URL.createObjectURL = vi.fn(() => {
      const url = `blob:test/${created.length + 1}`;
      created.push(url);
      return url;
    });
    URL.revokeObjectURL = vi.fn((url: string) => revoked.push(url));
  });

  afterEach(() => {
    URL.createObjectURL = original.create;
    URL.revokeObjectURL = original.revoke;
  });

  const file = (name: string) => new File([new Uint8Array([1])], name, { type: 'image/png' });

  it('選んだ画像のファイルとプレビューのURLを、アイテムごとに持つ', () => {
    const pending = new PendingImages();
    const a = file('a.png');
    pending.set('potion', a);

    expect(pending.file('potion')).toBe(a);
    expect(pending.url('potion')).toBe('blob:test/1');
    expect(pending.url('hipotion')).toBeNull();
    expect(pending.file('hipotion')).toBeNull();
  });

  it('選び直すと、前のプレビューを捨てて新しい画像にする', () => {
    const pending = new PendingImages();
    pending.set('potion', file('a.png'));
    const b = file('b.png');
    pending.set('potion', b);

    expect(revoked).toEqual(['blob:test/1']);
    expect(pending.file('potion')).toBe(b);
    expect(pending.url('potion')).toBe('blob:test/2');
  });

  it('外す・画面を閉じると、プレビューを捨てる', () => {
    const pending = new PendingImages();
    pending.set('potion', file('a.png'));
    pending.set('iron_sword', file('b.png'));

    pending.remove('potion');
    expect(pending.url('potion')).toBeNull();
    expect(revoked).toEqual(['blob:test/1']);

    pending.clear();
    expect(pending.url('iron_sword')).toBeNull();
    expect(revoked).toEqual(['blob:test/1', 'blob:test/2']);
  });
});
