export interface ExamRecord {
  id: string | number;
  userId: string | number;
  examType: string;
  date: string;
  correctCount: number;
  totalCount: number;
  createdAt?: string | null;
}
