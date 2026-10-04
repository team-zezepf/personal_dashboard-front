import { TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';
import { DashboardData, Schedule, Task } from '../models/dashboard.models';
import { DashboardService } from './dashboard.service';
import { GraphQLService } from './graphql.service';
import { NotificationService } from './notification.service';

// サーバーに保存済みのタスク・予定
const savedTask: Task = { id: 10, userId: 1, title: '保存済みタスク', description: '', taskDate: '2026-10-04', status: 'TODO', completedAt: null };
const savedSchedule: Schedule = {
  id: 20, userId: 1, taskId: null, title: '保存済みの予定', description: '', scheduleDate: '2026-10-04',
  startTime: '09:00', endTime: '10:00', scheduleType: 'SCHEDULE'
};

function newSchedule(fields: Partial<Schedule> = {}): Omit<Schedule, 'id'> {
  return { userId: 1, title: '新しい予定', scheduleDate: '2026-10-05', startTime: '13:00', endTime: '14:00', scheduleType: 'SCHEDULE', ...fields };
}

describe('DashboardService', () => {
  let service: DashboardService;
  let mutation: ReturnType<typeof vi.fn>;
  let query: ReturnType<typeof vi.fn>;
  let saveResponse: Observable<unknown>;

  beforeEach(() => {
    vi.useFakeTimers();
    saveResponse = of({ saveChanges: { success: true, message: null, gitCommitted: true } });
    const data: DashboardData = {
      currentDate: '2026-10-04', tasks: [savedTask], schedules: [savedSchedule],
      stock: { price: '', changeRate: '', points: '' }, topics: []
    };
    query = vi.fn(() => of({ dashboardData: structuredClone(data) }));
    mutation = vi.fn(() => saveResponse);

    TestBed.configureTestingModule({
      providers: [
        { provide: GraphQLService, useValue: { query, mutation } },
        { provide: NotificationService, useValue: { showSaving: vi.fn(), showResult: vi.fn(), dismiss: vi.fn() } }
      ]
    });
    service = TestBed.inject(DashboardService);
    service.loadDashboardData('2026-10-04');
    query.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // saveChanges を呼び、送った input を返す
  function save(): any {
    service.saveChanges();
    expect(mutation).toHaveBeenCalledTimes(1);
    return mutation.mock.calls[0][1].input;
  }

  it('読み込んだ直後は未保存の変更がない', () => {
    expect(service.tasks()).toEqual([savedTask]);
    expect(service.hasChanges()).toBe(false);
  });

  it('変更した予定とタスクだけを送り、変更していないものは送らない', () => {
    service.toggleTask(savedTask.id);

    const input = save();
    expect(input.tasks).toHaveLength(1);
    expect(input.tasks[0]).toMatchObject({ id: 10, title: '保存済みタスク', status: 'DONE' });
    expect(input.tasks[0].completedAt).toEqual(expect.any(String));
    expect(input.schedules).toBeUndefined();
    expect(input.deletedTaskIds).toBeUndefined();
    expect(input.deletedScheduleIds).toBeUndefined();
  });

  it('新規の予定は仮ID(負の値)を null にして送り、サーバーで採番させる', () => {
    service.addSchedule(newSchedule());
    service.addSchedule(newSchedule({ title: '2つ目' }));

    const input = save();
    expect(input.schedules.map((s: any) => s.id)).toEqual([null, null]);
    expect(input.schedules.map((s: any) => s.title)).toEqual(['新しい予定', '2つ目']);
  });

  it('新規のタスクは仮IDのまま送り、それを参照する予定の taskId も仮IDのまま送る(サーバーで付け替える)', () => {
    const task = service.addTask({ userId: 1, title: '過去問', description: '', taskDate: '2026-10-05', status: 'TODO', completedAt: null });
    service.addSchedule(newSchedule({ taskId: task.id, scheduleType: 'TASK' }));

    const input = save();
    expect(task.id).toBeLessThan(0);
    expect(input.tasks[0].id).toBe(task.id);
    expect(input.schedules[0]).toMatchObject({ id: null, taskId: task.id, scheduleType: 'TASK' });
  });

  it('保存済みの予定・タスクを消すと削除として送り、変更の一覧からは外す', () => {
    service.updateSchedule({ ...savedSchedule, title: '変更後' });
    service.deleteSchedule(savedSchedule.id);
    service.deleteTask(savedTask.id);
    // 画面からはすぐに消える(サーバーへの削除は保存時)
    expect(service.schedules()).toEqual([]);
    expect(service.tasks()).toEqual([]);

    const input = save();
    expect(input.deletedScheduleIds).toEqual([20]);
    expect(input.deletedTaskIds).toEqual([10]);
    expect(input.schedules).toBeUndefined();
  });

  it('保存前に消した新規の予定・タスクは、削除として送らない', () => {
    service.addSchedule(newSchedule());
    const task = service.addTask({ userId: 1, title: '消すタスク', description: '', taskDate: '2026-10-05', status: 'TODO', completedAt: null });
    service.deleteSchedule(service.schedules().find((s) => s.title === '新しい予定')!.id);
    service.deleteTask(task.id);

    service.saveChanges();
    expect(mutation).not.toHaveBeenCalled();
  });

  it('繰り返し設定は、空の値を null にし、回数を数値にして送る', () => {
    service.updateSchedule({
      ...savedSchedule,
      repeat: { enabled: true, frequency: 'weekly', endType: 'count', endDate: '', endCount: '3', excludedDates: [] }
    });

    const input = save();
    expect(input.schedules[0].repeat).toEqual({
      enabled: true, frequency: 'weekly', endType: 'count', endDate: null, endCount: 3, excludedDates: null
    });
  });

  it('繰り返し設定がない予定は repeat を null で送る', () => {
    service.updateSchedule({ ...savedSchedule, title: '変更後' });

    expect(save().schedules[0].repeat).toBeNull();
  });

  it('変更がなければ送らない', () => {
    service.saveChanges();
    vi.runAllTimers();

    expect(mutation).not.toHaveBeenCalled();
    expect(service.isSaving()).toBe(false);
  });

  it('保存に成功すると未保存の状態を解除し、採番されたIDを受け取るため読み込み直す', () => {
    service.addSchedule(newSchedule());
    expect(service.hasChanges()).toBe(true);

    save();
    expect(service.hasChanges()).toBe(false);
    expect(service.isSaving()).toBe(false);
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('保存に失敗したら未保存の状態のままにし、次の保存でもう一度送る', () => {
    saveResponse = throwError(() => new Error('network'));
    service.addSchedule(newSchedule());

    save();
    expect(service.hasChanges()).toBe(true);
    expect(query).not.toHaveBeenCalled();

    saveResponse = of({ saveChanges: { success: true, message: null, gitCommitted: true } });
    service.saveChanges();
    expect(mutation).toHaveBeenCalledTimes(2);
    expect(mutation.mock.calls[1][1].input.schedules).toHaveLength(1);
  });

  it('最後の変更から3秒操作がなければ自動で保存し、その前に変更があれば待ち直す', () => {
    service.toggleTask(savedTask.id);
    vi.advanceTimersByTime(2000);
    service.addSchedule(newSchedule());
    vi.advanceTimersByTime(2000);
    expect(mutation).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1000);
    expect(mutation).toHaveBeenCalledTimes(1);
    const input = mutation.mock.calls[0][1].input;
    expect(input.tasks).toHaveLength(1);
    expect(input.schedules).toHaveLength(1);
  });

  it('繰り返し予定は、カレンダー用の一覧(scheduleOccurrences)で日付ごとに展開される', () => {
    service.updateSchedule({ ...savedSchedule, repeat: { enabled: true, frequency: 'daily', endType: 'count', endCount: 3 } });

    expect(service.scheduleOccurrences().map((s) => s.scheduleDate)).toEqual(['2026-10-04', '2026-10-05', '2026-10-06']);
  });
});
