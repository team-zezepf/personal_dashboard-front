export type ExamRecordMode = 'PRACTICE' | 'MOCK_EXAM';

export interface ExamRecord {
  id: string | number;
  userId: string | number;
  examType: string;
  mode: ExamRecordMode;
  date: string;
  correctCount: number;
  totalCount: number;
  // 合否。模擬試験は不合格の回も記録する(練習は7割以上の回だけを記録するため常にtrue)
  passed: boolean;
  // 問題ごとの記録(模擬試験のみ)
  answers?: ExamAnswer[];
  createdAt?: string | null;
}

export interface ExamAnswer {
  questionId: string | number;
  // 選んだ選択肢の番号(0始まり)。未回答の場合は空
  selected: number[];
  correct: boolean;
}
