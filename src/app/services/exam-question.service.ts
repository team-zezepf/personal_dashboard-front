import { Injectable, inject } from '@angular/core';
import { Observable, map, shareReplay } from 'rxjs';
import { GraphQLService } from './graphql.service';
import { ExamQuestion } from '../models/exam-question.models';

/**
 * 実績の分野別集計や受験の詳細で、問題ID から問題文・分野などを引くために問題データを取得する。
 * 同じ科目の問題を何度も取得しないよう、科目ごとに結果を使い回す(画面を再読み込みすると取り直す)。
 */
@Injectable({
  providedIn: 'root'
})
export class ExamQuestionService {
  private graphql = inject(GraphQLService);
  private readonly cache = new Map<string, Observable<ExamQuestion[]>>();

  getQuestions(examType: string): Observable<ExamQuestion[]> {
    const cached = this.cache.get(examType);
    if (cached) return cached;

    const query = `
      query GetExamQuestions($examType: String!) {
        examQuestions(examType: $examType) {
          id
          category
          subCategory
          type
          question
          choices
          correct
          explanation
          image
          code
        }
      }
    `;
    const questions$ = this.graphql.query<{ examQuestions: ExamQuestion[] }>(query, { examType }).pipe(
      map((res) => res.examQuestions),
      shareReplay(1)
    );
    this.cache.set(examType, questions$);
    return questions$;
  }
}
