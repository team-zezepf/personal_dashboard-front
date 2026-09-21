export interface ExamRecord {
  id: string | number;
  userId: string | number;
  date: string;
  correctCount: number;
  totalCount: number;
  createdAt?: string | null;
}
