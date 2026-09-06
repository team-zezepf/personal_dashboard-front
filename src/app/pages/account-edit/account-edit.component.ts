import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../components/header/header.component';
import { AuthService } from '../../services/auth.service';
import { AccountService } from '../../services/account.service';
import { avatarUrl } from '../../utils/avatar';

const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024;

@Component({
  selector: 'app-account-edit-page',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent],
  templateUrl: './account-edit.component.html',
  styleUrl: './account-edit.component.css'
})
export class AccountEditPageComponent {
  private authService = inject(AuthService);
  private accountService = inject(AccountService);

  private currentUser = this.authService.currentUser;

  name = this.currentUser()?.name ?? '';
  currentPassword = '';
  newPassword = '';
  newPasswordConfirm = '';

  avatarFile: File | null = null;
  readonly avatarPreviewUrl = signal<string | null>(null);

  readonly isSubmitting = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');

  readonly existingAvatarSrc = computed(() => avatarUrl(this.currentUser()?.avatarFilename));

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
    const name = this.name.trim();
    if (!name) {
      this.errorMessage.set('ユーザー名を入力してください');
      return;
    }

    const wantsPasswordChange = this.currentPassword || this.newPassword || this.newPasswordConfirm;
    if (wantsPasswordChange) {
      if (!this.currentPassword || !this.newPassword || !this.newPasswordConfirm) {
        this.errorMessage.set('パスワードを変更する場合は現在のパスワード・新しいパスワード・確認用パスワードをすべて入力してください');
        return;
      }
      if (this.newPassword !== this.newPasswordConfirm) {
        this.errorMessage.set('新しいパスワードが一致しません');
        return;
      }
      if (this.newPassword.length < 8) {
        this.errorMessage.set('新しいパスワードは8文字以上で入力してください');
        return;
      }
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.accountService
      .updateProfile(name, this.avatarFile, this.currentPassword, this.newPassword, this.newPasswordConfirm)
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.successMessage.set('保存しました');
          this.currentPassword = '';
          this.newPassword = '';
          this.newPasswordConfirm = '';
          this.setAvatarFile(null);
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(err.error?.message || '保存に失敗しました。しばらくしてから再度お試しください');
        }
      });
  }
}
