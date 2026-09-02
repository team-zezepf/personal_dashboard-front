export interface Task {
  id: string | number;
  userId?: string | number;
  title: string;
  description?: string | null;
  taskDate: string;
  status: 'TODO' | 'DONE' | string;
  completedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  _dirty?: boolean;
}

export interface Schedule {
  id: string | number;
  userId?: string | number;
  taskId?: string | number | null;
  title: string;
  description?: string | null;
  scheduleDate: string;
  startTime: string;
  endTime: string;
  scheduleType: 'TASK' | 'SCHEDULE' | string;
  createdAt?: string | null;
  updatedAt?: string | null;
  repeat?: RepeatConfig | null;
  _dirty?: boolean;
}

export interface RepeatConfig {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  time?: string;
  weekday?: number | string | null;
  monthlyMode?: 'date' | 'weekday' | null;
  monthlyDate?: number | string | null;
  monthlyNth?: number | string | null;
  monthlyWeekday?: number | string | null;
  endType: 'never' | 'date' | 'count';
  endDate?: string | null;
  endCount?: number | string | null;
}

export interface StockData {
  price: string;
  changeRate: string;
  points: string;
}

export interface Topic {
  id: string | number;
  author: string;
  title: string;
}

export interface DashboardData {
  currentDate: string;
  tasks: Task[];
  schedules: Schedule[];
  stock: StockData;
  topics: Topic[];
}

export interface SaveChangesInput {
  tasks?: Partial<Task>[];
  schedules?: Partial<Schedule>[];
}

export interface SaveResult {
  success: boolean;
  message?: string;
  gitCommitted: boolean;
}
