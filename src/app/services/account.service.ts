import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, map, catchError, of } from 'rxjs';
import { AuthService } from './auth.service';
import { GraphQLService } from './graphql.service';
import { NotificationService } from './notification.service';
import { environment } from '../../environments/environment';

export interface AccountResponse {
  id: string | number;
  name: string;
  email: string;
  role: string;
  avatarFilename: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class AccountService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private graphql = inject(GraphQLService);
  private notificationService = inject(NotificationService);
  private base = `${environment.apiBaseUrl}/api/account`;

  updateProfile(
    name: string,
    avatar: File | null,
    currentPassword: string,
    newPassword: string,
    newPasswordConfirm: string
  ): Observable<AccountResponse> {
    const formData = new FormData();
    formData.append('name', name);
    if (avatar) {
      formData.append('avatar', avatar, avatar.name);
    }
    if (currentPassword || newPassword || newPasswordConfirm) {
      formData.append('currentPassword', currentPassword);
      formData.append('newPassword', newPassword);
      formData.append('newPasswordConfirm', newPasswordConfirm);
    }

    return this.http.post<AccountResponse>(`${this.base}/profile`, formData).pipe(
      tap(res => this.authService.updateStoredUser({ name: res.name, avatarFilename: res.avatarFilename }))
    );
  }

  // ツール一覧・ヘッダーどちらの★からも呼ばれる。成功/失敗を画面下部のトーストで知らせる
  // (スケジュール保存などと同じNotificationServiceの仕組みに乗せている)。
  toggleFavoriteTool(toolName: string, path: string): Observable<void> {
    const wasFavorite = this.authService.currentUser()?.favoriteTools?.includes(path) ?? false;

    const mutation = `
      mutation ToggleFavoriteTool($path: String!) {
        toggleFavoriteTool(path: $path) {
          favoriteTools
        }
      }
    `;

    return this.graphql.mutation<{ toggleFavoriteTool: { favoriteTools: string[] } }>(mutation, { path }).pipe(
      tap(res => {
        this.authService.updateStoredUser({ favoriteTools: res.toggleFavoriteTool.favoriteTools });
        const message = wasFavorite
          ? `「${toolName}」のお気に入りを解除しました`
          : `「${toolName}」をお気に入りに追加しました`;
        this.notificationService.showResult(message, 'success');
      }),
      map(() => undefined),
      catchError(err => {
        console.error('Failed to toggle favorite tool:', err);
        // 保存失敗はスケジュール保存等と同様、ユーザーが気づくまで自動で消さない
        this.notificationService.showResult('お気に入りの更新に失敗しました', 'error', null);
        return of(undefined);
      })
    );
  }

  // ポイント獲得の演出(結果画面の表示など)は呼び出し元がクライアント側の計算で行うため、
  // ここではヘッダーのポイント表示を最新化するだけでよく、専用のトースト通知は出さない。
  addPoints(amount: number): Observable<void> {
    const mutation = `
      mutation AddPoints($amount: Int!) {
        addPoints(amount: $amount) {
          points
        }
      }
    `;

    return this.graphql.mutation<{ addPoints: { points: number } }>(mutation, { amount }).pipe(
      tap(res => this.authService.updateStoredUser({ points: res.addPoints.points })),
      map(() => undefined),
      catchError(err => {
        console.error('Failed to add points:', err);
        return of(undefined);
      })
    );
  }
}
