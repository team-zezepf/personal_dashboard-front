// ジャンル別まとめの一覧。本文は docs/<examType>/<genreKey>.html の静的HTMLにある(front#129)。
// ジャンルを追加するときは、ここに登録し、docs/ にHTMLを追加する(docs/README.md を参照)。
export interface GenreEntry {
  examType: string;
  genreKey: string;
  genreName: string;
  // サイドバーでの見出しに使う大分類(テクノロジ系/マネジメント系/ストラテジ系など)
  category: string;
}

export const GENRES: GenreEntry[] = [
  { examType: 'kihonjoho', genreKey: 'kiso-riron', genreName: '基礎理論', category: 'テクノロジ系' },
  { examType: 'kihonjoho', genreKey: 'network', genreName: 'ネットワーク', category: 'テクノロジ系' },
  { examType: 'kihonjoho', genreKey: 'computer-components', genreName: 'コンピュータ構成要素', category: 'テクノロジ系' },
  { examType: 'kihonjoho', genreKey: 'algorithms-programming', genreName: 'アルゴリズムとプログラミング', category: 'テクノロジ系' },
  { examType: 'kihonjoho', genreKey: 'database', genreName: 'データベース', category: 'テクノロジ系' },
  { examType: 'kihonjoho', genreKey: 'security', genreName: 'セキュリティ', category: 'テクノロジ系' },
  { examType: 'kihonjoho', genreKey: 'software', genreName: 'ソフトウェア', category: 'テクノロジ系' },
  { examType: 'kihonjoho', genreKey: 'system-components', genreName: 'システム構成要素', category: 'テクノロジ系' },
  { examType: 'kihonjoho', genreKey: 'hardware', genreName: 'ハードウェア', category: 'テクノロジ系' },
  { examType: 'kihonjoho', genreKey: 'human-interface', genreName: 'ヒューマンインタフェース', category: 'テクノロジ系' },
  { examType: 'kihonjoho', genreKey: 'multimedia', genreName: 'マルチメディア', category: 'テクノロジ系' },
  { examType: 'kihonjoho', genreKey: 'system-development', genreName: 'システム開発技術', category: 'テクノロジ系' },
  { examType: 'kihonjoho', genreKey: 'project-management', genreName: 'プロジェクトマネジメント', category: 'マネジメント系' },
  { examType: 'kihonjoho', genreKey: 'service-management', genreName: 'サービスマネジメント', category: 'マネジメント系' },
  { examType: 'kihonjoho', genreKey: 'business-strategy', genreName: '経営戦略', category: 'ストラテジ系' },
  { examType: 'kihonjoho', genreKey: 'corporate-legal', genreName: '企業と法務', category: 'ストラテジ系' },
  { examType: 'kihonjoho', genreKey: 'system-strategy', genreName: 'システム戦略', category: 'ストラテジ系' },
  { examType: 'boki3', genreKey: 'kiso-chishiki', genreName: '基礎知識', category: '簿記3級' },
  { examType: 'boki3', genreKey: 'shiwake', genreName: '仕訳', category: '簿記3級' },
  { examType: 'boki3', genreKey: 'shisanhyo', genreName: '試算表', category: '簿記3級' },
  { examType: 'boki3', genreKey: 'kessan-seiri', genreName: '決算整理', category: '簿記3級' },
  { examType: 'boki3', genreKey: 'zaimu-shohyo', genreName: '財務諸表', category: '簿記3級' },
  { examType: 'boki3', genreKey: 'denpyo-chobo', genreName: '伝票・帳簿', category: '簿記3級' },
  { examType: 'oyojoho', genreKey: 'kiso-riron', genreName: '基礎理論', category: 'テクノロジ系' },
  { examType: 'oyojoho', genreKey: 'algorithms-programming', genreName: 'アルゴリズムとプログラミング', category: 'テクノロジ系' },
  { examType: 'oyojoho', genreKey: 'computer-components', genreName: 'コンピュータ構成要素', category: 'テクノロジ系' },
  { examType: 'oyojoho', genreKey: 'system-components', genreName: 'システム構成要素', category: 'テクノロジ系' },
  { examType: 'oyojoho', genreKey: 'software', genreName: 'ソフトウェア', category: 'テクノロジ系' },
  { examType: 'oyojoho', genreKey: 'database', genreName: 'データベース', category: 'テクノロジ系' },
  { examType: 'oyojoho', genreKey: 'network', genreName: 'ネットワーク', category: 'テクノロジ系' },
  { examType: 'oyojoho', genreKey: 'security', genreName: 'セキュリティ', category: 'テクノロジ系' },
  { examType: 'oyojoho', genreKey: 'system-development', genreName: 'システム開発技術', category: 'テクノロジ系' },
  { examType: 'oyojoho', genreKey: 'project-management', genreName: 'プロジェクトマネジメント', category: 'マネジメント系' },
  { examType: 'oyojoho', genreKey: 'service-management', genreName: 'サービスマネジメント', category: 'マネジメント系' },
  { examType: 'oyojoho', genreKey: 'system-strategy', genreName: 'システム戦略', category: 'ストラテジ系' },
  { examType: 'oyojoho', genreKey: 'business-strategy', genreName: '経営戦略', category: 'ストラテジ系' },
  { examType: 'oyojoho', genreKey: 'corporate-legal', genreName: '企業と法務', category: 'ストラテジ系' }
];

