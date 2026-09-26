import { Injectable, inject } from '@angular/core';
import { GraphQLService } from './graphql.service';
import { ExamRecord, ExamRecordMode } from '../models/exam-record.models';
import { Observable, map } from 'rxjs';

// 資格学習(練習)で「実績」とみなす正解率のしきい値。科目によって1回の出題数が異なるため割合で持ち、
// 必要な正解数は Math.ceil(出題数 * 割合) で求める(10問なら7問、5問なら4問)
export const EXAM_ACHIEVEMENT_RATIO = 0.7;

@Injectable({
  providedIn: 'root'
})
export class ExamAchievementsService {
  private graphql = inject(GraphQLService);

  // examTypeを省略すると、科目を問わず全科目分の記録を返す
  // (実績カレンダーは科目共通の1つのカレンダーとして表示するため)。
  // modeを省略すると練習/模擬試験の両方が返る。実績カレンダーの学習/模擬試験タブは
  // それぞれmodeを指定して呼び出す。
  getRecords(startDate: string, endDate: string, examType?: string, mode?: ExamRecordMode): Observable<ExamRecord[]> {
    const query = `
      query GetExamRecords($examType: String, $startDate: String, $endDate: String, $mode: String) {
        examRecords(examType: $examType, startDate: $startDate, endDate: $endDate, mode: $mode) {
          id
          userId
          examType
          mode
          date
          correctCount
          totalCount
          createdAt
        }
      }
    `;

    return this.graphql.query<{ examRecords: ExamRecord[] }>(query, { examType, startDate, endDate, mode }).pipe(
      map((res) => res.examRecords)
    );
  }

  // mode省略時は練習(PRACTICE)として記録する(既存の呼び出し元との後方互換)。
  recordCompletion(examType: string, correctCount: number, totalCount: number, mode: ExamRecordMode = 'PRACTICE'): Observable<ExamRecord> {
    const mutation = `
      mutation RecordExamCompletion($examType: String!, $correctCount: Int!, $totalCount: Int!, $mode: String) {
        recordExamCompletion(examType: $examType, correctCount: $correctCount, totalCount: $totalCount, mode: $mode) {
          id
          userId
          examType
          mode
          date
          correctCount
          totalCount
          createdAt
        }
      }
    `;

    return this.graphql.mutation<{ recordExamCompletion: ExamRecord }>(mutation, { examType, correctCount, totalCount, mode }).pipe(
      map((res) => res.recordExamCompletion)
    );
  }
}
