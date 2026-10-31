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
      '売値(front#379)が空なら道具屋の値段の半分を案内し、道具屋の値段以上にすると注意が出る',
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

    await step('RPGマップ作成(/rpg/admin)を開き、「🎒 アイテム」タブを押す', '回復の道具・武器・防具・素材・魔法書の一覧と、道具屋での見え方(回復薬〜魔法の鎧・いのちの羽・魔法の水・魔法書3つの14。front#383)が出る', async () => {
      await page.goto('/rpg/admin');
      await page.getByRole('tab', { name: '🎒 アイテム' }).click();
      for (const group of ['回復の道具（3）', '武器（', '防具（', '素材（23）', '魔法書（6）']) await expect(tab.getByText(group).first()).toBeVisible();
      await expect(shop.locator('.shop-row')).toHaveCount(14);
      await expect(shop.locator('.shop-row').first()).toContainText('回復薬');
    });

    await step(
      `「＋ 新しいアイテム」を押し、名前に「${name}」、HPの回復量に 60、説明に「HPを60回復」を入れ、「道具屋で売る」にチェックして値段を 15 にする`,
      'チェックが「✅ 問題はありません」になり、道具屋での見え方のいちばん下に 15 G で並ぶ',
      async () => {
        await tab.getByRole('button', { name: '＋ 新しいアイテム' }).click();
        const props = tab.getByRole('complementary', { name: 'アイテム', exact: true });
        await props.getByLabel('名前', { exact: true }).fill(name);
        // 回復の道具の回復量は「HPの回復量」(MPの回復量と分けた。front#383)
        await props.getByLabel('HPの回復量').fill('60');
        await props.getByLabel(/説明/).fill('HPを60回復');
        await props.getByLabel('道具屋で売る').check();
        await props.getByLabel(/値段/).fill('15');
        await expect(props.getByText('✅ 問題はありません')).toBeVisible();
        await expect(shop.locator('.shop-row')).toHaveCount(15);
        await expect(shop.locator('.shop-row').last()).toContainText(name);
        await expect(shop.locator('.shop-row').last()).toContainText('15 G');
      }
    );

    await step(
      '売値(front#379)は空のまま案内を見てから、20 を入れ、次に 8 に直す',
      '空なら「空なら 7G（道具屋の値段 15G の半分）で売れます。」、20 なら道具屋の値段以上の注意が出て、8 なら「プレイヤーは 8G で売れます。」になり、チェックは ✅ に戻る',
      async () => {
        const props = tab.getByRole('complementary', { name: 'アイテム', exact: true });
        await expect(props.getByText('空なら 7G（道具屋の値段 15G の半分）で売れます。')).toBeVisible();
        await props.getByLabel('売値', { exact: true }).fill('20');
        await expect(props.getByText('売値（20G）が道具屋の値段（15G）以上なので、買って売るだけでゴールドが増えます。')).toBeVisible();
        await props.getByLabel('売値', { exact: true }).fill('8');
        await expect(props.getByText('プレイヤーは 8G で売れます。')).toBeVisible();
        await expect(props.getByText('✅ 問題はありません')).toBeVisible();
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
      await expect(shop.locator('.shop-row')).toHaveCount(14);
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

test(
  'E2E-28 ダンジョンの推奨レベルをなくし、マップ作成画面ではベースとデフォルトBGMが並び、ゲームのエリア名にも出ない(front#381)',
  caseOf({
    precondition: ['sandbox が起動している', 'E2E 専用の管理者のアカウントでログインしている', 'E2E 用の RPG データ(始まりの草原: ベース 草原)'],
    expected: [
      'マップ作成画面の「🏰 ダンジョン」の設定に「推奨レベル」の欄がなく、「ベース」と「デフォルトBGM」が横に並ぶ',
      '「＋ 新しいダンジョン」の画面にも「推奨レベル」の欄がなく、「ベース」がある',
      'ゲーム(/rpg)でエリアに入ったときのタイトルは、ダンジョン名だけで「推奨 Lv」は出ない'
    ]
  }),
  async ({ page }) => {
    const step = startSteps(page);
    await resetAdminRpgSave();
    await loginAsE2E(page, step, true);
    const settings = page.getByRole('region', { name: 'ダンジョンの設定' });

    await step('RPGマップ作成(/rpg/admin)を開き、「🏰 ダンジョン」の設定を見る', '「推奨レベル」の欄がなく、「ベース」(草原)と「デフォルトBGM」が同じ高さに横に並ぶ', async () => {
      await page.goto('/rpg/admin');
      await page.getByRole('tab', { name: '🏰 ダンジョン' }).click();
      await expect(settings.getByText('推奨レベル')).toHaveCount(0);
      const look = settings.getByLabel('ベース');
      const bgm = settings.getByLabel('デフォルトBGM');
      await expect(look.locator('option:checked')).toHaveText('草原');
      const [a, b] = [(await look.boundingBox())!, (await bgm.boundingBox())!];
      expect(Math.abs(a.y - b.y)).toBeLessThan(2);
      expect(b.x).toBeGreaterThan(a.x);
    });

    await step('「＋ 新しいダンジョン」を押し、作らずに「やめる」を押す', '「推奨レベル」の欄がなく、「ベース」がある。やめると閉じる', async () => {
      await page.getByRole('button', { name: '＋ 新しいダンジョン' }).click();
      const dialog = page.getByRole('dialog', { name: '新しいダンジョン' });
      await expect(dialog.getByLabel('ベース')).toBeVisible();
      await expect(dialog.getByText('推奨レベル')).toHaveCount(0);
      await dialog.getByRole('button', { name: 'やめる' }).click();
      await expect(dialog).toBeHidden();
    });

    await step('RPG(/rpg)を開く', 'エリア名「始まりの草原」が大きく出て、「推奨 Lv」は出ない', async () => {
      await page.goto('/rpg');
      await expect(page.getByText('始まりの草原', { exact: true }).first()).toBeVisible();
      await expect(page.getByText(/推奨 Lv/)).toHaveCount(0);
    });
  }
);

test(
  'E2E-31 RPGマップ作成の「ベース」タブで、ベースを複製して名前と装飾を変えて保存すると、ダンジョンのベースに選べ、使っていなければ消せる(front#389)',
  caseOf({
    precondition: ['sandbox が起動している', 'E2E 専用の管理者のアカウントでログインしている', 'ダンジョンのベースを何も保存していない(最初の4つ)'],
    expected: [
      '「🎨 ベース」タブに 草原・森・谷・塔 が並び、プレビューが出る。谷の装飾は「装飾2」で、色は赤(#ff5a1f)',
      '最初からあるベース(草原)は「🗑 消す」を押せない',
      '谷を選んで「＋ 新しいベース」を押すと「谷のコピー」ができる。名前を「[E2E]雪原」、装飾を「装飾3」にすると濃さの欄が出る',
      '「ベースを保存する」を押すと「ベースを保存しました」と出て、ダンジョンの設定の「ベース」の選ぶ欄に「[E2E]雪原」が増える',
      'どのダンジョンでも使っていない「[E2E]雪原」は消せ、選ぶ欄からもなくなる'
    ]
  }),
  async ({ page }) => {
    const step = startSteps(page);
    await resetAdminRpgSave();
    await loginAsE2E(page, step, true);
    const tab = page.locator('app-rpg-theme-page');
    const list = tab.getByRole('complementary', { name: 'ベースの一覧' });
    const props = tab.getByRole('complementary', { name: 'ベースの項目' });
    const name = '[E2E]雪原';

    await step('RPGマップ作成(/rpg/admin)を開き、「🎨 ベース」タブを押して「谷」を選ぶ', '草原・森・谷・塔が並び、プレビューが出る。谷の装飾は「装飾2」・赤', async () => {
      await page.goto('/rpg/admin');
      await page.getByRole('tab', { name: '🎨 ベース' }).click();
      for (const label of ['草原', '森', '谷', '塔']) await expect(list.getByRole('button', { name: new RegExp(`^${label}`) })).toBeVisible();
      await expect(tab.getByLabel('ベースのプレビュー')).toBeVisible();
      await expect(tab.getByRole('button', { name: '🗑 消す' })).toBeDisabled();
      await list.getByRole('button', { name: /^谷/ }).click();
      await expect(props.getByLabel('装飾', { exact: true })).toHaveValue('fireflies');
      await expect(props.getByLabel('装飾', { exact: true }).locator('option:checked')).toHaveText('装飾2');
      await expect(props.getByLabel('装飾の色')).toHaveValue('#ff5a1f');
    });

    await step(`「＋ 新しいベース」を押し、名前を「${name}」、装飾を「装飾3」にする`, '「谷のコピー」ができ、装飾3にすると濃さの欄が出る', async () => {
      await tab.getByRole('button', { name: '＋ 新しいベース' }).click();
      await expect(props.getByLabel('ベースの名前')).toHaveValue('谷のコピー');
      await props.getByLabel('ベースの名前').fill(name);
      await props.getByLabel('装飾', { exact: true }).selectOption('vignette');
      await expect(props.getByLabel('装飾の濃さ')).toBeVisible();
      await expect(list.getByRole('button', { name })).toBeVisible();
    });

    await step('「ベースを保存する」を押し、「🗺️ マップ」タブのダンジョンの設定を見る', '「ベースを保存しました」と出て、ダンジョンのベースの選ぶ欄に増える', async () => {
      await tab.getByRole('button', { name: 'ベースを保存する' }).click();
      await expect(tab.getByRole('status')).toHaveText('ベースを保存しました');
      await page.getByRole('tab', { name: '🗺️ マップ' }).click();
      await page.getByRole('tab', { name: '🏰 ダンジョン' }).click();
      const look = page.getByRole('region', { name: 'ダンジョンの設定' }).getByLabel('ベース');
      await expect(look.locator('option', { hasText: name })).toHaveCount(1);
    });

    await step(`「🎨 ベース」タブに戻り、「${name}」を選んで「🗑 消す」を押す`, '「消しました」と出て、ダンジョンのベースの選ぶ欄からもなくなる', async () => {
      await page.getByRole('tab', { name: '🎨 ベース' }).click();
      await list.getByRole('button', { name }).click();
      await tab.getByRole('button', { name: '🗑 消す' }).click();
      await expect(tab.getByRole('status')).toHaveText(`「${name}」を消しました`);
      await page.getByRole('tab', { name: '🗺️ マップ' }).click();
      const look = page.getByRole('region', { name: 'ダンジョンの設定' }).getByLabel('ベース');
      await expect(look.locator('option', { hasText: name })).toHaveCount(0);
    });
  }
);

// 管理者のアカウントで、保存してあるベースの木の種類(front#447)を API から読む。なければ null(広葉樹)
async function savedTreeKind(themeName: string): Promise<string | null> {
  const login = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: E2E_ADMIN_ACCOUNT.email, password: E2E_ADMIN_ACCOUNT.password })
  });
  const { token } = (await login.json()) as { token: string };
  const res = await fetch(`${API_URL}/graphql`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: '{ rpgThemes { name treeKind } }' })
  });
  const body = (await res.json()) as { data: { rpgThemes: { name: string; treeKind: string | null }[] } };
  return body.data.rpgThemes.find((x) => x.name === themeName)!.treeKind ?? null;
}

