import { Locator, Page, test } from '@playwright/test';
import { E2E_ACCOUNT } from './env';

export { expect, test } from '@playwright/test';

/**
 * 手順を1つ実行し、終わったら(失敗しても)画面のスクリーンショットを撮って証跡に残す。
 * - title: 手順(何をするか)
 * - check: その手順で確かめること。確かめることがない操作だけの手順は null
 * - options.focus: スクリーンショットを撮る前に、画面に入るまでスクロールする要素
 */
export type Step = (
  title: string,
  check: string | null,
  body: () => Promise<void>,
  options?: { focus?: () => Locator }
) => Promise<void>;

/** 報告書の作成(evidence-reporter.ts)に渡す、手順1つ分の記録。添付の名前は evidence-step */
export interface StepEvidence {
  index: number;
  title: string;
  check: string | null;
  ok: boolean;
  error?: string;
  screenshot?: string;
}

export const STEP_ATTACHMENT = 'evidence-step';
export const PRECONDITION = '前提';
export const EXPECTED = '期待する結果';

function stepRunner(page: Page): Step {
  let index = 0;
  return async (title, check, body, options) => {
    const info = test.info();
    const current = ++index;
    await test.step(title, async () => {
      let error: unknown;
      try {
        await body();
      } catch (e) {
        error = e;
      }
      const screenshot = info.outputPath(`step-${String(current).padStart(2, '0')}.png`);
      let saved = true;
      try {
        if (options?.focus) await options.focus().scrollIntoViewIfNeeded({ timeout: 2_000 });
        await page.screenshot({ path: screenshot });
      } catch {
        saved = false;
      }
      const evidence: StepEvidence = {
        index: current,
        title,
        check,
        ok: error === undefined,
        error: error === undefined ? undefined : String(error instanceof Error ? error.message : error),
        screenshot: saved ? screenshot : undefined
      };
      await info.attach(STEP_ATTACHMENT, { contentType: 'application/json', body: JSON.stringify(evidence) });
      if (error !== undefined) throw error;
    });
  };
}

/**
 * テストケースの「前提」と「期待する結果」を、テストの付加情報(annotation)にする。報告書のテストケースの一覧に出る。
 * 使い方: test('E2E-01 タイトル', caseOf({ precondition: [...], expected: [...] }), async ({ page }) => { ... })
 */
export function caseOf(definition: { precondition: string[]; expected: string[] }) {
  return {
    annotation: [
      ...definition.precondition.map((description) => ({ type: PRECONDITION, description })),
      ...definition.expected.map((description) => ({ type: EXPECTED, description }))
    ]
  };
}

/** テストケースの手順を書き始める。手順ごとに証跡が残る。削除の確認(window.confirm)などは「OK」を選ぶ */
export function startSteps(page: Page): Step {
  page.on('dialog', (dialog) => dialog.accept());
  return stepRunner(page);
}

/** E2E 専用のアカウントでログインし、ダッシュボードが出るまで待つ(手順として証跡に残す) */
export async function loginAsE2E(page: Page, step: Step): Promise<void> {
  await step('ログイン画面で、E2E 専用のアカウントのメールアドレスとパスワードを入力してログインする', 'ダッシュボードが表示される', async () => {
    await page.goto('/login');
    await page.getByLabel('メールアドレス').fill(E2E_ACCOUNT.email);
    await page.getByLabel('パスワード').fill(E2E_ACCOUNT.password);
    await page.getByRole('button', { name: 'ログイン', exact: true }).click();
    await page.waitForURL((url) => url.pathname === '/');
    await page.getByRole('heading', { name: 'カレンダー' }).waitFor();
  });
}
