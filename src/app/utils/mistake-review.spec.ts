import { ExamAnswer, ExamRecord } from '../models/exam-record.models';
import { reviewTargets } from './mistake-review';

let nextId = 1;

// day 日目に受験した模擬試験の記録。answers は [問題ID, 正解したか] の組
function attempt(day: number, answers: [string, boolean][], examType = 'kihonjoho'): ExamRecord {
  const examAnswers: ExamAnswer[] = answers.map(([questionId, correct]) => ({ questionId, selected: correct ? [0] : [1], correct }));
  const date = `2026-09-${String(day).padStart(2, '0')}`;
  return {
    id: nextId++, userId: 1, examType, mode: 'MOCK_EXAM', date, createdAt: `${date}T10:00:00`,
    correctCount: 0, totalCount: answers.length, passed: false, answers: examAnswers
  };
}

describe('reviewTargets', () => {
  it('最後に解いたときに不正解だった問題だけを返す', () => {
    const records = [
      attempt(1, [['q1', false], ['q2', false], ['q3', true]]),
      attempt(2, [['q1', true], ['q3', false]])
    ];

    expect(reviewTargets(records, 'kihonjoho').map((t) => t.questionId).sort()).toEqual(['q2', 'q3']);
  });

  it('最後に間違えた回が新しい順に並べ、間違えた回をすべて持つ', () => {
    const first = attempt(1, [['q1', false], ['q2', false]]);
    const second = attempt(2, [['q2', false]]);
    const targets = reviewTargets([second, first], 'kihonjoho');

    expect(targets.map((t) => t.questionId)).toEqual(['q2', 'q1']);
    expect(targets[0].missedAttempts).toEqual([first, second]);
    expect(targets[0].lastSelected).toEqual([1]);
  });

  it('ほかの科目の記録と、直近10回より古い回は対象にしない', () => {
    const records = [
      attempt(1, [['old', false]]),
      ...Array.from({ length: 10 }, (_, i) => attempt(i + 2, [['q1', true]])),
      attempt(20, [['other', false]], 'oyojoho')
    ];

    expect(reviewTargets(records, 'kihonjoho')).toEqual([]);
  });
});

describe('reviewTargets 仕訳入力の問題(front#429)', () => {
  it('最後に解いたときに入力した仕訳を持ち、4択の問題や仕訳のない記録は null にする', () => {
    const journal = { debit: [{ account: '仕入', amount: 80000 }], credit: [{ account: '現金', amount: 80000 }] };
    const record = attempt(1, [['j1', false], ['c1', false]]);
    record.answers = [
      { questionId: 'j1', selected: [], correct: false, journal },
      { questionId: 'c1', selected: [1], correct: false }
    ];
    const targets = reviewTargets([record], 'kihonjoho');

    expect(targets.find((t) => t.questionId === 'j1')?.lastJournal).toEqual(journal);
    expect(targets.find((t) => t.questionId === 'c1')?.lastJournal).toBeNull();
  });
});
