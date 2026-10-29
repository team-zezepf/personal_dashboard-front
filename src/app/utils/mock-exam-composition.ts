import { ExamQuestion } from '../models/exam-question.models';
import { MockExamComposition, MockExamTypeComposition } from '../config/exam-subjects';

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

/**
 * 問題の形式ごとの出題数に従って、模擬試験の問題を選ぶ(簿記3級の仕訳入力・4択など)。形式の並び順に、
 * 形式ごとにまとめて並べる。形式の中の問題はランダムに選ぶ。問題が指定の数より少ない形式は、その形式の全問を出題する。
 */
export function pickByType(
  pool: ExamQuestion[],
  composition: MockExamTypeComposition[],
  shuffleFn: <T>(items: T[]) => T[] = shuffle
): ExamQuestion[] {
  const isType = (q: ExamQuestion, type: MockExamTypeComposition['type']) => (type === 'journal') === (q.type === 'journal');
  return composition.flatMap((c) => shuffleFn(pool.filter((q) => isType(q, c.type))).slice(0, c.count));
}
