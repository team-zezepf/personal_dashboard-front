import { inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { AuthService } from './services/auth.service';

/**
 * Android版(オフライン)の起動時の準備(front#184)。app.config.ts から environment.offline のときだけ呼ぶ。
 * - ログイン画面を出さず、端末の持ち主でログインした状態にする
 * - <html> に offline-app クラスを付け、画面下のタブの分だけ固定表示の部品(タスク・トーストなど)を上にずらす(styles.css)
 * - Android の戻るボタンで前の画面に戻る。戻る先がなければアプリを閉じる
 */
export function initOfflineApp(): void {
  inject(AuthService).startOfflineSession();
  const document = inject(DOCUMENT);
  document.documentElement.classList.add('offline-app');
  // ステータスバー・ジェスチャーバーの高さを env(safe-area-inset-*) で取れるようにする(PC 版の index.html は変えない)
  document.querySelector('meta[name="viewport"]')?.setAttribute('content', 'width=device-width, initial-scale=1, viewport-fit=cover');

  // PC 版の初回読み込みに含めないよう、使うときに読み込む
  import('@capacitor/app').then(({ App }) => {
    App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        history.back();
      } else {
        App.exitApp();
      }
    });
  });
}
