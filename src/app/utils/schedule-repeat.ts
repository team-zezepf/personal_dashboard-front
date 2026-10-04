import { Schedule } from '../models/dashboard.models';

// 繰り返し予定(Schedule.repeat)を、カレンダーに表示する日付ごとの予定へ展開する

export function getTodayString(): string {
  return dateToString(new Date());
}

function dateToString(d: Date): string {
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + days);
  return dateToString(d);
}

// 指定日から`months`ヶ月後の同日を返す。該当日がその月に存在しない場合(例: 1/31の1ヶ月後=2月末が存在しない)はnull
function addMonthsSameDate(dateStr: string, months: number): string | null {
  const d = new Date(`${dateStr}T00:00:00`);
  const targetYearMonth = new Date(d.getFullYear(), d.getMonth() + months, 1);
  const daysInTargetMonth = new Date(targetYearMonth.getFullYear(), targetYearMonth.getMonth() + 1, 0).getDate();
  if (d.getDate() > daysInTargetMonth) return null;
  targetYearMonth.setDate(d.getDate());
  return dateToString(targetYearMonth);
}

export function nextOccurrenceDate(fromDate: string, frequency: string): string | null {
  if (frequency === 'daily') return addDays(fromDate, 1);
  if (frequency === 'weekly') return addDays(fromDate, 7);
  if (frequency === 'monthly') {
    for (let months = 1; months <= 12; months++) {
      const candidate = addMonthsSameDate(fromDate, months);
      if (candidate) return candidate;
    }
    return null;
  }
  return null;
}

// 無期限(never)の繰り返しを実体化する上限(この日数分先まで生成する)
const NEVER_ENDING_HORIZON_DAYS = 730;
// 想定外の入力(巨大なendCount等)で暴走しないための安全弁
const SAFETY_MAX_OCCURRENCES = 1000;

// 繰り返し設定(repeat)を持つ予定を、カレンダー表示用に実際の日付ごとの予定へ展開する。
// 展開結果はあくまで表示用の仮想データであり、サーバーへの保存や編集/削除の対象は
// 常に元の予定(repeatMasterIdが指す側)を使う。
// today は無期限の繰り返しをどこまで展開するかの基準日(テストで固定できるよう引数にしている)。
export function expandScheduleOccurrences(schedules: Schedule[], today: string = getTodayString()): Schedule[] {
  const horizonStr = addDays(today, NEVER_ENDING_HORIZON_DAYS);
  const result: Schedule[] = [];

  for (const master of schedules) {
    const repeat = master.repeat;
    const excludedDates = new Set(repeat?.excludedDates || []);

    if (!repeat?.enabled) {
      result.push(master);
      continue;
    }

    // masterのscheduleDate自体も1回目として扱うため、除外日に含まれていれば表示しない
    if (!excludedDates.has(master.scheduleDate)) {
      result.push(master);
    }

    const countLimit = repeat.endType === 'count'
      ? Math.max(1, Number(repeat.endCount) || 1)
      : SAFETY_MAX_OCCURRENCES;
    const dateLimit = repeat.endType === 'date' ? repeat.endDate : null;

    let occurrenceDate = master.scheduleDate;
    let count = 1; // masterを1回目としてカウント(除外されていても回数自体は消費する)

    while (count < countLimit) {
      const next = nextOccurrenceDate(occurrenceDate, repeat.frequency);
      if (!next) break;
      occurrenceDate = next;

      if (dateLimit && occurrenceDate > dateLimit) break;
      if (repeat.endType === 'never' && occurrenceDate > horizonStr) break;

      if (!excludedDates.has(occurrenceDate)) {
        result.push({
          ...master,
          id: `${master.id}::${occurrenceDate}`,
          scheduleDate: occurrenceDate,
          repeatMasterId: master.id,
          isRepeatOccurrence: true
        });
      }
      count++;
    }
  }

  return result;
}
