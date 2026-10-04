import { Page } from '@playwright/test';
import { E2E_DATA_PREFIX } from './support/env';
import { caseOf, expect, loginAsE2E, startSteps, test } from './support/evidence';

// 今日の日付(yyyy-MM-dd)。月表示のカレンダーに必ず含まれる日として使う
function today(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const selectedDayPanel = (page: Page) =>
  page.locator('article', { has: page.getByRole('heading', { name: '選択日の予定' }) });

test(
  'E2E-03 カレンダーで予定を登録すると保存され、読み込み直しても残っている。削除すると消える',
  caseOf({
    precondition: ['sandbox が起動している', 'E2E 専用のアカウントでログインしている'],
    expected: [
      '登録した予定が、選んだ日の予定の一覧に出る',
      '自動で保存され(「保存完了」)、画面を読み込み直しても予定が残っている',
      '削除すると一覧から消え、読み込み直しても戻らない'
    ]
  }),
  async ({ page }) => {
    const step = startSteps(page);
    const date = today();
    // 前回の実行で残ったものと区別できるよう、実行ごとに違うタイトルにする
    const title = `${E2E_DATA_PREFIX} 予定 ${Date.now()}`;
    const event = () => selectedDayPanel(page).locator('.calendar-event', { hasText: title });

    await loginAsE2E(page, step);

    await step(`カレンダーで今日(${date})を選ぶ`, '選んだ日の予定の一覧が表示される', async () => {
      await page.locator(`[data-date="${date}"]`).click();
      await expect(selectedDayPanel(page)).toBeVisible();
    }, { focus: () => selectedDayPanel(page) });

    await step('「＋ 予定を登録」を押し、種別を「予定」にしてタイトルを入力する', null, async () => {
      await page.getByRole('button', { name: '＋ 予定を登録' }).click();
      const dialog = page.getByRole('dialog').filter({ hasText: 'タスク・予定を登録' });
      await dialog.getByRole('tab', { name: '予定' }).click();
      await dialog.getByRole('textbox', { name: 'タイトル' }).fill(title);
    });

    await step('「登録する」を押す', '選んだ日の予定の一覧に、登録した予定が出る', async () => {
      await page.getByRole('button', { name: '登録する' }).click();
      await expect(event()).toBeVisible();
    }, { focus: () => selectedDayPanel(page) });

    await step('自動保存を待つ', '「保存完了」と表示される', async () => {
      await expect(page.getByText('保存完了')).toBeVisible({ timeout: 15_000 });
    });

    await step('画面を読み込み直し、もう一度今日を選ぶ', '登録した予定が残っている', async () => {
      await page.reload();
      await page.locator(`[data-date="${date}"]`).click();
      await expect(event()).toBeVisible();
    }, { focus: () => selectedDayPanel(page) });

    await step('登録した予定の「削除」を押し、確認で「OK」を選ぶ', '一覧から予定が消え、「保存完了」と表示される', async () => {
      await event().getByRole('button', { name: '削除' }).click();
      await expect(event()).toHaveCount(0);
      await expect(page.getByText('保存完了')).toBeVisible({ timeout: 15_000 });
    }, { focus: () => selectedDayPanel(page) });

    await step('画面を読み込み直し、もう一度今日を選ぶ', '削除した予定は出ない', async () => {
      await page.reload();
      await page.locator(`[data-date="${date}"]`).click();
      await expect(selectedDayPanel(page)).toBeVisible();
      await expect(event()).toHaveCount(0);
    }, { focus: () => selectedDayPanel(page) });
  }
);
