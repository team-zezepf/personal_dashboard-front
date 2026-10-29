import { caseOf, expect, loginAsE2E, startSteps, test } from './support/evidence';

const SUBJECT = '簿記3級';

test(
  'E2E-40 簿記3級の模擬試験で、仕訳入力の問題に勘定科目と金額を入力して答え、結果と受験記録で入力した仕訳を確認できる',
  caseOf({
    precondition: ['sandbox が起動している', 'E2E 専用のアカウントでログインしている', `${SUBJECT}の仕訳入力の問題データがある`],
    expected: [
      '開始画面に、仕訳入力15問 → 4択35問の順に出題することと、出題数50問が表示される',
      '最初の問題は仕訳入力で、借方・貸方とも4行の入力欄(勘定科目のプルダウンと金額)がある',
      '1行入力すると回答済みに数えられ、別のページから戻っても入力した内容が残っている',
      '採点後、仕訳入力の問題に「あなたの回答」と「正解」の仕訳の表が表示される',
      '科目一覧の受験の詳細で、仕訳入力の問題に入力した仕訳と正解の仕訳が表示される'
    ]
  }),
  async ({ page }) => {
    const step = startSteps(page);
    await loginAsE2E(page, step);

    await step(`${SUBJECT}の模擬試験の画面を開く`, '出題構成「仕訳入力15問 → 4択35問」と出題数50問が表示される', async () => {
      await page.goto('/study/boki3/mock-exam');
      await expect(page.getByText('出題構成: 仕訳入力15問 → 4択35問の順に出題します')).toBeVisible();
      await expect(page.getByText('出題数: 50問')).toBeVisible();
    });

    const first = page.locator('.question-card').first();
    await step('「模擬試験を開始する」を押す', '第1問は仕訳入力で、借方・貸方とも4行の入力欄がある', async () => {
      await page.getByRole('button', { name: '模擬試験を開始する' }).click();
      await expect(page.getByText('回答済み: 0 / 50')).toBeVisible();
      await expect(first.getByRole('combobox', { name: /第1問 借方の勘定科目/ })).toHaveCount(4);
      await expect(first.getByRole('combobox', { name: /第1問 貸方の勘定科目/ })).toHaveCount(4);
      await expect(first.getByRole('textbox', { name: /第1問 借方の金額/ })).toHaveCount(4);
    });

    // 第1問の借方1行目に、プルダウンの最初の勘定科目と金額 12,345 を入力する(正解かどうかは問わない)
    let account = '';
    await step('第1問の借方1行目で、勘定科目を選び、金額に「12,345」と入力する', '「回答済み: 1 / 50」になる', async () => {
      const select = first.getByRole('combobox', { name: '第1問 借方の勘定科目1' });
      account = (await select.locator('option').nth(1).textContent())!.trim();
      await select.selectOption(account);
      await first.getByRole('textbox', { name: '第1問 借方の金額1' }).fill('12,345');
      await expect(page.getByText('回答済み: 1 / 50')).toBeVisible();
    });

    await step('「次の問題へ」を押してから「前の問題へ」を押して戻る', '第1問の借方1行目に、選んだ勘定科目と「12,345」が残っている', async () => {
      await page.getByRole('button', { name: '次の問題へ' }).click();
      await expect(page.getByText('第 3 問 / 全 50 問')).toBeVisible();
      await page.getByRole('button', { name: '前の問題へ' }).click();
      await expect(page.getByRole('combobox', { name: '第1問 借方の勘定科目1' })).toHaveValue(account);
      await expect(page.getByRole('textbox', { name: '第1問 借方の金額1' })).toHaveValue('12,345');
    });

    const firstResult = page.locator('.review-card').first();
    await step('「終了する」→「終了して採点する」を押す', '第1問(仕訳入力)に、入力した仕訳の表(あなたの回答)と正解の仕訳の表が表示される', async () => {
      await page.getByRole('button', { name: '終了する' }).click();
      await page.getByRole('button', { name: '終了して採点する' }).click();
      await expect(page.getByText(/正解数: \d+ \/ 50 問/)).toBeVisible();
      await expect(firstResult.getByText('あなたの回答：')).toBeVisible();
      const tables = firstResult.locator('app-journal-table');
      await expect(tables).toHaveCount(2);
      await expect(tables.first()).toContainText(account);
      await expect(tables.first()).toContainText('12,345');
      await expect(tables.nth(1).locator('tbody tr').first()).toBeVisible();
    }, { focus: () => firstResult });

    await step('科目一覧(/study)を開き、「直近の模擬試験」の先頭の回の「詳細」を押し、1問目を開く', '入力した仕訳と正解の仕訳の表が表示される', async () => {
      await page.goto('/study');
      const latest = page.locator('section', { has: page.getByRole('heading', { name: /直近\d+回の模擬試験/ }) }).locator('tbody tr').first();
      await expect(latest).toContainText(SUBJECT);
      await latest.getByRole('button', { name: /詳細/ }).click();
      const dialog = page.getByRole('dialog');
      await dialog.locator('.q-row').first().click();
      const tables = dialog.locator('app-journal-table');
      await expect(tables).toHaveCount(2);
      await expect(tables.first()).toContainText(account);
      await expect(tables.first()).toContainText('12,345');
    }, { focus: () => page.getByRole('dialog') });
  }
);
