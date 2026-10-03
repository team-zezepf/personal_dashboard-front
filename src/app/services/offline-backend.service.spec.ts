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

  it('Android版にない機能はエラーにする', async () => {
    await expect(call('query GetTimeline { timeline { id } }')).rejects.toThrow('Android版では使えない機能です(timeline)');
  });
});
