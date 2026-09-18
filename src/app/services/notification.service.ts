import { Injectable, signal } from '@angular/core';

export type NotificationStatus = 'idle' | 'saving' | 'success' | 'error';

const AUTO_IDLE_MS = 3000;

/**
 * 画面下部のトースト通知(スケジュール保存・お気に入り登録など)の状態を、画面をまたいで
 * 一元管理する。FooterComponentは元々DashboardServiceの保存状態だけを表示していたが、
 * ヘッダー(全画面共通)からもお気に入りをトグルできるようにしたため、トースト自体はどの画面からでも
 * 表示できるようこちらへ切り出した。
 */
@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  readonly status = signal<NotificationStatus>('idle');
  readonly message = signal('');

  private autoIdleTimer: ReturnType<typeof setTimeout> | null = null;

  showSaving(message: string): void {
    this.clearAutoIdle();
    this.status.set('saving');
    this.message.set(message);
  }

  // autoIdleMsにnullを渡すと自動で消えなくなる(エラー時など、ユーザーが気づくまで表示し続けたい場合用)
  showResult(message: string, status: 'success' | 'error', autoIdleMs: number | null = AUTO_IDLE_MS): void {
    this.clearAutoIdle();
    this.status.set(status);
    this.message.set(message);
    if (autoIdleMs !== null) {
      this.autoIdleTimer = setTimeout(() => this.status.set('idle'), autoIdleMs);
    }
  }

  private clearAutoIdle(): void {
    if (this.autoIdleTimer !== null) {
      clearTimeout(this.autoIdleTimer);
      this.autoIdleTimer = null;
    }
  }
}
