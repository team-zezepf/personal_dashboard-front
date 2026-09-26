import { ExamRecord } from '../models/exam-record.models';
import { ADVANCED_EXAM, ADVANCED_EXAM_TYPES, TITLES, TitleCondition, TitleDefinition } from '../config/titles';
import { averagePercent, recentAttempts } from './mock-exam-stats';

export interface ConditionProgress {
  condition: TitleCondition;
  // 高度資格の科目がまだないなど、挑戦できない条件
  isComingSoon: boolean;
  attempts: number;
  // 直近N回(受験回数が足りない場合は受験した全ての回)の平均正答率。未受験なら null
  average: number | null;
  // 目標までの不足分(%)。達成済みなら0
  shortfall: number;
  met: boolean;
}

export interface TitleProgress {
  title: TitleDefinition;
  conditions: ConditionProgress[];
  isComingSoon: boolean;
  met: boolean;
  // 100 −(各条件の不足分の合計)。挑戦できない条件は計算に含めない。受験回数が足りない条件がある間は最大99
  achievementRate: number;
}

function conditionProgress(condition: TitleCondition, mockRecords: ExamRecord[]): ConditionProgress {
  if (condition.examType === ADVANCED_EXAM && ADVANCED_EXAM_TYPES.length === 0) {
    return { condition, isComingSoon: true, attempts: 0, average: null, shortfall: condition.minRate, met: false };
  }

  // 高度資格は、いずれか1種で満たせばよいので、最も成績の良い科目で評価する
  const examTypes = condition.examType === ADVANCED_EXAM ? ADVANCED_EXAM_TYPES : [condition.examType];
  const candidates = examTypes.map((examType) => {
    const records = mockRecords.filter((r) => r.examType === examType);
    const recent = recentAttempts(records, condition.recentCount);
    const average = recent.length > 0 ? averagePercent(recent) : null;
    const met = records.length >= condition.recentCount && average !== null && average >= condition.minRate;
    return { attempts: records.length, average, met };
  });
  const best = candidates.find((c) => c.met)
    ?? candidates.reduce((a, b) => ((b.average ?? -1) > (a.average ?? -1) ? b : a));

  return {
    condition,
    isComingSoon: false,
    attempts: best.attempts,
    average: best.average,
    shortfall: best.met ? 0 : Math.max(0, condition.minRate - (best.average ?? 0)),
    met: best.met
  };
}

export function titleProgress(title: TitleDefinition, mockRecords: ExamRecord[]): TitleProgress {
  const conditions = title.conditions.map((c) => conditionProgress(c, mockRecords));
  const active = conditions.filter((c) => !c.isComingSoon);
  const isComingSoon = conditions.some((c) => c.isComingSoon);
  const met = !isComingSoon && conditions.every((c) => c.met);

  let rate = 100 - active.reduce((sum, c) => sum + c.shortfall, 0);
  // 平均は足りていても受験回数が足りない条件がある場合、100%にはしない
  if (!met) rate = Math.min(rate, 99);
  return { title, conditions, isComingSoon, met, achievementRate: Math.max(0, Math.round(rate)) };
}

export interface TitleStatus {
  current: TitleDefinition | null;
  // 次の目標。全ての称号を取得済みなら null
  next: TitleProgress | null;
}

// 現在の称号は、条件を全て満たしている称号のうち最もレベルの高いもの
export function titleStatus(mockRecords: ExamRecord[]): TitleStatus {
  const progresses = TITLES.map((t) => titleProgress(t, mockRecords));
  const achieved = progresses.filter((p) => p.met);
  const current = achieved.length > 0 ? achieved[achieved.length - 1].title : null;
  const next = progresses.find((p) => p.title.level > (current?.level ?? 0)) ?? null;
  return { current, next };
}
