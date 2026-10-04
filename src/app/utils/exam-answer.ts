import { ExamQuestion } from '../models/exam-question.models';

function sortedUnique(values: number[]): number[] {
  return [...new Set(values)].sort((a, b) => a - b);
}

// 選んだ選択肢が正解の組み合わせと完全に一致すれば正解(選んだ順番・重複は問わない。未回答は不正解)。
// 練習・模擬試験・間違えた問題の復習で共通の判定
export function isCorrectAnswer(question: ExamQuestion, answer: number[]): boolean {
  const correct = sortedUnique(question.correct);
  const given = sortedUnique(answer);
  return correct.length === given.length && correct.every((v, i) => v === given[i]);
}
