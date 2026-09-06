import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css']
})
export class ResetPasswordComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  private readonly token = this.route.snapshot.queryParamMap.get('token');
  readonly hasToken = !!this.token;

  newPassword = '';
  newPasswordConfirm = '';

  readonly isSubmitting = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');

  onSubmit(): void {
    if (!this.token) {
      this.errorMessage.set('無効なリンクです。もう一度パスワード再設定をリクエストしてください');
      return;
    }
    if (!this.newPassword || !this.newPasswordConfirm) {
      this.errorMessage.set('新しいパスワードを入力してください');
      return;
    }
    if (this.newPassword !== this.newPasswordConfirm) {
      this.errorMessage.set('パスワードが一致しません');
      return;
    }
    if (this.newPassword.length < 8) {
      this.errorMessage.set('パスワードは8文字以上で入力してください');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.authService.resetPassword(this.token, this.newPassword, this.newPasswordConfirm).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.successMessage.set(res.message);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.message || '再設定に失敗しました。しばらくしてから再度お試しください');
      }
    });
  }

  goToLogin(): void {
    this.router.navigateByUrl('/login');
  }

  goToForgotPassword(): void {
    this.router.navigateByUrl('/forgot-password');
  }
}
