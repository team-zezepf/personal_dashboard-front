import { GLOSSARY_KEY, adjacentGenres, findGenre, firstGenreOf, genreDocPath, glossaryOf } from './genre-content';

describe('glossaryOf', () => {
  it('まとめがある科目には用語集がある', () => {
    for (const examType of ['kihonjoho', 'oyojoho', 'boki3']) {
      expect(glossaryOf(examType)).toEqual({ examType, genreKey: GLOSSARY_KEY, genreName: '用語集', category: '' });
    }
  });

  it('まとめがない科目(科目B・午後など)には用語集もない', () => {
    expect(glossaryOf('kihonjoho-b')).toBeUndefined();
    expect(glossaryOf('unknown')).toBeUndefined();
  });

  it('本文は docs/<examType>/glossary.html にある', () => {
    expect(genreDocPath(glossaryOf('boki3')!)).toBe('docs/boki3/glossary.html');
  });
});

describe('findGenre', () => {
  it('ジャンルのキーに glossary を指定すると用語集を返す', () => {
    expect(findGenre('kihonjoho', GLOSSARY_KEY)?.genreName).toBe('用語集');
    expect(findGenre('kihonjoho-b', GLOSSARY_KEY)).toBeUndefined();
  });

  it('ふつうのジャンルはこれまでどおり返す', () => {
    expect(findGenre('kihonjoho', 'network')?.genreName).toBe('ネットワーク');
  });
});

describe('adjacentGenres', () => {
  it('用語集はサイドバーの先頭なので、前はなく、次は先頭のジャンル', () => {
    const { prev, next } = adjacentGenres('kihonjoho', GLOSSARY_KEY);
    expect(prev).toBeUndefined();
    expect(next?.genreKey).toBe('kiso-riron');
  });

  it('先頭のジャンルの前は用語集', () => {
    expect(adjacentGenres('kihonjoho', 'kiso-riron').prev?.genreKey).toBe(GLOSSARY_KEY);
  });
});

describe('firstGenreOf', () => {
  it('科目一覧の「学習する」で開くのは、用語集ではなく先頭のジャンルのまま', () => {
    expect(firstGenreOf('kihonjoho')?.genreKey).toBe('kiso-riron');
    expect(firstGenreOf('boki3')?.genreKey).toBe('kiso-chishiki');
  });
});