test(
  'E2E-46 RPGマップ作成の「ベース」タブで、ベースの木の種類(広葉樹・針葉樹・ヤシの木・葉なし)を選んで保存できる(front#447)',
  caseOf({
    precondition: ['sandbox が起動している', 'E2E 専用の管理者のアカウントでログインしている', 'ダンジョンのベースを何も保存していない(最初の4つ)'],
    expected: [
      '草原を選ぶと「木の種類」は「広葉樹」。選ぶ欄には 広葉樹・針葉樹・ヤシの木・葉なし が並ぶ',
      '草原を複製して名前を「[E2E]枯れ野」、木の種類を「葉なし」にすると、葉の色の欄が使えなくなり「葉なしでは、葉の色は使いません。」と出る',
      '木の種類を「針葉樹」にすると、葉の色の欄がまた使えるようになり、案内も消える',
      '「ベースを保存する」を押すと「ベースを保存しました」と出て、API でも木の種類が conifer になっている。画面を開き直しても「針葉樹」のまま',
      '(あと片づけ)「[E2E]枯れ野」を消せる'
    ]
  }),
  async ({ page }) => {
    const step = startSteps(page);
    await resetAdminRpgSave();
    await loginAsE2E(page, step, true);
    const tab = page.locator('app-rpg-theme-page');
    const list = tab.getByRole('complementary', { name: 'ベースの一覧' });
    const props = tab.getByRole('complementary', { name: 'ベースの項目' });
    const kind = props.getByLabel('木の種類');
    const hint = props.getByText('葉なしでは、葉の色は使いません。');
    const name = '[E2E]枯れ野';

    await step('RPGマップ作成(/rpg/admin)の「🎨 ベース」タブで「草原」を選ぶ', '「木の種類」は「広葉樹」で、広葉樹・針葉樹・ヤシの木・葉なしが選べる', async () => {
      await page.goto('/rpg/admin');
      await page.getByRole('tab', { name: '🎨 ベース' }).click();
      await list.getByRole('button', { name: /^草原/ }).click();
      await expect(kind.locator('option:checked')).toHaveText('広葉樹');
      await expect(kind.locator('option')).toHaveText(['広葉樹', '針葉樹', 'ヤシの木', '葉なし']);
    });

    await step(`「＋ 新しいベース」を押し、名前を「${name}」、木の種類を「葉なし」にする`, '葉の色の欄が使えなくなり、「葉なしでは、葉の色は使いません。」と出る', async () => {
      await tab.getByRole('button', { name: '＋ 新しいベース' }).click();
      await props.getByLabel('ベースの名前').fill(name);
      await kind.selectOption({ label: '葉なし' });
      await expect(props.getByLabel('葉の色 1')).toBeDisabled();
      await expect(hint).toBeVisible();
    });

    await step('木の種類を「針葉樹」にする', '葉の色の欄がまた使えるようになり、案内も消える', async () => {
      await kind.selectOption({ label: '針葉樹' });
      await expect(props.getByLabel('葉の色 1')).toBeEnabled();
      await expect(hint).toHaveCount(0);
    });

    await step('「ベースを保存する」を押し、画面を開き直して同じベースを選ぶ', '「ベースを保存しました」と出て、API でも conifer。開き直しても「針葉樹」', async () => {
      await tab.getByRole('button', { name: 'ベースを保存する' }).click();
      await expect(tab.getByRole('status')).toHaveText('ベースを保存しました');
      expect(await savedTreeKind(name)).toBe('conifer');
      await page.reload();
      await page.getByRole('tab', { name: '🎨 ベース' }).click();
      await list.getByRole('button', { name }).click();
      await expect(kind.locator('option:checked')).toHaveText('針葉樹');
    });

    await step(`(あと片づけ)「${name}」を「🗑 消す」`, '「消しました」と出る', async () => {
      await tab.getByRole('button', { name: '🗑 消す' }).click();
      await expect(tab.getByRole('status')).toHaveText(`「${name}」を消しました`);
    });
  }
);

// 管理者のアカウントで、保存してある村のエリアのベース(front#401)を API から読む。なければ null
async function savedVillageTheme(): Promise<string | null> {
  const login = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: E2E_ADMIN_ACCOUNT.email, password: E2E_ADMIN_ACCOUNT.password })
  });
  const { token } = (await login.json()) as { token: string };
  const res = await fetch(`${API_URL}/graphql`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: '{ rpgMaps { id theme } }' })
  });
  const body = (await res.json()) as { data: { rpgMaps: { id: string; theme: string | null }[] } };
  return body.data.rpgMaps.find((m) => m.id === 'plain')!.theme ?? null;
}

