import { Page } from '@playwright/test';
import { API_URL, E2E_ACCOUNT } from './support/env';
import { caseOf, expect, loginAsE2E, startSteps, test } from './support/evidence';

// 前回の実行の続きにならないよう、セーブデータを最初の状態(始まりの草原の村・30G・回復薬×3)に戻す。
// ポイント交換で使う10ptも足しておく(交換で同じだけ減るので、実行のたびに増え続けない)
async function resetRpg(): Promise<void> {
  const login = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: E2E_ACCOUNT.email, password: E2E_ACCOUNT.password })
  });
  const { token } = (await login.json()) as { token: string };
  const graphql = async (query: string, variables: Record<string, unknown>) => {
    const res = await fetch(`${API_URL}/graphql`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables })
    });
    const body = (await res.json()) as { errors?: unknown };
    if (body.errors) throw new Error(`GraphQL のエラー: ${JSON.stringify(body.errors)}`);
  };
  await graphql('mutation($input: RpgSaveInput!) { saveRpg(input: $input) { level } }', {
    input: {
      level: 1, exp: 0, hp: 50, gold: 30, weapon: 'wood_sword', armor: 'cloth',
      items: [{ itemId: 'potion', count: 3 }, { itemId: 'wood_sword', count: 1 }, { itemId: 'cloth', count: 1 }],
      area: 'plain', x: 6, y: 7
    }
  });
  await graphql('mutation($amount: Int!, $reason: String) { addPoints(amount: $amount, reason: $reason) { id } }', {
    amount: 10,
    reason: 'E2E RPGのポイント交換用'
  });
}

// キャンバスの中の村人をクリックする(位置は画面が開発用のビルドのときだけ出す window.rpgTest から求める)
async function clickNpc(page: Page, name: string): Promise<void> {
  await expect.poll(() => page.evaluate(() => (window as any).rpgTest?.isIdle())).toBe(true);
  const position = await page.evaluate((n) => (window as any).rpgTest.npcPosition(n) as [number, number], name);
  const box = (await page.getByLabel('RPGのゲーム画面').boundingBox())!;
  // 足元より少し上(体のあたり)をクリックする
  await page.mouse.click(box.x + position[0], box.y + position[1] - 25);
}

async function headerPoints(page: Page): Promise<number> {
  const text = await page.getByTitle('累計ポイント').innerText();
  return Number(text.replace(/[^0-9]/g, ''));
}

test(
  'E2E-08 RPGで、ポイント交換・買い物・装備をして、画面を開き直しても残っている',
  caseOf({
    precondition: ['sandbox が起動している', 'E2E 専用のアカウントでログインしている', 'RPGのセーブデータを最初の状態に戻し、10ptを足してある'],
    expected: [
      'RPG(/rpg)を開くと、始まりの草原の村から Lv 1・30G・回復薬×3 で始まる',
      '交換所の人に話しかけると、会話のあとにポイント交換所が開く。100ゴールドと交換すると 130G になり、ヘッダーのポイントが10減る',
      '道具屋の人に話しかけると、会話のあとに道具屋が開く。銅の剣を買うと 85G になり、持ち物に入る',
      '銅の剣を装備すると、装備欄が銅の剣になり、攻撃が上がる',
      'ほかの画面に移ってからRPGを開き直しても、ゴールドと装備が残っている(画面を離れるときに保存される)'
    ]
  }),
  async ({ page }) => {
    const step = startSteps(page);
    await resetRpg();
    await loginAsE2E(page, step);
    const status = page.getByRole('region', { name: 'ステータス' });
    const equipment = page.getByRole('region', { name: '装備' });
    const items = page.getByRole('region', { name: '持ち物' });
    let pointsBefore = 0;

    await step('RPG(/rpg)を開く', '始まりの草原の村から、Lv 1・30G・回復薬×3・木の剣を装備した状態で始まる', async () => {
      await page.goto('/rpg');
      // 左上のエリア名(入った直後は、画面の中央にも大きく出る)
      await expect(page.getByText('始まりの草原', { exact: true }).first()).toBeVisible();
      await expect(status.getByText('Lv 1')).toBeVisible();
      await expect(status.getByText('30G')).toBeVisible();
      await expect(items.getByText('×3')).toBeVisible();
      await expect(equipment.getByText('木の剣')).toBeVisible();
      pointsBefore = await headerPoints(page);
    });

    await step('「交換所 ステラ」をクリックし、会話をクリックで進める', '会話が出て、最後まで進めるとポイント交換所が開く', async () => {
      await clickNpc(page, '交換所 ステラ');
      const dialog = page.getByRole('dialog', { name: '交換所 ステラとの会話' });
      await expect(dialog).toContainText('ここはポイント交換所。');
      await dialog.click();
      await dialog.click();
      await expect(page.getByRole('dialog', { name: 'ポイント交換所' })).toBeVisible();
    });

    await step('「100ゴールド」の「交換する」を押す', 'ゴールドが 130G になり、ヘッダーのポイントが10減る', async () => {
      await page.getByRole('button', { name: '100ゴールドを交換する' }).click();
      await expect(status.getByText('130G')).toBeVisible();
      await expect.poll(() => headerPoints(page)).toBe(pointsBefore - 10);
      await page.getByRole('button', { name: '閉じる' }).click();
    });

    await step('「道具屋 ミナ」に話しかけ、「銅の剣」を買う', '道具屋が開き、買うと 85G になって持ち物に銅の剣が入る', async () => {
      await clickNpc(page, '道具屋 ミナ');
      const dialog = page.getByRole('dialog', { name: '道具屋 ミナとの会話' });
      await expect(dialog).toContainText('道具屋だよ');
      await dialog.click();
      await dialog.click();
      await page.getByRole('button', { name: '銅の剣を買う' }).click();
      await expect(status.getByText('85G')).toBeVisible();
      await expect(page.getByRole('button', { name: '銅の剣を持っている' })).toBeDisabled();
      await page.getByRole('button', { name: '閉じる' }).click();
    });

    await step('持ち物の銅の剣の「装備する」を押す', '装備欄の武器が銅の剣になり、攻撃が 8 から 12 に上がる', async () => {
      await expect(status.getByText('8', { exact: true })).toBeVisible();
      await page.getByRole('button', { name: '銅の剣を装備する' }).click();
      await expect(equipment.getByText('銅の剣')).toBeVisible();
      await expect(status.getByText('12', { exact: true })).toBeVisible();
    });

    await step('ダッシュボードへ移ってから、RPG(/rpg)を開き直す', '85G のままで、銅の剣を装備している', async () => {
      await page.goto('/');
      await page.getByRole('heading', { name: 'カレンダー' }).waitFor();
      await page.goto('/rpg');
      await expect(status.getByText('85G')).toBeVisible();
      await expect(equipment.getByText('銅の剣')).toBeVisible();
      await expect(items.getByText('装備中').first()).toBeVisible();
    });
  }
);
