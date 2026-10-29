import { ExamQuestion } from '../models/exam-question.models';
import { isAnswered, isCorrectAnswer, toRecordedAnswer } from './exam-answer';

function question(correct: number[]): ExamQuestion {
  return {
    id: 1, category: 'テクノロジ', subCategory: 'ネットワーク', type: correct.length > 1 ? 'multi' : 'single',
    question: '', choices: ['ア', 'イ', 'ウ', 'エ'], correct, explanation: ''
  };
}

describe('isCorrectAnswer', () => {
  it('単一選択は、正解の選択肢を選んだときだけ正解にする', () => {
    expect(isCorrectAnswer(question([1]), [1])).toBe(true);
    expect(isCorrectAnswer(question([1]), [0])).toBe(false);
  });

  it('複数選択は、選んだ順番や重複に関係なく、正解の組み合わせと完全に一致したときだけ正解にする', () => {
    const multi = question([0, 2]);

    expect(isCorrectAnswer(multi, [2, 0])).toBe(true);
    expect(isCorrectAnswer(multi, [0, 2, 2])).toBe(true);
    expect(isCorrectAnswer(multi, [0])).toBe(false);
    expect(isCorrectAnswer(multi, [0, 1, 2])).toBe(false);
  });

  it('未回答は不正解にする', () => {
    expect(isCorrectAnswer(question([0]), [])).toBe(false);
  });

  it('問題データの正解が並んでいなくても、重複していても判定できる', () => {
    expect(isCorrectAnswer(question([2, 0, 2]), [0, 2])).toBe(true);
  });
});

describe('仕訳入力の問題(front#429)', () => {
  const journalQuestion: ExamQuestion = {
    id: 9, category: '簿記3級', subCategory: '仕訳', type: 'journal', question: '', explanation: '',
    choices: ['仕入', '現金', '買掛金'], correct: [],
    journal: { debit: [{ account: '仕入', amount: 80000 }], credit: [{ account: '買掛金', amount: 80000 }] }
  };

  it('入力した仕訳が正解と一致したときだけ正解にし、選択肢の番号や未回答は不正解にする', () => {
    expect(isCorrectAnswer(journalQuestion, { debit: [{ account: '仕入', amount: 80000 }], credit: [{ account: '買掛金', amount: 80000 }] })).toBe(true);
    expect(isCorrectAnswer(journalQuestion, { debit: [{ account: '仕入', amount: 80000 }], credit: [{ account: '現金', amount: 80000 }] })).toBe(false);
    expect(isCorrectAnswer(journalQuestion, [0])).toBe(false);
    expect(isCorrectAnswer(journalQuestion, undefined)).toBe(false);
  });

  it('4択の問題に仕訳を渡しても正解にしない', () => {
    expect(isCorrectAnswer(question([0]), { debit: [], credit: [] })).toBe(false);
  });

  it('回答済みかどうかは、選択肢を選んだか、仕訳を1行でも入力したかで決める', () => {
    expect(isAnswered([0])).toBe(true);
    expect(isAnswered([])).toBe(false);
    expect(isAnswered({ debit: [{ account: '仕入', amount: null }], credit: [] })).toBe(true);
    expect(isAnswered({ debit: [], credit: [] })).toBe(false);
    expect(isAnswered(undefined)).toBe(false);
  });

  it('記録には、4択は選んだ選択肢だけを、仕訳入力は入力した仕訳を残す', () => {
    const journal = { debit: [{ account: '仕入', amount: 80000 }], credit: [] };
    expect(toRecordedAnswer([2])).toEqual({ selected: [2] });
    expect(toRecordedAnswer(undefined)).toEqual({ selected: [] });
    expect(toRecordedAnswer(journal)).toEqual({ selected: [], journal });
  });
});
