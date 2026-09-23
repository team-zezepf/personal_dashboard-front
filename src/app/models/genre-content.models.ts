export interface GenreParagraphBlock {
  type: 'paragraph';
  html: string;
}

export interface GenreTableBlock {
  type: 'table';
  headers: string[];
  rows: string[][];
}

export interface GenreExampleBlock {
  type: 'example';
  label: string;
  html: string;
}

export interface GenrePitfallBlock {
  type: 'pitfall';
  label: string;
  html: string;
}

export interface GenreFormulaBlock {
  type: 'formula';
  label: string;
  html: string;
}

export interface GenreFigureBlock {
  type: 'figure';
  svg: string;
  caption?: string;
}

// 小さなSVGアイコン+ラベル+説明の格子表示(論理ゲート一覧など)
export interface GenreIconGridBlock {
  type: 'iconGrid';
  items: { svg: string; label: string; desc: string }[];
}

export type GenreContentBlock =
  | GenreParagraphBlock
  | GenreTableBlock
  | GenreExampleBlock
  | GenrePitfallBlock
  | GenreFormulaBlock
  | GenreFigureBlock
  | GenreIconGridBlock;

export interface GenreTopic {
  title: string;
  relatedExamples: string;
  blocks: GenreContentBlock[];
}

export interface GenreContent {
  examType: string;
  genreKey: string;
  genreName: string;
  description: string;
  topics: GenreTopic[];
}
