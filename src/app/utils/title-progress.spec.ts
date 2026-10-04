import { ExamRecord } from '../models/exam-record.models';
import { TITLES, TitleDefinition } from '../config/titles';
import { titleProgress, titleStatus } from './title-progress';

let nextId = 1;

// examType の模擬試験を、正答率 percent(%)で受験した記録を count 回分作る(古い順)
function attempts(examType: string, percent: number, count = 1): ExamRecord[] {
  return Array.from({ length: count }, () => {
    const id = nextId++;
    const minute = String(id % 60).padStart(2, '0');
    const hour = String(Math.floor(id / 60) % 24).padStart(2, '0');
    return {
      id, userId: 1, examType, mode: 'MOCK_EXAM' as const, date: '2026-09-01', createdAt: `2026-09-01T${hour}:${minute}:00`,
      correctCount: percent, totalCount: 100, passed: false
    };
  });
}

// 条件が1つだけの称号(直近 recentCount 回の平均が minRate% 以上)
function singleConditionTitle(recentCount: number, minRate: number): TitleDefinition {
  return {
    level: 1, name: 'テスト', badgeImage: '',
    conditions: [{ examType: 'kihonjoho', label: '基本情報', recentCount, minRate }]
  };
}

describe('titleProgress', () => {
  it('直近N回の平均が目標以上で、N回以上受験していれば達成にする', () => {
    const progress = titleProgress(singleConditionTitle(3, 60), attempts('kihonjoho', 60, 3));

    expect(progress.met).toBe(true);
    expect(progress.achievementRate).toBe(100);
    expect(progress.conditions[0]).toMatchObject({ attempts: 3, average: 60, shortfall: 0, met: true });
  });

  it('受験回数がN回に満たない分は0%として平均を出す', () => {
    const progress = titleProgress(singleConditionTitle(4, 60), attempts('kihonjoho', 80, 2));

    expect(progress.conditions[0].average).toBe(40);
    expect(progress.conditions[0].shortfall).toBe(20);
    expect(progress.achievementRate).toBe(80);
  });

  it('平均が目標に届いていても、受験回数が足りなければ達成にせず、達成率は99%までにする', () => {
    // 3回平均50%の条件で、100%を2回(未受験の1回を0%として平均66.7%)
    const progress = titleProgress(singleConditionTitle(3, 50), attempts('kihonjoho', 100, 2));

    expect(progress.conditions[0].shortfall).toBe(0);
    expect(progress.conditions[0].met).toBe(false);
    expect(progress.met).toBe(false);
    expect(progress.achievementRate).toBe(99);
  });

  it('平均には直近N回だけを使い、それより前の回は数えない', () => {
    const records = [...attempts('kihonjoho', 100, 5), ...attempts('kihonjoho', 40, 3)];
    const progress = titleProgress(singleConditionTitle(3, 60), records);

    expect(progress.conditions[0].average).toBe(40);
    expect(progress.conditions[0].attempts).toBe(8);
    expect(progress.met).toBe(false);
  });

  it('ほかの科目の記録は数えない', () => {
    const progress = titleProgress(singleConditionTitle(1, 60), attempts('oyojoho', 100, 1));

    expect(progress.conditions[0]).toMatchObject({ attempts: 0, average: null, shortfall: 60, met: false });
    expect(progress.achievementRate).toBe(40);
  });

  it('達成率は 100 −(各条件の不足分の合計)にし、0%を下回らない', () => {
    const title: TitleDefinition = {
      level: 1, name: 'テスト', badgeImage: '',
      conditions: [
        { examType: 'kihonjoho', label: 'A', recentCount: 1, minRate: 70 },
        { examType: 'oyojoho', label: 'B', recentCount: 1, minRate: 50 }
      ]
    };

    // 不足分は 10 + 25 = 35
    expect(titleProgress(title, [...attempts('kihonjoho', 60), ...attempts('oyojoho', 25)]).achievementRate).toBe(65);
    // 未受験なら不足分は 70 + 50 = 120 だが、0%で止める
    expect(titleProgress(title, []).achievementRate).toBe(0);
  });

  it('高度資格の科目がまだない間は、高度資格の条件を COMING SOON にし、達成率の計算に含めない', () => {
    // ミドルエンジニアは「高度資格 いずれか1種」の条件を含む
    const middle = TITLES.find((t) => t.level === 2)!;
    const records = [
      ...attempts('kihonjoho', 100, 10),
      ...attempts('kihonjoho-b', 100, 10),
      ...attempts('oyojoho', 100, 5)
    ];
    const progress = titleProgress(middle, records);
    const advanced = progress.conditions.find((c) => c.condition.examType === 'advanced')!;

    expect(advanced.isComingSoon).toBe(true);
    expect(progress.isComingSoon).toBe(true);
    expect(progress.met).toBe(false);
    // ほかの条件はすべて満たしているので、高度資格の不足分を除けば100%だが、達成ではないので99%
    expect(progress.achievementRate).toBe(99);
  });
});

describe('titleStatus', () => {
  const junior = TITLES.find((t) => t.level === 1)!;

  // ジュニアエンジニアの条件を満たす記録
  function juniorRecords(): ExamRecord[] {
    return [
      ...attempts('kihonjoho', 60, 10),
      ...attempts('kihonjoho-b', 50, 10),
      ...attempts('oyojoho', 50, 10)
    ];
  }

  it('受験していなければ称号はなく、次の目標は最初の称号にする', () => {
    const status = titleStatus([]);

    expect(status.current).toBeNull();
    expect(status.next?.title).toBe(junior);
  });

  it('条件を満たした称号のうち最もレベルの高いものを現在の称号にし、その次の称号を次の目標にする', () => {
    const status = titleStatus(juniorRecords());

    expect(status.current).toBe(junior);
    expect(status.next?.title.level).toBe(2);
  });

  it('平均が下がると称号も下がる', () => {
    // 基本情報(科目A)の直近10回が59%になる
    const status = titleStatus([...juniorRecords(), ...attempts('kihonjoho', 59, 10)]);

    expect(status.current).toBeNull();
  });
});