test(
  'E2E-34 RPGマップ作成で「見た目」が「ベース」になってマップの右隣に並び、エリアごとにダンジョンと別のベースを選べ、使っているベースは消せない(front#401)',
  caseOf({
    precondition: [
      'sandbox が起動している',
      'E2E 専用の管理者のアカウントでログインしている',
      'E2E 用の RPG データ(始まりの草原 ／ はじまりの村。どちらもベースは草原)。ベースは何も保存していない(最初の4つ)'
    ],
    expected: [
      '上のタブが「🗺️ マップ」「🎨 ベース」「🎵 BGM・効果音」…の順に並ぶ(「見た目」のタブはない)',
      '「🎨 ベース」で草原を選んで「＋ 新しいベース」を押し、名前を「[E2E]花畑」にして「ベースを保存する」を押すと「ベースを保存しました」と出る',
      '「🗺️ マップ」の「エリアの設定」に「ベース」の欄があり、最初は「（ダンジョンのベース）」。「[E2E]花畑」を選んで「保存する」を押すと「保存しました。ゲームに反映されます」と出て、API でも村のベースが「[E2E]花畑」になっている。ダンジョンのベースは「草原」のまま',
      '「🎨 ベース」で「[E2E]花畑」を選ぶと、一覧に「1つのエリアで使用」、「このベースを使っているダンジョン・エリア」に「🗺️ 始まりの草原／はじまりの村」と出て、「🗑 消す」を押せない',
      '(あと片づけ)エリアのベースを「（ダンジョンのベース）」に戻して保存すると、API でもエリアのベースがなくなり、「[E2E]花畑」を消せる'
    ]
  }),
  async ({ page }) => {
    const step = startSteps(page);
    await resetAdminRpgSave();
    await loginAsE2E(page, step, true);
    const tab = page.locator('app-rpg-theme-page');
    const list = tab.getByRole('complementary', { name: 'ベースの一覧' });
    const props = tab.getByRole('complementary', { name: 'ベースの項目' });
    const area = page.getByRole('region', { name: 'エリアの設定' });
    const areaBase = area.getByRole('combobox', { name: 'ベース', exact: true });
    const name = '[E2E]花畑';

    await step('RPGマップ作成(/rpg/admin)を開き、上のタブの並びを見る', '「🗺️ マップ」「🎨 ベース」「🎵 BGM・効果音」…の順に並び、「見た目」のタブはない', async () => {
      await page.goto('/rpg/admin');
      const tabs = page.getByRole('tablist').first().getByRole('tab');
      await expect(tabs.nth(0)).toHaveText('🗺️ マップ');
      await expect(tabs.nth(1)).toHaveText('🎨 ベース');
      await expect(tabs.nth(2)).toHaveText('🎵 BGM・効果音');
      await expect(page.getByRole('tab', { name: /見た目/ })).toHaveCount(0);
    });

    await step(`「🎨 ベース」で草原を選んで「＋ 新しいベース」を押し、名前を「${name}」にして「ベースを保存する」を押す`, '「ベースを保存しました」と出る', async () => {
      await page.getByRole('tab', { name: '🎨 ベース' }).click();
      await list.getByRole('button', { name: /^草原/ }).click();
      await tab.getByRole('button', { name: '＋ 新しいベース' }).click();
      await props.getByLabel('ベースの名前').fill(name);
      await tab.getByRole('button', { name: 'ベースを保存する' }).click();
      await expect(tab.getByRole('status')).toHaveText('ベースを保存しました');
    });

    await step(
      `「🗺️ マップ」の「🗺️ エリア」で、エリアの設定の「ベース」を「${name}」にして「保存する」を押す`,
      '最初は「（ダンジョンのベース）」。保存すると「保存しました。ゲームに反映されます」と出て、API でも村のベースが変わる。ダンジョンのベースは「草原」のまま',
      async () => {
        await page.getByRole('tab', { name: '🗺️ マップ' }).click();
        await page.getByRole('tab', { name: '🗺️ エリア' }).click();
        await expect(areaBase).toHaveValue('');
        await areaBase.selectOption({ label: name });
        await page.getByRole('button', { name: '保存する' }).click();
        await expect(page.getByText('保存しました。ゲームに反映されます')).toBeVisible();
        expect(await savedVillageTheme()).toMatch(/^theme\d+$/);
        await page.getByRole('tab', { name: '🏰 ダンジョン' }).click();
        await expect(page.getByRole('region', { name: 'ダンジョンの設定' }).getByLabel('ベース').locator('option:checked')).toHaveText('草原');
        await page.getByRole('tab', { name: '🗺️ エリア' }).click();
      }
    );

    await step(`「🎨 ベース」で「${name}」を選ぶ`, '一覧に「1つのエリアで使用」、使っているところに「🗺️ 始まりの草原／はじまりの村」と出て、「🗑 消す」を押せない', async () => {
      await page.getByRole('tab', { name: '🎨 ベース' }).click();
      const row = list.getByRole('button', { name });
      await row.click();
      await expect(row).toContainText('1つのエリアで使用');
      await expect(tab.getByRole('region', { name: 'このベースを使っているダンジョン・エリア' })).toContainText('🗺️ 始まりの草原／はじまりの村');
      await expect(tab.getByRole('button', { name: '🗑 消す' })).toBeDisabled();
    });

    await step('(あと片づけ)エリアのベースを「（ダンジョンのベース）」に戻して保存し、「🎨 ベース」で消す', 'API でもエリアのベースがなくなり、消すと「消しました」と出る', async () => {
      await page.getByRole('tab', { name: '🗺️ マップ' }).click();
      await areaBase.selectOption({ label: '（ダンジョンのベース）' });
      await page.getByRole('button', { name: '保存する' }).click();
      await expect(page.getByText('保存しました。ゲームに反映されます')).toBeVisible();
      expect(await savedVillageTheme()).toBeNull();
      await page.getByRole('tab', { name: '🎨 ベース' }).click();
      await tab.getByRole('button', { name: '🗑 消す' }).click();
      await expect(tab.getByRole('status')).toHaveText(`「${name}」を消しました`);
    });
  }
);

// 管理者のアカウントで、保存してある村のエリアの地面の高さ(front#412)を API から読む
async function savedVillageHeights(): Promise<string[]> {
  const login = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: E2E_ADMIN_ACCOUNT.email, password: E2E_ADMIN_ACCOUNT.password })
  });
  const { token } = (await login.json()) as { token: string };
  const res = await fetch(`${API_URL}/graphql`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: '{ rpgMaps { id heights } }' })
  });
  const body = (await res.json()) as { data: { rpgMaps: { id: string; heights: string[] }[] } };
  return body.data.rpgMaps.find((m) => m.id === 'plain')!.heights;
}

test(
  'E2E-35 RPGマップ作成の「高さ」で、＋3段〜−3段・リセットの道具で今の高さから上げ下げでき、−5〜5段(マイナスは a〜e)で保存される(front#412)',
  caseOf({
    precondition: ['sandbox が起動している', 'E2E 専用の管理者のアカウントでログインしている', 'E2E 用の RPG データ(はじまりの村は、すべて0段)'],
    expected: [
      'パレットの「高さ」に「＋3段」「＋2段」「＋1段」「リセット」「−1段」「−2段」「−3段」が縦に並び、ボタンの高さは「地面」の道具の2/3くらい',
      '筆を3×3にして「−2段」で (11, 26) を1回、「＋3段」で (20, 26) を2回クリックすると(上限の5段で止まる)、保存したとき API の高さが (10〜12, 25〜27) は b(−2段)、(19〜21, 25〜27) は 5 になる',
      '(あと片づけ)「リセット」で戻して保存すると、API の高さはすべて0に戻る'
    ]
  }),
  async ({ page }) => {
    const step = startSteps(page);
    await loginAsE2E(page, step, true);
    const palette = page.locator('aside.palette');
    const tools = palette.locator('.items.height-list .item');
    const brush = (n: '1マス' | '3×3') => palette.getByRole('button', { name: n, exact: true }).click();
    const tool = (label: string) => palette.getByRole('button', { name: label }).click();
    const save = async () => {
      await page.getByRole('button', { name: '保存する' }).click();
      await expect(page.getByText('保存しました。ゲームに反映されます')).toBeVisible();
    };

    await step('RPGマップ作成(/rpg/admin)を開き、パレットの「高さ」を押す', '＋3段〜−3段・リセットの7つが縦に並び、ボタンの高さは「地面」の道具の2/3くらい', async () => {
      await page.goto('/rpg/admin');
      await expect(palette.locator('.item').first()).toBeVisible();
      const groundItem = (await palette.locator('.item').first().boundingBox())!;
      await palette.getByRole('button', { name: '高さ', exact: true }).click();
      await expect(tools).toHaveText([/＋3段/, /＋2段/, /＋1段/, /リセット/, /−1段/, /−2段/, /−3段/]);
      const boxes = await Promise.all([0, 1].map(async (i) => (await tools.nth(i).boundingBox())!));
      // 縦に並ぶ
      expect(boxes[1].y).toBeGreaterThan(boxes[0].y + boxes[0].height - 1);
      expect(Math.abs(boxes[1].x - boxes[0].x)).toBeLessThan(2);
      // 地面の道具の 2/3 くらい(0.55〜0.8倍)
      expect(boxes[0].height / groundItem.height).toBeGreaterThan(0.55);
      expect(boxes[0].height / groundItem.height).toBeLessThan(0.8);
    });

    await step('筆を3×3にして「−2段」で (11, 26) を1回、「＋3段」で (20, 26) を2回クリックし、「保存する」を押す', 'API の高さが (10〜12, 25〜27) は b(−2段)、(19〜21, 25〜27) は 5(上限)になる', async () => {
      await brush('3×3');
      await tool('−2段');
      await clickTile(page, 11, 26);
      await tool('＋3段');
      await clickTile(page, 20, 26);
      await clickTile(page, 20, 26);
      await save();
      const heights = await savedVillageHeights();
      for (const y of [25, 26, 27]) {
        expect(heights[y].slice(10, 13)).toBe('bbb');
        expect(heights[y].slice(19, 22)).toBe('555');
      }
      expect(heights[24].slice(10, 13)).toBe('000');
    });

    await step('くぼみと高台の間でホイールを回して拡大する', '(画面で見る)くぼみのまわりに壁が見える', async () => {
      const [sx, sy] = (await page.evaluate(() => (window as any).rpgAdminTest.tilePosition(15, 26))) as [number, number];
      const box = (await page.getByLabel('マップ', { exact: true }).boundingBox())!;
      await page.mouse.move(box.x + sx, box.y + sy);
      for (let i = 0; i < 6; i++) await page.mouse.wheel(0, -200);
    });

    await step('(あと片づけ)「リセット」で (11, 26)・(20, 26) をクリックし、「保存する」を押す', 'API の高さがすべて0に戻る', async () => {
      await tool('リセット');
      await clickTile(page, 11, 26);
      await clickTile(page, 20, 26);
      await save();
      expect((await savedVillageHeights()).every((row) => /^0+$/.test(row))).toBe(true);
    });
  }
);

