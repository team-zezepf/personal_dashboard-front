import { ExamQuestion, Journal, QuestionAnswer } from '../models/exam-question.models';
import { isCorrectJournal, isJournal, isJournalAnswered } from './journal';

function sortedUnique(values: number[]): number[] {
  return [...new Set(values)].sort((a, b) => a - b);
}

// 4択・複数選択は、選んだ選択肢が正解の組み合わせと完全に一致すれば正解(選んだ順番・重複は問わない)。
// 仕訳入力は、入力した仕訳が正解の仕訳と一致すれば正解(行の順番は問わない)。未回答は不正解。
// 練習・模擬試験・間違えた問題の復習で共通の判定
export function isCorrectAnswer(question: ExamQuestion, answer: QuestionAnswer | null | undefined): boolean {
  if (question.type === 'journal') {
    return !!question.journal && isJournal(answer) && isCorrectJournal(question.journal, answer);
  }
  if (!Array.isArray(answer)) return false;
  const correct = sortedUnique(question.correct);
  const given = sortedUnique(answer);
  return correct.length === given.length && correct.every((v, i) => v === given[i]);
}

// 何か回答しているか(選択肢を選んだ、または仕訳を1行でも入力した)
export function isAnswered(answer: QuestionAnswer | null | undefined): boolean {
  if (!answer) return false;
  return Array.isArray(answer) ? answer.length > 0 : isJournalAnswered(answer);
}

// 記録に保存する形(4択は選んだ選択肢、仕訳入力は入力した仕訳)に分ける。
// 4択の回答には journal を付けない(仕訳入力を始める前の記録と同じ形のまま)
export function toRecordedAnswer(answer: QuestionAnswer | null | undefined): { selected: number[]; journal?: Journal } {
  if (isJournal(answer)) return { selected: [], journal: answer };
  return { selected: Array.isArray(answer) ? answer : [] };
}
