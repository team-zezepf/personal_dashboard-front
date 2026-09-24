import { GenreContent } from '../models/genre-content.models';
import { KIHONJOHO_KISO_RIRON_CONTENT } from '../content/genre-study/kihonjoho-kiso-riron';

// ジャンル別まとめページのコンテンツ一覧。今後ジャンルを追加する際はここに登録するだけでよい
// (科目一覧画面への導線・ルーティングは登録されたコンテンツを見て自動的に反映される)。
export const GENRE_CONTENTS: GenreContent[] = [
  KIHONJOHO_KISO_RIRON_CONTENT
];

export function findGenreContent(examType: string, genreKey: string): GenreContent | undefined {
  return GENRE_CONTENTS.find((c) => c.examType === examType && c.genreKey === genreKey);
}

export function getGenreContentsForSubject(examType: string): GenreContent[] {
  return GENRE_CONTENTS.filter((c) => c.examType === examType);
}