// 管理者のアカウントで、保存してあるベースの「水のマスの段差の側面」(front#415)を API から読む。自動なら null
async function savedLiquidEdge(id: string): Promise<string[] | null> {
  const login = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: E2E_ADMIN_ACCOUNT.email, password: E2E_ADMIN_ACCOUNT.password })
  });
  const { token } = (await login.json()) as { token: string };
  const res = await fetch(`${API_URL}/graphql`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: '{ rpgThemes { id liquidEdge } }' })
  });
  const body = (await res.json()) as { data: { rpgThemes: { id: string; liquidEdge: string[] | null }[] } };
  return body.data.rpgThemes.find((t) => t.id === id)!.liquidEdge ?? null;
}

test(
  'E2E-36 RPGマップ作成の「ベース」タブで、水のマスの段差の側面を「水の色に合わせる」から好きな2色に変えて保存でき、自動に戻せる(front#415)',
  caseOf({
    precondition: ['sandbox が起動している', 'E2E 専用の管理者のアカウントでログインしている', 'ダンジョンのベースを何も保存していない(最初の4つ)'],
    expected: [
      '「🎨 ベース」タブで草原を選ぶと、「水のマス（水）」の欄に「段差の側面」があり、「水の色に合わせる」がオン。2色は水の色を暗くした色(#2b86b3・#226b8f)で、選べない',
      '「水の色に合わせる」をオフにすると2色を選べるようになり、左の色を #c026d3 にしてプレビューの水の段の側面がその色になる',
      '「ベースを保存する」を押すと「ベースを保存しました」と出て、API でも草原の水のマスの段差の側面が #c026d3・#226b8f になっている',
      '「水の色に合わせる」をオンに戻して保存すると、API でも自動(なし)に戻る'
    ]
  }),
  async ({ page }) => {
    const step = startSteps(page);
    await resetAdminRpgSave();
    await loginAsE2E(page, step, true);
    const tab = page.locator('app-rpg-theme-page');
    const list = tab.getByRole('complementary', { name: 'ベースの一覧' });
    const row = tab.getByRole('complementary', { name: 'ベースの項目' }).getByRole('group', { name: '水のマスの段差の側面' });
    const auto = row.getByRole('checkbox', { name: '水の色に合わせる' });
    const left = row.getByLabel('水のマスの段差の側面 1');
    const right = row.getByLabel('水のマスの段差の側面 2');

    await step('RPGマップ作成(/rpg/admin)を開き、「🎨 ベース」タブで「草原」を選ぶ', '「段差の側面」の行があり、「水の色に合わせる」がオン。2色は水の色を暗くした色で、選べない', async () => {
      await page.goto('/rpg/admin');
      await page.getByRole('tab', { name: '🎨 ベース' }).click();
      await list.getByRole('button', { name: /^草原/ }).click();
      await expect(auto).toBeChecked();
      await expect(left).toHaveValue('#2b86b3');
      await expect(right).toHaveValue('#226b8f');
      await expect(left).toBeDisabled();
      await expect(right).toBeDisabled();
      await row.scrollIntoViewIfNeeded();
    });

    await step('「水の色に合わせる」をオフにし、左の色を #c026d3 にする', '2色を選べるようになり、プレビューの水の段の側面が赤紫になる', async () => {
      await auto.uncheck();
      await expect(left).toBeEnabled();
      await left.fill('#c026d3');
      await expect(left).toHaveValue('#c026d3');
      await expect(right).toHaveValue('#226b8f');
      await expect(tab.getByLabel('ベースのプレビュー')).toBeVisible();
    });

    await step('「ベースを保存する」を押す', '「ベースを保存しました」と出て、API でも #c026d3・#226b8f になっている', async () => {
      await tab.getByRole('button', { name: 'ベースを保存する' }).click();
      await expect(tab.getByRole('status')).toHaveText('ベースを保存しました');
      expect(await savedLiquidEdge('plain')).toEqual(['#c026d3', '#226b8f']);
    });

    await step('「水の色に合わせる」をオンに戻して「ベースを保存する」を押す', '色は自動の色に戻って選べなくなり、API でも自動(なし)に戻る', async () => {
      await auto.check();
      await expect(left).toHaveValue('#2b86b3');
      await expect(left).toBeDisabled();
      await tab.getByRole('button', { name: 'ベースを保存する' }).click();
      await expect(tab.getByRole('status')).toHaveText('ベースを保存しました');
      expect(await savedLiquidEdge('plain')).toBeNull();
    });
  }
);

// 村(plain)に置いた扉(front#425)。API から読む
async function savedVillageDoors(): Promise<{ x: number; y: number; rotation: number | null; keyItem: string | null; consumeKey: boolean | null; lines: string[] }[]> {
  const login = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: E2E_ADMIN_ACCOUNT.email, password: E2E_ADMIN_ACCOUNT.password })
  });
  const { token } = (await login.json()) as { token: string };
  const res = await fetch(`${API_URL}/graphql`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: '{ rpgMaps { id objects { type x y rotation keyItem consumeKey lines } } }' })
  });
  type Obj = { type: string; x: number; y: number; rotation: number | null; keyItem: string | null; consumeKey: boolean | null; lines: string[] };
  const body = (await res.json()) as { data: { rpgMaps: { id: string; objects: Obj[] }[] } };
  return body.data.rpgMaps.find((m) => m.id === 'plain')!.objects.filter((o) => o.type === 'door').map(({ type: _, ...o }) => o);
}

