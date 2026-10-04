import { chooseFirstChoices } from './support/exam';
import { caseOf, expect, loginAsE2E, startSteps, test } from './support/evidence';

const SUBJECT = '基本情報技術者試験（科目A）';

test(
  'E2E-05 模擬試験を終了すると合否と正解数が出て、受験記録に残る',
  caseOf({
    precondition: ['sandbox が起動している', 'E2E 専用のアカウントでログインしている', `${SUBJECT}の問題データがある`],
    expected: [
      '開始すると、残り時間と回答済みの数(0 / 60)が表示される',
      '終了の確認で、未回答の問題の数が表示される',
      '終了すると、合格・不合格と正解数(x / 60 問)が表示される',
      '科目一覧の「直近の模擬試験」の先頭に、今回の回が同じ正解数・合否で表示される'
    ]
  }),
  async ({ page }) => {
    const step = startSteps(page);
    await loginAsE2E(page, step);

    await step(`${SUBJECT}の模擬試験の画面を開き、「模擬試験を開始する」を押す`, '残り時間と「回答済み: 0 / 60」が表示される', async () => {
      await page.goto('/study/kihonjoho/mock-exam');
      await page.getByRole('button', { name: '模擬試験を開始する' }).click();
      await expect(page.getByText('回答済み: 0 / 60')).toBeVisible();
      await expect(page.getByText(/\d{2}:\d{2}/).first()).toBeVisible();
    });

    await step('表示中の2問で、それぞれ最初の選択肢を選ぶ', '「回答済み: 2 / 60」になる', async () => {
      await chooseFirstChoices(page);
      await expect(page.getByText('回答済み: 2 / 60')).toBeVisible();
    });

    await step('「終了する」を押す', '終了の確認が出て、未回答の問題が58問あると表示される', async () => {
      await page.getByRole('button', { name: '終了する' }).click();
      await expect(page.getByRole('heading', { name: '模擬試験を終了しますか？' })).toBeVisible();
      await expect(page.getByText('未回答の問題が58問あります')).toBeVisible();
    });

    let correctCount = '';
    let verdict = '';
    await step('「終了して採点する」を押す', '合格・不合格と、正解数(x / 60 問)が表示される', async () => {
      await page.getByRole('button', { name: '終了して採点する' }).click();
      const score = page.getByText(/正解数: \d+ \/ 60 問/);
      await expect(score).toBeVisible();
      correctCount = (await score.textContent())!.match(/正解数: (\d+)/)![1];
      verdict = (await page.locator('.result-label').textContent())!.trim();
      expect(['合格', '不合格']).toContain(verdict);
    });

    await step('科目一覧(/study)を開く', `「直近の模擬試験」の先頭が今回の回(${SUBJECT}・同じ正解数・同じ合否)になっている`, async () => {
      await page.goto('/study');
      const latest = page.locator('section', { has: page.getByRole('heading', { name: /直近\d+回の模擬試験/ }) }).locator('tbody tr').first();
      await expect(latest).toContainText(SUBJECT);
      // 得点は「12/60 (20%)」の形で表示される
      await expect(latest).toContainText(`${correctCount}/60`);
      await expect(latest).toContainText(verdict);
    }, { focus: () => page.getByRole('heading', { name: /直近\d+回の模擬試験/ }) });
  }
);
