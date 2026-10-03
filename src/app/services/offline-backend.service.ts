import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, defer, map, of, shareReplay, throwError } from 'rxjs';
import { Schedule, Task } from '../models/dashboard.models';
import { ExamQuestion } from '../models/exam-question.models';
import { ExamAnswer, ExamRecord } from '../models/exam-record.models';
import { ImportDataResult, TransferFile } from '../models/data-transfer.models';

// 模擬試験の問題ごとの回答を残す回数(科目ごとに新しい順)。API の MOCK_EXAM_ANSWERS_KEPT と同じ
const MOCK_EXAM_ANSWERS_KEPT = 10;

const STORAGE_KEYS = {
  tasks: 'offline.tasks',
  schedules: 'offline.schedules',
  examRecords: 'offline.examRecords'
} as const;

// Android版で使う利用者は端末の持ち主 1 人だけなので、id は固定する
export const OFFLINE_USER_ID = 1;

// 同梱した問題データは科目で絞り込むため、examType も持つ(画面側の ExamQuestion には含めていない)
type BundledQuestion = ExamQuestion & { examType: string };

/**
 * Android版(オフライン)で、API(GraphQL)の代わりに端末内でデータを読み書きする(front#184)。
 * GraphQLService から呼ばれ、クエリの最初のフィールド名(dashboardData など)で処理を振り分ける。
 * 返す値の形は API と同じにしてあるので、各画面・サービスは PC 版と同じコードで動く。
 *
 * - 予定・タスク・成績: 端末内(localStorage)に保存する。保存の仕方(仮 ID の採番、模擬試験の古い回答の削除など)は API と同じ
 * - 問題: APK に同梱した offline-data/exam_questions.json を読む(scripts/prepare-android-data.mjs が書き出す)
 * - ポイント・テーマ: ポイントは Android 版にないので何もしない。テーマは呼び出し元(ThemeService)が端末に保存するので、受け取った値を返すだけ
 * - PC 版とのやり取り(exportData / importData): API の DataTransferService と同じ形のファイルを、同じルールで書き出し・取り込みする(front#185)
 *
 * ここにない機能(カード・つぶやきなど)は Android 版では画面ごと出さないので、呼ばれたらエラーにする。
 */
@Injectable({
  providedIn: 'root'
})
export class OfflineBackendService {
  private http = inject(HttpClient);

  private questions$ = this.http.get<BundledQuestion[]>('offline-data/exam_questions.json').pipe(shareReplay(1));

