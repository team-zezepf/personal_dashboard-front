import { defineConfig } from '@playwright/test';
import { FRONT_URL } from './e2e/support/env';

/**
 * 画面の主な操作を確かめる E2E テスト(npm run e2e)。
 * 起動中の sandbox(フロント 4201 / API 8081)に対して実行する。先に start-sandbox.bat で起動しておく。
 * 実行のたびに、テストケース・手順・結果・スクリーンショットを並べた報告書(証跡)を作る(e2e/support/evidence-reporter.ts)。
 */
export default defineConfig({
  testDir: './e2e',
  // E2E 専用のアカウント1つを使い回すので、テストは1つずつ順に実行する
  workers: 1,
  fullyParallel: false,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  globalSetup: './e2e/support/global-setup.ts',
  reporter: [['list'], ['./e2e/support/evidence-reporter.ts']],
  use: {
    baseURL: FRONT_URL,
    // ブラウザはインストール済みの Chrome を使う(Playwright のブラウザはダウンロードしない)
    channel: 'chrome',
    viewport: { width: 1280, height: 900 },
    locale: 'ja-JP',
    timezoneId: 'Asia/Tokyo',
    // 失敗したときの調査用に、操作の記録を test-results/ に残す
    trace: 'retain-on-failure'
  }
});