test(
  'E2E-39 RPGマップ作成で、扉を置くと設定のモーダルが開き、向き・開けるのに使うアイテム・鍵がなくなるか・鍵がないときのメッセージを決めて保存できる(front#425)',
  caseOf({
    precondition: [
      'sandbox が起動している',
      'E2E 専用の管理者のアカウントでログインしている',
      'E2E 用の RPG データで、村の (2, 3)〜(3, 3) に鍵付きの扉を1つ置いてあり、(6, 2)〜(6, 3) は空いている'
    ],
    expected: [
      'パレットの「置物」の「扉」で (6, 2) をクリックすると、扉の設定のモーダルが開く。向きは「左下向き（横に2マス）」、アイテムは「錆びた鍵」、「開けると鍵がなくなる」にチェックが付いている',
      '「↻ 回す」で「右下向き（縦に2マス）」になる。アイテムを「なし」にすると、「開けると鍵がなくなる」・メッセージの欄が消える',
      '錆びた鍵に戻し、「開けると鍵がなくなる」を外してメッセージを書き、「決める」→「保存する」を押すと、API でも (6, 2) の扉が 向き1・錆びた鍵・鍵がなくならない・そのメッセージ になっている'
    ]
  }),
  async ({ page }) => {
    const step = startSteps(page);
    await loginAsE2E(page, step, true);
    const dialog = page.getByRole('dialog', { name: '扉' });

    await step('RPGマップ作成(/rpg/admin)を開き、パレットの「置物」の「扉」を選んで (6, 2) をクリックする', '扉の設定のモーダルが開き、左下向き（横に2マス）・錆びた鍵・開けると鍵がなくなる になっている', async () => {
      await page.goto('/rpg/admin');
      await page.locator('aside.palette').getByRole('button', { name: '置物', exact: true }).click();
      await page.locator('aside.palette').getByRole('button', { name: /扉/ }).click();
      await clickTile(page, 6, 2);
      await expect(dialog).toBeVisible();
      await expect(dialog.getByTestId('door-dir')).toHaveText('左下向き（横に2マス）');
      await expect(dialog.getByLabel('開けるのに使うアイテム')).toHaveValue('rusty_key');
      await expect(dialog.getByLabel('開けると鍵がなくなる（1つ減る）')).toBeChecked();
    });

    await step('「↻ 回す」を押し、アイテムを「なし」にする', '右下向き（縦に2マス）になり、「開けると鍵がなくなる」・メッセージの欄が消える', async () => {
      await dialog.getByRole('button', { name: '↻ 回す' }).click();
      await expect(dialog.getByTestId('door-dir')).toHaveText('右下向き（縦に2マス）');
      await dialog.getByLabel('開けるのに使うアイテム').selectOption('');
      await expect(dialog.getByLabel('開けると鍵がなくなる（1つ減る）')).toBeHidden();
      await expect(dialog.getByLabel('鍵を持っていないときのメッセージ')).toBeHidden();
    });

    await step('錆びた鍵に戻し、「開けると鍵がなくなる」を外してメッセージを書き、「決める」→「保存する」を押す', 'API でも (6, 2) の扉が 向き1・錆びた鍵・鍵がなくならない・そのメッセージ になっている', async () => {
      await dialog.getByLabel('開けるのに使うアイテム').selectOption('rusty_key');
      await dialog.getByLabel('開けると鍵がなくなる（1つ減る）').uncheck();
      await dialog.getByLabel('鍵を持っていないときのメッセージ').fill('看守の部屋にあるらしい。');
      await dialog.getByRole('button', { name: '決める' }).click();
      await expect(dialog).toBeHidden();
      await page.getByRole('button', { name: '保存する' }).click();
      await expect(page.getByText('保存しました。ゲームに反映されます')).toBeVisible();
      expect((await savedVillageDoors()).find((d) => d.x === 6 && d.y === 2)).toEqual({
        x: 6, y: 2, rotation: 1, keyItem: 'rusty_key', consumeKey: null, lines: ['看守の部屋にあるらしい。']
      });
    });
  }
);

test(
  'E2E-41 RPGマップ作成の「アイテム」タブで防具に見た目(ローブ)を付けて保存すると、その防具を装備したプレイヤーの「見た目を変える」で防具の見た目が優先され、服はローブ・よろいを選べない(front#431)',
  caseOf({
    precondition: [
      'sandbox が起動している(API は api#204 の見た目の項目がある)',
      'E2E 専用の管理者のアカウントでログインしている',
      'E2E 用の RPG データで、革の鎧に見た目は付いていない',
      '管理者のアカウントの RPG のセーブデータを、最初の状態に戻し、革の鎧を1つ足してある'
    ],
    expected: [
      '武器を選ぶと「見た目（装備したとき）」に 見た目なし・片手剣・大剣・玉の杖・三日月の杖 が出る',
      '防具(革の鎧)を選ぶと 見た目なし と服の7つが出て、ローブを押すと「服の色」「飾りの色」の欄が出る',
      '飾りの色を選んで保存すると「アイテムを保存しました」と出る',
      'ゲームで革の鎧を装備して「見た目を変える」を開くと、「防具「革の鎧」の見た目で出ています」と出て、「🛡️ 防具を着た姿」を切り替えられ、服は 1 / 5(ローブ・よろいなし)',
      '革の鎧を「見た目なし」に戻して保存すると、案内は出なくなる'
    ]
  }),
  async ({ page }) => {
    const step = startSteps(page);
    await resetAdminRpgSave([{ itemId: 'leather', count: 1 }]);
    await loginAsE2E(page, step, true);
    const tab = page.locator('app-rpg-item-page');
    const field = tab.locator('app-rpg-equip-look-field');
    const chips = () => field.locator('.chip').allInnerTexts().then((t) => t.map((s) => s.trim()));
    const openArmor = async () => {
      await page.goto('/rpg/admin');
      await page.getByRole('tab', { name: '🎒 アイテム' }).click();
      await tab.locator('.item-row', { hasText: '革の鎧' }).click();
    };

    await step('RPGマップ作成の「🎒 アイテム」タブで「銅の剣」を選ぶ', '「見た目（装備したとき）」に 見た目なし・片手剣・大剣・玉の杖・三日月の杖 が出る', async () => {
      await page.goto('/rpg/admin');
      await page.getByRole('tab', { name: '🎒 アイテム' }).click();
      await tab.locator('.item-row', { hasText: '銅の剣' }).click();
      await expect(tab.getByRole('heading', { name: '見た目（装備したとき）' })).toBeVisible();
      expect(await chips()).toEqual(['見た目なし', '片手剣', '大剣', '玉の杖', '三日月の杖']);
    });

    await step('「革の鎧」を選び、見た目の形で「ローブ」を押して、飾りの色で金色(#fde047)を押し、保存する', '服の7つが出て、ローブを押すと服の色・飾りの色が出て、保存すると「アイテムを保存しました」と出る', async () => {
      await tab.locator('.item-row', { hasText: '革の鎧' }).click();
      expect(await chips()).toEqual(['見た目なし', 'シャツ', 'ローブ', 'よろい', 'ワンピース', 'ベスト', 'パーカー', 'セーラー服']);
      await field.getByRole('button', { name: 'ローブ', exact: true }).click();
      await expect(field.getByRole('group', { name: '服の色' })).toBeVisible();
      await field.getByRole('button', { name: '飾りの色 #fde047' }).click();
      await expect(field.getByRole('button', { name: '飾りの色 #fde047' })).toHaveAttribute('aria-pressed', 'true');
      await tab.getByRole('button', { name: 'アイテムを保存する' }).click();
      await expect(tab.getByRole('status')).toHaveText('アイテムを保存しました');
    });

    await step('RPG(/rpg)を開き、持ち物の革の鎧を装備して「見た目を変える」を押す', '防具の見た目を優先している案内が出て、「🛡️ 防具を着た姿」を切り替えられ、服は 1 / 5', async () => {
      await page.goto('/rpg');
      await page.getByRole('button', { name: '革の鎧を装備する' }).click();
      await page.getByRole('button', { name: '🧑 見た目を変える' }).click();
      const editor = page.locator('app-rpg-look-editor');
      await expect(editor.getByRole('note')).toHaveText(/防具「革の鎧」の見た目で出ています/);
      const toggle = editor.getByRole('button', { name: '🛡️ 防具を着た姿' });
      await expect(toggle).toHaveAttribute('aria-pressed', 'true');
      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-pressed', 'false');
      await expect(editor.locator('.row[aria-label="服"] .count')).toHaveText('1 / 5');
    });

    await step('RPGマップ作成で「革の鎧」を「見た目なし」に戻して保存し、ゲームの「見た目を変える」を開き直す', '保存でき、防具の見た目の案内は出ない', async () => {
      await openArmor();
      await field.getByRole('button', { name: '見た目なし', exact: true }).click();
      await tab.getByRole('button', { name: 'アイテムを保存する' }).click();
      await expect(tab.getByRole('status')).toHaveText('アイテムを保存しました');
      await page.goto('/rpg');
      await page.getByRole('button', { name: '🧑 見た目を変える' }).click();
      await expect(page.locator('app-rpg-look-editor').getByRole('note')).toHaveCount(0);
    });
  }
);

