import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

export interface AuthUser {
  id: string | number;
  name: string;
  email: string;
  role: string;
  avatarFilename?: string | null;
}

interface LoginResponse {
  token: string;
  user: AuthUser;
}

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private authBase = 'http://localhost:8080/api/auth';

  readonly currentUser = signal<AuthUser | null>(this.readStoredUser());

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.authBase}/login`, { email, password }).pipe(
      tap(res => this.storeSession(res))
    );
  }

  register(
    email: string,
    name: string,
    password: string,
    passwordConfirm: string,
    avatar?: File | null
  ): Observable<LoginResponse> {
    // 画像(任意)を同時に送るためmultipart/form-dataで送信する。
    // Content-Typeは付与しない(ブラウザがboundary付きで自動設定するため)。
    const formData = new FormData();
    formData.append('email', email);
    formData.append('name', name);
    formData.append('password', password);
    formData.append('passwordConfirm', passwordConfirm);
    if (avatar) {
      formData.append('avatar', avatar, avatar.name);
    }

    return this.http.post<LoginResponse>(`${this.authBase}/register`, formData).pipe(
      tap(res => this.storeSession(res))
    );
  }

  logout(): void {
    this.clearSession();
    this.router.navigateByUrl('/login');
  }

  forgotPassword(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.authBase}/forgot-password`, { email });
  }

  resetPassword(token: string, newPassword: string, newPasswordConfirm: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.authBase}/reset-password`, {
      token,
      newPassword,
      newPasswordConfirm
    });
  }

  // アカウント情報編集など、ログイン以外の経路でユーザー情報が更新された際に
  // 保持しているスナップショット(localStorage/シグナル)を追従させる
  updateStoredUser(partial: Partial<AuthUser>): void {
    const current = this.currentUser();
    if (!current) return;
    const updated: AuthUser = { ...current, ...partial };
    this.safeStorageSet(USER_KEY, JSON.stringify(updated));
    this.currentUser.set(updated);
  }

  getToken(): string | null {
    return this.safeStorageGet(TOKEN_KEY);
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  private storeSession(res: LoginResponse): void {
    this.safeStorageSet(TOKEN_KEY, res.token);
    this.safeStorageSet(USER_KEY, JSON.stringify(res.user));
    this.currentUser.set(res.user);
  }

  private clearSession(): void {
    this.safeStorageRemove(TOKEN_KEY);
    this.safeStorageRemove(USER_KEY);
    this.currentUser.set(null);
  }

  private readStoredUser(): AuthUser | null {
    const raw = this.safeStorageGet(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  }

  private safeStorageGet(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  private safeStorageSet(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      // localStorageが使えない環境(プライベートモード等)では保持できないが、致命的ではないので無視する
    }
  }

  private safeStorageRemove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      // 上記と同様に無視する
    }
  }
}
