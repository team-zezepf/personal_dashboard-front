import { ExamRecord } from '../models/exam-record.models';
import { recentAttempts } from './mock-exam-stats';

export interface ReviewTarget {
  questionId: string;
  // 最後に解いたときの回答(未回答なら空)
  lastSelected: number[];
  // 直近の模擬試験のうち、この問題を間違えた回(古い順)
  missedAttempts: ExamRecord[];
}

/**
 * 模擬試験で間違えた問題の復習の対象。直近 RECENT_ATTEMPT_COUNT 回の模擬試験で、
 * 最後に解いたときに不正解(未回答を含む)だった問題を、最後に間違えた回が新しい順に返す。
 * 後の回で正解した問題は対象から外れる(問題ごとの記録は直近の回の分しか残らないため、対象も直近の回に揃える)。
 */
export function reviewTargets(records: ExamRecord[], examType: string): ReviewTarget[] {
  const attempts = recentAttempts(records.filter((r) => r.examType === examType && r.mode === 'MOCK_EXAM'));
  const byId = new Map<string, { lastSelected: number[]; lastCorrect: boolean; missedAttempts: ExamRecord[]; order: number }>();
  attempts.forEach((attempt, order) => {
    for (const answer of attempt.answers ?? []) {
      const id = String(answer.questionId);
      const entry = byId.get(id) ?? { lastSelected: [], lastCorrect: false, missedAttempts: [], order };
      entry.lastSelected = answer.selected;
      entry.lastCorrect = answer.correct;
      if (!answer.correct) {
        entry.missedAttempts.push(attempt);
        entry.order = order;
      }
      byId.set(id, entry);
    }
  });
  return [...byId.entries()]
    .filter(([, e]) => !e.lastCorrect)
    .sort(([, a], [, b]) => b.order - a.order)
    .map(([questionId, e]) => ({ questionId, lastSelected: e.lastSelected, missedAttempts: e.missedAttempts }));
}
