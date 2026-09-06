import { Injectable, inject, signal } from '@angular/core';
import { GraphQLService } from './graphql.service';
import { User } from '../models/dashboard.models';
import { Observable, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private graphql = inject(GraphQLService);

  readonly users = signal<User[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly loadError = signal<string>('');

  loadUsers(): void {
    const query = `
      query GetUsers {
        users {
          id
          name
          email
          role
          avatarFilename
          createdAt
          updatedAt
        }
      }
    `;

    this.isLoading.set(true);
    this.loadError.set('');

    this.graphql.query<{ users: User[] }>(query).subscribe({
      next: (res) => {
        this.users.set(res.users);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.loadError.set('ユーザー一覧の取得に失敗しました');
      }
    });
  }

  updateUserRole(id: string | number, role: string): Observable<{ updateUserRole: User }> {
    const mutation = `
      mutation UpdateUserRole($id: ID!, $role: String!) {
        updateUserRole(id: $id, role: $role) {
          id
          name
          email
          role
          avatarFilename
          createdAt
          updatedAt
        }
      }
    `;

    return this.graphql.mutation<{ updateUserRole: User }>(mutation, { id, role }).pipe(
      tap(res => {
        this.users.update(list => list.map(u => (u.id === id ? res.updateUserRole : u)));
      })
    );
  }
}
