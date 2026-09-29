import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { GraphQLService } from './graphql.service';
import { InterviewPrep, InterviewPrepAnswer } from '../models/interview-prep.models';

const FIELDS = `
  id
  companyName
  answers { key value }
  createdAt
  updatedAt
`;

@Injectable({
  providedIn: 'root'
})
export class InterviewPrepService {
  private graphql = inject(GraphQLService);

  // ログイン中のユーザーのシート(更新が新しい順)
  getAll(): Observable<InterviewPrep[]> {
    return this.graphql.query<{ interviewPreps: InterviewPrep[] }>(`query { interviewPreps { ${FIELDS} } }`).pipe(
      map((res) => res.interviewPreps)
    );
  }

  get(id: string | number): Observable<InterviewPrep> {
    const query = `query GetInterviewPrep($id: ID!) { interviewPrep(id: $id) { ${FIELDS} } }`;
    return this.graphql.query<{ interviewPrep: InterviewPrep }>(query, { id }).pipe(
      map((res) => res.interviewPrep)
    );
  }

  create(companyName: string): Observable<InterviewPrep> {
    const mutation = `mutation CreateInterviewPrep($companyName: String!) { createInterviewPrep(companyName: $companyName) { ${FIELDS} } }`;
    return this.graphql.mutation<{ createInterviewPrep: InterviewPrep }>(mutation, { companyName }).pipe(
      map((res) => res.createInterviewPrep)
    );
  }

  // 企業名と回答をまとめて保存する(回答は渡した内容で丸ごと置き換わる)
  update(id: string | number, companyName: string, answers: InterviewPrepAnswer[]): Observable<InterviewPrep> {
    const mutation = `mutation UpdateInterviewPrep($id: ID!, $input: InterviewPrepInput!) { updateInterviewPrep(id: $id, input: $input) { ${FIELDS} } }`;
    return this.graphql.mutation<{ updateInterviewPrep: InterviewPrep }>(mutation, { id, input: { companyName, answers } }).pipe(
      map((res) => res.updateInterviewPrep)
    );
  }

  delete(id: string | number): Observable<boolean> {
    const mutation = `mutation DeleteInterviewPrep($id: ID!) { deleteInterviewPrep(id: $id) }`;
    return this.graphql.mutation<{ deleteInterviewPrep: boolean }>(mutation, { id }).pipe(
      map((res) => res.deleteInterviewPrep)
    );
  }
}
