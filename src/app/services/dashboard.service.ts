import { Injectable, inject, signal, computed } from '@angular/core';
import { GraphQLService } from './graphql.service';
import { DashboardData, Schedule, Task, SaveResult, Topic, StockData } from '../models/dashboard.models';
import { catchError, of, tap } from 'rxjs';

function getTodayString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private graphql = inject(GraphQLService);

  readonly currentDate = signal<string>(getTodayString());
  readonly tasks = signal<Task[]>([]);
  readonly schedules = signal<Schedule[]>([]);
  readonly stock = signal<StockData>({ price: '¥4,820', changeRate: '+1.84%', points: '0,55 35,51 65,58 95,42 125,47 155,31 185,39 215,34 245,44 275,26 305,32 335,19 365,28 395,13 425,20 455,8 500,14' });
  readonly topics = signal<Topic[]>([
    { id: 1, author: '田中さん', title: 'プロジェクトの進捗について' },
    { id: 2, author: '山田さん', title: '次回ミーティングの確認' },
    { id: 3, author: 'ニュース', title: '気になる技術トピック' }
  ]);

  readonly isSaving = signal<boolean>(false);
  readonly saveMessage = signal<string>('');
  readonly saveStatus = signal<'idle' | 'saving' | 'success' | 'error'>('idle');

  // Computed properties
  readonly todayTasks = computed(() => {
    const today = this.currentDate();
    return this.tasks().filter(t => t.taskDate === today);
  });

  readonly completedTaskCount = computed(() => {
    return this.todayTasks().filter(t => t.status === 'DONE').length;
  });

  readonly totalTaskCount = computed(() => {
    return this.todayTasks().length;
  });

  readonly taskProgressRate = computed(() => {
    const total = this.totalTaskCount();
    if (total === 0) return 0;
    return Math.round((this.completedTaskCount() / total) * 100);
  });

  readonly todaySchedules = computed(() => {
    const today = this.currentDate();
    return this.schedules()
      .filter(s => s.scheduleDate === today)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  });

  // Track modified items
  private dirtyTaskIds = new Set<string | number>();
  private dirtyScheduleIds = new Set<string | number>();

  loadDashboardData(date: string = this.currentDate()) {
    const query = `
      query GetDashboardData($date: String) {
        dashboardData(date: $date) {
          currentDate
          tasks {
            id
            userId
            title
            description
            taskDate
            status
            completedAt
            createdAt
            updatedAt
          }
          schedules {
            id
            userId
            taskId
            title
            description
            scheduleDate
            startTime
            endTime
            scheduleType
            createdAt
            updatedAt
          }
          stock {
            price
            changeRate
            points
          }
          topics {
            id
            author
            title
          }
        }
      }
    `;

    this.graphql.query<{ dashboardData: DashboardData }>(query, { date }).pipe(
      catchError(err => {
        console.warn('Backend GraphQL fetch failed, falling back to local defaults:', err);
        // Fallback default mock data
        return of({
          dashboardData: {
            currentDate: date,
            tasks: [
              { id: 1, userId: 1, title: 'タスクA', description: '', taskDate: '2026-08-10', status: 'DONE', completedAt: '2026-08-10T15:00:00' },
              { id: 2, userId: 1, title: 'タスクB', description: '本日の予定', taskDate: '2026-08-10', status: 'TODO', completedAt: null }
            ],
            schedules: [
              { id: 1, userId: 1, taskId: null, title: 'チーム定例', description: 'オンライン会議', scheduleDate: '2026-08-04', startTime: '13:00', endTime: '14:00', scheduleType: 'SCHEDULE' },
              { id: 2, userId: 1, taskId: null, title: '顧客打ち合わせ', description: '第2会議室', scheduleDate: '2026-08-07', startTime: '10:00', endTime: '11:00', scheduleType: 'SCHEDULE' },
              { id: 3, userId: 1, taskId: 2, title: 'タスクB', description: '本日の予定', scheduleDate: '2026-08-10', startTime: '16:00', endTime: '17:00', scheduleType: 'TASK' },
              { id: 4, userId: 1, taskId: null, title: '休憩', description: '', scheduleDate: '2026-08-10', startTime: '17:00', endTime: '17:30', scheduleType: 'SCHEDULE' },
              { id: 5, userId: 1, taskId: null, title: 'レビュー', description: '資料確認', scheduleDate: '2026-08-13', startTime: '15:00', endTime: '16:00', scheduleType: 'SCHEDULE' },
              { id: 6, userId: 1, taskId: null, title: '食事会', description: '駅前のお店', scheduleDate: '2026-08-21', startTime: '19:00', endTime: '21:00', scheduleType: 'SCHEDULE' }
            ],
            stock: { price: '¥4,820', changeRate: '+1.84%', points: '0,55 35,51 65,58 95,42 125,47 155,31 185,39 215,34 245,44 275,26 305,32 335,19 365,28 395,13 425,20 455,8 500,14' },
            topics: [
              { id: 1, author: '田中さん', title: 'プロジェクトの進捗について' },
              { id: 2, author: '山田さん', title: '次回ミーティングの確認' },
              { id: 3, author: 'ニュース', title: '気になる技術トピック' }
            ]
          }
        });
      })
    ).subscribe(res => {
      const data = res.dashboardData;
      this.currentDate.set(data.currentDate);
      this.tasks.set(data.tasks);
      this.schedules.set(data.schedules);
      if (data.stock) this.stock.set(data.stock);
      if (data.topics) this.topics.set(data.topics);
      this.dirtyTaskIds.clear();
      this.dirtyScheduleIds.clear();
    });
  }

  toggleTask(taskId: string | number) {
    this.tasks.update(list => list.map(task => {
      if (task.id === taskId) {
        const newStatus = task.status === 'DONE' ? 'TODO' : 'DONE';
        const updated = {
          ...task,
          status: newStatus,
          completedAt: newStatus === 'DONE' ? new Date().toISOString() : null,
          _dirty: true
        };
        this.dirtyTaskIds.add(taskId);
        return updated;
      }
      return task;
    }));
  }

  addSchedule(schedule: Omit<Schedule, 'id'>) {
    const currentList = this.schedules();
    const maxId = currentList.reduce((max, s) => Math.max(max, Number(s.id) || 0), 0);
    const newId = maxId + 1;
    const newSchedule: Schedule = {
      ...schedule,
      id: newId,
      _dirty: true
    };
    this.dirtyScheduleIds.add(newId);
    this.schedules.update(list => [...list, newSchedule]);
  }

  updateSchedule(schedule: Schedule) {
    this.dirtyScheduleIds.add(schedule.id);
    this.schedules.update(list => list.map(s => {
      if (s.id === schedule.id) {
        return { ...schedule, _dirty: true };
      }
      return s;
    }));
  }

  deleteSchedule(scheduleId: string | number) {
    const index = this.schedules().findIndex(s => s.id === scheduleId);
    if (index === -1) return;
    const removedSchedule = this.schedules()[index];

    this.dirtyScheduleIds.delete(scheduleId);
    this.schedules.update(list => list.filter(s => s.id !== scheduleId));

    const mutation = `
      mutation DeleteSchedule($id: ID!) {
        deleteSchedule(id: $id)
      }
    `;
    this.graphql.mutation<{ deleteSchedule: boolean }>(mutation, { id: scheduleId })
      .pipe(
        catchError(err => {
          console.error('Delete failed:', err);
          return of({ deleteSchedule: false });
        })
      )
      .subscribe(res => {
        if (!res.deleteSchedule) {
          // サーバー側で削除できなかった場合はローカル表示を元に戻し、失敗をユーザーに知らせる
          this.schedules.update(list => {
            const restored = [...list];
            restored.splice(Math.min(index, restored.length), 0, removedSchedule);
            return restored;
          });
          this.saveStatus.set('error');
          this.saveMessage.set(`「${removedSchedule.title}」の削除に失敗しました`);
        }
      });
  }

  saveChanges() {
    this.isSaving.set(true);
    this.saveStatus.set('saving');
    this.saveMessage.set('保存中...');

    // Collect dirty tasks and schedules
    const dirtyTasks = this.tasks().filter(t => this.dirtyTaskIds.has(t.id)).map(t => ({
      id: t.id,
      userId: t.userId || 1,
      title: t.title,
      description: t.description || '',
      taskDate: t.taskDate,
      status: t.status,
      completedAt: t.completedAt
    }));

    const dirtySchedules = this.schedules().filter(s => this.dirtyScheduleIds.has(s.id)).map(s => ({
      id: s.id,
      userId: s.userId || 1,
      taskId: s.taskId,
      title: s.title,
      description: s.description || '',
      scheduleDate: s.scheduleDate,
      startTime: s.startTime,
      endTime: s.endTime,
      scheduleType: s.scheduleType
    }));

    const mutation = `
      mutation SaveChanges($input: SaveChangesInput!) {
        saveChanges(input: $input) {
          success
          message
          gitCommitted
        }
      }
    `;

    const input: any = {};
    if (dirtyTasks.length > 0) input.tasks = dirtyTasks;
    if (dirtySchedules.length > 0) input.schedules = dirtySchedules;

    // If nothing changed, we still save all or report clean state
    if (dirtyTasks.length === 0 && dirtySchedules.length === 0) {
      setTimeout(() => {
        this.isSaving.set(false);
        this.saveStatus.set('success');
        this.saveMessage.set('変更はありません');
        setTimeout(() => this.saveStatus.set('idle'), 2500);
      }, 300);
      return;
    }

    this.graphql.mutation<{ saveChanges: SaveResult }>(mutation, { input }).pipe(
      catchError(err => {
        console.error('Save failed:', err);
        return of({
          saveChanges: {
            success: false,
            message: '保存に失敗しました: ' + (err.message || '通信エラー'),
            gitCommitted: false
          }
        });
      })
    ).subscribe(res => {
      this.isSaving.set(false);
      const result = res.saveChanges;
      if (result.success) {
        this.saveStatus.set('success');
        this.saveMessage.set('保存完了' + (result.gitCommitted ? '（Gitコミット済）' : ''));
        this.dirtyTaskIds.clear();
        this.dirtyScheduleIds.clear();
      } else {
        this.saveStatus.set('error');
        this.saveMessage.set(result.message || '保存に失敗しました');
      }

      setTimeout(() => {
        if (this.saveStatus() === 'success') {
          this.saveStatus.set('idle');
        }
      }, 3000);
    });
  }
}
