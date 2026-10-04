import { RepeatConfig, Schedule } from '../models/dashboard.models';
import { expandScheduleOccurrences, nextOccurrenceDate } from './schedule-repeat';

// 繰り返し設定つきの予定(repeat を省略すると繰り返さない予定)
function schedule(scheduleDate: string, repeat?: Partial<RepeatConfig>, id: string | number = 1): Schedule {
  return {
    id,
    title: '予定',
    scheduleDate,
    startTime: '09:00',
    endTime: '10:00',
    scheduleType: 'SCHEDULE',
    repeat: repeat ? { enabled: true, frequency: 'daily', endType: 'never', ...repeat } : null
  };
}

const TODAY = '2026-10-04';

function datesOf(schedules: Schedule[]): string[] {
  return expandScheduleOccurrences(schedules, TODAY).map((s) => s.scheduleDate);
}

describe('nextOccurrenceDate', () => {
  it('毎日・毎週は1日後・7日後にし、月や年をまたげる', () => {
    expect(nextOccurrenceDate('2026-12-31', 'daily')).toBe('2027-01-01');
    expect(nextOccurrenceDate('2026-02-25', 'weekly')).toBe('2026-03-04');
  });

  it('毎月は翌月の同じ日にし、年をまたげる', () => {
    expect(nextOccurrenceDate('2026-12-15', 'monthly')).toBe('2027-01-15');
  });

  it('毎月で翌月にその日がなければ、その日がある月まで飛ばす', () => {
    expect(nextOccurrenceDate('2026-01-31', 'monthly')).toBe('2026-03-31');
    expect(nextOccurrenceDate('2026-03-31', 'monthly')).toBe('2026-05-31');
  });

  it('毎月の29日は、うるう年なら2月29日にする', () => {
    expect(nextOccurrenceDate('2027-01-29', 'monthly')).toBe('2027-03-29');
    expect(nextOccurrenceDate('2028-01-29', 'monthly')).toBe('2028-02-29');
  });

  it('知らない繰り返しの種類は null にする', () => {
    expect(nextOccurrenceDate('2026-10-04', 'yearly')).toBeNull();
  });
});

describe('expandScheduleOccurrences', () => {
  it('繰り返さない予定・繰り返しを無効にした予定は、そのまま返す', () => {
    const plain = schedule('2026-10-04');
    const disabled = schedule('2026-10-05', { enabled: false, endType: 'count', endCount: 3 });

    expect(expandScheduleOccurrences([plain, disabled], TODAY)).toEqual([plain, disabled]);
  });

  it('回数で終わる繰り返しは、元の予定を1回目として指定の回数だけ作る', () => {
    expect(datesOf([schedule('2026-10-30', { frequency: 'daily', endType: 'count', endCount: 3 })])).toEqual([
      '2026-10-30', '2026-10-31', '2026-11-01'
    ]);
  });

  it('回数が文字列でも数値として扱い、不正な値なら1回だけにする', () => {
    expect(datesOf([schedule('2026-10-04', { frequency: 'weekly', endType: 'count', endCount: '2' })])).toEqual([
      '2026-10-04', '2026-10-11'
    ]);
    expect(datesOf([schedule('2026-10-04', { endType: 'count', endCount: 'abc' })])).toEqual(['2026-10-04']);
    expect(datesOf([schedule('2026-10-04', { endType: 'count', endCount: 0 })])).toEqual(['2026-10-04']);
  });

  it('終了日で終わる繰り返しは、終了日の当日を含める', () => {
    expect(datesOf([schedule('2026-10-04', { frequency: 'weekly', endType: 'date', endDate: '2026-10-18' })])).toEqual([
      '2026-10-04', '2026-10-11', '2026-10-18'
    ]);
  });

  it('毎月の31日は、31日がない月を飛ばし、飛ばした月は回数に数えない', () => {
    expect(datesOf([schedule('2026-01-31', { frequency: 'monthly', endType: 'count', endCount: 4 })])).toEqual([
      '2026-01-31', '2026-03-31', '2026-05-31', '2026-07-31'
    ]);
  });

  it('除外した日は作らないが、回数は消費する(1回目を除外した場合も同じ)', () => {
    const repeat: Partial<RepeatConfig> = { endType: 'count', endCount: 4, excludedDates: ['2026-10-04', '2026-10-06'] };

    expect(datesOf([schedule('2026-10-04', repeat)])).toEqual(['2026-10-05', '2026-10-07']);
  });

  it('展開した回は、元の予定のIDと日付を組み合わせたIDにし、元の予定を参照する', () => {
    const [master, second] = expandScheduleOccurrences([schedule('2026-10-04', { endType: 'count', endCount: 2 }, 42)], TODAY);

    expect(master.id).toBe(42);
    expect(master.isRepeatOccurrence).toBeUndefined();
    expect(second).toMatchObject({ id: '42::2026-10-05', scheduleDate: '2026-10-05', repeatMasterId: 42, isRepeatOccurrence: true, title: '予定' });
  });

  it('無期限の繰り返しは、今日から730日後まで作る', () => {
    const dates = datesOf([schedule(TODAY, { frequency: 'daily', endType: 'never' })]);

    expect(dates).toHaveLength(731);
    expect(dates[dates.length - 1]).toBe('2028-10-03');
  });

  it('想定外に多くなる場合も、1つの予定から作るのは1000回までにする', () => {
    // 無期限の毎日の予定が4年前から続いている
    const dates = datesOf([schedule('2022-10-04', { frequency: 'daily', endType: 'never' })]);

    expect(dates).toHaveLength(1000);
  });

  it('複数の予定は、それぞれ展開して並べる', () => {
    const result = expandScheduleOccurrences(
      [schedule('2026-10-04', { endType: 'count', endCount: 2 }, 1), schedule('2026-10-10', undefined, 2)],
      TODAY
    );

    expect(result.map((s) => s.id)).toEqual([1, '1::2026-10-05', 2]);
  });
});
