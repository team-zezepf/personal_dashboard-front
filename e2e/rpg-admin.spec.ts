import { Page } from '@playwright/test';
import { caseOf, expect, loginAsE2E, startSteps, test } from './support/evidence';

// マップのマス(x, y)の上の面の中心をクリックする(位置は開発用のビルドだけで出す window.rpgAdminTest から求める)
async function clickTile(page: Page, x: number, y: number): Promise<void> {
  await expect.poll(() => page.evaluate(() => !!(window as any).rpgAdminTest)).toBe(true);
  const [sx, sy] = (await page.evaluate(([tx, ty]) => (window as any).rpgAdminTest.tilePosition(tx, ty), [x, y])) as [number, number];
  const box = (await page.getByLabel('マップ', { exact: true }).boundingBox())!;
  await page.mouse.click(box.x + sx, box.y + sy);
}

test(
  'E2E-19 RPGマップ作成で、置いた置物の設定のモーダルのチェックボックスを切り替えられ、背景をクリックすると閉じる',
  caseOf({
    precondition: [
      'sandbox が起動している',
      'E2E 専用の管理者のアカウントでログインしている(global-setup で作り、管理者にする。front#341)',
      'E2E 用の RPG データで、村の (4, 7) に木のおけを置いてある(色合いは種類のデフォルトのまま)'
    ],
    expected: [
      '木のおけをクリックすると、設定のモーダルが開き、色合いの「デフォルトのまま」にチェックが付いている',
      '「デフォルトのまま」を押すとチェックが外れ、もう一度押すとまた付く(front#341 の不具合: 外せなかった)',
      '「クリック時にメッセージを表示する」を押すとチェックが付き、メッセージの欄が出る',
      'モーダルの外側(背景)をクリックすると、保存せずにモーダルが閉じる'
    ]
  }),
  async ({ page }) => {
    const step = startSteps(page);
    await loginAsE2E(page, step, true);
    const dialog = page.getByRole('dialog', { name: '木のおけ' });

    await step('RPGマップ作成(/rpg/admin)を開き、パレットの「その他」の「選ぶ・動かす」を選んで、村の (4, 7) の木のおけをクリックする', '設定のモーダルが開き、色合いの「デフォルトのまま」にチェックが付いている', async () => {
      await page.goto('/rpg/admin');
      // 何も置かず、置いてある物を選ぶ道具にする
      await page.locator('aside.palette').getByRole('button', { name: 'その他', exact: true }).click();
      await page.locator('aside.palette').getByRole('button', { name: /選ぶ・動かす/ }).click();
      await clickTile(page, 4, 7);
      await expect(dialog).toBeVisible();
      await expect(dialog.getByRole('heading', { name: /色合い/ }).getByRole('checkbox', { name: 'デフォルトのまま' })).toBeChecked();
    });

    await step('色合いの「デフォルトのまま」を押し、もう一度押す', '1回目でチェックが外れ、2回目でまた付く', async () => {
      const keep = dialog.getByRole('heading', { name: /色合い/ }).getByRole('checkbox', { name: 'デフォルトのまま' });
      await keep.click();
      await expect(keep).not.toBeChecked();
      await keep.click();
      await expect(keep).toBeChecked();
    });

    await step('「クリック時にメッセージを表示する」を押す', 'チェックが付き、メッセージの欄が出る', async () => {
      const show = dialog.getByRole('checkbox', { name: 'クリック時にメッセージを表示する' });
      await show.click();
      await expect(show).toBeChecked();
      await expect(dialog.getByLabel('メッセージ', { exact: true })).toBeVisible();
    });

    await step('モーダルの外側(画面の左上のあたり)をクリックする', 'モーダルが閉じる', async () => {
      await page.mouse.click(10, 10);
      await expect(dialog).toBeHidden();
    });
  }
);
