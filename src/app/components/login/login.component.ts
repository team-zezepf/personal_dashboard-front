import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  email = '';
  password = '';

  readonly isSubmitting = signal(false);
  readonly errorMessage = signal('');

  onSubmit(): void {
    const email = this.email.trim();
    const password = this.password;

    if (!email || !password) {
      this.errorMessage.set('メールアドレスとパスワードを入力してください');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    this.authService.login(email, password).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.router.navigateByUrl('/');
      },
      error: (err) => {
        this.isSubmitting.set(false);
        if (err.status === 401) {
          this.errorMessage.set('メールアドレスまたはパスワードが正しくありません');
        } else {
          this.errorMessage.set('ログインに失敗しました。しばらくしてから再度お試しください');
        }
      }
    });
  }
}
