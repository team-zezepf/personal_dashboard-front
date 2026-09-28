import { ExamQuestion } from '../models/exam-question.models';
import { MockExamComposition } from '../config/exam-subjects';
import { pickByComposition } from './mock-exam-composition';

function question(id: string, subCategory: string): ExamQuestion {
  return { id, category: '午後', subCategory, type: 'single', question: id, choices: ['ア', 'イ'], correct: [0], explanation: '' };
}

// 分野ごとに n 問ずつ用意する
function poolOf(genres: Record<string, number>): ExamQuestion[] {
  return Object.entries(genres).flatMap(([g, n]) => Array.from({ length: n }, (_, i) => question(`${g}-${i + 1}`, g)));
}

const composition: MockExamComposition = {
  required: [{ genre: 'セキュリティ', count: 2 }],
  elective: { genres: ['経営', 'DB', 'NW'], pickCount: 2, countPerGenre: 3 }
};

// 並べ替えずにそのまま返す(結果を決定的にするため)
const noShuffle = <T>(items: T[]) => [...items];

describe('pickByComposition', () => {
  it('必須の分野を先に、選んだ分野をその後に、指定の数ずつ出題する', () => {
    const pool = poolOf({ セキュリティ: 5, 経営: 5, DB: 5, NW: 5 });
    const picked = pickByComposition(pool, composition, ['NW', '経営'], noShuffle);

    expect(picked.map((q) => q.subCategory)).toEqual(['セキュリティ', 'セキュリティ', '経営', '経営', '経営', 'NW', 'NW', 'NW']);
  });

  it('選択の候補にない分野は出題しない', () => {
    const pool = poolOf({ セキュリティ: 5, 経営: 5, その他: 5 });
    const picked = pickByComposition(pool, composition, ['経営', 'その他'], noShuffle);

    expect(picked.some((q) => q.subCategory === 'その他')).toBe(false);
  });

  it('分野の問題が指定の数より少ないときは、その分野の全問を出題する', () => {
    const pool = poolOf({ セキュリティ: 1, 経営: 2, DB: 5 });
    const picked = pickByComposition(pool, composition, ['経営', 'DB'], noShuffle);

    expect(picked.filter((q) => q.subCategory === 'セキュリティ').length).toBe(1);
    expect(picked.filter((q) => q.subCategory === '経営').length).toBe(2);
    expect(picked.filter((q) => q.subCategory === 'DB').length).toBe(3);
  });

  it('同じ問題を2回出題しない', () => {
    const pool = poolOf({ セキュリティ: 30, 経営: 15, DB: 15, NW: 15 });
    for (let i = 0; i < 20; i++) {
      const ids = pickByComposition(pool, composition, ['DB', 'NW']).map((q) => q.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});
