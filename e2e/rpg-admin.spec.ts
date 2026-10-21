import { Page } from '@playwright/test';
import { API_URL, E2E_ADMIN_ACCOUNT } from './support/env';
import { caseOf, expect, loginAsE2E, startSteps, test } from './support/evidence';

// 管理者のアカウントのRPGのセーブデータを、最初の状態(始まりの草原の村・30G・回復薬×3)に戻す
async function resetAdminRpgSave(extraItems: { itemId: string; count: number }[] = []): Promise<void> {
  const login = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: E2E_ADMIN_ACCOUNT.email, password: E2E_ADMIN_ACCOUNT.password })
  });
  const { token } = (await login.json()) as { token: string };
  const res = await fetch(`${API_URL}/graphql`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: 'mutation($input: RpgSaveInput!) { saveRpg(input: $input) { level } }',
      variables: {
        input: {
          level: 1, exp: 0, hp: 50, gold: 30, weapon: 'wood_sword', armor: 'cloth',
          items: [{ itemId: 'potion', count: 3 }, { itemId: 'wood_sword', count: 1 }, { itemId: 'cloth', count: 1 }, ...extraItems],
          area: 'plain', x: 6, y: 7, stats: { hp: 0, atk: 0, def: 0, mag: 0, spd: 0, luk: 0 }, statPoints: 0, quests: [],
          respawn: { area: 'plain', x: 6, y: 7 }
        }
      }
    })
  });
  const body = (await res.json()) as { errors?: unknown };
  if (body.errors) throw new Error(`GraphQL のエラー: ${JSON.stringify(body.errors)}`);
}

// キャンバスの中の村人をクリックする(位置は開発用のビルドだけで出す window.rpgTest から求める)
async function clickNpc(page: Page, name: string): Promise<void> {
  await expect.poll(() => page.evaluate(() => (window as any).rpgTest?.isIdle())).toBe(true);
  const position = await page.evaluate((n) => (window as any).rpgTest.npcPosition(n) as [number, number], name);
  const box = (await page.getByLabel('RPGのゲーム画面').boundingBox())!;
  await page.mouse.click(box.x + position[0], box.y + position[1] - 25);
}

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