test(
  'E2E-42 RPGマップ作成の「敵」タブで、攻撃を属性と LV で選べ、LV2 では「魔法陣を出す」を外して保存できる(front#435)',
  caseOf({
    precondition: [
      'sandbox が起動している',
      'E2E 専用の管理者のアカウントでログインしている(global-setup で作り、管理者にする。front#341)',
      'E2E 用の RPG データで、3番目の敵キノコンの攻撃は体当たり'
    ],
    expected: [
      '攻撃のボタンに絵文字がなく、属性の攻撃は「炎・水・風・雷・闇」の5つにまとまっている(前の「暗黒」「魔法陣」のボタンはない)',
      '属性のボタンを押すと LV1 / LV2 を選べ、LV1 では「魔法陣を出す」は出ない',
      'LV2 を選ぶと「魔法陣を出す」(はじめはオン)と、射程・範囲の欄が出る',
      '属性を変えても LV はそのまま(水 LV2 → 雷を押すと 雷 LV2)',
      '「魔法陣を出す」を外して保存し、読み込み直しても 水 LV2・魔法陣を出さない のまま'
    ]
  }),
  async ({ page }) => {
    const step = startSteps(page);
    await loginAsE2E(page, step, true);
    const tab = page.locator('app-rpg-enemy-page');
    const list = tab.getByRole('complementary', { name: '敵の一覧' });
    const attack = tab.locator('aside.props').getByRole('group', { name: '攻撃', exact: true });
    const card = (label: string) => attack.locator('.attacks').getByRole('button', { name: new RegExp(`^${label}\\s?(ふるまい|見た目)`) });
    const level = (lv: 1 | 2) => attack.getByRole('group', { name: '攻撃の LV' }).getByRole('button', { name: `LV${lv}`, exact: true });
    const circle = attack.getByRole('checkbox', { name: '魔法陣を出す' });
    const openKinokon = async () => {
      await page.goto('/rpg/admin');
      await page.getByRole('tab', { name: '👾 敵' }).click();
      await list.getByRole('button', { name: 'キノコン', exact: true }).click();
      await expect(tab.locator('aside.props').getByLabel('名前', { exact: true })).toHaveValue('キノコン');
    };

    await step('RPGマップ作成(/rpg/admin)の「👾 敵」タブを開き、キノコンを選ぶ', '攻撃のボタンは絵文字なしで 体当たり・ひっかき・かみつき・ジャンプ・炎・水・風・雷・闇・衝撃波。体当たりが選ばれていて、LV の欄は出ない', async () => {
      await openKinokon();
      await expect(attack.locator('.attacks button')).toHaveText([
        '体当たりふるまい', 'ひっかき見た目', 'かみつき見た目', 'ジャンプふるまい',
        '炎ふるまい', '水ふるまい', '風ふるまい', '雷ふるまい', '闇ふるまい', '衝撃波ふるまい'
      ]);
      await expect(card('体当たり')).toHaveAttribute('aria-pressed', 'true');
      await expect(attack.getByRole('group', { name: '攻撃の LV' })).toHaveCount(0);
    });

    await step('「水」を押す', '水が選ばれ、LV1 が選ばれている。「魔法陣を出す」は出ず、射程の欄だけ出る', async () => {
      await card('水').click();
      await expect(card('水')).toHaveAttribute('aria-pressed', 'true');
      await expect(level(1)).toHaveAttribute('aria-pressed', 'true');
      await expect(circle).toHaveCount(0);
      await expect(attack.getByRole('spinbutton', { name: '射程（マス）' })).toBeVisible();
      await expect(attack.getByRole('spinbutton', { name: '範囲（まわり何マス）' })).toHaveCount(0);
    });

    await step('「LV2」を押す', '「魔法陣を出す」がオンで出て、射程・範囲の欄が出る', async () => {
      await level(2).click();
      await expect(level(2)).toHaveAttribute('aria-pressed', 'true');
      await expect(circle).toBeChecked();
      await expect(attack.getByRole('spinbutton', { name: '範囲（まわり何マス）' })).toBeVisible();
    });

    await step('「雷」を押し、もう一度「水」を押す', '雷でも LV2 のまま。水に戻しても LV2 のまま', async () => {
      await card('雷').click();
      await expect(card('雷')).toHaveAttribute('aria-pressed', 'true');
      await expect(level(2)).toHaveAttribute('aria-pressed', 'true');
      await card('水').click();
      await expect(level(2)).toHaveAttribute('aria-pressed', 'true');
    });

    await step('「魔法陣を出す」を外して「敵を保存する」を押し、読み込み直してキノコンを選ぶ', '「敵を保存しました」と出る。読み込み直しても 水・LV2 が選ばれ、「魔法陣を出す」はオフ', async () => {
      await circle.uncheck();
      await tab.getByRole('button', { name: '敵を保存する' }).click();
      await expect(tab.getByRole('status')).toHaveText('敵を保存しました');
      await openKinokon();
      await expect(card('水')).toHaveAttribute('aria-pressed', 'true');
      await expect(level(2)).toHaveAttribute('aria-pressed', 'true');
      await expect(circle).not.toBeChecked();
    });

    await step('(後片付け)「魔法陣を出す」をオンに戻し、「体当たり」を押して保存する', '「敵を保存しました」と出る', async () => {
      await circle.check();
      await card('体当たり').click();
      await tab.getByRole('button', { name: '敵を保存する' }).click();
      await expect(tab.getByRole('status')).toHaveText('敵を保存しました');
    });
  }
);

