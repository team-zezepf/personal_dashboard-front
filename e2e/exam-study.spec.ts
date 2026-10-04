import { chooseFirstChoices } from './support/exam';
import { caseOf, expect, loginAsE2E, startSteps, test } from './support/evidence';

test(
  'E2E-04 練習を最後まで解くと、結果画面に正解数が出る',
  caseOf({
    precondition: ['sandbox が起動している', 'E2E 専用のアカウントでログインしている', '基本情報技術者試験（科目A）の問題データがある'],
    expected: ['2問ずつ回答するたびに、正誤と解説が表示される', '10問を解き終えると「お疲れさまでした！」と正解数(x / 10 問)が表示される']
  }),
  async ({ page }) => {
    const step = startSteps(page);
    await loginAsE2E(page, step);

    await step('基本情報技術者試験（科目A）の練習の画面を開き、「学習を始める」を押す', '第1問が表示される(全10問)', async () => {
      await page.goto('/study/kihonjoho');
      await page.getByRole('button', { name: '学習を始める' }).click();
      await expect(page.getByText('第 1 問 / 全 10 問')).toBeVisible();
    });

    for (let round = 1; round <= 5; round++) {
      await step(`${round * 2 - 1}〜${round * 2}問目で最初の選択肢を選び、「回答する」を押す`, '正誤と解説が表示される', async () => {
        await chooseFirstChoices(page);
        await page.getByRole('button', { name: '回答する' }).click();
        await expect(page.getByText('解説').first()).toBeVisible();
      });

      const isLast = round === 5;
      await step(
        isLast ? '「結果を見る」を押す' : '「次の問題へ」を押す',
        isLast ? '「お疲れさまでした！」と正解数が表示される' : `${round * 2 + 1}問目が表示される`,
        async () => {
          await page.getByRole('button', { name: isLast ? '結果を見る' : '次の問題へ' }).click();
          if (isLast) {
            await expect(page.getByRole('heading', { name: 'お疲れさまでした！' })).toBeVisible();
            await expect(page.getByText(/正解数：\d+ \/ 10 問/)).toBeVisible();
          } else {
            await expect(page.getByText(`第 ${round * 2 + 1} 問 / 全 10 問`)).toBeVisible();
          }
        }
      );
    }
  }
);
