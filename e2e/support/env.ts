import path from 'node:path';

// 接続先(sandbox)。別の環境に向けるときは環境変数で上書きする
export const FRONT_URL = process.env['E2E_FRONT_URL'] ?? 'http://localhost:4201';
export const API_URL = process.env['E2E_API_URL'] ?? 'http://localhost:8081';

// E2E 専用のアカウント。手で確認するときの sandbox@example.com とは分ける(なければ global-setup で作る)
export const E2E_ACCOUNT = {
  email: process.env['E2E_EMAIL'] ?? 'e2e@example.com',
  password: process.env['E2E_PASSWORD'] ?? 'e2e-pass-1234',
  name: 'E2Eテスト'
};

// テストで作るデータ(予定・つぶやき)のタイトルの先頭に付ける印。前回の実行で残ったものを global-setup で消すのに使う
export const E2E_DATA_PREFIX = '[E2E]';

/**
 * 証跡(報告書)を置くフォルダ: <E2E_EVIDENCE_ROOT>/<E2E_EVIDENCE>/<実行日時>/
 * - E2E_EVIDENCE: Issue 番号が分かるフォルダ名(例: front-203-e2e-tests)。省略すると e2e
 * - E2E_EVIDENCE_ROOT: 省略するとリポジトリの隣の test/(C:\zezepf\personal_dashboard\test)
 */
export const EVIDENCE_ROOT = process.env['E2E_EVIDENCE_ROOT'] ?? path.resolve(__dirname, '..', '..', '..', 'test');
export const EVIDENCE_NAME = process.env['E2E_EVIDENCE'] ?? 'e2e';