test(
  'E2E-43 RPGで、敵に属性を付けられ、「属性を変える」アイテムを道具屋で買って使うと、プレイヤーの属性が変わり、開き直しても残っている(front#437)',
  caseOf({
    precondition: [
      'sandbox が起動している',
      'E2E 専用の管理者のアカウントでログインしている(global-setup で作り、管理者にする。front#341)',
      'E2E 用の RPG データで、敵キノコンの属性はなし',
      '管理者のアカウントの RPG のセーブデータを、最初の状態(30G・回復薬×3・属性は木)に戻してある'
    ],
    expected: [
      '「👾 敵」タブの「属性」で、なし・火・水・木・光・闇を選べ、火にして保存すると、読み込み直しても火のまま',
      '「🎒 アイテム」タブで種類「属性を変える」を選ぶと「変わる属性」を選べ、保存できる',
      'ゲームの左下に自分の属性(はじめは 🌳木)が出る',
      '道具屋で買った「属性を変える」アイテムを使うと、属性が 🔥火 に変わり、アイテムはなくなる',
      '開き直しても 🔥火 のまま'
    ]
  }),
  async ({ page }) => {
    const step = startSteps(page);
    await resetAdminRpgSave();
    await loginAsE2E(page, step, true);
    const enemyTab = page.locator('app-rpg-enemy-page');
    const itemTab = page.locator('app-rpg-item-page');
    const enemyElement = enemyTab.locator('aside.props').getByRole('group', { name: '敵の属性' });
    const name = '[E2E]ほのおの石';
    const openKinokon = async () => {
      await page.goto('/rpg/admin');
      await page.getByRole('tab', { name: '👾 敵' }).click();
      await enemyTab.getByRole('complementary', { name: '敵の一覧' }).getByRole('button', { name: 'キノコン', exact: true }).click();
      await expect(enemyTab.locator('aside.props').getByLabel('名前', { exact: true })).toHaveValue('キノコン');
    };

    await step('RPGマップ作成(/rpg/admin)の「👾 敵」タブでキノコンを選ぶ', '「属性」に なし・🔥 火・💧 水・🌳 木・✨ 光・🌑 闇 が並び、「なし」が選ばれている', async () => {
      await openKinokon();
      await expect(enemyElement.getByRole('button')).toHaveText(['なし', '🔥 火', '💧 水', '🌳 木', '✨ 光', '🌑 闇']);
      await expect(enemyElement.getByRole('button', { name: 'なし' })).toHaveAttribute('aria-pressed', 'true');
    });

    await step('「🔥 火」を押して「敵を保存する」を押し、読み込み直してキノコンを選ぶ', '「敵を保存しました」と出て、読み込み直しても「🔥 火」が選ばれている', async () => {
      await enemyElement.getByRole('button', { name: '🔥 火' }).click();
      await enemyTab.getByRole('button', { name: '敵を保存する' }).click();
      await expect(enemyTab.getByRole('status')).toHaveText('敵を保存しました');
      await openKinokon();
      await expect(enemyElement.getByRole('button', { name: '🔥 火' })).toHaveAttribute('aria-pressed', 'true');
    });

    await step(
      `「🎒 アイテム」タブで「＋ 新しいアイテム」を押し、種類「属性を変える」、名前「${name}」、変わる属性「🔥 火」、道具屋で売る・値段 10 にして保存する`,
      '強さの欄の代わりに「変わる属性」が出て、チェックが ✅ になり、「アイテムを保存しました」と出る',
      async () => {
        await page.getByRole('tab', { name: '🎒 アイテム' }).click();
        await itemTab.getByRole('button', { name: '＋ 新しいアイテム' }).click();
        const props = itemTab.getByRole('complementary', { name: 'アイテム', exact: true });
        await props.getByRole('group', { name: '種類' }).getByRole('button', { name: /属性を変える/ }).click();
        await expect(props.getByLabel('HPの回復量')).toHaveCount(0);
        await props.getByLabel('名前', { exact: true }).fill(name);
        await props.getByLabel('変わる属性').selectOption('fire');
        await props.getByLabel('道具屋で売る').check();
        await props.getByLabel(/値段/).fill('10');
        await expect(props.getByText('✅ 問題はありません')).toBeVisible();
        await itemTab.getByRole('button', { name: 'アイテムを保存する' }).click();
        await expect(itemTab.getByRole('status')).toHaveText('アイテムを保存しました');
      }
    );

    const status = page.getByRole('region', { name: 'プレイヤーの状態' });
    await step('RPG(/rpg)を開く', '左下のプレイヤーの状態に、属性「🌳木」が出る', async () => {
      await page.goto('/rpg');
      await expect(status.getByLabel('属性 木')).toHaveText('🌳木');
    });

    await step(`「道具屋 ミナ」に話しかけて「${name}」を買い、持ち物の「使う」を押す`, `属性が「🔥火」に変わり、持ち物から「${name}」がなくなる`, async () => {
      await clickNpc(page, '道具屋 ミナ');
      const dialog = page.getByRole('dialog', { name: '道具屋 ミナとの会話' });
      await dialog.click();
      await dialog.click();
      await page.getByRole('button', { name: `${name}を買う` }).click();
      await expect(status.getByText('20G')).toBeVisible();
      await page.getByRole('button', { name: '閉じる' }).click();
      const inventory = page.getByRole('region', { name: '持ち物' });
      await inventory.getByRole('button', { name: `${name}を使う` }).click();
      await expect(status.getByLabel('属性 火')).toHaveText('🔥火');
      await expect(inventory.getByText(name)).toHaveCount(0);
    });

    await step('RPG(/rpg)を開き直す', '属性は「🔥火」のまま', async () => {
      await page.goto('/rpg');
      await expect(status.getByLabel('属性 火')).toHaveText('🔥火');
    });

    await step('あとかたづけ: 作ったアイテムを消し、キノコンの属性を「なし」に戻して保存する', '「〜を消しました」「敵を保存しました」と出る', async () => {
      await page.goto('/rpg/admin');
      await page.getByRole('tab', { name: '🎒 アイテム' }).click();
      await itemTab.locator('.item-row', { hasText: name }).click();
      await itemTab.getByRole('button', { name: '🗑 このアイテムを消す' }).click();
      await expect(itemTab.getByRole('status')).toHaveText(`「${name}」を消しました`);
      await openKinokon();
      await enemyElement.getByRole('button', { name: 'なし' }).click();
      await enemyTab.getByRole('button', { name: '敵を保存する' }).click();
      await expect(enemyTab.getByRole('status')).toHaveText('敵を保存しました');
    });
  }
);

// マップの端の矢印(front#439)の名前の札をクリックする(位置は開発用のビルドだけで出す window.rpgAdminTest から求める)
async function clickArrow(page: Page, text: string): Promise<void> {
  await expect.poll(() => page.evaluate((t) => !!(window as any).rpgAdminTest?.arrowPosition(t), text)).toBe(true);
  const [sx, sy] = (await page.evaluate((t) => (window as any).rpgAdminTest.arrowPosition(t), text)) as [number, number];
  const box = (await page.getByLabel('マップ', { exact: true }).boundingBox())!;
  await page.mouse.click(box.x + sx, box.y + sy);
}

test(
  'E2E-44 RPGマップ作成で、マップの端の矢印を押すと隣のエリア・ほかのダンジョンのエリアへ移り、置いた敵を押すと左の一覧でも選ばれ、もう一度押すと「敵」タブでその敵を編集できる(front#439)',
  caseOf({
    precondition: ['sandbox が起動している', 'E2E 専用の管理者のアカウントでログインしている', 'E2E 用の RPG データ(始まりの草原: はじまりの村だけ。スライムが x 26・y 11 にいる)'],
    expected: [
      '隣にエリアがある端に、行き先の名前の付いた矢印が出て、押すとそのエリアに切り替わる',
      'ほかのダンジョンへのつながり(紫)の矢印を押すと、そのダンジョンのエリアに切り替わり、上の「ダンジョン」のプルダウンも変わる',
      'パレットの敵を選んでいるときに、敵以外の場所(右の欄)を押すと、選択が外れる',
      'マップに置いてある敵を押すと、パレットの一覧でもその敵が選ばれる',
      'パレットで選んでいる敵をもう一度押すと、「👾 敵」タブに移り、その敵が選ばれている'
    ]
  }),
  async ({ page }) => {
    const step = startSteps(page);
    await loginAsE2E(page, step, true);
    const areaName = page.getByRole('region', { name: 'エリアの設定' }).getByLabel('エリアの名前');
    const east = '[E2E]東の原っぱ';

    await step('RPGマップ作成(/rpg/admin)を開き、「🏰 ダンジョン」の「エリアの配置」で、はじまりの村の右の「＋」から「' + east + '」を作る', '作ったエリアに切り替わり、左上の端に「はじまりの村」の矢印が出る', async () => {
      await page.goto('/rpg/admin');
      await page.getByRole('tab', { name: '🏰 ダンジョン' }).click();
      await page.locator('.layout-grid [data-cell="1,0"]').click();
      const dialog = page.getByRole('dialog', { name: '新しいエリア' });
      await dialog.getByLabel('エリアの名前').fill(east);
      await dialog.getByRole('button', { name: '作る' }).click();
      await expect(dialog).toBeHidden();
      await page.getByRole('tab', { name: '🗺️ エリア' }).click();
      await expect(areaName).toHaveValue(east);
      await expect.poll(() => page.evaluate(() => !!(window as any).rpgAdminTest.arrowPosition('はじまりの村'))).toBe(true);
    });

    await step('マップの左上の端の「はじまりの村」の矢印を押す', 'はじまりの村に切り替わり、右下の端に「' + east + '」の矢印が出る', async () => {
      await clickArrow(page, 'はじまりの村');
      await expect(areaName).toHaveValue('はじまりの村');
      await expect.poll(() => page.evaluate((t) => !!(window as any).rpgAdminTest.arrowPosition(t), east)).toBe(true);
    });

    await step(
      '「＋ 新しいダンジョン」で「[E2E]海辺」を作り、その「入口」の右上の端のつながりを「始まりの草原 ／ はじまりの村」にして、紫の矢印を押す',
      'はじまりの村に切り替わり、上の「ダンジョン」のプルダウンが「始まりの草原」になる',
      async () => {
        await page.getByRole('button', { name: '＋ 新しいダンジョン' }).click();
        const dialog = page.getByRole('dialog', { name: '新しいダンジョン' });
        await dialog.getByLabel('名前').fill('[E2E]海辺');
        await dialog.getByRole('button', { name: '作る' }).click();
        await expect(dialog).toBeHidden();
        await page.getByRole('tab', { name: '🗺️ エリア' }).click();
        await expect(areaName).toHaveValue('入口');
        await page.getByLabel('右上の端のつながり').selectOption({ label: '始まりの草原 ／ はじまりの村' });
        await clickArrow(page, '始まりの草原 ／ はじまりの村');
        await expect(areaName).toHaveValue('はじまりの村');
        await expect(page.getByLabel('ダンジョン', { exact: true }).locator('option:checked')).toContainText('始まりの草原');
      }
    );

    const palette = page.getByRole('complementary', { name: 'パレット' });
    const slime = palette.locator('.enemy-item[title="スライム"]');
    await step('パレットの「敵」を押してから、右の欄の「エリアの設定」の見出しを押す', '最初はスライムが選ばれていて、右の欄を押すと、パレットの敵の選択が外れる', async () => {
      await palette.getByRole('button', { name: '敵', exact: true }).click();
      await expect(slime).toHaveClass(/active/);
      await page.getByRole('heading', { name: 'エリアの設定' }).click();
      await expect(palette.locator('.enemy-item.active')).toHaveCount(0);
    });

    await step('マップの x 26・y 11 に置いてあるスライムを押す', 'パレットの一覧でもスライムが選ばれ、右の欄に「敵の出る場所」が出る', async () => {
      await clickTile(page, 26, 11);
      await expect(slime).toHaveClass(/active/);
      await expect(page.getByText('👾 敵の出る場所')).toBeVisible();
    });

    await step('パレットで選んでいるスライムを、もう一度押す', '「👾 敵」タブに移り、一覧でスライムが選ばれている', async () => {
      await slime.click();
      await expect(page.getByRole('tab', { name: '👾 敵' })).toHaveAttribute('aria-selected', 'true');
      await expect(page.locator('app-rpg-enemy-page .enemy-row.active')).toContainText('スライム');
    });
  }
);

