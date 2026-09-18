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

  getRecords(startDate: string, endDate: string): Observable<ExamRecord[]> {
    const query = `
      query GetExamRecords($startDate: String, $endDate: String) {
        examRecords(startDate: $startDate, endDate: $endDate) {
          id
          userId
          date
          correctCount
          totalCount
          createdAt
        }
      }
    `;

    return this.graphql.query<{ examRecords: ExamRecord[] }>(query, { startDate, endDate }).pipe(
      map((res) => res.examRecords)
    );
  }

  recordCompletion(correctCount: number, totalCount: number): Observable<ExamRecord> {
    const mutation = `
      mutation RecordExamCompletion($correctCount: Int!, $totalCount: Int!) {
        recordExamCompletion(correctCount: $correctCount, totalCount: $totalCount) {
          id
          userId
          date
          correctCount
          totalCount
          createdAt
        }
      }
    `;

    return this.graphql.mutation<{ recordExamCompletion: ExamRecord }>(mutation, { correctCount, totalCount }).pipe(
      map((res) => res.recordExamCompletion)
    );
  }
}
