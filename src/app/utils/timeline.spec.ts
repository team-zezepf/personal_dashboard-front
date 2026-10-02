import { firstUrl, formatPostTime, postLength, splitBody } from './timeline';

describe('timeline utils', () => {
  it('本文をテキストとURLに分け、URLのあとの日本語や句読点はリンクに含めない', () => {
    expect(splitBody('この記事 https://example.com/a?b=1。いいね')).toEqual([
      { text: 'この記事 ' },
      { text: 'https://example.com/a?b=1', url: 'https://example.com/a?b=1' },
      { text: '。いいね' }
    ]);
    expect(splitBody('(https://example.com/x)')).toEqual([
      { text: '(' },
      { text: 'https://example.com/x', url: 'https://example.com/x' },
      { text: ')' }
    ]);
    expect(splitBody('https://example.com/pathのページ')[0].url).toBe('https://example.com/path');
    expect(splitBody('URLなし')).toEqual([{ text: 'URLなし' }]);
  });

  it('最初のURLを返す', () => {
    expect(firstUrl('a http://example.com と https://example.org')).toBe('http://example.com');
    expect(firstUrl('なし')).toBeNull();
  });

  it('絵文字も1文字と数え、前後の空白は数えない', () => {
    expect(postLength('  😀😀 ')).toBe(2);
  });

  it('投稿時刻を、新しいものほど相対的に表示する', () => {
    const now = new Date(2026, 9, 3, 12, 0, 0);
    expect(formatPostTime('2026-10-03T11:59:40', now)).toBe('たった今');
    expect(formatPostTime('2026-10-03T11:57:00', now)).toBe('3分前');
    expect(formatPostTime('2026-10-03T09:00:00', now)).toBe('3時間前');
    expect(formatPostTime('2026-10-02T22:15:00', now)).toBe('昨日 22:15');
    expect(formatPostTime('2026-09-28T08:05:00', now)).toBe('9/28 8:05');
    expect(formatPostTime('2025-09-28T08:05:00', now)).toBe('2025/9/28');
  });
});