test(
  'E2E-45 RPGマップ作成で、置いてあるNPCをドラッグして端の矢印の上で離すと、矢印の行き先のエリアへ移せ、保存できる(front#443)',
  caseOf({
    precondition: ['sandbox が起動している', 'E2E 専用の管理者のアカウントでログインしている', 'E2E 用の RPG データ(始まりの草原: はじまりの村だけ。道具屋 ミナが x 18・y 13 にいる)'],
    expected: [
      'NPCを左下の端の矢印へドラッグして離すと、「〜へ移しました」と出て、画面ははじまりの村のまま、元の場所からNPCがいなくなる',
      '移した先のエリアの、こちら側(右上)の端のまん中の近くに、移したNPCがいる',
      '両方のエリアが保存していない変更になり、「保存する」で保存できる'
    ]
  }),
  async ({ page }) => {
    const step = startSteps(page);
    await loginAsE2E(page, step, true);
    const areaName = page.getByRole('region', { name: 'エリアの設定' }).getByLabel('エリアの名前');
    // E2E-44 が村の右にエリアを作って保存しているので、村の下に作る
    const south = '[E2E]南の原っぱ';

    await step('RPGマップ作成(/rpg/admin)を開き、はじまりの村の下の「＋」から「' + south + '」(20×20)を作って、右上の端の矢印ではじまりの村に戻る', 'はじまりの村に戻り、左下の端に「' + south + '」の矢印が出る', async () => {
      await page.goto('/rpg/admin');
      await page.getByRole('tab', { name: '🏰 ダンジョン' }).click();
      await page.locator('.layout-grid [data-cell="0,1"]').click();
      const dialog = page.getByRole('dialog', { name: '新しいエリア' });
      await dialog.getByLabel('エリアの名前').fill(south);
      await dialog.getByRole('button', { name: '作る' }).click();
      await expect(dialog).toBeHidden();
      await page.getByRole('tab', { name: '🗺️ エリア' }).click();
      await expect(areaName).toHaveValue(south);
      await clickArrow(page, 'はじまりの村');
      await expect(areaName).toHaveValue('はじまりの村');
    });

    await step(
      'パレットの「その他」(選ぶ・動かす)にして、x 18・y 13 の「道具屋 ミナ」を、左下の端の「' + south + '」の矢印までドラッグして離す',
      '「「道具屋 ミナ」を「' + south + '」へ移しました（x 9 ・ y 0）」と出て、画面ははじまりの村のまま、保存していない変更になる',
      async () => {
        await page.getByRole('complementary', { name: 'パレット' }).getByRole('button', { name: 'その他', exact: true }).click();
        const box = (await page.getByLabel('マップ', { exact: true }).boundingBox())!;
        const [fx, fy] = (await page.evaluate(() => (window as any).rpgAdminTest.tilePosition(18, 13))) as [number, number];
        const [tx, ty] = (await page.evaluate((t) => (window as any).rpgAdminTest.arrowPosition(t), south)) as [number, number];
        await page.mouse.move(box.x + fx, box.y + fy);
        await page.mouse.down();
        await page.mouse.move(box.x + tx, box.y + ty, { steps: 20 });
        await page.mouse.up();
        await expect(page.getByRole('status')).toHaveText(`「道具屋 ミナ」を「${south}」へ移しました（x 9 ・ y 0）`);
        await expect(areaName).toHaveValue('はじまりの村');
        await expect(page.getByText('● 保存していない変更があります')).toBeVisible();
      }
    );

    await step('「保存する」を押す', '保存していない変更がなくなる', async () => {
      await page.getByRole('button', { name: '保存する', exact: true }).click();
      await expect(page.getByText('● 保存していない変更があります')).toBeHidden();
    });

    await step('左下の端の「' + south + '」の矢印を押し、x 9・y 0 のマスを押す', south + 'に切り替わり、「道具屋 ミナ」のNPCの設定が開く', async () => {
      await clickArrow(page, south);
      await expect(areaName).toHaveValue(south);
      await clickTile(page, 9, 0);
      const dialog = page.getByRole('dialog', { name: 'NPC' });
      await expect(dialog.getByLabel('名前', { exact: true })).toHaveValue('道具屋 ミナ');
    });
  }
);

// 村(plain)に置いた柵(front#451)。API から読む
async function savedVillageFences(): Promise<string[]> {
  const login = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: E2E_ADMIN_ACCOUNT.email, password: E2E_ADMIN_ACCOUNT.password })
  });
  const { token } = (await login.json()) as { token: string };
  const res = await fetch(`${API_URL}/graphql`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: '{ rpgMaps { id objects { type x y } } }' })
  });
  const body = (await res.json()) as { data: { rpgMaps: { id: string; objects: { type: string; x: number; y: number }[] }[] } };
  return body.data.rpgMaps
    .find((m) => m.id === 'plain')!
    .objects.filter((o) => o.type.startsWith('fence_'))
    .map((o) => `${o.type} ${o.x},${o.y}`)
    .sort();
}

test(
  'E2E-47 RPGマップ作成で、パレットの「置物」の「木の柵」「鉄の柵」を並べて置き、保存できる(front#451)',
  caseOf({
    precondition: [
      'sandbox が起動している',
      'E2E 専用の管理者のアカウントでログインしている',
      'E2E 用の RPG データで、村の (3, 4)〜(5, 4)・(5, 5)・(3, 11)〜(4, 11) は空いていて、柵は1つも置いていない'
    ],
    expected: [
      'パレットの「置物」に「木の柵」「鉄の柵」がある',
      '「木の柵」で (3, 4)・(4, 4)・(5, 4)・(5, 5) を、「鉄の柵」で (3, 11)・(4, 11) をクリックして「保存する」を押すと、API でも村にその6つの柵が置いてある'
    ]
  }),
  async ({ page }) => {
    const step = startSteps(page);
    await loginAsE2E(page, step, true);
    const palette = page.locator('aside.palette');

    await step('RPGマップ作成(/rpg/admin)を開き、パレットの「置物」を押す', '「木の柵」「鉄の柵」がある', async () => {
      await page.goto('/rpg/admin');
      await palette.getByRole('button', { name: '置物', exact: true }).click();
      await expect(palette.getByRole('button', { name: /木の柵/ })).toBeVisible();
      await expect(palette.getByRole('button', { name: /鉄の柵/ })).toBeVisible();
    });

    await step('「木の柵」で (3, 4)・(4, 4)・(5, 4)・(5, 5) を、「鉄の柵」で (3, 11)・(4, 11) をクリックし、「保存する」を押す', 'API でも村にその6つの柵が置いてある', async () => {
      await palette.getByRole('button', { name: /木の柵/ }).click();
      for (const [x, y] of [[3, 4], [4, 4], [5, 4], [5, 5]]) await clickTile(page, x, y);
      await palette.getByRole('button', { name: /鉄の柵/ }).click();
      for (const [x, y] of [[3, 11], [4, 11]]) await clickTile(page, x, y);
      await page.getByRole('button', { name: '保存する' }).click();
      await expect(page.getByText('保存しました。ゲームに反映されます')).toBeVisible();
      expect(await savedVillageFences()).toEqual(['fence_iron 3,11', 'fence_iron 4,11', 'fence_wood 3,4', 'fence_wood 4,4', 'fence_wood 5,4', 'fence_wood 5,5']);
    });
  }
);
