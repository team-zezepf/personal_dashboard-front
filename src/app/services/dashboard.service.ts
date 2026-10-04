import { Injectable, inject, signal, computed } from '@angular/core';
import { GraphQLService } from './graphql.service';
import { NotificationService } from './notification.service';
import { DashboardData, Schedule, Task, SaveResult, Topic, StockData } from '../models/dashboard.models';
import { catchError, of, tap } from 'rxjs';
import { expandScheduleOccurrences, getTodayString } from '../utils/schedule-repeat';

const LOAD_ERROR_MESSAGE = 'バックエンドに接続できないため、仮のデータを表示しています';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private graphql = inject(GraphQLService);
  private notificationService = inject(NotificationService);

  readonly currentDate = signal<string>(getTodayString());
  readonly tasks = signal<Task[]>([]);
  readonly schedules = signal<Schedule[]>([]);
  readonly stock = signal<StockData>({ price: '¥4,820', changeRate: '+1.84%', points: '0,55 35,51 65,58 95,42 125,47 155,31 185,39 215,34 245,44 275,26 305,32 335,19 365,28 395,13 425,20 455,8 500,14' });
  readonly topics = signal<Topic[]>([
    { id: 1, author: '田中さん', title: 'プロジェクトの進捗について' },
    { id: 2, author: '山田さん', title: '次回ミーティングの確認' },
    { id: 3, author: 'ニュース', title: '気になる技術トピック' }
  ]);

  // dashboardDataの読み込みが一度でも完了したか。初期状態のtasks=[]と、
  // 読み込み後に「本日のタスクが本当に0件」だった場合を区別するために使う。
  readonly isDataLoaded = signal<boolean>(false);

  readonly isSaving = signal<boolean>(false);
  // タスク・予定に未保存の変更があるかどうか(セーブボタンの活性/非活性に使う)
  readonly hasChanges = signal<boolean>(false);

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

  // 繰り返し予定を実際の日付ごとの予定に展開したもの。カレンダー表示等、
  // 「その日に予定があるかどうか」を扱う箇所はすべてこちらを参照する。
  readonly scheduleOccurrences = computed(() => expandScheduleOccurrences(this.schedules()));

  readonly todaySchedules = computed(() => {
    const today = this.currentDate();
    return this.scheduleOccurrences()
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
            repeat {
              enabled
              frequency
              endType
              endDate
              endCount
              excludedDates
            }
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
      // 以前の取得失敗で出したエラーが残っていれば、実データを取得できた時点で消す
      tap(() => this.notificationService.dismiss(LOAD_ERROR_MESSAGE)),
      catchError(err => {
        console.warn('Backend GraphQL fetch failed, falling back to local defaults:', err);
        // バックエンドに接続できない場合、開発時の見た目確認用に仮データへフォールバックするが、
        // ユーザーが気づかずこの仮データを実データだと誤認しないよう、エラーを画面下部に表示し続ける
        this.notificationService.showResult(LOAD_ERROR_MESSAGE, 'error', null);
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
      this.dirtyDeletedTaskIds.clear();
      this.dirtyDeletedScheduleIds.clear();
      this.hasChanges.set(false);
      this.cancelAutoSave();
      this.isDataLoaded.set(true);
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
    this.recomputeHasChanges();
  }

  // 未保存の新規タスクに割り振る仮ID(サーバー側の実IDと衝突しない負の値)。
  // 予定側(nextTempScheduleId)とは別カウンターにしておき、taskIdとscheduleIdの
  // 仮ID同士が偶然一致しないようにする。
  private nextTempTaskId = -1;

  // カレンダーの「タスク」種別の予定から呼ばれ、対応するTaskを仮IDで新規作成する。
  // 戻り値のidをSchedule.taskIdに設定して呼び出し元で紐付ける。
  addTask(task: Omit<Task, 'id'>): Task {
    const tempId = this.nextTempTaskId--;
    const newTask: Task = {
      ...task,
      id: tempId,
      _dirty: true
    };
    this.dirtyTaskIds.add(tempId);
    this.tasks.update(list => [...list, newTask]);
    this.recomputeHasChanges();
    return newTask;
  }

  // カレンダーの「タスク」種別の予定が編集された際、紐づくTaskの内容を追従させる。
  updateTaskFields(taskId: string | number, fields: Partial<Pick<Task, 'title' | 'description' | 'taskDate'>>) {
    this.tasks.update(list => list.map(task => {
      if (task.id === taskId) {
        this.dirtyTaskIds.add(taskId);
        return { ...task, ...fields, _dirty: true };
      }
      return task;
    }));
    this.recomputeHasChanges();
  }

  // 削除待ちのTask ID(保存ボタン押下時にsaveChangesへまとめて送る)。
  private dirtyDeletedTaskIds = new Set<string | number>();

  // タスクの削除も追加・編集と同じく保存ボタン待ちのdirty管理にする。
  // 画面上は即座に一覧から消すが、サーバーへの削除は保存時にまとめて行う
  // (保存前にリロードすれば削除前の状態に戻る、追加・編集の下書きと同じ挙動)。
  deleteTask(taskId: string | number) {
    const index = this.tasks().findIndex(t => t.id === taskId);
    if (index === -1) return;

    this.dirtyTaskIds.delete(taskId);
    this.tasks.update(list => list.filter(t => t.id !== taskId));

    // まだ保存されていない(仮IDのままの)タスクはサーバーに存在しないため、削除待ちに加える必要はない
    if (Number(taskId) >= 0) {
      this.dirtyDeletedTaskIds.add(taskId);
    }
    this.recomputeHasChanges();
  }

  // 未保存の新規予定に割り振る仮ID(サーバー側の実IDと衝突しない負の値)。
  // 呼び出しごとに確実に異なる値にするため、Date.now()ではなく単純減算のカウンターを使う
  // (複製操作などで同一ミリ秒内にaddScheduleが連続呼び出しされてもIDが衝突しないようにするため)。
  private nextTempScheduleId = -1;

  addSchedule(schedule: Omit<Schedule, 'id'>) {
    // 正のIDを推測で採番すると、サーバー側の「idを指定した更新リクエスト」と衝突し、
    // 保存前に削除しようとすると存在しないIDとして削除失敗になる(または保存時に
    // 他人のデータの更新とみなされて無視される)問題があったため、負の値を仮IDとする。
    // Date.now()ではなく単純減算のカウンターを使うのは、複製操作などで同一ミリ秒内に
    // addScheduleが連続呼び出しされてもIDが衝突しないようにするため。
    // saveChanges()送信時にこの仮IDはnullへ変換し、サーバー側で正式なIDを採番させる。
    const tempId = this.nextTempScheduleId--;
    const newSchedule: Schedule = {
      ...schedule,
      id: tempId,
      _dirty: true
    };
    this.dirtyScheduleIds.add(tempId);
    this.schedules.update(list => [...list, newSchedule]);
    this.recomputeHasChanges();
  }

  updateSchedule(schedule: Schedule) {
    this.dirtyScheduleIds.add(schedule.id);
    this.schedules.update(list => list.map(s => {
      if (s.id === schedule.id) {
        return { ...schedule, _dirty: true };
      }
      return s;
    }));
    this.recomputeHasChanges();
  }

  // 削除待ちのSchedule ID(保存ボタン押下時にsaveChangesへまとめて送る)。
  private dirtyDeletedScheduleIds = new Set<string | number>();

  deleteSchedule(scheduleId: string | number) {
    const index = this.schedules().findIndex(s => s.id === scheduleId);
    if (index === -1) return;

    this.dirtyScheduleIds.delete(scheduleId);
    this.schedules.update(list => list.filter(s => s.id !== scheduleId));

    // まだ保存されていない(仮IDのままの)予定はサーバーに存在しないため、削除待ちに加える必要はない
    if (Number(scheduleId) >= 0) {
      this.dirtyDeletedScheduleIds.add(scheduleId);
    }
    this.recomputeHasChanges();
  }

  private recomputeHasChanges() {
    this.hasChanges.set(
      this.dirtyTaskIds.size > 0 ||
      this.dirtyScheduleIds.size > 0 ||
      this.dirtyDeletedTaskIds.size > 0 ||
      this.dirtyDeletedScheduleIds.size > 0
    );
    this.scheduleAutoSave();
  }

  // 最後の変更からこの時間(ms)操作がなければ自動保存する。
  private static readonly AUTO_SAVE_DEBOUNCE_MS = 3000;
  private autoSaveTimer: ReturnType<typeof setTimeout> | null = null;

  // 変更のたびに呼び出し、タイマーをリセットする(デバウンス)。
  // 保存ボタンは廃止せず、自動保存が間に合わない場合の手動フラッシュ手段として残す。
  private scheduleAutoSave() {
    this.cancelAutoSave();
    if (!this.hasChanges()) {
      return;
    }
    this.autoSaveTimer = setTimeout(() => {
      this.autoSaveTimer = null;
      // 手動保存(セーブボタン)と競合しないよう、保存中でなければ実行する
      if (this.hasChanges() && !this.isSaving()) {
        this.saveChanges();
      }
    }, DashboardService.AUTO_SAVE_DEBOUNCE_MS);
  }

  private cancelAutoSave() {
    if (this.autoSaveTimer !== null) {
      clearTimeout(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }

  saveChanges() {
    // 手動保存・自動保存のどちらから呼ばれた場合も、これから保存するので
    // 既存の自動保存タイマーは不要になる
    this.cancelAutoSave();
    this.isSaving.set(true);
    this.notificationService.showSaving('保存中...');

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
      // 仮ID(負の値)はサーバーに存在しないため、新規作成として扱われるようnullで送る
      id: Number(s.id) < 0 ? null : s.id,
      userId: s.userId || 1,
      taskId: s.taskId,
      title: s.title,
      description: s.description || '',
      scheduleDate: s.scheduleDate,
      startTime: s.startTime,
      endTime: s.endTime,
      scheduleType: s.scheduleType,
      repeat: s.repeat ? {
        enabled: s.repeat.enabled,
        frequency: s.repeat.frequency,
        endType: s.repeat.endType,
        endDate: s.repeat.endDate || null,
        endCount: s.repeat.endCount ? Number(s.repeat.endCount) : null,
        excludedDates: s.repeat.excludedDates && s.repeat.excludedDates.length > 0 ? s.repeat.excludedDates : null
      } : null
    }));

    const deletedTaskIds = Array.from(this.dirtyDeletedTaskIds);
    const deletedScheduleIds = Array.from(this.dirtyDeletedScheduleIds);

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
    if (deletedTaskIds.length > 0) input.deletedTaskIds = deletedTaskIds;
    if (deletedScheduleIds.length > 0) input.deletedScheduleIds = deletedScheduleIds;

    // If nothing changed, we still save all or report clean state
    if (dirtyTasks.length === 0 && dirtySchedules.length === 0 && deletedTaskIds.length === 0 && deletedScheduleIds.length === 0) {
      setTimeout(() => {
        this.isSaving.set(false);
        this.notificationService.showResult('変更はありません', 'success', 2500);
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
        this.notificationService.showResult('保存完了', 'success');
        this.dirtyTaskIds.clear();
        this.dirtyScheduleIds.clear();
        this.dirtyDeletedTaskIds.clear();
        this.dirtyDeletedScheduleIds.clear();
        this.hasChanges.set(false);
        // 新規追加分の仮IDをサーバーが採番した正式なIDに置き換えるため再取得する
        this.loadDashboardData();
      } else {
        // エラーは自動で消さず、ユーザーが気づいて再試行するまで表示し続ける(既存の挙動を維持)
        this.notificationService.showResult(result.message || '保存に失敗しました', 'error', null);
      }
    });
  }
}
