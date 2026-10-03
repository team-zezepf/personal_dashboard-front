import { RepeatConfig } from './dashboard.models';
import { ExamAnswer, ExamRecordMode } from './exam-record.models';

/*
 * PC 版と Android 版でやり取りするファイルの形(front#185 / api#62。API の TransferFile と同じ)。
 * id は取り込む側で振り直すので、ファイルの中での対応(予定の taskId → タスクの id)にだけ使う
 */
export interface TransferFile {
  app: 'personal-dashboard';
  version: number;
  // 書き出した側
  source: 'pc' | 'android';
  exportedAt: string;
  schedules: TransferSchedule[];
  tasks: TransferTask[];
  examRecords: TransferExamRecord[];
}

export interface TransferTask {
  id: number;
  title: string;
  description?: string | null;
  taskDate: string;
  status: string;
  completedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface TransferSchedule {
  id: number;
  taskId?: number | null;
  title: string;
  description?: string | null;
  scheduleDate: string;
  startTime: string;
  endTime: string;
  scheduleType: string;
  repeat?: Pick<RepeatConfig, 'enabled' | 'frequency' | 'endType' | 'endDate' | 'endCount' | 'excludedDates'> | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface TransferExamRecord {
  examType: string;
  mode: ExamRecordMode;
  date: string;
  correctCount: number;
  totalCount: number;
  passed: boolean;
  answers: ExamAnswer[];
  createdAt?: string | null;
}

// 取り込みの結果(dryRun のときは取り込む前の確認用の件数)
export interface ImportDataResult {
  source: 'pc' | 'android';
  exportedAt: string;
  // 置き換えたあとの予定・タスクの件数
  schedules: number;
  tasks: number;
  // 追加した成績の件数(すでにある記録は含まない)
  addedExamRecords: number;
  // 置き換える前の予定・タスクの件数
  currentSchedules: number;
  currentTasks: number;
}
