import { Injectable, inject } from '@angular/core';
import { GraphQLService } from './graphql.service';
import { ExamRecord } from '../models/exam-record.models';
import { Observable, map } from 'rxjs';

// 資格学習で「実績」とみなす正解数のしきい値(10問中7問以上正解)
export const EXAM_ACHIEVEMENT_THRESHOLD = 7;

@Injectable({
  providedIn: 'root'
})
export class ExamAchievementsService {
  private graphql = inject(GraphQLService);

  // examTypeを省略すると、科目を問わず全科目分の記録を返す
  // (実績カレンダーは科目共通の1つのカレンダーとして表示するため)。
  getRecords(startDate: string, endDate: string, examType?: string): Observable<ExamRecord[]> {
    const query = `
      query GetExamRecords($examType: String, $startDate: String, $endDate: String) {
        examRecords(examType: $examType, startDate: $startDate, endDate: $endDate) {
          id
          userId
          examType
          date
          correctCount
          totalCount
          createdAt
        }
      }
    `;

    return this.graphql.query<{ examRecords: ExamRecord[] }>(query, { examType, startDate, endDate }).pipe(
      map((res) => res.examRecords)
    );
  }

  recordCompletion(examType: string, correctCount: number, totalCount: number): Observable<ExamRecord> {
    const mutation = `
      mutation RecordExamCompletion($examType: String!, $correctCount: Int!, $totalCount: Int!) {
        recordExamCompletion(examType: $examType, correctCount: $correctCount, totalCount: $totalCount) {
          id
          userId
          examType
          date
          correctCount
          totalCount
          createdAt
        }
      }
    `;

    return this.graphql.mutation<{ recordExamCompletion: ExamRecord }>(mutation, { examType, correctCount, totalCount }).pipe(
      map((res) => res.recordExamCompletion)
    );
  }
}