test(
  'E2E-20 RPGマップ作成の「アイテム」タブで回復の道具を作って道具屋で売ると、ゲームの道具屋で買え、消すと持ち物からもなくなる',
  caseOf({
    precondition: [
      'sandbox が起動している',
      'E2E 専用の管理者のアカウントでログインしている(global-setup で作り、管理者にする。front#341)',
      'E2E 用の RPG データで、アイテムは最初のアイテムのまま(道具屋で売るのは回復薬〜魔法の鎧の9つ)',
      '管理者のアカウントの RPG のセーブデータを、最初の状態(30G・回復薬×3)に戻してある'
    ],
    expected: [
      '「🎒 アイテム」タブを開くと、回復の道具・武器・防具・素材に分かれた一覧と、道具屋での見え方が出る',
      '「＋ 新しいアイテム」で作り、名前・回復量・道具屋で売る・値段を入れると、チェックが ✅ になり、道具屋での見え方のいちばん下に並ぶ',
      '保存すると「アイテムを保存しました」と出て、APIが決めたID(item1)になる',
      'ゲーム(/rpg)の道具屋 ミナに、作ったアイテムが 15G で並び、買うと 15G になって持ち物に入る',
      '「アイテム」タブで作ったアイテムを消すと、一覧から消え、ゲームの持ち物からもなくなる'
    ]
  }),
  async ({ page }) => {
    const step = startSteps(page);
    await resetAdminRpgSave();
    await loginAsE2E(page, step, true);
    const tab = page.locator('app-rpg-item-page');
    const shop = tab.getByRole('region', { name: '道具屋での見え方' });
    const name = '[E2E]特製回復薬';

    await step('RPGマップ作成(/rpg/admin)を開き、「🎒 アイテム」タブを押す', '回復の道具・武器・防具・素材の一覧と、道具屋での見え方(回復薬〜魔法の鎧の9つ)が出る', async () => {
      await page.goto('/rpg/admin');
      await page.getByRole('tab', { name: '🎒 アイテム' }).click();
      for (const group of ['回復の道具（2）', '武器（', '防具（', '素材（23）']) await expect(tab.getByText(group).first()).toBeVisible();
      await expect(shop.locator('.shop-row')).toHaveCount(9);
      await expect(shop.locator('.shop-row').first()).toContainText('回復薬');
    });

    await step(
      `「＋ 新しいアイテム」を押し、名前に「${name}」、回復量に 60、説明に「HPを60回復」を入れ、「道具屋で売る」にチェックして値段を 15 にする`,
      'チェックが「✅ 問題はありません」になり、道具屋での見え方のいちばん下に 15 G で並ぶ',
      async () => {
        await tab.getByRole('button', { name: '＋ 新しいアイテム' }).click();
        const props = tab.getByRole('complementary', { name: 'アイテム', exact: true });
        await props.getByLabel('名前').fill(name);
        await props.getByLabel('回復量').fill('60');
        await props.getByLabel(/説明/).fill('HPを60回復');
        await props.getByLabel('道具屋で売る').check();
        await props.getByLabel(/値段/).fill('15');
        await expect(props.getByText('✅ 問題はありません')).toBeVisible();
        await expect(shop.locator('.shop-row')).toHaveCount(10);
        await expect(shop.locator('.shop-row').last()).toContainText(name);
        await expect(shop.locator('.shop-row').last()).toContainText('15 G');
      }
    );

    await step('「アイテムを保存する」を押す', '「アイテムを保存しました」と出て、IDが item1 になる', async () => {
      await tab.getByRole('button', { name: 'アイテムを保存する' }).click();
      await expect(tab.getByRole('status')).toHaveText('アイテムを保存しました');
      await expect(tab.getByText('ID: item1')).toBeVisible();
      await expect(tab.getByText('● 保存していない変更があります')).toBeHidden();
    });

    await step('RPG(/rpg)を開き、「道具屋 ミナ」に話しかけて、作ったアイテムを買う', `道具屋に「${name}」が 15 G で並び、買うと 15G になって持ち物に入る`, async () => {
      await page.goto('/rpg');
      const status = page.getByRole('region', { name: 'プレイヤーの状態' });
      await expect(status.getByText('30G')).toBeVisible();
      await clickNpc(page, '道具屋 ミナ');
      const dialog = page.getByRole('dialog', { name: '道具屋 ミナとの会話' });
      await dialog.click();
      await dialog.click();
      await page.getByRole('button', { name: `${name}を買う` }).click();
      await expect(status.getByText('15G')).toBeVisible();
      await page.getByRole('button', { name: '閉じる' }).click();
      await expect(page.getByRole('region', { name: '持ち物' }).getByText(name)).toBeVisible();
    });

    await step('RPGマップ作成の「🎒 アイテム」タブで作ったアイテムを選び、「🗑 このアイテムを消す」を押して確認で OK を押す', '1人が持っていると確認が出て、消すと一覧から消える', async () => {
      await page.goto('/rpg/admin');
      await page.getByRole('tab', { name: '🎒 アイテム' }).click();
      await tab.locator('.item-row', { hasText: name }).click();
      await expect(tab.getByText('いま 1人 が持っています。').first()).toBeVisible();
      let confirmText = '';
      // 確認は startSteps が OK にする。ここでは文言だけ読む
      page.once('dialog', (d) => (confirmText = d.message()));
      await tab.getByRole('button', { name: '🗑 このアイテムを消す' }).click();
      await expect(tab.getByRole('status')).toHaveText(`「${name}」を消しました`);
      expect(confirmText).toContain('1人が持っています');
      await expect(shop.locator('.shop-row')).toHaveCount(9);
    });

    await step('RPG(/rpg)を開き直す', `持ち物に「${name}」がない`, async () => {
      await page.goto('/rpg');
      await expect(page.getByRole('region', { name: 'プレイヤーの状態' }).getByText('15G')).toBeVisible();
      await expect(page.getByRole('region', { name: '持ち物' }).getByText(name)).toHaveCount(0);
    });
  }
);

// 1×1 の PNG(アイテムの画像のアップロードに使う。front#345)
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

