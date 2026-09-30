export interface InterviewPrepAnswer {
  key: string;
  value: string;
}

export interface InterviewPrep {
  id: string | number;
  companyName: string;
  // 項目のキーごとの入力内容(空の項目は含まれない)
  answers: InterviewPrepAnswer[];
  createdAt: string;
  updatedAt: string;
}
