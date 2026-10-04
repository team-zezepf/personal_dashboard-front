import { ExamQuestion } from '../models/exam-question.models';
import { isCorrectAnswer } from './exam-answer';

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
