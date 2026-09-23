export type ExamRecordMode = 'PRACTICE' | 'MOCK_EXAM';

export interface ExamRecord {
  id: string | number;
  userId: string | number;
  examType: string;
  mode: ExamRecordMode;
  date: string;
  correctCount: number;
  totalCount: number;
  createdAt?: string | null;
}
