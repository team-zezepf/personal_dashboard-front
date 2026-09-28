import { ExamQuestion } from '../models/exam-question.models';
import { MockExamComposition } from '../config/exam-subjects';

export function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * 出題構成に従って、模擬試験の問題を選ぶ。必須の分野を先に、選択した分野をその後に、
 * 分野ごとにまとめて並べる(本番の午後の問題の並びに合わせる)。分野の中の問題はランダムに選ぶ。
 * 分野の問題が指定の数より少ないときは、その分野の全問を出題する。
 */
export function pickByComposition(
  pool: ExamQuestion[],
  composition: MockExamComposition,
  selectedGenres: string[],
  shuffleFn: <T>(items: T[]) => T[] = shuffle
): ExamQuestion[] {
  const pick = (genre: string, count: number) =>
    shuffleFn(pool.filter((q) => q.subCategory === genre)).slice(0, count);

  const electives = composition.elective.genres.filter((g) => selectedGenres.includes(g));
  return [
    ...composition.required.flatMap((r) => pick(r.genre, r.count)),
    ...electives.flatMap((g) => pick(g, composition.elective.countPerGenre))
  ];
}
