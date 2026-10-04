import { E2E_DATA_PREFIX } from './support/env';
import { caseOf, expect, loginAsE2E, startSteps, test } from './support/evidence';

test(
  'E2E-06 つぶやきを投稿すると一覧の先頭に出て、削除すると消える',
  caseOf({
    precondition: ['sandbox が起動している', 'E2E 専用のアカウントでログインしている'],
    expected: [
      '投稿すると、一覧の先頭に自分の投稿として(編集・削除のボタン付きで)出る',
      '削除すると「削除しました」と表示され、一覧から消える。読み込み直しても戻らない'
    ]
  }),
  async ({ page }) => {
    const step = startSteps(page);
    // 前回の実行で残ったものと区別できるよう、実行ごとに違う本文にする
    const body = `${E2E_DATA_PREFIX} E2E テストの投稿 ${Date.now()}`;
    const post = () => page.locator('main article', { hasText: body });

    await loginAsE2E(page, step);

    await step('つぶやき(/timeline)を開き、本文を入力する', '入力した文字数が表示され、「投稿する」が押せる', async () => {
      await page.goto('/timeline');
      await page.getByRole('textbox', { name: 'いまどうしてる？' }).fill(body);
      await expect(page.getByText(`${[...body].length} / 200`)).toBeVisible();
      await expect(page.getByRole('button', { name: '投稿する' })).toBeEnabled();
    });

    await step('「投稿する」を押す', '一覧の先頭に投稿が出て、自分の投稿なので「編集」「削除」がある', async () => {
      await page.getByRole('button', { name: '投稿する' }).click();
      await expect(page.locator('main article').first()).toContainText(body);
      await expect(post().getByRole('button', { name: '編集' })).toBeVisible();
      await expect(post().getByRole('button', { name: '削除' })).toBeVisible();
    });

    await step('投稿の「削除」を押し、確認で「OK」を選ぶ', '「削除しました」と表示され、一覧から投稿が消える', async () => {
      await post().getByRole('button', { name: '削除' }).click();
      await expect(page.getByText('削除しました')).toBeVisible();
      await expect(post()).toHaveCount(0);
    });

    await step('画面を読み込み直す', '削除した投稿は出ない', async () => {
      await page.reload();
      await expect(page.getByRole('heading', { name: 'つぶやき' })).toBeVisible();
      await expect(page.locator('main article').first()).toBeVisible();
      await expect(post()).toHaveCount(0);
    });
  }
);
