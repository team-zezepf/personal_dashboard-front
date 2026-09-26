import { ExamRecord } from '../models/exam-record.models';
import { ExamQuestion } from '../models/exam-question.models';

// 推移グラフ・分野別の正答率・直近平均の集計対象にする回数
export const RECENT_ATTEMPT_COUNT = 10;
// 分野別の正答率で「苦手」とみなすしきい値(%)と、参考値扱いにする解答数の下限
export const WEAK_GENRE_RATE = 50;
export const MIN_GENRE_ANSWERS = 5;

export interface MockExamSubjectSummary {
  attempts: number;
  passes: number;
  passRate: number | null;
  best: ExamRecord | null;
  latest: ExamRecord | null;
  // 直近 RECENT_ATTEMPT_COUNT 回の平均正答率。受験回数が足りない場合は null
  recentAverage: number | null;
}

export interface GenreRate {
  genre: string;
  correct: number;
  total: number;
  rate: number;
  // 解答数が少なく参考値として扱う
  isFew: boolean;
  isWeak: boolean;
}

export function scorePercent(record: ExamRecord): number {
  return record.totalCount === 0 ? 0 : (record.correctCount / record.totalCount) * 100;
}

// 受験日時の古い順に並べる(createdAt がない古い記録は日付とIDで並べる)
export function sortByTakenAt(records: ExamRecord[]): ExamRecord[] {
  const key = (r: ExamRecord) => r.createdAt ?? `${r.date}T00:00:00`;
  return [...records].sort((a, b) => key(a).localeCompare(key(b)) || Number(a.id) - Number(b.id));
}

// 直近 count 回の記録を古い順で返す
export function recentAttempts(records: ExamRecord[], count = RECENT_ATTEMPT_COUNT): ExamRecord[] {
  return sortByTakenAt(records).slice(-count);
}

export function averagePercent(records: ExamRecord[]): number {
  return records.reduce((sum, r) => sum + scorePercent(r), 0) / records.length;
}

export function summarize(records: ExamRecord[]): MockExamSubjectSummary {
  if (records.length === 0) {
    return { attempts: 0, passes: 0, passRate: null, best: null, latest: null, recentAverage: null };
  }
  const sorted = sortByTakenAt(records);
  const passes = records.filter((r) => r.passed).length;
  const best = sorted.reduce((a, b) => (scorePercent(b) > scorePercent(a) ? b : a));
  return {
    attempts: records.length,
    passes,
    passRate: (passes / records.length) * 100,
    best,
    latest: sorted[sorted.length - 1],
    recentAverage: records.length >= RECENT_ATTEMPT_COUNT ? averagePercent(sorted.slice(-RECENT_ATTEMPT_COUNT)) : null
  };
}

function questionMapOf(questions: ExamQuestion[]): Map<string, ExamQuestion> {
  return new Map(questions.map((q) => [String(q.id), q]));
}

// 受験の問題ごとの記録から、分野別の正答率を集計する(正答率の低い順)。
// 問題ごとの記録がない回(記録を始める前の受験)や、問題データから消えた問題は集計しない。
export function genreRates(attempts: ExamRecord[], questions: ExamQuestion[]): GenreRate[] {
  const byId = questionMapOf(questions);
  const totals = new Map<string, { correct: number; total: number }>();
  for (const attempt of attempts) {
    for (const answer of attempt.answers ?? []) {
      const genre = byId.get(String(answer.questionId))?.subCategory;
      if (!genre) continue;
      const t = totals.get(genre) ?? { correct: 0, total: 0 };
      t.total++;
      if (answer.correct) t.correct++;
      totals.set(genre, t);
    }
  }
  return [...totals.entries()]
    .map(([genre, t]) => {
      const rate = (t.correct / t.total) * 100;
      const isFew = t.total < MIN_GENRE_ANSWERS;
      return { genre, correct: t.correct, total: t.total, rate, isFew, isWeak: !isFew && rate < WEAK_GENRE_RATE };
    })
    .sort((a, b) => a.rate - b.rate || a.genre.localeCompare(b.genre));
}

// 各回の正答率の推移。genre を指定すると、その回のその分野の問題だけの正答率を返す
// (その回にその分野の問題が出なかった、または問題ごとの記録がない場合は null)。
export function scoreSeries(attempts: ExamRecord[], questions: ExamQuestion[], genre: string | null): (number | null)[] {
  if (genre === null) return attempts.map(scorePercent);
  const byId = questionMapOf(questions);
  return attempts.map((attempt) => {
    const inGenre = (attempt.answers ?? []).filter((a) => byId.get(String(a.questionId))?.subCategory === genre);
    if (inGenre.length === 0) return null;
    return (inGenre.filter((a) => a.correct).length / inGenre.length) * 100;
  });
}

// "2026-09-26T16:36:19" → "9/26"、withTime なら "9/26 16:36"
export function formatTakenAt(record: ExamRecord, withTime = false): string {
  const iso = record.createdAt ?? `${record.date}T00:00:00`;
  const [date, time] = iso.split('T');
  const [, m, d] = date.split('-');
  const md = `${Number(m)}/${Number(d)}`;
  return withTime && record.createdAt ? `${md} ${time.slice(0, 5)}` : md;
}
