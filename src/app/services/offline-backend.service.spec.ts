import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { OfflineBackendService } from './offline-backend.service';

describe('OfflineBackendService', () => {
  let service: OfflineBackendService;

  // 画面側のサービスと同じく、GraphQL のクエリ文字列の最初のフィールド名で振り分けられる
  const call = <T>(query: string, variables: Record<string, any> = {}) => firstValueFrom(service.handle<T>(query, variables));

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(OfflineBackendService);
  });

  it('新規のタスクと、その仮IDを参照する予定を保存すると、予定の taskId が採番したIDに付け替わる', async () => {
    await call('mutation SaveChanges($input: SaveChangesInput!) { saveChanges(input: $input) { success } }', {
      input: {
        tasks: [{ id: -1, title: '過去問', taskDate: '2026-10-03', status: 'TODO' }],
        schedules: [{ id: null, taskId: -1, title: '過去問', scheduleDate: '2026-10-03', startTime: '09:00', endTime: '10:00', scheduleType: 'TASK' }]
      }
    });

    const { dashboardData } = await call<any>('query GetDashboardData($date: String) { dashboardData(date: $date) { tasks { id } } }', {
      date: '2026-10-03'
    });
    expect(dashboardData.tasks.map((t: any) => t.id)).toEqual([1]);
    expect(dashboardData.schedules[0]).toMatchObject({ id: 1, taskId: 1 });
  });

  it('更新・削除は既存のIDだけに効き、タスクは指定した日のものだけを返す', async () => {
    const save = (input: object) => call('mutation { saveChanges(input: $input) { success } }', { input });
    await save({
      tasks: [
        { id: -1, title: 'A', taskDate: '2026-10-03', status: 'TODO' },
        { id: -2, title: 'B', taskDate: '2026-10-04', status: 'TODO' }
      ]
    });
    await save({ tasks: [{ id: 1, title: 'A', taskDate: '2026-10-03', status: 'DONE' }], deletedTaskIds: [2] });

    const { dashboardData } = await call<any>('query { dashboardData(date: $date) { tasks { id } } }', { date: '2026-10-03' });
    expect(dashboardData.tasks).toHaveLength(1);
    expect(dashboardData.tasks[0].status).toBe('DONE');
    expect(dashboardData.tasks[0].completedAt).toBeTruthy();
    expect(service.counts().tasks).toBe(1);
  });

  it('模擬試験は科目ごとに新しい10回分だけ問題ごとの回答を残す', async () => {
    const record = (examType: string) =>
      call('mutation { recordExamCompletion(examType: $examType) { id } }', {
        examType,
        correctCount: 1,
        totalCount: 1,
        mode: 'MOCK_EXAM',
        passed: false,
        answers: [{ questionId: 1, selected: [0], correct: true }]
      });
    for (let i = 0; i < 11; i++) await record('kihonjoho');
    await record('oyojoho');

    const { examRecords } = await call<any>('query { examRecords(mode: $mode) { id } }', { mode: 'MOCK_EXAM' });
    const kihon = examRecords.filter((r: any) => r.examType === 'kihonjoho');
    expect(kihon.filter((r: any) => r.answers.length > 0)).toHaveLength(10);
    expect(kihon.find((r: any) => r.id === 1).answers).toEqual([]);
    expect(examRecords.find((r: any) => r.examType === 'oyojoho').answers).toHaveLength(1);
  });

  it('問題は同梱したファイルから科目で絞り込んで返す', async () => {
    const result = call<any>('query GetExamQuestions($examType: String!) { examQuestions(examType: $examType) { id } }', {
      examType: 'kihonjoho'
    });
    TestBed.inject(HttpTestingController)
      .expectOne('offline-data/exam_questions.json')
      .flush([
        { id: 1, examType: 'kihonjoho', category: 'テクノロジ系' },
        { id: 2, examType: 'oyojoho', category: 'テクノロジ系' }
      ]);

    expect((await result).examQuestions.map((q: any) => q.id)).toEqual([1]);
  });

  describe('PC 版とのやり取り', () => {
    // PC 版(API)が書き出すファイル。成績の1件目は端末にすでにある記録と同じ
    const PC_FILE = JSON.stringify({
      app: 'personal-dashboard',
      version: 1,
      source: 'pc',
      exportedAt: '2026-10-03T08:00:00',
      tasks: [{ id: 41, title: 'PCのタスク', taskDate: '2026-10-03', status: 'TODO' }],
      schedules: [
        { id: 70, taskId: 41, title: 'PCのタスク', scheduleDate: '2026-10-03', startTime: '09:00', endTime: '10:00', scheduleType: 'TASK' },
        { id: 71, title: 'PCの予定', scheduleDate: '2026-10-04', startTime: '13:00', endTime: '14:00', scheduleType: 'SCHEDULE' }
      ],
      examRecords: [
        { examType: 'kihonjoho', mode: 'PRACTICE', date: '2026-10-01', correctCount: 8, totalCount: 10, passed: true, answers: [], createdAt: 'same' },
        { examType: 'oyojoho', mode: 'PRACTICE', date: '2026-10-02', correctCount: 9, totalCount: 10, passed: true, answers: [], createdAt: 'pc-only' }
      ]
    });
    const importData = (data: string, dryRun: boolean) =>
      call<any>('mutation ImportData($data: String!, $dryRun: Boolean) { importData(data: $data, dryRun: $dryRun) { schedules } }', { data, dryRun });

    beforeEach(() => {
      localStorage.setItem('offline.tasks', JSON.stringify([{ id: 1, userId: 1, title: 'スマホのタスク', taskDate: '2026-10-03', status: 'TODO' }]));
      localStorage.setItem('offline.schedules', JSON.stringify([]));
      localStorage.setItem(
        'offline.examRecords',
        JSON.stringify([{ id: 1, userId: 1, examType: 'kihonjoho', mode: 'PRACTICE', date: '2026-10-01', correctCount: 8, totalCount: 10, passed: true, answers: [], createdAt: 'same' }])
      );
    });

    it('dryRun のときは件数だけを返し、端末のデータは変えない', async () => {
      const { importData: result } = await importData(PC_FILE, true);

      expect(result).toMatchObject({ source: 'pc', schedules: 2, tasks: 1, addedExamRecords: 1, currentSchedules: 0, currentTasks: 1 });
      expect(service.counts()).toEqual({ schedules: 0, tasks: 1, examRecords: 1 });
    });

    it('取り込むと予定・タスクは置き換わり(id を振り直して taskId も付け替える)、成績は重複しないものだけ増える', async () => {
      await importData(PC_FILE, false);

      const tasks = JSON.parse(localStorage.getItem('offline.tasks')!);
      const schedules = JSON.parse(localStorage.getItem('offline.schedules')!);
      const records = JSON.parse(localStorage.getItem('offline.examRecords')!);
      expect(tasks.map((t: any) => [t.id, t.title])).toEqual([[1, 'PCのタスク']]);
      expect(schedules.map((s: any) => [s.id, s.taskId, s.title])).toEqual([[1, 1, 'PCのタスク'], [2, null, 'PCの予定']]);
      expect(records.map((r: any) => [r.id, r.examType])).toEqual([[1, 'kihonjoho'], [2, 'oyojoho']]);
    });

    it('書き出したファイルは API と同じ形で、そのまま取り込み直しても成績は増えない', async () => {
      const { exportData } = await call<any>('query ExportData { exportData }');
      const file = JSON.parse(exportData);

      expect(file).toMatchObject({ app: 'personal-dashboard', version: 1, source: 'android' });
      expect(file.tasks[0]).toMatchObject({ id: 1, title: 'スマホのタスク', taskDate: '2026-10-03' });
      expect(file.examRecords[0]).not.toHaveProperty('userId');
      const { importData: result } = await importData(exportData, true);
      expect(result).toMatchObject({ source: 'android', tasks: 1, addedExamRecords: 0 });
    });

    it('同じ内容の成績が複数あるときは、すでにある件数を超える分だけ追加し、取り込み直しても増えない', async () => {
      const same = { examType: 'kihonjoho', mode: 'PRACTICE', date: '2026-10-01', correctCount: 8, totalCount: 10, passed: true, answers: [], createdAt: 'same' };
      const file = JSON.stringify({ app: 'personal-dashboard', version: 1, source: 'pc', exportedAt: 'x', examRecords: [same, same] });

      expect((await importData(file, false)).importData.addedExamRecords).toBe(1);
      expect((await importData(file, false)).importData.addedExamRecords).toBe(0);
      expect(service.counts().examRecords).toBe(2);
    });

    it('Personal Dashboard のファイルでないもの・壊れたもの・新しい形式のものは理由を付けて断る', async () => {
      await expect(importData('not json', true)).rejects.toThrow('ファイルが壊れています');
      await expect(importData(JSON.stringify({ app: 'other' }), true)).rejects.toThrow('Personal Dashboard で書き出したファイルではありません');
      await expect(importData(PC_FILE.replace('"version":1', '"version":2'), true)).rejects.toThrow('新しい形式のファイル');
      await expect(importData(PC_FILE.replace('"title":"PCの予定"', '"title":null'), true)).rejects.toThrow('ファイルが壊れています');
    });
  });

  it('Android版にない機能はエラーにする', async () => {
    await expect(call('query GetTimeline { timeline { id } }')).rejects.toThrow('Android版では使えない機能です(timeline)');
  });
});
