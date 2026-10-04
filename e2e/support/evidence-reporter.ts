import type { FullConfig, FullResult, Reporter, Suite, TestCase, TestResult } from '@playwright/test/reporter';
import { execSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { EVIDENCE_NAME, EVIDENCE_ROOT, FRONT_URL } from './env';
import { EXPECTED, PRECONDITION, STEP_ATTACHMENT, StepEvidence } from './evidence';

interface CaseResult {
  id: string;
  title: string;
  file: string;
  precondition: string[];
  expected: string[];
  status: TestResult['status'] | 'notRun';
  durationMs: number;
  steps: StepEvidence[];
  errors: string[];
}

/**
 * テストケース・手順・結果(OK / NG)・スクリーンショットを並べた HTML の報告書(証跡)を作る。
 * 置き場所: <E2E_EVIDENCE_ROOT>/<E2E_EVIDENCE>/<実行日時>/index.html(env.ts)
 */
export default class EvidenceReporter implements Reporter {
  private startedAt = new Date();
  private cases = new Map<TestCase, CaseResult>();

  onBegin(_config: FullConfig, suite: Suite): void {
    this.startedAt = new Date();
    // 実行されなかったテストケース(途中で止まった場合など)も一覧に出すため、先に全件を登録しておく
    for (const test of suite.allTests()) {
      this.cases.set(test, this.emptyResult(test));
    }
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    const steps = result.attachments
      .filter((a) => a.name === STEP_ATTACHMENT && a.body)
      .map((a) => JSON.parse(a.body!.toString('utf8')) as StepEvidence);
    this.cases.set(test, {
      ...this.emptyResult(test),
      status: result.status,
      durationMs: result.duration,
      steps,
      errors: result.errors.map((e) => stripAnsi(e.message ?? String(e.value ?? '')))
    });
  }

  onEnd(result: FullResult): void {
    const dir = path.join(EVIDENCE_ROOT, EVIDENCE_NAME, timestamp(this.startedAt));
    const shotDir = path.join(dir, 'screenshots');
    mkdirSync(shotDir, { recursive: true });

    // 実行の順(ファイル名の順)ではなく、テストケースの ID の順に並べる
    const cases = [...this.cases.values()].sort((a, b) => a.id.localeCompare(b.id));
    for (const c of cases) {
      for (const s of c.steps) {
        if (!s.screenshot || !existsSync(s.screenshot)) {
          s.screenshot = undefined;
          continue;
        }
        const name = `${c.id}-${String(s.index).padStart(2, '0')}.png`;
        copyFileSync(s.screenshot, path.join(shotDir, name));
        s.screenshot = `screenshots/${name}`;
      }
    }

    writeFileSync(path.join(dir, 'index.html'), renderReport(cases, this.startedAt, result), 'utf8');
    console.log(`\n証跡(報告書): ${path.join(dir, 'index.html')}`);
  }

  printsToStdio(): boolean {
    return true;
  }

  private emptyResult(test: TestCase): CaseResult {
    const [id, ...rest] = test.title.split(' ');
    return {
      id,
      title: rest.join(' '),
      file: path.basename(test.location.file),
      precondition: test.annotations.filter((a) => a.type === PRECONDITION).map((a) => a.description ?? ''),
      expected: test.annotations.filter((a) => a.type === EXPECTED).map((a) => a.description ?? ''),
      status: 'notRun',
      durationMs: 0,
      steps: [],
      errors: []
    };
  }
}

function timestamp(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function formatDateTime(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function stripAnsi(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/\u001b\[[0-9;]*m/g, '');
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function git(command: string): string {
  try {
    return execSync(`git ${command}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '(不明)';
  }
}

const STATUS_LABEL: Record<CaseResult['status'], { label: string; cls: string }> = {
  passed: { label: 'OK', cls: 'ok' },
  failed: { label: 'NG', cls: 'ng' },
  timedOut: { label: 'NG(時間切れ)', cls: 'ng' },
  interrupted: { label: '中断', cls: 'skip' },
  skipped: { label: 'スキップ', cls: 'skip' },
  notRun: { label: '未実行', cls: 'skip' }
};

function renderList(items: string[]): string {
  if (items.length === 0) return '-';
  return `<ul>${items.map((i) => `<li>${escapeHtml(i)}</li>`).join('')}</ul>`;
}

function renderReport(cases: CaseResult[], startedAt: Date, result: FullResult): string {
  const passed = cases.filter((c) => c.status === 'passed').length;
  const failed = cases.filter((c) => c.status === 'failed' || c.status === 'timedOut').length;
  const others = cases.length - passed - failed;
  const overall = failed === 0 && others === 0 && result.status === 'passed';

  const summaryRows = cases
    .map((c) => {
      const s = STATUS_LABEL[c.status];
      return `<tr>
        <td class="nowrap"><a href="#${escapeHtml(c.id)}">${escapeHtml(c.id)}</a></td>
        <td>${escapeHtml(c.title)}<div class="muted">${escapeHtml(c.file)}</div></td>
        <td>${renderList(c.precondition)}</td>
        <td>${renderList(c.expected)}</td>
        <td class="center"><span class="badge ${s.cls}">${s.label}</span></td>
      </tr>`;
    })
    .join('');

  const details = cases
    .map((c) => {
      const s = STATUS_LABEL[c.status];
      const stepRows = c.steps
        .map(
          (st) => `<tr class="${st.ok ? '' : 'ng-row'}">
            <td class="center">${st.index}</td>
            <td>${escapeHtml(st.title)}</td>
            <td>${st.check ? escapeHtml(st.check) : '<span class="muted">(操作のみ)</span>'}</td>
            <td class="center"><span class="badge ${st.ok ? 'ok' : 'ng'}">${st.ok ? 'OK' : 'NG'}</span></td>
            <td>${
              st.screenshot
                ? `<a href="${st.screenshot}" target="_blank"><img src="${st.screenshot}" alt="手順${st.index}の画面"></a>`
                : '<span class="muted">なし</span>'
            }</td>
          </tr>${st.error ? `<tr class="ng-row"><td></td><td colspan="4"><pre>${escapeHtml(stripAnsi(st.error))}</pre></td></tr>` : ''}`
        )
        .join('');
      const errors =
        c.errors.length > 0 && c.steps.every((st) => st.ok)
          ? `<pre>${escapeHtml(c.errors.join('\n\n'))}</pre>`
          : '';
      return `<section class="card" id="${escapeHtml(c.id)}">
        <h2><span class="badge ${s.cls}">${s.label}</span> ${escapeHtml(c.id)} ${escapeHtml(c.title)}</h2>
        <p class="muted">${escapeHtml(c.file)} ・ ${(c.durationMs / 1000).toFixed(1)}秒</p>
        <div class="two-col">
          <div><h3>前提</h3>${renderList(c.precondition)}</div>
          <div><h3>期待する結果</h3>${renderList(c.expected)}</div>
        </div>
        <h3>手順と結果</h3>
        ${
          c.steps.length > 0
            ? `<div class="table-wrap"><table class="steps">
                <thead><tr><th>#</th><th>手順</th><th>確かめること</th><th>結果</th><th>スクリーンショット</th></tr></thead>
                <tbody>${stepRows}</tbody></table></div>`
            : '<p class="muted">記録された手順はありません。</p>'
        }
        ${errors}
      </section>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>E2E テスト報告書 ${escapeHtml(EVIDENCE_NAME)} ${escapeHtml(formatDateTime(startedAt))}</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; background: #f5f7fa; color: #1f2937; line-height: 1.6;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Hiragino Kaku Gothic ProN", "Yu Gothic", Meiryo, sans-serif; }
  header { background: #6076e0; color: #fff; padding: 16px 24px; }
  header h1 { margin: 0; font-size: 20px; }
  main { max-width: 1200px; margin: 0 auto; padding: 20px 16px 48px; }
  .card { background: #fff; border: 1px solid #e7ebf0; border-radius: 12px; padding: 16px 20px; margin-bottom: 20px; }
  h2 { font-size: 17px; margin: 0 0 4px; }
  h3 { font-size: 14px; margin: 12px 0 4px; color: #4b5563; }
  .muted { color: #7b8794; font-size: 13px; }
  .table-wrap { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  th, td { border-bottom: 1px solid #e7ebf0; padding: 8px; text-align: left; vertical-align: top; }
  th { background: #f0f3f7; white-space: nowrap; }
  td ul { margin: 0; padding-left: 18px; }
  .center { text-align: center; }
  .nowrap { white-space: nowrap; }
  .badge { display: inline-block; padding: 1px 10px; border-radius: 999px; font-size: 13px; font-weight: bold; white-space: nowrap; }
  .badge.ok { background: #e3f6ec; color: #14804a; }
  .badge.ng { background: #fde8e8; color: #c81e1e; }
  .badge.skip { background: #eef1f5; color: #4b5563; }
  .ng-row td { background: #fff5f5; }
  .steps img { width: 320px; max-width: 40vw; border: 1px solid #d5dbe3; border-radius: 6px; display: block; }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  @media (max-width: 720px) { .two-col { grid-template-columns: 1fr; } }
  pre { white-space: pre-wrap; background: #1f2937; color: #e5e7eb; padding: 10px 12px; border-radius: 8px; font-size: 12px; }
  dl { display: grid; grid-template-columns: max-content 1fr; gap: 4px 16px; margin: 0; }
  dt { color: #4b5563; }
  dd { margin: 0; }
</style>
</head>
<body>
<header><h1>E2E テスト報告書 <span class="badge ${overall ? 'ok' : 'ng'}">${overall ? 'すべてOK' : 'NGあり'}</span></h1></header>
<main>
  <section class="card">
    <h2>実行の情報</h2>
    <dl>
      <dt>実行日時</dt><dd>${escapeHtml(formatDateTime(startedAt))}</dd>
      <dt>証跡のフォルダ</dt><dd>${escapeHtml(EVIDENCE_NAME)}</dd>
      <dt>接続先</dt><dd>${escapeHtml(FRONT_URL)}</dd>
      <dt>ブランチ / コミット</dt><dd>${escapeHtml(git('rev-parse --abbrev-ref HEAD'))} / ${escapeHtml(git('rev-parse --short HEAD'))}</dd>
      <dt>結果</dt><dd>${cases.length}件中 OK ${passed}件 / NG ${failed}件${others > 0 ? ` / そのほか ${others}件` : ''}</dd>
    </dl>
  </section>
  <section class="card">
    <h2>テストケースの一覧</h2>
    <div class="table-wrap"><table>
      <thead><tr><th>ID</th><th>テストケース</th><th>前提</th><th>期待する結果</th><th>結果</th></tr></thead>
      <tbody>${summaryRows}</tbody>
    </table></div>
  </section>
  ${details}
</main>
</body>
</html>
`;
}
