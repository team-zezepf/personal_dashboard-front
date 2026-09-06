import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { AuthService } from './auth.service';

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
  private base = 'http://localhost:8080/api/account';

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
}
