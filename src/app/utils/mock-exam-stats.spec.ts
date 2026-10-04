import { ExamRecord } from '../models/exam-record.models';
import { ExamQuestion } from '../models/exam-question.models';
import {
  MIN_GENRE_ANSWERS,
  RECENT_ATTEMPT_COUNT,
  formatTakenAt,
  genreRates,
  recentAttempts,
  scorePercent,
  scoreSeries,
  sortByTakenAt,
  summarize
} from './mock-exam-stats';

let nextId = 1;

// 模擬試験の記録。takenAt は createdAt("YYYY-MM-DDTHH:mm:ss")。answers は [問題ID, 正解したか] の組
function record(
  correctCount: number,
  totalCount: number,
  options: { takenAt?: string | null; date?: string; passed?: boolean; answers?: [string, boolean][]; id?: number } = {}
): ExamRecord {
  const takenAt = options.takenAt === undefined ? `2026-09-01T10:00:00` : options.takenAt;
  return {
    id: options.id ?? nextId++,
    userId: 1,
    examType: 'kihonjoho',
    mode: 'MOCK_EXAM',
    date: options.date ?? takenAt?.slice(0, 10) ?? '2026-09-01',
    createdAt: takenAt ?? undefined,
    correctCount,
    totalCount,
    passed: options.passed ?? false,
    answers: options.answers?.map(([questionId, correct]) => ({ questionId, selected: [0], correct }))
  };
}

// day 日目の10時に受験した記録
function onDay(day: number, correctCount: number, totalCount = 10, passed = false): ExamRecord {
  return record(correctCount, totalCount, { takenAt: `2026-09-${String(day).padStart(2, '0')}T10:00:00`, passed });
}

function question(id: string, subCategory: string): ExamQuestion {
  return { id, category: 'テクノロジ', subCategory, type: 'single', question: '', choices: [], correct: [0], explanation: '' };
}

describe('scorePercent', () => {
  it('正答数 ÷ 問題数を百分率で返す', () => {
    expect(scorePercent(record(3, 4))).toBe(75);
  });

  it('問題数が0のときは0%にする(0で割らない)', () => {
    expect(scorePercent(record(0, 0))).toBe(0);
  });
});

describe('sortByTakenAt', () => {
  it('受験日時の古い順に並べ、元の配列は変えない', () => {
    const late = onDay(3, 1);
    const early = onDay(1, 1);
    const middle = onDay(2, 1);
    const records = [late, early, middle];

    expect(sortByTakenAt(records)).toEqual([early, middle, late]);
    expect(records).toEqual([late, early, middle]);
  });

  it('createdAt がない古い記録は、その日の0時に受験したものとして並べる', () => {
    const old = record(1, 10, { takenAt: null, date: '2026-09-02' });
    const morning = record(1, 10, { takenAt: '2026-09-02T09:00:00' });
    const previousDay = record(1, 10, { takenAt: '2026-09-01T23:00:00' });

    expect(sortByTakenAt([morning, old, previousDay])).toEqual([previousDay, old, morning]);
  });

  it('同じ日時ならIDの小さい順にする', () => {
    const second = record(1, 10, { takenAt: null, date: '2026-09-01', id: 2 });
    const first = record(1, 10, { takenAt: null, date: '2026-09-01', id: 1 });

    expect(sortByTakenAt([second, first])).toEqual([first, second]);
  });
});

describe('recentAttempts', () => {
  it('新しいほうから count 回分を、古い順で返す', () => {
    const records = [onDay(4, 4), onDay(1, 1), onDay(3, 3), onDay(2, 2)];

    expect(recentAttempts(records, 2).map((r) => r.correctCount)).toEqual([3, 4]);
  });

  it('受験回数が count に満たなければ全部を返す', () => {
    expect(recentAttempts([onDay(1, 1)], 5)).toHaveLength(1);
  });
});

describe('summarize', () => {
  it('受験していなければ、すべて空の値にする', () => {
    expect(summarize([])).toEqual({ attempts: 0, passes: 0, passRate: null, best: null, latest: null, recentAverage: null });
  });

  it('受験回数・合格回数・合格率・最高点・最新の回を返す', () => {
    const best = onDay(2, 9, 10, true);
    const latest = onDay(3, 5);
    const summary = summarize([latest, onDay(1, 6, 10, true), best]);

    expect(summary.attempts).toBe(3);
    expect(summary.passes).toBe(2);
    expect(summary.passRate).toBeCloseTo((2 / 3) * 100);
    expect(summary.best).toBe(best);
    expect(summary.latest).toBe(latest);
  });

  it('最高点は正答数ではなく正答率で比べる', () => {
    const highRate = onDay(1, 4, 5);
    const manyCorrect = onDay(2, 6, 10);

    expect(summarize([manyCorrect, highRate]).best).toBe(highRate);
  });

  it(`直近の平均は${RECENT_ATTEMPT_COUNT}回受験するまで出さない`, () => {
    const records = Array.from({ length: RECENT_ATTEMPT_COUNT - 1 }, (_, i) => onDay(i + 1, 10));

    expect(summarize(records).recentAverage).toBeNull();
  });

  it(`直近の平均は、新しい${RECENT_ATTEMPT_COUNT}回の正答率の平均にする`, () => {
    // 1日目だけ0点。11回受験すると、1日目は直近10回から外れる
    const records = [onDay(1, 0), ...Array.from({ length: RECENT_ATTEMPT_COUNT }, (_, i) => onDay(i + 2, i % 2 === 0 ? 6 : 8))];

    expect(summarize(records).recentAverage).toBe(70);
  });
});