  handle<T>(query: string, variables: Record<string, any>): Observable<T> {
    const field = /\{\s*(\w+)/.exec(query)?.[1];
    return defer(() => {
      switch (field) {
        case 'dashboardData':
          return of({ dashboardData: this.dashboardData(variables['date']) });
        case 'saveChanges':
          return of({ saveChanges: this.saveChanges(variables['input'] ?? {}) });
        case 'examQuestions':
          return this.questions$.pipe(
            map((all) => ({
              examQuestions: all.filter(
                (q) => q.examType === variables['examType'] && (!variables['category'] || q.category === variables['category'])
              )
            }))
          );
        case 'examRecords':
          return of({ examRecords: this.examRecords(variables) });
        case 'recordExamCompletion':
          return of({ recordExamCompletion: this.recordExamCompletion(variables) });
        case 'addPoints':
          return of({ addPoints: { points: 0 } });
        case 'updateTheme':
          return of({ updateTheme: { theme: variables['input'] } });
        case 'exportData':
          return of({ exportData: this.exportData() });
        case 'importData':
          return of({ importData: this.importData(variables['data'], !!variables['dryRun']) });
        default:
          return throwError(() => new Error(`Android版では使えない機能です(${field ?? '不明'})`));
      }
    }) as Observable<T>;
  }

  // 端末に保存している件数(設定画面に表示する)
  counts(): { schedules: number; tasks: number; examRecords: number } {
    return {
      schedules: this.read('schedules').length,
      tasks: this.read('tasks').length,
      examRecords: this.read('examRecords').length
    };
  }

  private exportData(): string {
    const file: TransferFile = {
      app: TRANSFER_APP_ID,
      version: TRANSFER_FORMAT_VERSION,
      source: 'android',
      exportedAt: toDateTimeString(new Date()),
      schedules: this.read<Schedule>('schedules').map((s) => ({
        id: Number(s.id),
        taskId: s.taskId == null ? null : Number(s.taskId),
        title: s.title,
        description: s.description ?? null,
        scheduleDate: s.scheduleDate,
        startTime: s.startTime,
        endTime: s.endTime,
        scheduleType: s.scheduleType,
        repeat: s.repeat ?? null,
        createdAt: s.createdAt ?? null,
        updatedAt: s.updatedAt ?? null
      })),
      tasks: this.read<Task>('tasks').map((t) => ({
        id: Number(t.id),
        title: t.title,
        description: t.description ?? null,
        taskDate: t.taskDate,
        status: t.status,
        completedAt: t.completedAt ?? null,
        createdAt: t.createdAt ?? null,
        updatedAt: t.updatedAt ?? null
      })),
      examRecords: this.read<ExamRecord>('examRecords').map((r) => ({
        examType: r.examType,
        mode: r.mode,
        date: r.date,
        correctCount: r.correctCount,
        totalCount: r.totalCount,
        passed: r.passed,
        answers: r.answers ?? [],
        createdAt: r.createdAt ?? null
      }))
    };
    return JSON.stringify(file);
  }

  // API の DataTransferService.importData と同じルールで取り込む。予定・タスクは置き換え(id は 1 から振り直し、
  // 予定の taskId も付け替える)、成績は同じ内容の記録がすでにある件数を超える分だけ追加する。dryRun のときは保存しない
  private importData(data: string, dryRun: boolean): ImportDataResult {
    const file = parseTransferFile(data);
    // 作成日時・科目・モード・日付・正解数・問題数・合否が同じ記録は同じものとみなす(API の key() と同じ)
    const recordKey = (r: Omit<ExamRecord, 'id' | 'userId'>) =>
      [r.createdAt, r.examType, r.mode, r.date, r.correctCount, r.totalCount, r.passed].join('|');
    const records = this.read<ExamRecord>('examRecords');
    const remaining = new Map<string, number>();
    for (const r of records) remaining.set(recordKey(r), (remaining.get(recordKey(r)) ?? 0) + 1);
    const newRecords = file.examRecords.filter((r) => {
      const left = remaining.get(recordKey(r)) ?? 0;
      if (left > 0) remaining.set(recordKey(r), left - 1);
      return left === 0;
    });

    const result: ImportDataResult = {
      source: file.source,
      exportedAt: file.exportedAt,
      schedules: file.schedules.length,
      tasks: file.tasks.length,
      addedExamRecords: newRecords.length,
      currentSchedules: this.read('schedules').length,
      currentTasks: this.read('tasks').length
    };
    if (dryRun) return result;

    const taskIdMap = new Map<number, number>();
    const tasks: Task[] = file.tasks.map((t, i) => {
      taskIdMap.set(Number(t.id), i + 1);
      return { ...t, id: i + 1, userId: OFFLINE_USER_ID };
    });
    const schedules: Schedule[] = file.schedules.map((s, i) => ({
      ...s,
      id: i + 1,
      userId: OFFLINE_USER_ID,
      taskId: s.taskId == null ? null : (taskIdMap.get(Number(s.taskId)) ?? null)
    }));
    let maxRecordId = Math.max(0, ...records.map((r) => Number(r.id)));
    let updatedRecords: ExamRecord[] = [
      ...records,
      ...[...newRecords]
        .sort((a, b) => (a.createdAt ?? a.date).localeCompare(b.createdAt ?? b.date))
        .map((r) => ({ ...r, id: ++maxRecordId, userId: OFFLINE_USER_ID }))
    ];
    for (const examType of new Set(newRecords.filter((r) => r.mode === 'MOCK_EXAM').map((r) => r.examType))) {
      updatedRecords = pruneOldMockExamAnswers(updatedRecords, examType);
    }
    this.write('tasks', tasks);
    this.write('schedules', schedules);
    this.write('examRecords', updatedRecords);
    return result;
  }

  private dashboardData(date: string | null | undefined) {
    const targetDate = date ?? toDateString(new Date());
    return {
      currentDate: targetDate,
      tasks: this.read<Task>('tasks').filter((t) => t.taskDate === targetDate),
      schedules: this.read<Schedule>('schedules'),
      stock: null,
      topics: null
    };
  }

  // API の DashboardService.saveChanges と同じ手順で保存する。新規の Task に振られた仮 ID(負の値)は
  // 予定の taskId からも参照されるので、採番した ID に付け替える
  private saveChanges(input: {
    tasks?: any[];
    schedules?: any[];
    deletedTaskIds?: (string | number)[];
    deletedScheduleIds?: (string | number)[];
  }) {
    const now = toDateTimeString(new Date());
    const tempTaskIdToRealId = new Map<number, number>();

    if (input.tasks?.length || input.deletedTaskIds?.length) {
      const tasks = new Map(this.read<Task>('tasks').map((t) => [Number(t.id), t]));
      let maxId = Math.max(0, ...tasks.keys());
      for (const id of input.deletedTaskIds ?? []) tasks.delete(Number(id));
      for (const t of input.tasks ?? []) {
        const id = t.id == null ? null : Number(t.id);
        const fields = {
          title: t.title,
          description: t.description,
          taskDate: t.taskDate,
          status: t.status
        };
        if (id != null && id > 0) {
          const current = tasks.get(id);
          if (!current) continue;
          tasks.set(id, { ...current, ...fields, completedAt: t.status === 'DONE' ? (t.completedAt ?? now) : null, updatedAt: now });
        } else {
          maxId++;
          tasks.set(maxId, {
            id: maxId,
            userId: OFFLINE_USER_ID,
            ...fields,
            completedAt: t.status === 'DONE' ? now : null,
            createdAt: now,
            updatedAt: now
          });
          if (id != null) tempTaskIdToRealId.set(id, maxId);
        }
      }
      this.write('tasks', [...tasks.values()].sort((a, b) => Number(a.id) - Number(b.id)));
    }

    if (input.schedules?.length || input.deletedScheduleIds?.length) {
      const schedules = new Map(this.read<Schedule>('schedules').map((s) => [Number(s.id), s]));
      let maxId = Math.max(0, ...schedules.keys());
      for (const id of input.deletedScheduleIds ?? []) schedules.delete(Number(id));
      for (const s of input.schedules ?? []) {
        const id = s.id == null ? null : Number(s.id);
        const taskId = s.taskId == null ? null : (tempTaskIdToRealId.get(Number(s.taskId)) ?? s.taskId);
        const fields = {
          taskId,
          title: s.title,
          description: s.description,
          scheduleDate: s.scheduleDate,
          startTime: s.startTime,
          endTime: s.endTime,
          scheduleType: s.scheduleType,
          repeat: s.repeat
            ? {
                enabled: s.repeat.enabled,
                frequency: s.repeat.frequency,
                endType: s.repeat.endType,
                endDate: s.repeat.endDate ?? null,
                endCount: s.repeat.endCount ?? null,
                excludedDates: s.repeat.excludedDates ?? null
              }
            : null
        };
        if (id != null && id > 0) {
          const current = schedules.get(id);
          if (!current) continue;
          schedules.set(id, { ...current, ...fields, updatedAt: now });
        } else {
          maxId++;
          schedules.set(maxId, { id: maxId, userId: OFFLINE_USER_ID, ...fields, createdAt: now, updatedAt: now });
        }
      }
      this.write('schedules', [...schedules.values()].sort((a, b) => Number(a.id) - Number(b.id)));
    }

    return { success: true, message: '端末に保存しました', gitCommitted: false };
  }

  private examRecords(v: Record<string, any>): ExamRecord[] {
    return this.read<ExamRecord>('examRecords').filter(
      (r) =>
        (!v['examType'] || r.examType === v['examType']) &&
        (!v['mode'] || r.mode === v['mode']) &&
        (!v['startDate'] || !v['endDate'] || (r.date >= v['startDate'] && r.date <= v['endDate']))
    );
  }

  private recordExamCompletion(v: Record<string, any>): ExamRecord {
    const records = this.read<ExamRecord>('examRecords');
    const now = new Date();
    const record: ExamRecord = {
      id: Math.max(0, ...records.map((r) => Number(r.id))) + 1,
      userId: OFFLINE_USER_ID,
      examType: v['examType'],
      mode: v['mode'] ?? 'PRACTICE',
      date: toDateString(now),
      correctCount: v['correctCount'],
      totalCount: v['totalCount'],
      passed: v['passed'] ?? true,
      answers: (v['answers'] ?? []) as ExamAnswer[],
      createdAt: toDateTimeString(now)
    };
    let updated = [...records, record];
    if (record.mode === 'MOCK_EXAM') updated = pruneOldMockExamAnswers(updated, record.examType);
    this.write('examRecords', updated);
    return record;
  }

  private read<T>(key: keyof typeof STORAGE_KEYS): T[] {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS[key]) ?? '[]') as T[];
    } catch {
      return [];
    }
  }

  private write(key: keyof typeof STORAGE_KEYS, value: unknown[]): void {
    localStorage.setItem(STORAGE_KEYS[key], JSON.stringify(value));
  }
}

