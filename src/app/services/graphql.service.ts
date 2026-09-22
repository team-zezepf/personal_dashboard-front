import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';

export interface GraphQLResponse<T> {
  data?: T;
  errors?: { message: string }[];
}

@Injectable({
  providedIn: 'root'
})
export class GraphQLService {
  private http = inject(HttpClient);
  private endpoint = `${environment.apiBaseUrl}/graphql`;

  query<T>(query: string, variables: Record<string, any> = {}): Observable<T> {
    return this.http.post<GraphQLResponse<T>>(this.endpoint, { query, variables }).pipe(
      map(res => {
        if (res.errors && res.errors.length > 0) {
          throw new Error(res.errors.map(e => e.message).join(', '));
        }
        return res.data as T;
      })
    );
  }

  mutation<T>(mutation: string, variables: Record<string, any> = {}): Observable<T> {
    return this.query<T>(mutation, variables);
  }
}