test(
  'E2E-21 RPGマップ作成でアイテムに画像を設定すると、保存したときにアップロードされ、ゲームの道具屋・持ち物に画像で出て、外すと絵文字に戻る(合成の装備は保存しなければアップロードされない)',
  caseOf({
    precondition: [
      'sandbox が起動している',
      'E2E 専用の管理者のアカウントでログインしている',
      'E2E 用の RPG データで、アイテム・合成の装備はどれも画像なし(絵文字)',
      '管理者のアカウントの RPG のセーブデータを、最初の状態に上回復薬×1 を足した状態にしてある'
    ],
    expected: [
      '「🎒 アイテム」タブで上回復薬に画像を選ぶと、プレビュー・一覧・道具屋での見え方が画像になる。この時点ではまだアップロードしない(front#347)',
      '「アイテムを保存する」を押すと、画像を1回アップロードしてから保存し、表示が API の画像(/rpg-item-images/…)になる',
      '「⚒️ 合成」タブでゼリーの服に画像を選ぶと、編集欄のプレビューと鍛冶屋での見え方が画像になる。保存せずにほかの画面へ移ると、アップロードされない(E2E 用のデータは合成の装備が ⛔ で保存できないため、保存しない場合だけ確かめる)',
      'ゲーム(/rpg)の道具屋・持ち物の上回復薬が画像で出る(絵文字ではない)',
      '「画像を外す」で保存すると、上回復薬は絵文字に戻り、使われなくなった画像ファイルは配られなくなる(API が消す)'
    ]
  }),
  async ({ page }) => {
    const step = startSteps(page);
    await resetAdminRpgSave([{ itemId: 'hipotion', count: 1 }]);
    await loginAsE2E(page, step, true);
    const itemTab = page.locator('app-rpg-item-page');
    const craftTab = page.locator('app-rpg-craft-page');
    let imageSrc = '';
    // 画像のアップロード(POST /api/rpg-item-images)の回数
    let uploads = 0;
    page.on('request', (req) => {
      if (req.method() === 'POST' && req.url().includes('/api/rpg-item-images')) uploads++;
    });

    await step('RPGマップ作成の「🎒 アイテム」タブで「上回復薬」を選び、「画像を選ぶ」で PNG を選ぶ', 'プレビュー・一覧・道具屋での見え方が、選んだ画像(ブラウザの中のプレビュー)になる。まだアップロードしない', async () => {
      await page.goto('/rpg/admin');
      await page.getByRole('tab', { name: '🎒 アイテム' }).click();
      await itemTab.locator('.item-row', { hasText: '上回復薬' }).click();
      await itemTab.getByLabel('画像のファイル').setInputFiles({ name: 'potion.png', mimeType: 'image/png', buffer: PNG });
      const preview = itemTab.locator('.image-preview img');
      await expect(preview).toHaveAttribute('src', /^blob:/);
      const blobSrc = (await preview.getAttribute('src'))!;
      await expect(itemTab.locator('.item-row', { hasText: '上回復薬' }).locator('img')).toHaveAttribute('src', blobSrc);
      await expect(itemTab.locator('.shop-row', { hasText: '上回復薬' }).locator('img')).toHaveAttribute('src', blobSrc);
      expect(uploads).toBe(0);
    });

    await step('「アイテムを保存する」を押す', '画像を1回アップロードして保存し、「アイテムを保存しました」と出て、表示が API の画像(/rpg-item-images/…)になる', async () => {
      await itemTab.getByRole('button', { name: 'アイテムを保存する' }).click();
      await expect(itemTab.getByRole('status')).toHaveText('アイテムを保存しました');
      const preview = itemTab.locator('.image-preview img');
      await expect(preview).toHaveAttribute('src', /\/rpg-item-images\/[0-9a-f-]+\.png$/);
      imageSrc = (await preview.getAttribute('src'))!;
      await expect(itemTab.locator('.item-row', { hasText: '上回復薬' }).locator('img')).toHaveAttribute('src', imageSrc);
      expect(uploads).toBe(1);
    });

    await step('「⚒️ 合成」タブで「ゼリーの服」を選び、「画像を選ぶ」で PNG を選ぶ', '編集欄のプレビューと、鍛冶屋での見え方のゼリーの服が画像になる。アップロードはしない', async () => {
      await page.getByRole('tab', { name: '⚒️ 合成' }).click();
      await craftTab.locator('.craft-row', { hasText: 'ゼリーの服' }).first().click();
      await craftTab.getByLabel('画像のファイル').setInputFiles({ name: 'robe.png', mimeType: 'image/png', buffer: PNG });
      await expect(craftTab.locator('.image-preview img')).toHaveAttribute('src', /^blob:/);
      await expect(craftTab.locator('.smith-row', { hasText: 'ゼリーの服' }).first().locator('.smith-icon img')).toBeVisible();
      expect(uploads).toBe(1);
    });

    await step('保存せずに RPG(/rpg)を開き、持ち物を見てから「道具屋 ミナ」に話しかける', 'ゼリーの服の画像はアップロードされない(アップロードは上回復薬の1回だけ)。持ち物・道具屋の上回復薬が画像で出る', async () => {
      await page.goto('/rpg');
      expect(uploads).toBe(1);
      await expect(page.getByRole('region', { name: '持ち物' }).locator('.inv-row', { hasText: '上回復薬' }).locator('img')).toHaveAttribute('src', imageSrc);
      await clickNpc(page, '道具屋 ミナ');
      const shopTalk = page.getByRole('dialog', { name: '道具屋 ミナとの会話' });
      await shopTalk.click();
      await shopTalk.click();
      await expect(page.locator('.shop-row', { hasText: '上回復薬' }).locator('.shop-icon img')).toHaveAttribute('src', imageSrc);
      await page.getByRole('button', { name: '閉じる' }).click();
    });

    await step('RPGマップ作成の「🎒 アイテム」タブで上回復薬の「画像を外す」を押して保存する', '上回復薬が絵文字(⚗️)に戻り、使われなくなった画像は配られなくなる', async () => {
      await page.goto('/rpg/admin');
      await page.getByRole('tab', { name: '🎒 アイテム' }).click();
      await itemTab.locator('.item-row', { hasText: '上回復薬' }).click();
      await itemTab.getByRole('button', { name: '画像を外す（絵文字に戻す）' }).click();
      await itemTab.getByRole('button', { name: 'アイテムを保存する' }).click();
      await expect(itemTab.getByRole('status')).toHaveText('アイテムを保存しました');
      await expect(itemTab.locator('.item-row', { hasText: '上回復薬' }).locator('img')).toHaveCount(0);
      await expect(itemTab.locator('.item-row', { hasText: '上回復薬' })).toContainText('⚗️');
      expect((await page.request.get(imageSrc)).status()).toBe(404);
    });
  }
);