// 記録の容量の大部分は問題ごとの回答なので、同じ科目の模擬試験のうち新しい MOCK_EXAM_ANSWERS_KEPT 回より
// 古い回は、回答だけを消す(受験日時・正解数・合否は残す)。API の pruneOldMockExamAnswers と同じ
function pruneOldMockExamAnswers(records: ExamRecord[], examType: string): ExamRecord[] {
  const isTarget = (r: ExamRecord) => r.examType === examType && r.mode === 'MOCK_EXAM';
  const keptIds = new Set(
    records
      .filter(isTarget)
      .sort((a, b) => Number(b.id) - Number(a.id))
      .slice(0, MOCK_EXAM_ANSWERS_KEPT)
      .map((r) => r.id)
  );
  return records.map((r) => (isTarget(r) && !keptIds.has(r.id) && r.answers?.length ? { ...r, answers: [] } : r));
}

const TRANSFER_APP_ID = 'personal-dashboard';
const TRANSFER_FORMAT_VERSION = 1;

// 書き出したファイルを読む。API の DataTransferService.parse と同じメッセージで、形式が違うファイルを断る
function parseTransferFile(data: string): TransferFile {
  const broken = 'Personal Dashboard で書き出したファイルではないか、ファイルが壊れています';
  let file: any;
  try {
    file = JSON.parse(data);
  } catch {
    throw new Error(broken);
  }
  if (!file || typeof file !== 'object') throw new Error(broken);
  if (file.app !== TRANSFER_APP_ID) throw new Error('Personal Dashboard で書き出したファイルではありません');
  if (typeof file.version !== 'number' || typeof file.source !== 'string' || typeof file.exportedAt !== 'string') {
    throw new Error(broken);
  }
  if (file.version > TRANSFER_FORMAT_VERSION) {
    throw new Error('新しい形式のファイルのため取り込めません。アプリを新しくしてから取り込んでください');
  }
  const list = (value: unknown, valid: (item: any) => boolean) => {
    const items = value ?? [];
    if (!Array.isArray(items) || !items.every((item) => item && typeof item === 'object' && valid(item))) throw new Error(broken);
    return items;
  };
  const isString = (v: unknown) => typeof v === 'string';
  const isNumber = (v: unknown) => typeof v === 'number';
  return {
    ...file,
    tasks: list(file.tasks, (t) => isNumber(t.id) && isString(t.title) && isString(t.taskDate)).map((t) => ({ status: 'TODO', ...t })),
    schedules: list(
      file.schedules,
      (s) => isNumber(s.id) && isString(s.title) && isString(s.scheduleDate) && isString(s.startTime) && isString(s.endTime)
    ).map((s) => ({ scheduleType: 'SCHEDULE', ...s })),
    examRecords: list(
      file.examRecords,
      (r) => isString(r.examType) && isString(r.date) && isNumber(r.correctCount) && isNumber(r.totalCount)
    ).map((r) => ({ mode: 'PRACTICE', passed: true, answers: [], ...r }))
  };
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function toDateString(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// API と同じく、タイムゾーンなしの端末の現地時刻(yyyy-MM-ddTHH:mm:ss)
function toDateTimeString(d: Date): string {
  return `${toDateString(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