// 本文のHTMLのパス(アプリでは docs/ をそのまま同梱している)
export function genreDocPath(genre: Pick<GenreEntry, 'examType' | 'genreKey'>): string {
  return `docs/${genre.examType}/${genre.genreKey}.html`;
}

// 用語集(docs/<examType>/glossary.html)。ジャンルと同じページで表示し、サイドバーではジャンルより上に置く(front#209)。
// まとめがある科目には用語集もある(用語は scripts/glossary/ にあり、npm run docs:glossary で docs/ に書き出す)
export const GLOSSARY_KEY = 'glossary';

export function glossaryOf(examType: string): GenreEntry | undefined {
  if (getGenreContentsForSubject(examType).length === 0) return undefined;
  return { examType, genreKey: GLOSSARY_KEY, genreName: '用語集', category: '' };
}

export function findGenre(examType: string, genreKey: string): GenreEntry | undefined {
  if (genreKey === GLOSSARY_KEY) return glossaryOf(examType);
  return GENRES.find((c) => c.examType === examType && c.genreKey === genreKey);
}

export function getGenreContentsForSubject(examType: string): GenreEntry[] {
  return GENRES.filter((c) => c.examType === examType);
}

export interface GenreCategoryGroup {
  category: string;
  genres: GenreEntry[];
}

// 登録順を保ったまま、カテゴリ(テクノロジ系/マネジメント系/ストラテジ系など)ごとにまとめる
export function groupGenresByCategory(examType: string): GenreCategoryGroup[] {
  const groups: GenreCategoryGroup[] = [];
  for (const genre of getGenreContentsForSubject(examType)) {
    let group = groups.find((g) => g.category === genre.category);
    if (!group) {
      group = { category: genre.category, genres: [] };
      groups.push(group);
    }
    group.genres.push(genre);
  }
  return groups;
}

// 科目の「学習する」で最初に開くジャンル(カテゴリごとにまとめたときの先頭)
export function firstGenreOf(examType: string): GenreEntry | undefined {
  return groupGenresByCategory(examType)[0]?.genres[0];
}

// サイドバーと同じ並び(用語集 → カテゴリごとにまとめたジャンルの順)での前後のジャンル
export function adjacentGenres(examType: string, genreKey: string): { prev?: GenreEntry; next?: GenreEntry } {
  const glossary = glossaryOf(examType);
  const ordered = [...(glossary ? [glossary] : []), ...groupGenresByCategory(examType).flatMap((g) => g.genres)];
  const index = ordered.findIndex((g) => g.genreKey === genreKey);
  if (index < 0) return {};
  return { prev: ordered[index - 1], next: ordered[index + 1] };
}
