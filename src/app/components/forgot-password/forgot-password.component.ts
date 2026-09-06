import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.css']
})
export class ForgotPasswordComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  email = '';

  readonly isSubmitting = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');

  onSubmit(): void {
    const email = this.email.trim();
    if (!email) {
      this.errorMessage.set('メールアドレスを入力してください');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.authService.forgotPassword(email).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        // 登録有無に関わらずバックエンドは常に同じメッセージを返す(ユーザー列挙防止)
        this.successMessage.set(res.message);
      },
      error: () => {
        this.isSubmitting.set(false);
        this.errorMessage.set('送信に失敗しました。しばらくしてから再度お試しください');
      }
    });
  }

  goToLogin(): void {
    this.router.navigateByUrl('/login');
  }
}
