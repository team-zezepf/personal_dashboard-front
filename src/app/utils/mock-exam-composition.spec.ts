import { ExamQuestion } from '../models/exam-question.models';
import { MockExamComposition } from '../config/exam-subjects';
import { pickByComposition, pickByType } from './mock-exam-composition';

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

describe('pickByType(front#429)', () => {
  const typed = (id: string, type: string): ExamQuestion => ({ ...question(id, '仕訳'), type });
  const pool = [typed('c1', 'single'), typed('j1', 'journal'), typed('c2', 'multi'), typed('j2', 'journal'), typed('c3', 'single'), typed('j3', 'journal')];

  it('形式の並び順に、形式ごとに指定の数ずつ出題する(4択・複数選択は choice にまとめる)', () => {
    const picked = pickByType(pool, [{ type: 'journal', label: '仕訳入力', count: 2 }, { type: 'choice', label: '4択', count: 2 }], noShuffle);

    expect(picked.map((q) => q.id)).toEqual(['j1', 'j2', 'c1', 'c2']);
  });

  it('問題が指定の数より少ない形式は、その形式の全問を出題する', () => {
    const picked = pickByType(pool, [{ type: 'journal', label: '仕訳入力', count: 5 }, { type: 'choice', label: '4択', count: 1 }], noShuffle);

    expect(picked.map((q) => q.id)).toEqual(['j1', 'j2', 'j3', 'c1']);
  });
});
