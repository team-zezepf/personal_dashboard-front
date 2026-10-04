import { E2E_ACCOUNT } from './support/env';
import { caseOf, expect, loginAsE2E, startSteps, test } from './support/evidence';

test(
  'E2E-01 ログインしていないとログイン画面に移り、ログインするとダッシュボードが出る',
  caseOf({
    precondition: ['sandbox が起動している', 'E2E 専用のアカウントがある(なければテストの最初に作る)', 'ログインしていない'],
    expected: ['ダッシュボード(/)を開くと、ログイン画面に移る', 'ログインすると、ダッシュボードにカレンダーが表示される']
  }),
  async ({ page }) => {
    const step = startSteps(page);

    await step('ログインせずに、ダッシュボード(/)を開く', 'ログイン画面(/login)に移る', async () => {
      await page.goto('/');
      await expect(page).toHaveURL(/\/login$/);
      await expect(page.getByRole('button', { name: 'ログイン', exact: true })).toBeVisible();
    });

    await loginAsE2E(page, step);
  }
);

test(
  'E2E-02 パスワードが違うとログインできず、エラーが出る',
  caseOf({
    precondition: ['sandbox が起動している', 'E2E 専用のアカウントがある', 'ログインしていない'],
    expected: ['「メールアドレスまたはパスワードが正しくありません」と表示され、ログイン画面のままになる']
  }),
  async ({ page }) => {
    const step = startSteps(page);

    await step(
      'ログイン画面で、正しいメールアドレスと違うパスワードを入力してログインする',
      'エラーメッセージが出て、ログイン画面のままになる',
      async () => {
        await page.goto('/login');
        await page.getByLabel('メールアドレス').fill(E2E_ACCOUNT.email);
        await page.getByLabel('パスワード').fill('wrong-password');
        await page.getByRole('button', { name: 'ログイン', exact: true }).click();
        await expect(page.getByText('メールアドレスまたはパスワードが正しくありません')).toBeVisible();
        await expect(page).toHaveURL(/\/login$/);
      }
    );
  }
);
