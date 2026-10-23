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
      'E2E 用の RPG データで、アイテムは最初のアイテムのまま(道具屋で売るのは回復薬〜魔法の鎧・いのちの羽の10)',
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

    await step('RPGマップ作成(/rpg/admin)を開き、「🎒 アイテム」タブを押す', '回復の道具・武器・防具・素材の一覧と、道具屋での見え方(回復薬〜魔法の鎧・いのちの羽の10)が出る', async () => {
      await page.goto('/rpg/admin');
      await page.getByRole('tab', { name: '🎒 アイテム' }).click();
      for (const group of ['回復の道具（2）', '武器（', '防具（', '素材（23）']) await expect(tab.getByText(group).first()).toBeVisible();
      await expect(shop.locator('.shop-row')).toHaveCount(10);
      await expect(shop.locator('.shop-row').first()).toContainText('回復薬');
    });

    await step(
      `「＋ 新しいアイテム」を押し、名前に「${name}」、回復量に 60、説明に「HPを60回復」を入れ、「道具屋で売る」にチェックして値段を 15 にする`,
      'チェックが「✅ 問題はありません」になり、道具屋での見え方のいちばん下に 15 G で並ぶ',
      async () => {
        await tab.getByRole('button', { name: '＋ 新しいアイテム' }).click();
        const props = tab.getByRole('complementary', { name: 'アイテム', exact: true });
        await props.getByLabel('名前', { exact: true }).fill(name);
        await props.getByLabel('回復量').fill('60');
        await props.getByLabel(/説明/).fill('HPを60回復');
        await props.getByLabel('道具屋で売る').check();
        await props.getByLabel(/値段/).fill('15');
        await expect(props.getByText('✅ 問題はありません')).toBeVisible();
        await expect(shop.locator('.shop-row')).toHaveCount(11);
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
      await expect(shop.locator('.shop-row')).toHaveCount(10);
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

test(
  'E2E-22 RPGマップ作成の「敵」タブで、一覧の経験値・HP・攻撃・防御をそのまま書き換えて保存でき、並び替えのドラッグも今までどおりできる',
  caseOf({
    precondition: [
      'sandbox が起動している',
      'E2E 専用の管理者のアカウントでログインしている(global-setup で作り、管理者にする。front#341)',
      'E2E 用の RPG データで、敵の一覧の先頭はスライム(HP 22)、2番目はブルースライム(経験値 16・HP 50・攻撃 14・防御 5)、3番目はキノコン'
    ],
    expected: [
      '「👾 敵」タブを開くと、一覧の各行に経験値・HP・攻撃・防御の欄が出て、今の値が入っている(front#350)',
      '一覧でブルースライムの HP を書き換えると、ブルースライムが選ばれ、右の編集欄の HP も同じ値になり、行に「●」が付く',
      '右の編集欄で攻撃を書き換えると、一覧の攻撃の欄も同じ値になる',
      '一覧の欄に範囲より大きい値(HP 100000)を入れて欄から離れると、範囲内(99999)に直る',
      '「敵を保存する」で保存すると「敵を保存しました」と出て「●」が消え、読み込み直しても書き換えた値のまま',
      '数値の欄の上ではその行をドラッグできず(文字を選べる)、⠿ のあたりをつかむと今までどおり並び替えられる'
    ]
  }),
  async ({ page }) => {
    const step = startSteps(page);
    await loginAsE2E(page, step, true);
    const tab = page.locator('app-rpg-enemy-page');
    const list = tab.getByRole('complementary', { name: '敵の一覧' });
    const props = tab.locator('aside.props');
    const row = (name: string) => list.locator('.enemy-row', { has: page.getByRole('button', { name, exact: true }) });
    const openEnemyTab = async () => {
      await page.goto('/rpg/admin');
      await page.getByRole('tab', { name: '👾 敵' }).click();
      await expect(list.getByLabel('スライムのHP', { exact: true })).toHaveValue('22');
    };

    await step('RPGマップ作成(/rpg/admin)を開き、「👾 敵」タブを押す', '一覧の各行に経験値・HP・攻撃・防御の欄が出て、ブルースライムは 16・50・14・5', async () => {
      await openEnemyTab();
      await expect(list.getByLabel('ブルースライムの経験値', { exact: true })).toHaveValue('16');
      await expect(list.getByLabel('ブルースライムのHP', { exact: true })).toHaveValue('50');
      await expect(list.getByLabel('ブルースライムの攻撃', { exact: true })).toHaveValue('14');
      await expect(list.getByLabel('ブルースライムの防御', { exact: true })).toHaveValue('5');
    });

    await step('一覧のブルースライムの HP の欄に 60 を入れる', 'ブルースライムが選ばれ、右の編集欄の HP も 60 になり、行に「●」が付く', async () => {
      await list.getByLabel('ブルースライムのHP', { exact: true }).fill('60');
      await expect(list.getByRole('button', { name: 'ブルースライム', exact: true })).toHaveAttribute('aria-pressed', 'true');
      await expect(props.getByLabel('名前', { exact: true })).toHaveValue('ブルースライム');
      await expect(props.getByRole('spinbutton', { name: 'HP', exact: true })).toHaveValue('60');
      await expect(row('ブルースライム').getByTitle('保存していない変更があります')).toBeVisible();
      await expect(tab.getByText('● 保存していない変更があります')).toBeVisible();
    });

    await step('右の編集欄の攻撃に 18 を入れる', '一覧のブルースライムの攻撃の欄も 18 になる', async () => {
      await props.getByRole('spinbutton', { name: '攻撃', exact: true }).fill('18');
      await expect(list.getByLabel('ブルースライムの攻撃', { exact: true })).toHaveValue('18');
    });

    await step('一覧のスライムの HP の欄に 100000 を入れて、欄から離れる(Tab)', 'スライムが選ばれ、HP が範囲内の 99999 に直る。もう一度 22 に戻しておく', async () => {
      const hp = list.getByLabel('スライムのHP', { exact: true });
      await hp.fill('100000');
      await hp.press('Tab');
      await expect(hp).toHaveValue('99999');
      await expect(props.getByLabel('名前', { exact: true })).toHaveValue('スライム');
      await expect(props.getByRole('spinbutton', { name: 'HP', exact: true })).toHaveValue('99999');
      await hp.fill('22');
      await expect(props.getByRole('spinbutton', { name: 'HP', exact: true })).toHaveValue('22');
    });

    await step('「敵を保存する」を押し、ページを読み込み直して「👾 敵」タブを開く', '「敵を保存しました」と出て「●」が消え、読み込み直してもブルースライムは HP 60・攻撃 18', async () => {
      await tab.getByRole('button', { name: '敵を保存する' }).click();
      await expect(tab.getByRole('status')).toHaveText('敵を保存しました');
      await expect(tab.getByText('● 保存していない変更があります')).toBeHidden();
      await openEnemyTab();
      await expect(list.getByLabel('ブルースライムのHP', { exact: true })).toHaveValue('60');
      await expect(list.getByLabel('ブルースライムの攻撃', { exact: true })).toHaveValue('18');
    });

    await step('(後片付け)一覧でブルースライムを HP 50・攻撃 14 に戻して保存する', '「敵を保存しました」と出る', async () => {
      await list.getByLabel('ブルースライムのHP', { exact: true }).fill('50');
      await list.getByLabel('ブルースライムの攻撃', { exact: true }).fill('14');
      await tab.getByRole('button', { name: '敵を保存する' }).click();
      await expect(tab.getByRole('status')).toHaveText('敵を保存しました');
    });

    await step(
      'キノコンの数値の欄にポインターを乗せ、そのあと キノコンの ⠿ をつかんで、スライムの行の上半分へドラッグする(保存はしない)',
      '数値の欄の上ではキノコンの行がドラッグできない(draggable=false)。⠿ からはドラッグでき、キノコンが一覧の先頭に来て「●」が付く',
      async () => {
        await list.getByLabel('キノコンのHP', { exact: true }).hover();
        await expect(row('キノコン')).toHaveAttribute('draggable', 'false');
        await row('キノコン').locator('.grip').hover();
        await expect(row('キノコン')).toHaveAttribute('draggable', 'true');
        await row('キノコン').locator('.grip').dragTo(row('スライム'), { targetPosition: { x: 40, y: 4 } });
        await expect(list.locator('.enemy-row').first()).toContainText('キノコン');
        await expect(row('キノコン').getByTitle('保存していない変更があります')).toBeVisible();
      }
    );
  }
);

// 管理者のアカウントで、保存してある村のエリアの広さと、木のおけの位置を API から読む
async function savedVillage(): Promise<{ width: number; height: number; bucket: [number, number] | null }> {
  const login = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: E2E_ADMIN_ACCOUNT.email, password: E2E_ADMIN_ACCOUNT.password })
  });
  const { token } = (await login.json()) as { token: string };
  const res = await fetch(`${API_URL}/graphql`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: '{ rpgMaps { id width height objects { type x y } } }' })
  });
  const body = (await res.json()) as { data: { rpgMaps: { id: string; width: number; height: number; objects: { type: string; x: number; y: number }[] }[] } };
  const village = body.data.rpgMaps.find((m) => m.id === 'plain')!;
  const bucket = village.objects.find((o) => o.type === 'bucket');
  return { width: village.width, height: village.height, bucket: bucket ? [bucket.x, bucket.y] : null };
}

