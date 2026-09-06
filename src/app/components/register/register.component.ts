import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024;

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  email = '';
  username = '';
  password = '';
  passwordConfirm = '';

  avatarFile: File | null = null;
  readonly avatarPreviewUrl = signal<string | null>(null);

  readonly isSubmitting = signal(false);
  readonly errorMessage = signal('');

  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    if (file && file.size > MAX_AVATAR_SIZE_BYTES) {
      this.errorMessage.set('画像ファイルは5MB以下にしてください');
      input.value = '';
      this.setAvatarFile(null);
      return;
    }

    this.setAvatarFile(file);
  }

  private setAvatarFile(file: File | null): void {
    const previous = this.avatarPreviewUrl();
    if (previous) {
      URL.revokeObjectURL(previous);
    }
    this.avatarFile = file;
    this.avatarPreviewUrl.set(file ? URL.createObjectURL(file) : null);
  }

  onSubmit(): void {
    const email = this.email.trim();
    const name = this.username.trim();
    const password = this.password;
    const passwordConfirm = this.passwordConfirm;

    if (!email || !name || !password || !passwordConfirm) {
      this.errorMessage.set('すべての項目を入力してください');
      return;
    }
    if (password !== passwordConfirm) {
      this.errorMessage.set('パスワードが一致しません');
      return;
    }
    if (password.length < 8) {
      this.errorMessage.set('パスワードは8文字以上で入力してください');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    this.authService.register(email, name, password, passwordConfirm, this.avatarFile).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.router.navigateByUrl('/');
      },
      error: (err) => {
        this.isSubmitting.set(false);
        if (err.status === 409) {
          this.errorMessage.set('このメールアドレスは既に登録されています');
        } else if (err.status === 400) {
          this.errorMessage.set(err.error?.message || '入力内容を確認してください');
        } else {
          this.errorMessage.set('登録に失敗しました。しばらくしてから再度お試しください');
        }
      }
    });
  }

  goToLogin(): void {
    this.router.navigateByUrl('/login');
  }
}
