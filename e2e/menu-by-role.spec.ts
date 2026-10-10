import { caseOf, expect, loginAsE2E, startSteps, test } from './support/evidence';

test(
  'E2E-07 一般ユーザーには管理者向けのメニューが出ず、画面を直接開いても中身は表示されない',
  caseOf({
    precondition: ['sandbox が起動している', 'E2E 専用のアカウント(ロールは一般)でログインしている'],
    expected: [
      'ヘッダーの画面切り替えのメニューに「ユーザー管理」が出ない',
      'ユーザー管理(/users)を直接開いても、ユーザーの一覧は表示されない(API が拒否する。api#67)',
      'カード登録(/cards/admin)を直接開いても、カード・パックは表示されない(API が拒否する。api#67)',
      'RPGマップ作成(/rpg/admin)を直接開いても、マップは編集できない(front#217)'
    ]
  }),
  async ({ page }) => {
    const step = startSteps(page);
    await loginAsE2E(page, step);

    await step('ヘッダーの画面名(「Dashboard」)を押して、画面切り替えのメニューを開く', '「Dashboard」「ツール一覧」だけが出て、「ユーザー管理」は出ない', async () => {
      await page.getByRole('banner').getByRole('button', { name: 'Dashboard' }).click();
      const menu = page.getByRole('banner').getByRole('menu');
      await expect(menu.getByRole('menuitem')).toHaveText(['Dashboard', 'ツール一覧']);
      await expect(menu.getByRole('menuitem', { name: 'ユーザー管理' })).toHaveCount(0);
    });

    await step('ユーザー管理(/users)を直接開く', '「ユーザー一覧の取得に失敗しました」と表示され、ユーザーは0件', async () => {
      await page.goto('/users');
      await expect(page.getByText('ユーザー一覧の取得に失敗しました')).toBeVisible();
      await expect(page.getByText('0件のユーザー')).toBeVisible();
    });

    await step('カード登録(/cards/admin)を直接開く', '「カード・パックの取得に失敗しました」と表示される', async () => {
      await page.goto('/cards/admin');
      await expect(page.getByText('カード・パックの取得に失敗しました')).toBeVisible();
    });

    await step('RPGマップ作成(/rpg/admin)を直接開く', '「この画面は、管理者・開発者だけが使えます。」と表示され、マップは出ない', async () => {
      await page.goto('/rpg/admin');
      await expect(page.getByText('この画面は、管理者・開発者だけが使えます。')).toBeVisible();
      await expect(page.getByLabel('マップ', { exact: true })).toHaveCount(0);
    });
  }
);
