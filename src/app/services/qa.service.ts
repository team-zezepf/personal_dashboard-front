import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { GraphQLService } from './graphql.service';
import { environment } from '../../environments/environment';
import { QaEntry, QaEntryInput } from '../models/qa.models';

const QA_ENTRY_FIELDS = `
  id
  title
  question
  answer
  images {
    filename
    label
    caption
  }
  tags
  authorId
  authorName
  createdAt
  updatedAt
`;

@Injectable({
  providedIn: 'root'
})
export class QaService {
  private graphql = inject(GraphQLService);
  private http = inject(HttpClient);
  private imageUploadUrl = `${environment.apiBaseUrl}/api/qa-images`;

  getEntries(keyword?: string, tag?: string): Observable<QaEntry[]> {
    const query = `
      query GetQaEntries($keyword: String, $tag: String) {
        qaEntries(keyword: $keyword, tag: $tag) {
          ${QA_ENTRY_FIELDS}
        }
      }
    `;

    return this.graphql.query<{ qaEntries: QaEntry[] }>(query, { keyword, tag }).pipe(
      map((res) => res.qaEntries)
    );
  }

  createEntry(input: QaEntryInput): Observable<QaEntry> {
    const mutation = `
      mutation CreateQaEntry($input: QaEntryInput!) {
        createQaEntry(input: $input) {
          ${QA_ENTRY_FIELDS}
        }
      }
    `;

    return this.graphql.mutation<{ createQaEntry: QaEntry }>(mutation, { input }).pipe(
      map((res) => res.createQaEntry)
    );
  }

  updateEntry(id: string | number, input: QaEntryInput): Observable<QaEntry> {
    const mutation = `
      mutation UpdateQaEntry($id: ID!, $input: QaEntryInput!) {
        updateQaEntry(id: $id, input: $input) {
          ${QA_ENTRY_FIELDS}
        }
      }
    `;

    return this.graphql.mutation<{ updateQaEntry: QaEntry }>(mutation, { id, input }).pipe(
      map((res) => res.updateQaEntry)
    );
  }

  deleteEntry(id: string | number): Observable<boolean> {
    const mutation = `
      mutation DeleteQaEntry($id: ID!) {
        deleteQaEntry(id: $id)
      }
    `;

    return this.graphql.mutation<{ deleteQaEntry: boolean }>(mutation, { id }).pipe(
      map((res) => res.deleteQaEntry)
    );
  }

  // 画像は<img>でプレーン参照する都合上GraphQLを経由せず、アバターと同じくREST(multipart)で
  // アップロードする。返ってきたfilenameをQaEntryInput.imagesに詰めて保存する。
  uploadImage(file: File): Observable<string> {
    const formData = new FormData();
    formData.append('file', file, file.name);

    return this.http.post<{ filename: string }>(this.imageUploadUrl, formData).pipe(
      map((res) => res.filename)
    );
  }
}