test(
  'E2E-23 RPGマップ作成で、マップの左上のボタンでエリアを90°回せ、元に戻せて、保存すると回したまま残る(front#353)',
  caseOf({
    precondition: [
      'sandbox が起動している',
      'E2E 専用の管理者のアカウントでログインしている(global-setup で作り、管理者にする。front#341)',
      'E2E 用の RPG データで、村(32×32)の (4, 7) に木のおけを置いてある'
    ],
    expected: [
      'マップの左上に「↺ 左に90°」「↻ 右に90°」が出る',
      '「↻ 右に90°」を押すと、確認なしですぐに回り、木のおけが (4, 7) から (24, 4) へ動く(画面で見て右回り)。「保存する」が押せるようになる',
      '木のおけをクリックして選んだあとでも、「元に戻す」を1回押すと回す前に戻り、木のおけが (4, 7) に戻る(選んだだけでは元に戻す位置ができない。front#356)',
      'もう一度右に回して保存すると「保存しました。ゲームに反映されます」と出て、API でも木のおけが (24, 4) にある',
      '読み込み直しても、木のおけは (24, 4) にある',
      '(あと片づけ)「↺ 左に90°」で回して保存すると、木のおけが (4, 7) に戻る'
    ]
  }),
  async ({ page }) => {
    const step = startSteps(page);
    await loginAsE2E(page, step, true);
    const dialog = page.getByRole('dialog', { name: '木のおけ' });
    const rotate = page.getByRole('group', { name: 'エリアを回す' });
    // (x, y) をクリックすると木のおけの設定のモーダルが開くことを確かめ、「やめる」で閉じる
    const bucketAt = async (x: number, y: number) => {
      await clickTile(page, x, y);
      await expect(dialog).toBeVisible();
      await dialog.getByRole('button', { name: 'やめる' }).click();
      await expect(dialog).toBeHidden();
    };

    await step('RPGマップ作成(/rpg/admin)を開き、パレットの「その他」の「選ぶ・動かす」を選ぶ', 'マップの左上に「↺ 左に90°」「↻ 右に90°」が出て、(4, 7) に木のおけがある', async () => {
      await page.goto('/rpg/admin');
      await page.locator('aside.palette').getByRole('button', { name: 'その他', exact: true }).click();
      await page.locator('aside.palette').getByRole('button', { name: /選ぶ・動かす/ }).click();
      await expect(rotate.getByRole('button', { name: '↺ 左に90°' })).toBeVisible();
      await expect(rotate.getByRole('button', { name: '↻ 右に90°' })).toBeVisible();
      await bucketAt(4, 7);
    });

    await step('「↻ 右に90°」を押す', '確認なしですぐに回り、木のおけが (24, 4) へ動く。「保存する」が押せる', async () => {
      await rotate.getByRole('button', { name: '↻ 右に90°' }).click();
      await expect(page.getByRole('button', { name: '保存する' })).toBeEnabled();
      await bucketAt(24, 4);
    });

    // 木のおけをクリックして選んだあと(front#356 の前は、選んだだけで元に戻す位置ができ、1回目は何も戻らなかった)
    await step('「元に戻す」を1回押す', '回す前に戻り、木のおけが (4, 7) に戻る', async () => {
      await page.getByRole('button', { name: '↶ 元に戻す' }).click();
      await bucketAt(4, 7);
    });

    await step('もう一度「↻ 右に90°」を押して「保存する」を押す', '「保存しました。ゲームに反映されます」と出て、API でも木のおけが (24, 4) にある', async () => {
      await rotate.getByRole('button', { name: '↻ 右に90°' }).click();
      await page.getByRole('button', { name: '保存する' }).click();
      await expect(page.getByText('保存しました。ゲームに反映されます')).toBeVisible();
      expect(await savedVillage()).toEqual({ width: 32, height: 32, bucket: [24, 4] });
    });

    await step('画面を読み込み直し、「選ぶ・動かす」で (24, 4) をクリックする', '木のおけの設定のモーダルが開く(回したまま残っている)', async () => {
      await page.reload();
      await page.locator('aside.palette').getByRole('button', { name: 'その他', exact: true }).click();
      await page.locator('aside.palette').getByRole('button', { name: /選ぶ・動かす/ }).click();
      await bucketAt(24, 4);
    });

    await step('(あと片づけ)「↺ 左に90°」を押して保存する', '木のおけが (4, 7) に戻り、API でも (4, 7) にある', async () => {
      await rotate.getByRole('button', { name: '↺ 左に90°' }).click();
      await bucketAt(4, 7);
      await page.getByRole('button', { name: '保存する' }).click();
      await expect(page.getByText('保存しました。ゲームに反映されます')).toBeVisible();
      expect(await savedVillage()).toEqual({ width: 32, height: 32, bucket: [4, 7] });
    });
  }
);
