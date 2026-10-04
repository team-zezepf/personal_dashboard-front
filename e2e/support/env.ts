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
 * 証跡(報告書)を置くフォルダ: <E2E_EVIDENCE_ROOT>/<E2E_EVIDENCE>/<実行日時>[-<E2E_NOTE>]/
 * - E2E_EVIDENCE: Issue 番号が分かるフォルダ名。<repo>-issue<番号>-<内容>(例: front-issue204-multi-choice-click)にすると、
 *   報告書に Issue へのリンクを出す。省略すると e2e
 * - E2E_NOTE: 実行の目的などのメモ(例: 修正前)。実行日時のフォルダ名の後ろに付け、報告書にも出す
 * - E2E_EVIDENCE_ROOT: 省略するとリポジトリの隣の test/(C:\zezepf\personal_dashboard\test)
 */
export const EVIDENCE_ROOT = process.env['E2E_EVIDENCE_ROOT'] ?? path.resolve(__dirname, '..', '..', '..', 'test');
export const EVIDENCE_NAME = toFolderName(process.env['E2E_EVIDENCE'] ?? 'e2e');
export const EVIDENCE_NOTE = (process.env['E2E_NOTE'] ?? '').trim();

// フォルダ名に使えない文字・空白を _ に置き換える
export function toFolderName(text: string): string {
  return text.trim().replace(/[\\/:*?"<>|\s]+/g, '_');
}

const REPOSITORIES: Record<string, string> = {
  front: 'team-zezepf/personal_dashboard-front',
  api: 'team-zezepf/personal_dashboard-api'
};

/** 証跡のフォルダ名(<repo>-issue<番号>-...)から、Issue の表示名と URL を読み取る。読み取れなければ null */
export function issueOf(evidenceName: string): { label: string; url: string } | null {
  const match = /^(front|api)-issue(\d+)(?:-|$)/.exec(evidenceName);
  if (!match) return null;
  const [, repo, number] = match;
  return { label: `${repo}#${number}`, url: `https://github.com/${REPOSITORIES[repo]}/issues/${number}` };
}