describe('genreRates', () => {
  const questions = [question('q1', 'ネットワーク'), question('q2', 'ネットワーク'), question('q3', 'データベース')];

  it('分野ごとに正答数・解答数・正答率を集計し、正答率の低い順に並べる', () => {
    const attempts = [
      record(0, 3, { answers: [['q1', true], ['q2', false], ['q3', false]] }),
      record(0, 2, { answers: [['q1', true], ['q3', true]] })
    ];

    expect(genreRates(attempts, questions).map(({ genre, correct, total, rate }) => ({ genre, correct, total, rate }))).toEqual([
      { genre: 'データベース', correct: 1, total: 2, rate: 50 },
      { genre: 'ネットワーク', correct: 2, total: 3, rate: (2 / 3) * 100 }
    ]);
  });

  it('正答率が同じなら分野名の順に並べる', () => {
    const attempts = [record(0, 2, { answers: [['q3', true], ['q1', true]] })];

    expect(genreRates(attempts, questions).map((g) => g.genre)).toEqual(['データベース', 'ネットワーク']);
  });

  it(`解答数が${MIN_GENRE_ANSWERS}問未満の分野は参考値にし、苦手には数えない`, () => {
    const answers: [string, boolean][] = Array.from({ length: MIN_GENRE_ANSWERS - 1 }, () => ['q1', false]);
    const [rate] = genreRates([record(0, answers.length, { answers })], questions);

    expect(rate.rate).toBe(0);
    expect(rate.isFew).toBe(true);
    expect(rate.isWeak).toBe(false);
  });

  it(`解答数が${MIN_GENRE_ANSWERS}問以上で正答率が50%未満なら苦手、50%ちょうどなら苦手にしない`, () => {
    const weak: [string, boolean][] = [['q1', true], ['q1', true], ['q1', false], ['q1', false], ['q1', false]];
    const borderline: [string, boolean][] = [['q3', true], ['q3', true], ['q3', true], ['q3', false], ['q3', false], ['q3', false]];
    const rates = genreRates([record(0, 0, { answers: [...weak, ...borderline] })], questions);

    expect(rates.find((g) => g.genre === 'ネットワーク')).toMatchObject({ rate: 40, isFew: false, isWeak: true });
    expect(rates.find((g) => g.genre === 'データベース')).toMatchObject({ rate: 50, isFew: false, isWeak: false });
  });

  it('問題データから消えた問題と、問題ごとの記録がない回は集計しない', () => {
    const attempts = [record(5, 10), record(0, 2, { answers: [['deleted', false], ['q3', true]] })];

    expect(genreRates(attempts, questions)).toEqual([
      { genre: 'データベース', correct: 1, total: 1, rate: 100, isFew: true, isWeak: false }
    ]);
  });

  it('問題IDは数値でも文字列でも同じ問題として扱う', () => {
    const numericQuestions = [{ ...question('x', 'ネットワーク'), id: 7 }];

    expect(genreRates([record(0, 1, { answers: [['7', true]] })], numericQuestions)).toHaveLength(1);
  });
});

describe('scoreSeries', () => {
  const questions = [question('q1', 'ネットワーク'), question('q2', 'データベース')];

  it('分野を指定しなければ、各回の全体の正答率を返す', () => {
    expect(scoreSeries([record(5, 10), record(3, 4)], questions, null)).toEqual([50, 75]);
  });

  it('分野を指定すると、その回のその分野の問題だけの正答率を返す', () => {
    const attempts = [record(0, 3, { answers: [['q1', true], ['q1', false], ['q2', false]] })];

    expect(scoreSeries(attempts, questions, 'ネットワーク')).toEqual([50]);
  });

  it('その分野の問題が出なかった回と、問題ごとの記録がない回は null にする', () => {
    const attempts = [record(0, 1, { answers: [['q2', true]] }), record(5, 10)];

    expect(scoreSeries(attempts, questions, 'ネットワーク')).toEqual([null, null]);
  });
});

describe('formatTakenAt', () => {
  it('月/日で表示する(0埋めしない)', () => {
    expect(formatTakenAt(record(1, 1, { takenAt: '2026-09-06T08:05:00' }))).toBe('9/6');
  });

  it('withTime なら時刻も表示する', () => {
    expect(formatTakenAt(record(1, 1, { takenAt: '2026-09-26T16:36:19' }), true)).toBe('9/26 16:36');
  });

  it('createdAt がない古い記録は、withTime でも日付だけにする', () => {
    expect(formatTakenAt(record(1, 1, { takenAt: null, date: '2026-10-01' }), true)).toBe('10/1');
  });
});
