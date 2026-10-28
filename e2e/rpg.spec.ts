import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { Locator, Page } from '@playwright/test';
import { API_URL, E2E_ACCOUNT, E2E_MATE_ACCOUNT, SANDBOX_DATA_DIR } from './support/env';
import { caseOf, expect, loginAsE2E, startSteps, test } from './support/evidence';

// 前回の実行の続きにならないよう、セーブデータを最初の状態(始まりの草原の村・30G・回復薬×3)に戻す。
// level を上げると、そのレベルまでの分のステータスのポイント((level-1)×3)を、振り分けていない状態で持つ。
// 見た目も最初の見た目(ショート・シャツ)に戻し、受けたクエストもなくす(front#239)。ふっかつ地点も村に戻す(front#337)。
// ポイント交換で使う10ptも足しておく(交換で同じだけ減るので、実行のたびに増え続けない)
async function resetRpg(level = 1, extraItems: { itemId: string; count: number }[] = [], gold = 30): Promise<void> {
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
      level, exp: 0, hp: 50, gold, weapon: 'wood_sword', armor: 'cloth',
      items: [{ itemId: 'potion', count: 3 }, { itemId: 'wood_sword', count: 1 }, { itemId: 'cloth', count: 1 }, ...extraItems],
      area: 'plain', x: 6, y: 7,
      stats: { hp: 0, atk: 0, def: 0, mag: 0, spd: 0, luk: 0 }, statPoints: (level - 1) * 3, quests: [],
      // MP は最大(魔力0なので20)、覚えた魔法はなしに戻す(front#383。送らないと今のまま)
      mp: 20, spells: [], spellLevels: [],
      // ふっかつ地点(front#337)も村の (6, 7) に戻す(送らないと今のまま)
      respawn: { area: 'plain', x: 6, y: 7 },
      look: {
        hair: 'short', hairColor: '#6b3f1f', skin: '#ffe0bd', eyes: 'normal', eyeColor: '#3b2f2f',
        mouth: 'smile', clothes: 'shirt', clothesColor: '#3b82f6', accentColor: '#f8fafc',
        // 眉(front#362)も ふつう・髪の色に合わせる に戻す
        brows: 'normal', browColor: null, hairTop: null, hairBack: null
      }
    }
  });
  await graphql('mutation($amount: Int!, $reason: String) { addPoints(amount: $amount, reason: $reason) { id } }', {
    amount: 10,
    reason: 'E2E RPGのポイント交換用'
  });
}

// 今のセーブデータの復活地点(front#337)。まだ覚えていなければ null
async function savedRespawn(): Promise<{ area: string; x: number; y: number } | null> {
  const login = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: E2E_ACCOUNT.email, password: E2E_ACCOUNT.password })
  });
  const { token } = (await login.json()) as { token: string };
  const res = await fetch(`${API_URL}/graphql`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: '{ rpgSave { respawn { area x y } } }' })
  });
  const body = (await res.json()) as { data: { rpgSave: { respawn: { area: string; x: number; y: number } | null } } };
  return body.data.rpgSave.respawn;
}

// キャンバスの中の、画面上の位置 [x, y] から dy だけ上をクリックする(位置は window.rpgTest から求める)
async function clickCanvas(page: Page, position: [number, number], dy = 0): Promise<void> {
  const box = (await page.getByLabel('RPGのゲーム画面').boundingBox())!;
  await page.mouse.click(box.x + position[0], box.y + position[1] - dy);
}

// キャンバスの中の村人をクリックする(位置は画面が開発用のビルドのときだけ出す window.rpgTest から求める)
async function clickNpc(page: Page, name: string): Promise<void> {
  await expect.poll(() => page.evaluate(() => (window as any).rpgTest?.isIdle())).toBe(true);
  const position = await page.evaluate((n) => (window as any).rpgTest.npcPosition(n) as [number, number], name);
  const box = (await page.getByLabel('RPGのゲーム画面').boundingBox())!;
  // 足元より少し上(体のあたり)をクリックする
  await page.mouse.click(box.x + position[0], box.y + position[1] - 25);
}

// ステータスのモーダルを開き、その項目の値を読んで閉じる
async function statValue(page: Page, label: string): Promise<string> {
  await page.getByRole('button', { name: /ステータス/ }).click();
  const value = (await page.getByRole('dialog', { name: 'ステータス' }).getByLabel(label, { exact: true }).innerText()).trim();
  await page.getByRole('dialog', { name: 'ステータス' }).getByRole('button', { name: '閉じる' }).click();
  return value;
}

async function headerPoints(page: Page): Promise<number> {
  const text = await page.getByTitle('累計ポイント').innerText();
  return Number(text.replace(/[^0-9]/g, ''));
}

test(
  'E2E-09 RPGの設定(歯車)で BGM の音を消すと、画面を開き直しても消えたまま',
  caseOf({
    precondition: ['sandbox が起動している', 'E2E 専用のアカウントでログインしている', 'この端末のブラウザに覚えた BGM の設定を消してある'],
    expected: [
      '右上の歯車を押すと設定が開き、BGM の「音を消す」ボタンと音量のスライダーがある',
      '「音を消す」を押すと「音を出す」に変わる',
      'ゲーム画面をクリックすると設定が閉じる',
      '画面を開き直して設定を開いても、音を消したまま(「音を出す」)になっている'
    ]
  }),
  async ({ page }) => {
    const step = startSteps(page);
    await loginAsE2E(page, step);
    const settings = page.getByRole('dialog', { name: '設定' });

    await step('RPG(/rpg)を開き、右上の歯車(設定)を押す', '設定が開き、「音を消す」ボタンと音量のスライダーがある', async () => {
      await page.goto('/rpg');
      await page.evaluate(() => localStorage.removeItem('rpgBgmSettings'));
      await page.reload();
      await page.getByRole('button', { name: '設定' }).click();
      await expect(settings.getByRole('button', { name: '音を消す' })).toBeVisible();
      await expect(settings.getByRole('slider', { name: '音量' })).toBeVisible();
    });

    await step('「音を消す」を押す', '「音を出す」に変わる', async () => {
      await settings.getByRole('button', { name: '音を消す' }).click();
      await expect(settings.getByRole('button', { name: '音を出す' })).toBeVisible();
    });

    await step('ゲーム画面をクリックする', '設定が閉じる', async () => {
      await page.getByLabel('RPGのゲーム画面').click({ position: { x: 40, y: 200 } });
      await expect(settings).toHaveCount(0);
    });

    await step('画面を読み込み直して、歯車(設定)を押す', '音を消したまま(「音を出す」)になっている', async () => {
      await page.reload();
      await page.getByRole('button', { name: '設定' }).click();
      await expect(settings.getByRole('button', { name: '音を出す' })).toBeVisible();
      await page.evaluate(() => localStorage.removeItem('rpgBgmSettings'));
    });
  }
);

test(
  'E2E-13 RPGの設定(歯車)でショートカットキーに道具を登録すると、そのキーで使え、画面を開き直しても残っている',
  caseOf({
    precondition: [
      'sandbox が起動している',
      'E2E 専用のアカウントでログインしている',
      'セーブデータが最初の状態(HP満タン・回復薬×3・上回復薬なし)',
      'この端末のブラウザに覚えたショートカットの設定を消してある'
    ],
    expected: [
      '左上に、はじめの設定のショートカット「1 回復薬 ×3」「2 上回復薬 ×0」が出る',
      '歯車(設定)の「ショートカット」で 3キーに回復薬を選ぶと、左上に「3 回復薬 ×3」が増える',
      '2キーを押すと、ログに「上回復薬を持っていない」と出る',
      '3キーを押すと、回復薬を使おうとして、ログに「HPは満タンだ」と出る',
      '画面を読み込み直しても、3キーは回復薬のまま(設定・左上の表示とも)'
    ]
  }),
  async ({ page }) => {
    const step = startSteps(page);
    await loginAsE2E(page, step);
    await resetRpg();
    const settings = page.getByRole('dialog', { name: '設定' });
    const chips = page.locator('.hud .chip.shortcut');
    const log = page.getByRole('region', { name: 'ログ' });

    await step('RPG(/rpg)を開く', '左上に「1 回復薬 ×3」「2 上回復薬 ×0」が出る', async () => {
      await page.goto('/rpg');
      await page.evaluate(() => localStorage.removeItem('rpgShortcuts'));
      await page.reload();
      await expect(chips).toHaveText(['1回復薬 ×3', '2上回復薬 ×0']);
    });

    await step('歯車(設定)を開き、「ショートカット」の 3キーで回復薬を選ぶ', '左上に「3 回復薬 ×3」が増える', async () => {
      await page.getByRole('button', { name: '設定' }).click();
      await settings.getByLabel('3キーで使う道具').selectOption({ label: '🧪 回復薬' });
      await expect(chips).toHaveText(['1回復薬 ×3', '2上回復薬 ×0', '3回復薬 ×3']);
    });

    await step('ゲーム画面をクリックして設定を閉じ、2キーを押す', 'ログに「上回復薬を持っていない」と出る', async () => {
      await page.getByLabel('RPGのゲーム画面').click({ position: { x: 40, y: 200 } });
      await expect(settings).toHaveCount(0);
      await page.keyboard.press('2');
      await expect(log.getByText('上回復薬を持っていない')).toBeVisible();
    });

    await step('3キーを押す', 'HPが満タンなので、ログに「HPは満タンだ」と出る(回復薬は減らない)', async () => {
      await page.keyboard.press('3');
      await expect(log.getByText('HPは満タンだ')).toBeVisible();
      await expect(chips.nth(2)).toHaveText('3回復薬 ×3');
    });

    await step('画面を読み込み直して、歯車(設定)を開く', '3キーは回復薬のまま(設定・左上の表示とも)', async () => {
      await page.reload();
      await expect(chips).toHaveText(['1回復薬 ×3', '2上回復薬 ×0', '3回復薬 ×3']);
      await page.getByRole('button', { name: '設定' }).click();
      await expect(settings.getByLabel('3キーで使う道具')).toHaveValue('potion');
      await page.evaluate(() => localStorage.removeItem('rpgShortcuts'));
    });
  }
);

test(
  'E2E-16 RPGで、鍛冶屋に話しかけ、素材とゴールドで装備を作ると、持ち物に入り、開き直しても残っている',
  caseOf({
    precondition: [
      'sandbox が起動している',
      'E2E 専用のアカウントでログインしている',
      'セーブデータが最初の状態(30G)で、素材のスライムゼリーを6つ持っている',
      'はじまりの村に「鍛冶屋 ゴンゾウ」がいる(E2E 用のマップのデータ)'
    ],
    expected: [
      '持ち物のスライムゼリーには「素材」の印が付き、使う・装備するボタンはない',
      '鍛冶屋に話しかけると、会話のあとに鍛冶屋が開き、ゼリーの服(スライムゼリー 6/5・20G)は作れ、牙の剣(恐竜の牙 0/3)は作れない',
      'ゼリーの服を作ると、ログに「ゼリーの服を作った！（-20G）」と出て、10G・スライムゼリー×1 になり、持ち物にゼリーの服が入る',
      '画面を開き直しても、ゼリーの服・スライムゼリー×1・10G のまま'
    ]
  }),
  async ({ page }) => {
    const step = startSteps(page);
    await loginAsE2E(page, step);
    await resetRpg(1, [{ itemId: 'slime_jelly', count: 6 }]);
    const items = page.getByRole('region', { name: '持ち物' });
    const status = page.getByRole('region', { name: 'プレイヤーの状態' });
    const smith = page.getByRole('dialog', { name: '鍛冶屋' });
    const jelly = items.locator('.inv-row', { hasText: 'スライムゼリー' });

    await step('RPG(/rpg)を開く', '持ち物のスライムゼリー(×6)に「素材」の印が付き、ボタンはない', async () => {
      await page.goto('/rpg');
      await expect(status.getByText('30G')).toBeVisible();
      await expect(jelly).toContainText('×6');
      await expect(jelly).toContainText('素材');
      // 使う・装備するボタンはない(捨てる 🗑 はある。front#391)
      await expect(jelly.getByRole('button', { name: /を使う|を装備する/ })).toHaveCount(0);
      await expect(jelly.getByRole('button', { name: 'スライムゼリーを捨てる' })).toBeVisible();
    });

    await step('鍛冶屋 ゴンゾウに話しかけ、セリフを進める', '鍛冶屋が開き、ゼリーの服は「作る」を押せ、牙の剣は押せない', async () => {
      await clickNpc(page, '鍛冶屋 ゴンゾウ');
      const dialog = page.getByRole('dialog', { name: '鍛冶屋 ゴンゾウとの会話' });
      await dialog.waitFor();
      for (let i = 0; i < 5 && (await dialog.isVisible()); i++) await dialog.click();
      await expect(smith).toBeVisible();
      await expect(smith.getByText('スライムゼリー 6/5')).toBeVisible();
      await expect(smith.getByRole('button', { name: 'ゼリーの服を作る', exact: true })).toBeEnabled();
      await expect(smith.getByRole('button', { name: '牙の剣を作る', exact: true })).toBeDisabled();
    });

    await step('ゼリーの服の「作る」を押す', 'ログに「ゼリーの服を作った！（-20G）」と出て、10G・スライムゼリー×1 になり、持ち物にゼリーの服が入る', async () => {
      await smith.getByRole('button', { name: 'ゼリーの服を作る', exact: true }).click();
      await expect(page.getByRole('region', { name: 'ログ' }).getByText('ゼリーの服を作った！（-20G）')).toBeVisible();
      await expect(smith.getByRole('button', { name: 'ゼリーの服を持っている', exact: true })).toBeDisabled();
      await smith.getByRole('button', { name: '閉じる' }).click();
      await expect(status.getByText('10G')).toBeVisible();
      await expect(jelly).toContainText('×1');
      await expect(items.getByText('ゼリーの服')).toBeVisible();
    });

    await step('画面を読み込み直す', 'ゼリーの服・スライムゼリー×1・10G のまま', async () => {
      await page.reload();
      await expect(status.getByText('10G')).toBeVisible();
      await expect(jelly).toContainText('×1');
      await expect(items.getByText('ゼリーの服')).toBeVisible();
    });
  }
);

test(
  'E2E-15 RPGの設定(歯車)で効果音を鳴らさないようにし、音量を変えると、画面を開き直しても残っている',
  caseOf({
    precondition: ['sandbox が起動している', 'E2E 専用のアカウントでログインしている', 'この端末のブラウザに覚えた効果音の設定を消してある'],
    expected: [
      '歯車(設定)に、BGM とは別に「効果音」の「効果音を鳴らさない」ボタンとボリュームがある(はじめは 80)',
      '「効果音を鳴らさない」を押すと「効果音を鳴らす」に変わり、ボリュームを 30 にできる。BGM のボタンは「音を消す」のまま',
      '画面を読み込み直しても、効果音は鳴らさないまま・ボリュームは 30 のまま'
    ]
  }),
  async ({ page }) => {
    const step = startSteps(page);
    await loginAsE2E(page, step);
    const settings = page.getByRole('dialog', { name: '設定' });
    const volume = settings.getByRole('slider', { name: '効果音のボリューム' });

    await step('RPG(/rpg)を開き、歯車(設定)を押す', '「効果音を鳴らさない」ボタンと、80 のボリュームがある', async () => {
      await page.goto('/rpg');
      await page.evaluate(() => localStorage.removeItem('rpgSeSettings'));
      await page.reload();
      await page.getByRole('button', { name: '設定' }).click();
      await expect(settings.getByRole('button', { name: '効果音を鳴らさない' })).toBeVisible();
      await expect(volume).toHaveValue('80');
    });

    await step('「効果音を鳴らさない」を押し、ボリュームを 30 にする', '「効果音を鳴らす」に変わる。BGM のボタンは「音を消す」のまま', async () => {
      await settings.getByRole('button', { name: '効果音を鳴らさない' }).click();
      await volume.fill('30');
      await expect(settings.getByRole('button', { name: '効果音を鳴らす' })).toBeVisible();
      await expect(settings.getByRole('button', { name: '音を消す', exact: true })).toBeVisible();
    });

    await step('画面を読み込み直して、歯車(設定)を押す', '効果音は鳴らさないまま・ボリュームは 30 のまま', async () => {
      await page.reload();
      await page.getByRole('button', { name: '設定' }).click();
      await expect(settings.getByRole('button', { name: '効果音を鳴らす' })).toBeVisible();
      await expect(volume).toHaveValue('30');
      await page.evaluate(() => localStorage.removeItem('rpgSeSettings'));
    });
  }
);

test(
  'E2E-14 RPGで、フィールドに落ちたアイテムをクリックすると、歩いて拾い、持ち物に入る',
  caseOf({
    precondition: [
      'sandbox が起動している',
      'E2E 専用のアカウントでログインしている',
      'セーブデータが最初の状態(回復薬×3)',
      'プレイヤーの近くに回復薬を1つ落としておく(テスト用の入り口 rpgTest.dropNearPlayer。敵を倒して落ちる動きは単体テストで見ている)'
    ],
    expected: [
      '落ちた回復薬は、拾うまで持ち物の数に入らない(×3 のまま)',
      '落ちた回復薬をクリックすると、そこまで歩いて拾い、ログに「回復薬を拾った」と出る',
      '持ち物の回復薬が ×4 になる'
    ]
  }),
  async ({ page }) => {
    const step = startSteps(page);
    await loginAsE2E(page, step);
    await resetRpg();
    const items = page.getByRole('region', { name: '持ち物' });
    const log = page.getByRole('region', { name: 'ログ' });
    let at: [number, number] = [0, 0];

    await step('RPG(/rpg)を開き、プレイヤーの近くに回復薬を1つ落とす', '持ち物の回復薬は ×3 のまま', async () => {
      await page.goto('/rpg');
      await expect.poll(() => page.evaluate(() => (window as any).rpgTest?.isIdle())).toBe(true);
      at = await page.evaluate(() => (window as any).rpgTest.dropNearPlayer('potion', 1) as [number, number]);
      // 飛び出して落ちきるまで待つ
      await page.waitForTimeout(700);
      await expect(items.getByText('×3')).toBeVisible();
    });

    await step('落ちた回復薬をクリックする', '歩いて拾い、ログに「回復薬を拾った」と出て、持ち物の回復薬が ×4 になる', async () => {
      const box = (await page.getByLabel('RPGのゲーム画面').boundingBox())!;
      await page.mouse.click(box.x + at[0], box.y + at[1] - 10);
      await expect(log.getByText('回復薬を拾った')).toBeVisible();
      await expect(items.getByText('×4')).toBeVisible();
    });
  }
);

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
    // ゲーム画面の左下のパネル(レベル・お金・HP・経験値)
    const status = page.getByRole('region', { name: 'プレイヤーの状態' });
    const equipment = page.getByRole('region', { name: '装備' });
    const items = page.getByRole('region', { name: '持ち物' });
    let pointsBefore = 0;

    await step('RPG(/rpg)を開く', '始まりの草原の村から、Lv 1・30G・回復薬×3・木の剣を装備した状態で始まる', async () => {
      await page.goto('/rpg');
      // エリアに入った直後に、画面の中央に大きく出るエリア名
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

    await step('持ち物の銅の剣の「装備する」を押す', '装備欄の武器が銅の剣になり、ステータスの攻撃が 8 から 12 に上がる', async () => {
      expect(await statValue(page, '攻撃')).toBe('8');
      await page.getByRole('button', { name: '銅の剣を装備する' }).click();
      await expect(equipment.getByText('銅の剣')).toBeVisible();
      expect(await statValue(page, '攻撃')).toBe('12');
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

test(
  'E2E-10 RPGで、レベルアップでもらったポイントをステータスに振り分けると、開き直しても残っている',
  caseOf({
    precondition: ['sandbox が起動している', 'E2E 専用のアカウントでログインしている', 'RPGのセーブデータを Lv2・振り分けていないポイント3 にしてある'],
    expected: [
      'ゲーム画面の左下のパネルに Lv 2 と出て、「ステータス」ボタンに振り分けていないポイント「+3」が出る',
      'ステータスを開き、攻撃を2・HPを1増やすと「のこり 0 ポイント」になり、攻撃 14・HP 62 と出る',
      '「決める」を押すと、ボタンの「+3」が消える',
      '画面を開き直しても、攻撃 14・HP 62 のまま'
    ]
  }),
  async ({ page }) => {
    const step = startSteps(page);
    await resetRpg(2);
    await loginAsE2E(page, step);
    const status = page.getByRole('region', { name: 'プレイヤーの状態' });
    const modal = page.getByRole('dialog', { name: 'ステータス' });

    await step('RPG(/rpg)を開く', '左下のパネルに Lv 2 と、振り分けていないポイント「+3」が出る', async () => {
      await page.goto('/rpg');
      await expect(status.getByText('Lv 2')).toBeVisible();
      await expect(status.getByLabel('振り分けていないポイント 3')).toBeVisible();
    });

    await step('「ステータス」を開き、攻撃の＋を2回・HPの＋を1回押す', '「のこり 0 ポイント」になり、攻撃 14・HP 62 と出る', async () => {
      await status.getByRole('button', { name: /ステータス/ }).click();
      await modal.getByRole('button', { name: '攻撃を増やす' }).click();
      await modal.getByRole('button', { name: '攻撃を増やす' }).click();
      await modal.getByRole('button', { name: 'HPを増やす' }).click();
      await expect(modal.getByText('のこり 0 ポイント')).toBeVisible();
      await expect(modal.getByLabel('攻撃', { exact: true })).toContainText('14');
      await expect(modal.getByLabel('HP', { exact: true })).toContainText('62');
    });

    await step('「決める」を押して閉じる', 'ボタンの「+3」が消える', async () => {
      await modal.getByRole('button', { name: '決める' }).click();
      await modal.getByRole('button', { name: '閉じる' }).click();
      await expect(status.getByLabel('振り分けていないポイント 3')).toHaveCount(0);
    });

    await step('画面を読み込み直す', '攻撃 14・HP 62 のまま', async () => {
      await page.reload();
      await expect(status.getByText('Lv 2')).toBeVisible();
      expect(await statValue(page, '攻撃')).toBe('14');
      expect(await statValue(page, 'HP')).toBe('62');
    });
  }
);

test(
  'E2E-11 RPGで、プレイヤーの見た目を変えると、開き直しても残っている',
  caseOf({
    precondition: ['sandbox が起動している', 'E2E 専用のアカウントでログインしている', 'RPGのセーブデータを最初の状態(ショート・ふつうの目・シャツ)に戻してある'],
    expected: [
      'サイド欄の「見た目を変える」を押すと「見た目」の画面が開き、部品ごとに1行で今の見た目(ショート・眉ふつう・目ふつう・シャツ)が出ている(front#362)',
      '目を「メガネ」にしても、目の色の欄は残る(メガネ越しに目が見える。front#361)',
      '「やめる」で閉じると、見た目は変わらない',
      '< > で髪型・眉・目・服を、「くわしく」を開いて髪のトップ・後ろを(front#370)、色の丸から服の色・眉の色を、カスタムで髪の色を選んで「決める」を押すと、画面が閉じ、ログに「見た目を変えた」と出る',
      '画面を読み込み直して「見た目を変える」を開いても、選んだ見た目のまま'
    ]
  }),
  async ({ page }) => {
    const step = startSteps(page);
    await resetRpg();
    await loginAsE2E(page, step);
    const dialog = page.getByRole('dialog', { name: '見た目' });
    // 部品の1行(名前・< 部品 >・色)
    const row = (label: string) => dialog.getByRole('group', { name: label, exact: true });
    const part = (label: string) => row(label).locator('.name');
    const next = (label: string, times = 1) => clickTimes(dialog.getByRole('button', { name: `${label} 次へ` }), times);
    const prev = (label: string, times = 1) => clickTimes(dialog.getByRole('button', { name: `${label} 前へ` }), times);
    const chip = (label: string, color: string) => row(label).getByRole('button', { name: new RegExp(color) });

    await step('RPG(/rpg)を開き、サイド欄の「見た目を変える」を押す', '「見た目」の画面が開き、髪型 ショート・眉 ふつう(眉の色は髪に合わせる)・目 ふつう・服 シャツと出る', async () => {
      await page.goto('/rpg');
      await page.getByRole('button', { name: '🧑 見た目を変える' }).click();
      await expect(part('髪型')).toContainText('ショート');
      await expect(part('眉')).toContainText('ふつう');
      await expect(chip('眉', '眉の色')).toContainText('髪に合わせる');
      await expect(part('目')).toContainText('ふつう');
      await expect(part('服')).toContainText('シャツ');
    });

    await step('目の「前へ」を押して「メガネ」にする', '目の色の欄は残っている', async () => {
      await prev('目');
      await expect(part('目')).toContainText('メガネ');
      await expect(chip('目', '目の色')).toBeVisible();
    });

    await step('「やめる」で閉じて、もう一度開く', '目は「ふつう」のまま', async () => {
      await dialog.getByRole('button', { name: 'やめる' }).click();
      await expect(dialog).toHaveCount(0);
      await page.getByRole('button', { name: '🧑 見た目を変える' }).click();
      await expect(part('目')).toContainText('ふつう');
    });

    await step(
      'ポニーテール・カスタムの髪の色(#123456)・トップ とんがり・後ろ 外ハネ・山なりの眉・赤い眉・メガネ・セーラー服・紫の服を選んで「決める」を押す',
      '画面が閉じ、ログに「見た目を変えた」と出る',
      async () => {
        await next('髪型', 2);
        await expect(part('髪型')).toContainText('ポニーテール');
        // 髪のトップ・後ろ(front#370)は「くわしく」を開くと出る。選んでいなければ髪型どおり
        await expect(row('トップ')).toHaveCount(0);
        await dialog.getByRole('button', { name: /くわしく/ }).click();
        await expect(part('トップ')).toContainText('いまは まん中分け');
        await next('トップ', 5);
        await expect(part('トップ')).toContainText('とんがり');
        await next('後ろ', 4);
        await expect(part('後ろ')).toContainText('外ハネ');
        await chip('髪型', '髪の色').click();
        await dialog.getByLabel('髪の色 カスタム').fill('#123456');
        await next('眉', 3);
        await expect(part('眉')).toContainText('山なり');
        await chip('眉', '眉の色').click();
        await dialog.getByRole('button', { name: '眉の色 #dc2626' }).click();
        await prev('目');
        // 服の最後はセーラー服
        await prev('服');
        await expect(part('服')).toContainText('セーラー服');
        await chip('服', '服の色').click();
        await dialog.getByRole('button', { name: '服の色 #8b5cf6' }).click();
        await dialog.getByRole('button', { name: '決める' }).click();
        await expect(dialog).toHaveCount(0);
        await expect(page.getByRole('region', { name: 'ログ' }).getByText('見た目を変えた')).toBeVisible();
      }
    );

    await step('画面を読み込み直して「見た目を変える」を押す', 'ポニーテール(トップ とんがり・後ろ 外ハネ)・カスタムの髪の色・山なりの赤い眉・メガネ・紫のセーラー服のまま', async () => {
      // 見た目は「決める」ですぐ保存する。保存が終わるのを待ってから読み込み直す
      await page.waitForLoadState('networkidle');
      await page.reload();
      await page.getByRole('button', { name: '🧑 見た目を変える' }).click();
      await expect(part('髪型')).toContainText('ポニーテール');
      await expect(part('眉')).toContainText('山なり');
      await expect(part('目')).toContainText('メガネ');
      await expect(part('服')).toContainText('セーラー服');
      await dialog.getByRole('button', { name: /くわしく/ }).click();
      await expect(part('トップ')).toContainText('とんがり');
      await expect(part('後ろ')).toContainText('外ハネ');
      await chip('髪型', '髪の色').click();
      await expect(row('髪型').locator('.custom')).toContainText('#123456');
      await chip('眉', '眉の色').click();
      await expect(dialog.getByRole('button', { name: '眉の色 #dc2626' })).toHaveAttribute('aria-pressed', 'true');
      await chip('服', '服の色').click();
      await expect(dialog.getByRole('button', { name: '服の色 #8b5cf6' })).toHaveAttribute('aria-pressed', 'true');
    });
  }
);

// ボタンを決まった回数押す
async function clickTimes(button: Locator, times: number): Promise<void> {
  for (let i = 0; i < times; i++) await button.click();
}

test(
  'E2E-12 RPGで、村長のクエストを受けてスライムを3体たおし、報告すると報酬をもらえ、開き直しても終わったまま',
  caseOf({
    precondition: [
      'sandbox が起動している',
      'E2E 専用のアカウントでログインしている',
      'RPGのセーブデータを最初の状態(30G・受けたクエストなし)に戻してある',
      '始まりの草原の村長 ゴロウが、最初のクエスト「スライム退治(スライムを3体たおす)」を持っている'
    ],
    expected: [
      '村長 ゴロウの頭に「!」が出ている',
      '村長に話しかけ、依頼のセリフを進めると「引き受ける」が出て、引き受けると右の「クエスト」欄にスライム退治(0/3)が出る',
      'スライムを3体たおすと、クエスト欄に「報告できます」、村長の頭に「?」が出る',
      '村長に報告すると、ログに達成と報酬が出て、ゴールドが50増え、回復薬が2つ増える',
      '画面を開き直しても、クエスト欄は空で、村長の頭に印は出ない'
    ]
  }),
  async ({ page }) => {
    const step = startSteps(page);
    await resetRpg();
    await loginAsE2E(page, step);
    const quests = page.getByRole('region', { name: 'クエスト' });
    const status = page.getByRole('region', { name: 'プレイヤーの状態' });
    const items = page.getByRole('region', { name: '持ち物' });
    const mark = () => page.evaluate(() => (window as any).rpgTest?.questMark('村長 ゴロウ'));
    const dialog = page.getByRole('dialog', { name: '村長 ゴロウとの会話' });

    await step('RPG(/rpg)を開く', '村長 ゴロウの頭に「!」が出ている', async () => {
      await page.goto('/rpg');
      await expect(status.getByText('30G')).toBeVisible();
      await expect.poll(mark).toBe('!');
    });

    await step('村長 ゴロウに話しかけ、セリフを進めて「引き受ける」を押す', '右の「クエスト」欄に「スライム退治」と「スライムをたおす（0/3）」が出る', async () => {
      await clickNpc(page, '村長 ゴロウ');
      await dialog.waitFor();
      const accept = dialog.getByRole('button', { name: '引き受ける' });
      for (let i = 0; i < 10 && !(await accept.isVisible()); i++) await dialog.click();
      await accept.click();
      await expect(quests.getByText('スライム退治')).toBeVisible();
      await expect(quests.getByText(/スライムをたおす（0\/3）/)).toBeVisible();
      expect(await mark()).toBeNull();
    });

    await step('スライムを3体たおす', 'クエスト欄に「報告できます」、村長の頭に「?」が出る', async () => {
      for (let i = 0; i < 3; i++) expect(await page.evaluate(() => (window as any).rpgTest.defeat('slime'))).toBe(true);
      await expect(quests.getByText('? 報告できます')).toBeVisible();
      await expect.poll(mark).toBe('?');
    });

    await step('村長 ゴロウに話しかけ、報告のセリフを最後まで進める', 'ログに達成と報酬が出て、ゴールドが50増え、回復薬が×5になる', async () => {
      const goldBefore = Number((await status.getByText(/\d+G/).innerText()).replace(/[^0-9]/g, ''));
      await clickNpc(page, '村長 ゴロウ');
      await dialog.waitFor();
      // 最後のセリフで会話が閉じるので、見えていると判定した直後に閉じていることがある。待ち続けないよう、クリックは短く待つ(front#260)
      for (let i = 0; i < 10 && (await dialog.isVisible()); i++) await dialog.click({ timeout: 2000 }).catch(() => undefined);
      await expect(page.getByRole('region', { name: 'ログ' }).getByText(/クエスト「スライム退治」を達成した！ 50G・回復薬×2 を手に入れた/)).toBeVisible();
      await expect(status.getByText(`${goldBefore + 50}G`)).toBeVisible();
      await expect(items.getByText('×5')).toBeVisible();
    });

    await step('画面を読み込み直す', 'クエスト欄は空で、村長の頭に印は出ない', async () => {
      await page.reload();
      await expect(quests.getByText('受けているクエストはありません。', { exact: false })).toBeVisible();
      await expect.poll(mark).toBeNull();
    });
  }
);

test(
  'E2E-17 RPGで、木のおけをクリックすると、歩いて叩いて1回で壊し、中からドブネズミが現れる',
  caseOf({
    precondition: [
      'sandbox が起動している',
      'E2E 専用のアカウントでログインしている',
      'セーブデータが最初の状態(始まりの草原の村の (6, 7))',
      'E2E 用の RPG データで、村の (4, 7) に木のおけ(中身はドブネズミ)を置いてある(front#321)'
    ],
    expected: [
      '木のおけ(front#321 で足した置物)をクリックすると、そこまで歩いて叩き、1回で壊れる',
      'ログに「木のおけの中からドブネズミが現れた！」と出る(ネズミの形の敵 front#321)'
    ]
  }),
  async ({ page }) => {
    const step = startSteps(page);
    await loginAsE2E(page, step);
    await resetRpg();
    const log = page.getByRole('region', { name: 'ログ' });

    await step('RPG(/rpg)を開き、村の (4, 7) の木のおけをクリックする', '歩いて叩いて壊し、ログに「木のおけの中からドブネズミが現れた！」と出る', async () => {
      await page.goto('/rpg');
      await expect.poll(() => page.evaluate(() => (window as any).rpgTest?.isIdle())).toBe(true);
      const [x, y] = (await page.evaluate(() => (window as any).rpgTest.tilePosition(4, 7))) as [number, number];
      const box = (await page.getByLabel('RPGのゲーム画面').boundingBox())!;
      // 木のおけの胴(足元から少し上)をクリックする
      await page.mouse.click(box.x + x, box.y + y - 10);
      await expect(log.getByText('木のおけの中からドブネズミが現れた！')).toBeVisible();
    });
  }
);

test(
  'E2E-18 RPGで、セーブポイントをクリックすると、歩いて調べ、立っていたマスがふっかつ地点として保存される',
  caseOf({
    precondition: [
      'sandbox が起動している',
      'E2E 専用のアカウントでログインしている',
      'セーブデータが最初の状態(始まりの草原の村の (6, 7))で、ふっかつ地点も村の (6, 7)',
      'E2E 用の RPG データで、村の (9, 5) にセーブポイントを置いてある(front#337)'
    ],
    expected: [
      'セーブポイント(front#337 で足した置物)をクリックすると、そばまで歩いて調べ、「ここを ふっかつ地点にした。」と出る',
      'ログに「ふっかつ地点を はじまりの村 にした」と出る',
      '画面を離れると保存され、セーブデータのふっかつ地点が、村のセーブポイントのとなりのマスになる'
    ]
  }),
  async ({ page }) => {
    const step = startSteps(page);
    await loginAsE2E(page, step);
    await resetRpg();
    const log = page.getByRole('region', { name: 'ログ' });

    await step('RPG(/rpg)を開き、村の (9, 5) のセーブポイントをクリックする', '歩いて調べ、「ここを ふっかつ地点にした。」と、ログに「ふっかつ地点を はじまりの村 にした」と出る', async () => {
      await page.goto('/rpg');
      await expect.poll(() => page.evaluate(() => (window as any).rpgTest?.isIdle())).toBe(true);
      const [x, y] = (await page.evaluate(() => (window as any).rpgTest.tilePosition(9, 5))) as [number, number];
      const box = (await page.getByLabel('RPGのゲーム画面').boundingBox())!;
      // 浮かんでいる石(足元から少し上)をクリックする
      await page.mouse.click(box.x + x, box.y + y - 20);
      await expect(page.getByText('ここを ふっかつ地点にした。', { exact: false })).toBeVisible();
      await expect(log.getByText('ふっかつ地点を はじまりの村 にした')).toBeVisible();
    });

    await step('ダッシュボードへ移って保存させ、セーブデータを読む', 'ふっかつ地点が、村のセーブポイント (9, 5) のとなりのマスになっている', async () => {
      await page.goto('/');
      await expect.poll(async () => (await savedRespawn())?.x).not.toBe(6);
      const respawn = (await savedRespawn())!;
      expect(respawn.area).toBe('plain');
      expect(Math.max(Math.abs(respawn.x - 9), Math.abs(respawn.y - 5))).toBe(1);
    });
  }
);

// ===== 集会場・仲間(front#358) =====

type SandboxUser = { id: number; email: string };
type SandboxSave = { user_id: number; level: number; exp: number; items: { item_id: string; count: number }[]; party?: number[]; spells?: string[] };

const readJson = <T>(file: string): T => JSON.parse(readFileSync(path.join(SANDBOX_DATA_DIR, file), 'utf8')) as T;
const writeJson = (file: string, data: unknown) => writeFileSync(path.join(SANDBOX_DATA_DIR, file), JSON.stringify(data, null, 2), 'utf8');
const userIdOf = (email: string) => readJson<SandboxUser[]>('users.json').find((u) => u.email === email)!.id;

/**
 * 仲間の役のアカウント(E2E_MATE_ACCOUNT)を、集会場に登録していない・まだRPGを遊んでいない状態に戻し、
 * E2E のアカウントのパーティも空にする。
 * 仲間の役のアカウントで API を使うと「本人が遊んでいる」扱いになって呼べなくなるため、sandbox のファイルを直す(API は毎回ファイルを読む)
 */
function resetParty(): void {
  const mate = userIdOf(E2E_MATE_ACCOUNT.email);
  const me = userIdOf(E2E_ACCOUNT.email);
  if (existsSync(path.join(SANDBOX_DATA_DIR, 'rpg_hall.json'))) {
    writeJson('rpg_hall.json', readJson<{ user_id: number }[]>('rpg_hall.json').filter((h) => h.user_id !== mate));
  }
  const saves = readJson<SandboxSave[]>('rpg_saves.json')
    .filter((s) => s.user_id !== mate)
    .map((s) => (s.user_id === me ? { ...s, party: [] } : s));
  writeJson('rpg_saves.json', saves);
}

/** 仲間の役のアカウントのセーブデータ(sandbox のファイルを読む)。まだなければ undefined */
function mateSave(): SandboxSave | undefined {
  const mate = userIdOf(E2E_MATE_ACCOUNT.email);
  return readJson<SandboxSave[]>('rpg_saves.json').find((s) => s.user_id === mate);
}

test(
  'E2E-24 RPGで、集会場に仲間を招待して呼ぶと、いっしょに冒険でき、経験値を分け合い、道具を渡せる。開き直しても仲間がいる',
  caseOf({
    precondition: [
      'sandbox が起動している',
      'E2E 専用のアカウントでログインしている',
      'セーブデータが最初の状態で、いのちの羽を1つ持っている。パーティは空',
      '仲間の役のアカウント(E2E仲間)は、集会場に登録しておらず、まだRPGを遊んでいない',
      'はじまりの村に「集会場の受付 リン」がいる(E2E 用のマップのデータ)'
    ],
    expected: [
      '受付に話しかけると、集会場が開き「招待メールを送る」「仲間を呼ぶ」を選べる',
      '仲間の役のメールアドレスで招待すると「E2E仲間さんに招待メールを送りました。集会場に登録しました！」と出る',
      '「仲間を呼ぶ」に E2E仲間(Lv 1)が出て、押すと「E2E仲間が仲間になった！」と出る。もう一度は押せない(パーティにいる)',
      '左下の自分の状態の右に E2E仲間のHPが出て、右の欄に「仲間（1/3人）」が出る',
      'いのちの羽を E2E仲間に渡すと、E2E仲間の持ち物に いのちの羽×1 が入り、自分の持ち物から消える',
      'スライムをたおすと、ログに「経験値6を2人で分けて+3」と出て、E2E仲間のアカウントのセーブデータの経験値が増えている',
      '画面を開き直しても、E2E仲間がパーティにいて、いのちの羽×1 を持っている',
      '「別れる」を押すと、仲間の欄と左下のHPが消え、ログに「E2E仲間と別れた。集会場に戻っていった」と出る'
    ]
  }),
  async ({ page }) => {
    const step = startSteps(page);
    await loginAsE2E(page, step);
    await resetRpg(1, [{ itemId: 'life_feather', count: 1 }]);
    resetParty();
    const hall = page.getByRole('dialog', { name: '集会場' });
    const party = page.getByRole('region', { name: '仲間', exact: true });
    const hud = page.getByRole('region', { name: '仲間の状態' });
    const items = page.getByRole('region', { name: '持ち物' });
    const log = page.getByRole('region', { name: 'ログ' });

    await step('RPG(/rpg)を開き、集会場の受付 リンに話しかけ、セリフを進める', '集会場が開き「招待メールを送る」「仲間を呼ぶ」を選べる', async () => {
      await page.goto('/rpg');
      await expect(items.getByText('いのちの羽')).toBeVisible();
      await clickNpc(page, '集会場の受付 リン');
      const dialog = page.getByRole('dialog', { name: '集会場の受付 リンとの会話' });
      await dialog.waitFor();
      for (let i = 0; i < 5 && (await dialog.isVisible()); i++) await dialog.click();
      await expect(hall.getByRole('button', { name: '✉ 招待メールを送る' })).toBeVisible();
      await expect(hall.getByRole('button', { name: '🤝 仲間を呼ぶ' })).toBeVisible();
    });

    await step('「招待メールを送る」を押し、仲間の役のメールアドレスを入れて「送る」を押す', '「E2E仲間さんに招待メールを送りました。集会場に登録しました！」と出る', async () => {
      await hall.getByRole('button', { name: '✉ 招待メールを送る' }).click();
      await hall.getByLabel('招待するメールアドレス').fill(E2E_MATE_ACCOUNT.email);
      await hall.getByRole('button', { name: '送る' }).click();
      await expect(hall.getByText('E2E仲間さんに招待メールを送りました。集会場に登録しました！')).toBeVisible();
    });

    await step('「もどる」→「仲間を呼ぶ」を押し、E2E仲間を押す', '「E2E仲間が仲間になった！」と出て、E2E仲間はもう押せない(パーティにいる)', async () => {
      await hall.getByRole('button', { name: 'もどる' }).click();
      await hall.getByRole('button', { name: '🤝 仲間を呼ぶ' }).click();
      const mate = hall.getByRole('button', { name: 'E2E仲間を呼ぶ' });
      await expect(mate).toContainText('Lv 1');
      await mate.click();
      await expect(hall.getByText('E2E仲間が仲間になった！')).toBeVisible();
      await expect(mate).toBeDisabled();
      await expect(mate).toContainText('パーティにいる');
    });

    await step('集会場を閉じる', '左下に E2E仲間のHPが出て、右の欄に「仲間（1/3人）」が出る', async () => {
      await hall.getByRole('button', { name: '閉じる' }).click();
      await expect(hud.getByLabel('E2E仲間')).toContainText('HP 50/50');
      await expect(party.getByRole('heading', { name: '仲間（1/3人）' })).toBeVisible();
    });

    await step('右の欄の仲間で、いのちの羽を渡す', 'E2E仲間の持ち物に いのちの羽×1 が入り、自分の持ち物から消える', async () => {
      await party.getByRole('button', { name: 'E2E仲間にいのちの羽を渡す' }).click();
      await expect(party.getByText('いのちの羽×1')).toBeVisible();
      await expect(items.getByText('いのちの羽')).toHaveCount(0);
    });

    await step('スライムを1体たおす', 'ログに「経験値6を2人で分けて+3」と出て、E2E仲間のアカウントの経験値が増えている', async () => {
      await page.evaluate(() => (window as any).rpgTest.defeat('slime'));
      await expect(log.getByText('スライムをたおした！ 経験値6を2人で分けて+3', { exact: false })).toBeVisible();
      // すぐ保存されるよう、画面を読み込み直す(離れるときに保存する)
      await page.reload();
      await expect.poll(() => mateSave()?.exp ?? 0).toBeGreaterThanOrEqual(3);
    });

    await step('(読み込み直したあとの画面を見る)', 'E2E仲間がパーティにいて、いのちの羽×1 を持っている', async () => {
      await expect(party.getByRole('heading', { name: '仲間（1/3人）' })).toBeVisible();
      await expect(party.getByText('いのちの羽×1')).toBeVisible();
      await expect(hud.getByLabel('E2E仲間')).toBeVisible();
    });

    await step('右の欄の「別れる」を押す', '仲間の欄と左下のHPが消え、ログに「E2E仲間と別れた。集会場に戻っていった」と出る', async () => {
      await party.getByRole('button', { name: 'E2E仲間と別れる' }).click();
      await expect(log.getByText('E2E仲間と別れた。集会場に戻っていった')).toBeVisible();
      await expect(party).toHaveCount(0);
      await expect(hud).toHaveCount(0);
    });
  }
);

test(
  'E2E-25 RPGで、仲間がいるときにたおれると、右下の案内で待ち、仲間がいのちの羽で起こしてくれる。起こしてもらえないときは「町に戻る」で村に戻る',
  caseOf({
    precondition: [
      'sandbox が起動している',
      'E2E 専用のアカウントでログインしている',
      'セーブデータが最初の状態で、いのちの羽を1つ持っている。パーティは空',
      '仲間の役のアカウント(E2E仲間)は、まだRPGを遊んでいない'
    ],
    expected: [
      'E2E仲間を呼び、いのちの羽を渡してからたおれると、画面の右下に「たおれてしまった…」と残り時間・「町に戻る」が出る(画面の真ん中には何も出ない)',
      'E2E仲間がそばに来て いのちの羽を使い、右下の案内が消え、ログに「E2E仲間がいのちの羽を使った！ あなたが起き上がった」と出る。E2E仲間の いのちの羽はなくなる',
      'もう一度たおれ(仲間は いのちの羽を持っていない)、「町に戻る」を押すと、ログに「E2E仲間は集会場に戻っていった」と出て、仲間がいなくなる',
      '集会場の「仲間を呼ぶ」で、E2E仲間をまた呼べる'
    ]
  }),
  async ({ page }) => {
    const step = startSteps(page);
    await loginAsE2E(page, step);
    await resetRpg(1, [{ itemId: 'life_feather', count: 1 }]);
    resetParty();
    const hall = page.getByRole('dialog', { name: '集会場' });
    const party = page.getByRole('region', { name: '仲間', exact: true });
    const wait = page.getByRole('status', { name: 'たおれている' });
    const log = page.getByRole('region', { name: 'ログ' });

    const openHall = async () => {
      await clickNpc(page, '集会場の受付 リン');
      const dialog = page.getByRole('dialog', { name: '集会場の受付 リンとの会話' });
      await dialog.waitFor();
      for (let i = 0; i < 5 && (await dialog.isVisible()); i++) await dialog.click();
      await hall.getByRole('button', { name: '🤝 仲間を呼ぶ' }).click();
    };

    await step('集会場で E2E仲間を招待して呼び、いのちの羽を渡す', 'E2E仲間が いのちの羽×1 を持っている', async () => {
      await page.goto('/rpg');
      await clickNpc(page, '集会場の受付 リン');
      const dialog = page.getByRole('dialog', { name: '集会場の受付 リンとの会話' });
      await dialog.waitFor();
      for (let i = 0; i < 5 && (await dialog.isVisible()); i++) await dialog.click();
      await hall.getByRole('button', { name: '✉ 招待メールを送る' }).click();
      await hall.getByLabel('招待するメールアドレス').fill(E2E_MATE_ACCOUNT.email);
      await hall.getByRole('button', { name: '送る' }).click();
      await expect(hall.getByText('集会場に登録しました！', { exact: false })).toBeVisible();
      await hall.getByRole('button', { name: 'もどる' }).click();
      await hall.getByRole('button', { name: '🤝 仲間を呼ぶ' }).click();
      await hall.getByRole('button', { name: 'E2E仲間を呼ぶ' }).click();
      await expect(hall.getByText('E2E仲間が仲間になった！')).toBeVisible();
      await hall.getByRole('button', { name: '閉じる' }).click();
      await party.getByRole('button', { name: 'E2E仲間にいのちの羽を渡す' }).click();
      await expect(party.getByText('いのちの羽×1')).toBeVisible();
    });

    await step('たおれる', '画面の右下に「たおれてしまった…」と残り時間・「町に戻る」が出る', async () => {
      await page.evaluate(() => (window as any).rpgTest.knockOut());
      await expect(wait).toBeVisible();
      await expect(wait).toContainText('たおれてしまった…');
      await expect(wait).toContainText(/0:5\d|1:00/);
      await expect(wait.getByRole('button', { name: '町に戻る' })).toBeVisible();
      // 案内は右下にある(ゲーム画面の右半分・下半分)
      const area = (await page.getByLabel('RPGのゲーム画面').boundingBox())!;
      const box = (await wait.boundingBox())!;
      expect(box.x).toBeGreaterThan(area.x + area.width / 2);
      expect(box.y).toBeGreaterThan(area.y + area.height / 2);
    });

    await step('仲間が起こしてくれるのを待つ', '右下の案内が消え、ログに「E2E仲間がいのちの羽を使った！ あなたが起き上がった」と出る。E2E仲間の いのちの羽はなくなる', async () => {
      await expect(wait).toHaveCount(0, { timeout: 15_000 });
      await expect(log.getByText('E2E仲間がいのちの羽を使った！ あなたが起き上がった')).toBeVisible();
      await expect(party.getByText('いのちの羽×1')).toHaveCount(0);
    });

    await step('もう一度たおれ、右下の「町に戻る」を押す', 'ログに「E2E仲間は集会場に戻っていった」と出て、仲間がいなくなる', async () => {
      await page.evaluate(() => (window as any).rpgTest.knockOut());
      await wait.getByRole('button', { name: '町に戻る' }).click();
      await expect(log.getByText('E2E仲間は集会場に戻っていった')).toBeVisible();
      await expect(party).toHaveCount(0);
    });

    await step('村に戻ったら、集会場の「仲間を呼ぶ」を開く', 'E2E仲間をまた呼べる', async () => {
      await expect(log.getByText(/にもどってきた。HP・MPが全回復した/)).toBeVisible({ timeout: 10_000 });
      await openHall();
      await expect(hall.getByRole('button', { name: 'E2E仲間を呼ぶ' })).toBeEnabled();
    });
  }
);

/**
 * 仲間の役のアカウントで API を呼ぶ(front#360)。集会場の一覧を見る・招待するだけなら「本人が遊んでいる」扱いにならない
 */
async function asMate<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const login = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: E2E_MATE_ACCOUNT.email, password: E2E_MATE_ACCOUNT.password })
  });
  const { token } = (await login.json()) as { token: string };
  const res = await fetch(`${API_URL}/graphql`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables })
  });
  return ((await res.json()) as { data: T }).data;
}

/** 仲間の役のアカウントから見た、E2E のアカウントの「自分で冒険中」 */
async function e2ePlaying(): Promise<boolean> {
  const data = await asMate<{ rpgHall: { name: string; playing: boolean }[] }>('{ rpgHall { name playing } }');
  return data.rpgHall.find((m) => m.name === E2E_ACCOUNT.name)?.playing ?? false;
}

test(
  'E2E-26 RPG画面を開いている間は、集会場で「自分で冒険中」になり、ほかの画面へ移るとすぐ外れる',
  caseOf({
    precondition: [
      'sandbox が起動している',
      'E2E 専用のアカウントでログインしている',
      'E2E のアカウントが集会場に登録されている(仲間の役のアカウントから招待する)'
    ],
    expected: [
      'RPG(/rpg)を開くと、仲間の役のアカウントから見た集会場の一覧で、E2E のアカウントが「自分で冒険中」になる',
      'タイトルのメニューからダッシュボードへ移ると、3分待たずに「自分で冒険中」が外れる',
      'もう一度RPGを開いてから、ほかのページ(about:blank)へ移る(タブを閉じるのと同じくページから出る)と、すぐ外れる'
    ]
  }),
  async ({ page }) => {
    const step = startSteps(page);
    await loginAsE2E(page, step);
    resetParty();
    // E2E のアカウントを集会場に登録しておく(登録ずみならエラーになるが、そのままでよい)
    await asMate('mutation($email: String!) { inviteRpgHall(email: $email) { name } }', { email: E2E_ACCOUNT.email });

    await step('RPG(/rpg)を開く', '集会場の一覧で、E2E のアカウントが「自分で冒険中」になる', async () => {
      await page.goto('/rpg');
      await expect(page.getByRole('region', { name: 'プレイヤーの状態' })).toBeVisible();
      await expect.poll(e2ePlaying).toBe(true);
    });

    await step('左上のタイトル(RPG)のメニューから「Dashboard」を押す', '3分待たずに「自分で冒険中」が外れる', async () => {
      await page.getByRole('button', { name: 'RPG', exact: true }).click();
      await page.getByRole('menuitem', { name: 'Dashboard' }).click();
      await page.getByRole('heading', { name: 'カレンダー' }).waitFor();
      await expect.poll(e2ePlaying, { timeout: 10_000 }).toBe(false);
    });

    await step('もう一度RPGを開き、ほかのページ(about:blank)へ移る', 'RPGを開くと「自分で冒険中」になり、ページから出るとすぐ外れる', async () => {
      await page.goto('/rpg');
      await expect(page.getByRole('region', { name: 'プレイヤーの状態' })).toBeVisible();
      await expect.poll(e2ePlaying).toBe(true);
      await page.goto('about:blank');
      await expect.poll(e2ePlaying, { timeout: 10_000 }).toBe(false);
    });
  }
);

test(
  'E2E-27 RPGの道具屋で、持ち物を売る・回復薬を個数を選んで買うと、開き直しても残っている(front#379)',
  caseOf({
    precondition: [
      'sandbox が起動している',
      'E2E 専用のアカウントでログインしている',
      'RPGのセーブデータを最初の状態(30G・回復薬×3)に戻し、銅の剣×1・スライムゼリー×4 を足してある',
      'E2E 用のアイテム(e2e/fixtures/rpg)は 回復薬 10G・銅の剣 45G(売値は空)、スライムゼリーの売値 2G'
    ],
    expected: [
      '道具屋に「買う／売る」の切り替えがあり、「売る」には売値のある持ち物だけが並ぶ(値段のない木の剣・布の服は出ない)',
      '装備中の銅の剣は「装備中」で売れない。外すと、確認のあと道具屋の値段の半分(22G)で売れる',
      'スライムゼリーは －／＋ で個数を選び、選んだ数だけまとめて売れる(3個で 6G)',
      '「買う」では回復薬を －／＋ で個数を選び、まとめて買える(2個で 20G)',
      'ほかの画面に移ってから開き直しても、ゴールドと持ち物が残っている'
    ]
  }),
  async ({ page }) => {
    const step = startSteps(page);
    await resetRpg(1, [
      { itemId: 'copper_sword', count: 1 },
      { itemId: 'slime_jelly', count: 4 }
    ]);
    await loginAsE2E(page, step);
    const status = page.getByRole('region', { name: 'プレイヤーの状態' });
    const items = page.getByRole('region', { name: '持ち物' });
    const shop = page.getByRole('dialog', { name: '道具屋' });
    const openShop = async () => {
      await clickNpc(page, '道具屋 ミナ');
      const dialog = page.getByRole('dialog', { name: '道具屋 ミナとの会話' });
      await dialog.click();
      await dialog.click();
      await expect(shop).toBeVisible();
    };

    await step('RPG(/rpg)を開き、持ち物の銅の剣を装備する', '30G で始まり、装備欄が銅の剣になる', async () => {
      await page.goto('/rpg');
      await expect(status.getByText('30G')).toBeVisible();
      await page.getByRole('button', { name: '銅の剣を装備する' }).click();
      await expect(page.getByRole('region', { name: '装備' }).getByText('銅の剣')).toBeVisible();
    });

    await step('「道具屋 ミナ」に話しかけ、「売る」に切り替える', '売値のある 銅の剣・回復薬・スライムゼリー が並び、装備中の銅の剣は「装備中」で押せない。木の剣・布の服は出ない', async () => {
      await openShop();
      await shop.getByRole('tab', { name: '売る' }).click();
      await expect(shop.getByRole('button', { name: '銅の剣を装備中' })).toBeDisabled();
      await expect(shop.getByRole('button', { name: '回復薬を売る（5G）' })).toBeEnabled();
      await expect(shop.getByRole('button', { name: 'スライムゼリーを売る（2G）' })).toBeEnabled();
      await expect(shop.getByText('木の剣')).toHaveCount(0);
      await expect(shop.getByText('布の服')).toHaveCount(0);
      await page.getByRole('button', { name: '閉じる' }).click();
    });

    await step('木の剣を装備し直して道具屋の「売る」で銅の剣を売り、確認で「売る」を押す', '「銅の剣を 22G で売りますか？」と確認が出て、売ると 52G になり、持ち物から銅の剣がなくなる', async () => {
      await page.getByRole('button', { name: '木の剣を装備する' }).click();
      await openShop();
      await shop.getByRole('tab', { name: '売る' }).click();
      await shop.getByRole('button', { name: '銅の剣を売る' }).click();
      const confirm = page.getByRole('alertdialog', { name: '売る確認' });
      await expect(confirm).toContainText('銅の剣を 22G で売りますか？');
      await confirm.getByRole('button', { name: '売る' }).click();
      await expect(status.getByText('52G')).toBeVisible();
      await expect(shop.getByText('銅の剣')).toHaveCount(0);
    });

    await step('スライムゼリーの「＋」を2回押して3個にし、売る', '売るボタンが「売る（6G）」になり、売ると 58G・残り1個になる', async () => {
      const plus = shop.getByRole('button', { name: 'スライムゼリーを1個ふやす' });
      await plus.click();
      await plus.click();
      await expect(shop.getByLabel('スライムゼリーの個数')).toHaveText('3');
      await shop.getByRole('button', { name: 'スライムゼリーを売る（6G）' }).click();
      await expect(status.getByText('58G')).toBeVisible();
      await expect(shop.getByText('1個持っている')).toBeVisible();
    });

    await step('「買う」に切り替え、回復薬の「＋」を1回押して2個にし、買う', '買うボタンが「買う（20G）」になり、買うと 38G・回復薬が5個になる(3個 + 買った2個)', async () => {
      await shop.getByRole('tab', { name: '買う' }).click();
      await shop.getByRole('button', { name: '回復薬を1個ふやす', exact: true }).click();
      await expect(shop.getByLabel('回復薬の個数', { exact: true })).toHaveText('2');
      await shop.getByRole('button', { name: '回復薬を買う（20G）', exact: true }).click();
      await expect(status.getByText('38G')).toBeVisible();
      await page.getByRole('button', { name: '閉じる' }).click();
      await expect(items.getByText('×5')).toBeVisible();
    });

    await step('ダッシュボードへ移ってから、RPG(/rpg)を開き直す', '38G・回復薬×5 のままで、銅の剣はない', async () => {
      await page.goto('/');
      await page.getByRole('heading', { name: 'カレンダー' }).waitFor();
      await page.goto('/rpg');
      await expect(status.getByText('38G')).toBeVisible();
      await expect(items.getByText('×5')).toBeVisible();
      await expect(items.getByText('銅の剣')).toHaveCount(0);
    });
  }
);

test(
  'E2E-29 RPGで、魔法書を読んで魔法を覚え、敵をクリックで選んで攻撃魔法を撃ち、自分を選んで回復魔法・魔法の水を使う(front#383)',
  caseOf({
    precondition: [
      'sandbox が起動している',
      'E2E 専用のアカウントでログインしている',
      'RPGのセーブデータを最初の状態(村・HP50・MP20・魔法なし)に戻し、魔法書: ファイア・魔法書: ヒール・魔法の水を1つずつ足してある',
      '始まりの草原の村の (7, 5) に、近づいても襲ってこないスライム(HP22)がいる(E2E 用のマップのデータ)',
      'この端末のブラウザに覚えたショートカットの設定を消してある'
    ],
    expected: [
      '左下にMPのバー(20 / 20)と「🔮 魔法」ボタンがある。魔法の一覧では、まだ覚えていない魔法は押せない',
      '持ち物の魔法書を使うと、ログに「…を覚えた！」と出て魔法書がなくなり、魔法の一覧でファイア・ヒールの「使う」を押せる(ブリザドは押せない)',
      '歯車(設定)のショートカットで 3キーにファイア、4キーにヒールを選ぶと、左上に「3 🔥 ファイア MP4」「4 💚 ヒール MP5」が出る',
      'いちばん近いスライムをクリックすると選ばれる(画面の上のまんなかには出さない front#385)。3キーを押すと、ログに「🔥 ファイア！」と出て MP が4減り、スライムのHPが減る(または たおれる)',
      '自分をクリックすると「💚 あなた」に変わる。HPを20に減らして4キーを押すと、ログに「💚 ヒール！」と出てHPが35以上に戻り、MP が5減る',
      'Esc を押すと選択が外れる。持ち物の魔法の水を使うと MP が 20(最大)に戻る',
      '画面を読み込み直しても、覚えた魔法(ファイア・ヒール)は残っている'
    ]
  }),
  async ({ page }) => {
    const step = startSteps(page);
    await loginAsE2E(page, step);
    await resetRpg(1, [{ itemId: 'book_fire', count: 1 }, { itemId: 'book_heal', count: 1 }, { itemId: 'magic_water', count: 1 }]);
    const status = page.getByRole('region', { name: 'プレイヤーの状態' });
    const items = page.getByRole('region', { name: '持ち物' });
    const log = page.getByRole('region', { name: 'ログ' });
    const spells = page.getByRole('dialog', { name: '魔法' });
    const selection = page.getByRole('status', { name: '選んでいる相手' });
    const chips = page.locator('.hud .chip.shortcut');
    const mp = status.getByLabel('MP', { exact: true });
    const mpValue = async () => Number((await mp.innerText()).split('/')[0]);
    const hpValue = async () => Number((await status.locator('.vitals-num').first().innerText()).split('/')[0]);
    const openSpells = async () => status.getByRole('button', { name: '🔮 魔法' }).click();

    await step('RPG(/rpg)を開き、左下の「🔮 魔法」を押す', 'MP 20 / 20 が出て、魔法の一覧のファイアは「まだ覚えていない」で押せない', async () => {
      await page.goto('/rpg');
      await page.evaluate(() => localStorage.removeItem('rpgShortcuts'));
      await page.reload();
      await expect(mp).toHaveText('20 / 20');
      await openSpells();
      await expect(spells.locator('.shop-row', { hasText: 'ファイア' })).toContainText('まだ覚えていない');
      await expect(spells.getByRole('button', { name: 'ファイアを使う' })).toBeDisabled();
      await spells.getByRole('button', { name: '閉じる' }).click();
    });

    await step(
      '持ち物の「魔法書: ファイア」「魔法書: ヒール」の「使う」を押し、「🔮 魔法」を開く',
      'ログに「🔥 ファイアを覚えた！」「💚 ヒールを覚えた！」と出て魔法書がなくなり、ファイア・ヒールは使え、ブリザドは使えない',
      async () => {
        await items.getByRole('button', { name: '魔法書: ファイアを使う' }).click();
        await expect(log.getByText('🔥 ファイアを覚えた！', { exact: false })).toBeVisible();
        await items.getByRole('button', { name: '魔法書: ヒールを使う' }).click();
        await expect(log.getByText('💚 ヒールを覚えた！', { exact: false })).toBeVisible();
        await expect(items.getByText('魔法書')).toHaveCount(0);
        await openSpells();
        await expect(spells.getByRole('button', { name: 'ファイアを使う' })).toBeEnabled();
        await expect(spells.getByRole('button', { name: 'ヒールを使う' })).toBeEnabled();
        await expect(spells.getByRole('button', { name: 'ブリザドを使う' })).toBeDisabled();
        await spells.getByRole('button', { name: '閉じる' }).click();
      }
    );

    await step('歯車(設定)のショートカットで、3キーにファイア、4キーにヒールを選ぶ', '左上に「3 🔥 ファイア MP4」「4 💚 ヒール MP5」が出る', async () => {
      await page.getByRole('button', { name: '設定' }).click();
      const settings = page.getByRole('dialog', { name: '設定' });
      await settings.getByLabel('3キーで使う道具').selectOption({ label: '🔥 ファイア LV1（MP4）' });
      await settings.getByLabel('4キーで使う道具').selectOption({ label: '💚 ヒール LV1（MP5）' });
      await expect(chips.nth(2)).toHaveText('3🔥 ファイア MP4');
      await expect(chips.nth(3)).toHaveText('4💚 ヒール MP5');
      await page.getByLabel('RPGのゲーム画面').click({ position: { x: 40, y: 200 } });
      await expect(settings).toHaveCount(0);
    });

    await step(
      'いちばん近いスライムをクリックし、3キーを押す',
      'スライムが選ばれ(上のまんなかには何も出ない)、ログに「🔥 ファイア！」、MP が4減り、スライムのHPが22より減る(または たおれる)',
      async () => {
        await expect.poll(() => page.evaluate(() => (window as any).rpgTest?.isIdle())).toBe(true);
        const slime = await page.evaluate(() => (window as any).rpgTest.enemyPosition('slime') as [number, number]);
        await clickCanvas(page, slime, 10);
        await expect.poll(() => page.evaluate(() => (window as any).rpgTest.selectedEnemy()?.name)).toBe('スライム');
        await expect(selection).toHaveCount(0);
        await page.keyboard.press('3');
        await expect(log.getByText('🔥 ファイア！')).toBeVisible();
        // 戦っている間も MP は3秒に1ずつ戻るので、16 か 17
        expect(await mpValue()).toBeGreaterThanOrEqual(16);
        expect(await mpValue()).toBeLessThanOrEqual(17);
        await expect
          .poll(() => page.evaluate(() => { const s = (window as any).rpgTest.selectedEnemy(); return s === null || s.hp < 22; }))
          .toBe(true);
      }
    );

    await step(
      'スライムとの戦いが終わってから自分をクリックし、HPを20に減らして4キーを押す',
      '上のまんなかが「💚 あなた」に変わり、ログに「💚 ヒール！」と出てHPが35以上に戻り、MP が5減る',
      async () => {
        await expect.poll(() => page.evaluate(() => (window as any).rpgTest?.isIdle()), { timeout: 20_000 }).toBe(true);
        const me = await page.evaluate(() => (window as any).rpgTest.playerPosition() as [number, number]);
        await clickCanvas(page, me, 30);
        await expect(selection).toContainText('💚 あなた');
        await page.evaluate(() => (window as any).rpgTest.hurtPlayer(20));
        const before = await mpValue();
        await page.keyboard.press('4');
        await expect(log.getByText('💚 ヒール！')).toBeVisible();
        await expect.poll(hpValue).toBeGreaterThanOrEqual(35);
        expect(before - (await mpValue())).toBeGreaterThanOrEqual(4);
        expect(before - (await mpValue())).toBeLessThanOrEqual(5);
      }
    );

    await step('Esc を押し、持ち物の「魔法の水」の「使う」を押す', '選択が外れ、MP が 20 / 20 に戻る', async () => {
      await page.keyboard.press('Escape');
      await expect(selection).toHaveCount(0);
      await items.getByRole('button', { name: '魔法の水を使う' }).click();
      await expect(log.getByText('魔法の水を使った。MPが', { exact: false })).toBeVisible();
      await expect(mp).toHaveText('20 / 20');
    });

    await step('画面を読み込み直し、「🔮 魔法」を開く', 'ファイア・ヒールは覚えたままで「使う」を押せる', async () => {
      await page.reload();
      await expect(mp).toHaveText('20 / 20');
      await openSpells();
      await expect(spells.getByRole('button', { name: 'ファイアを使う' })).toBeEnabled();
      await expect(spells.getByRole('button', { name: 'ヒールを使う' })).toBeEnabled();
      await page.evaluate(() => localStorage.removeItem('rpgShortcuts'));
    });
  }
);

test(
  'E2E-30 RPGで、覚えている魔法の書も道具屋で買え、鍛冶屋で魔法の書【全体回復 LV1】を作って読むと、ヒールオールを LV1 で覚える(front#387)',
  caseOf({
    precondition: [
      'sandbox が起動している',
      'E2E 専用のアカウントでログインしている',
      'RPGのセーブデータを最初の状態に戻し、500G・魔法書: ヒール×1・精霊の光×30 を持たせてある',
      'E2E 用のアイテム・合成(e2e/fixtures/rpg)に、魔法書: ヒール(道具屋 120G)と、合成「魔法の書【全体回復 LV1】」(魔法書: ヒール×1・精霊の光×30・300G)がある'
    ],
    expected: [
      '持ち物の魔法書: ヒールを使うと、ヒールを LV1 で覚え、魔法書はなくなる',
      '道具屋で、覚えている魔法書: ヒールに「覚えている（LV1）・合成の素材に使える」と出て、買える(380G・1冊になる)',
      '鍛冶屋で、魔法の書【全体回復 LV1】の素材が「魔法書: ヒール 1/1」「精霊の光 30/30」になり、作ると 80G になって持ち物に入る。もう一度は作れない(持っている)',
      '作った書を使うと、ログに「✨ ヒールオールを覚えた！（LV1）」と出て、魔法の一覧のヒールオールに LV1 が付き、使える'
    ]
  }),
  async ({ page }) => {
    const step = startSteps(page);
    await resetRpg(1, [{ itemId: 'book_heal', count: 1 }, { itemId: 'spirit_light', count: 30 }], 500);
    await loginAsE2E(page, step);
    const status = page.getByRole('region', { name: 'プレイヤーの状態' });
    const items = page.getByRole('region', { name: '持ち物' });
    const log = page.getByRole('region', { name: 'ログ' });
    const shop = page.getByRole('dialog', { name: '道具屋' });
    const smith = page.getByRole('dialog', { name: '鍛冶屋' });
    const spells = page.getByRole('dialog', { name: '魔法' });
    const talkTo = async (name: string, dialogOf: Locator) => {
      await clickNpc(page, name);
      const dialog = page.getByRole('dialog', { name: `${name}との会話` });
      await dialog.waitFor();
      for (let i = 0; i < 5 && (await dialog.isVisible()); i++) await dialog.click();
      await expect(dialogOf).toBeVisible();
    };

    await step('RPG(/rpg)を開き、持ち物の「魔法書: ヒール」の「使う」を押す', 'ヒールを LV1 で覚え、魔法書: ヒールは持ち物からなくなる', async () => {
      await page.goto('/rpg');
      await expect(status.getByText('500G')).toBeVisible();
      await items.getByRole('button', { name: '魔法書: ヒールを使う' }).click();
      await expect(log.getByText('💚 ヒールを覚えた！（LV1）', { exact: false })).toBeVisible();
      await expect(items.getByText('魔法書: ヒール')).toHaveCount(0);
    });

    await step('「道具屋 ミナ」に話しかけ、魔法書: ヒールを1冊買う', '「覚えている（LV1）・合成の素材に使える」と出て買え、380G・魔法書: ヒール×1 になる', async () => {
      await talkTo('道具屋 ミナ', shop);
      const row = shop.locator('.shop-row', { hasText: '魔法書: ヒール' });
      await expect(row).toContainText('覚えている（LV1）・合成の素材に使える');
      await shop.getByRole('button', { name: '魔法書: ヒールを買う（120G）', exact: true }).click();
      await expect(status.getByText('380G')).toBeVisible();
      await shop.getByRole('button', { name: '閉じる' }).click();
      await expect(items.locator('.inv-row', { hasText: '魔法書: ヒール' })).toContainText('×1');
    });

    await step(
      '「鍛冶屋 ゴンゾウ」に話しかけ、魔法の書【全体回復 LV1】を作る',
      '素材が「魔法書: ヒール 1/1」「精霊の光 30/30」で作れ、80G になって持ち物に入る。作ったあとは「持っている」で押せない',
      async () => {
        await talkTo('鍛冶屋 ゴンゾウ', smith);
        await expect(smith.getByText('魔法書: ヒール 1/1')).toBeVisible();
        await expect(smith.getByText('精霊の光 30/30')).toBeVisible();
        await smith.getByRole('button', { name: '魔法の書【全体回復 LV1】を作る', exact: true }).click();
        await expect(log.getByText('魔法の書【全体回復 LV1】を作った！（-300G）')).toBeVisible();
        await expect(smith.getByRole('button', { name: '魔法の書【全体回復 LV1】を持っている', exact: true })).toBeDisabled();
        await smith.getByRole('button', { name: '閉じる' }).click();
        await expect(status.getByText('80G')).toBeVisible();
      }
    );

    await step('持ち物の「魔法の書【全体回復 LV1】」の「使う」を押し、「🔮 魔法」を開く', 'ヒールオールを LV1 で覚え、魔法の一覧のヒールオールに LV1 が付いて使える', async () => {
      await items.getByRole('button', { name: '魔法の書【全体回復 LV1】を使う' }).click();
      await expect(log.getByText('✨ ヒールオールを覚えた！（LV1）', { exact: false })).toBeVisible();
      await status.getByRole('button', { name: '🔮 魔法' }).click();
      const row = spells.locator('.shop-row', { hasText: 'ヒールオール' });
      await expect(row).toContainText('LV1');
      await expect(spells.getByRole('button', { name: 'ヒールオールを使う' })).toBeEnabled();
    });
  }
);

test(
  'E2E-32 RPGで、持ち物を捨てると、近くの仲間が3秒後に拾いに来る。魔法書なら読んで魔法を覚え、開き直しても仲間のデータに残る(front#391)',
  caseOf({
    precondition: [
      'sandbox が起動している',
      'E2E 専用のアカウントでログインしている',
      'セーブデータが最初の状態(回復薬×3)で、魔法書: ファイアを1冊持っている。パーティは空',
      '仲間の役のアカウント(E2E仲間)は、集会場に登録しておらず、まだRPGを遊んでいない(魔法を覚えていない)'
    ],
    expected: [
      '集会場で E2E仲間を呼ぶと、右の欄の仲間に「MP 20/20・魔法: なし」と出る',
      '持ち物の回復薬の「🗑」を押すと「回復薬を捨てる」画面が開き、＋で2個にして「捨てる」を押すと、ログに「回復薬を2個捨てた」と出て、持ち物が×1になる',
      '3秒ほどたつと、ログに「E2E仲間が回復薬×2を拾った」と出て、仲間の持ち物の回復薬が 3 → 5 になる(まだ遊んでいないアカウントは回復薬×3を持っている)',
      '魔法書: ファイアを捨てると、E2E仲間が拾って「E2E仲間が魔法書: ファイアを読んで、🔥 ファイアを覚えた！（LV1）」と出て、仲間の欄の魔法が「🔥ファイア LV1」になる(書は仲間の持ち物に残らない)',
      '画面を開き直すと、E2E仲間のアカウントのセーブデータに 回復薬×5 とファイアが入っている'
    ]
  }),
  async ({ page }) => {
    const step = startSteps(page);
    await loginAsE2E(page, step);
    await resetRpg(1, [{ itemId: 'book_fire', count: 1 }]);
    resetParty();
    const hall = page.getByRole('dialog', { name: '集会場' });
    const party = page.getByRole('region', { name: '仲間', exact: true });
    const items = page.getByRole('region', { name: '持ち物' });
    const log = page.getByRole('region', { name: 'ログ' });
    const discard = page.getByRole('dialog', { name: '捨てる' });

    await step('RPG(/rpg)を開き、集会場で E2E仲間を招待して呼ぶ', '右の欄の仲間に「MP 20/20・魔法: なし」と出る', async () => {
      await page.goto('/rpg');
      await clickNpc(page, '集会場の受付 リン');
      const dialog = page.getByRole('dialog', { name: '集会場の受付 リンとの会話' });
      await dialog.waitFor();
      for (let i = 0; i < 5 && (await dialog.isVisible()); i++) await dialog.click();
      await hall.getByRole('button', { name: '✉ 招待メールを送る' }).click();
      await hall.getByLabel('招待するメールアドレス').fill(E2E_MATE_ACCOUNT.email);
      await hall.getByRole('button', { name: '送る' }).click();
      await expect(hall.getByText('集会場に登録しました！', { exact: false })).toBeVisible();
      await hall.getByRole('button', { name: 'もどる' }).click();
      await hall.getByRole('button', { name: '🤝 仲間を呼ぶ' }).click();
      await hall.getByRole('button', { name: 'E2E仲間を呼ぶ' }).click();
      await expect(hall.getByText('E2E仲間が仲間になった！')).toBeVisible();
      await hall.getByRole('button', { name: '閉じる' }).click();
      await expect(party.getByText('MP 20/20・魔法: なし', { exact: false })).toBeVisible();
    });

    await step('持ち物の回復薬の「🗑」を押し、＋で2個にして「捨てる」を押す', 'ログに「回復薬を2個捨てた」と出て、持ち物の回復薬が×1になる', async () => {
      await items.getByRole('button', { name: '回復薬を捨てる' }).click();
      await expect(discard).toContainText('回復薬を捨てる');
      await discard.getByRole('button', { name: '捨てる数をふやす' }).click();
      await expect(discard.getByLabel('捨てる数', { exact: true })).toHaveText('2');
      await discard.getByRole('button', { name: '捨てる', exact: true }).click();
      await expect(log.getByText('回復薬を2個捨てた')).toBeVisible();
      await expect(items.locator('.inv-row', { hasText: '回復薬' })).toContainText('×1');
    });

    await step('3秒ほど待つ', 'ログに「E2E仲間が回復薬×2を拾った」と出て、仲間の持ち物の回復薬が×5になる(はじめの×3＋拾った×2)', async () => {
      await expect(party.getByText('回復薬×3')).toBeVisible();
      await expect(log.getByText('E2E仲間が回復薬×2を拾った')).toBeVisible({ timeout: 15_000 });
      await expect(party.getByText('回復薬×5')).toBeVisible();
    });

    await step('持ち物の「魔法書: ファイア」の「🗑」を押して捨て、3秒ほど待つ', 'E2E仲間が読んでファイアを覚え、仲間の欄の魔法が「🔥ファイア LV1」になる', async () => {
      await items.getByRole('button', { name: '魔法書: ファイアを捨てる' }).click();
      await discard.getByRole('button', { name: '捨てる', exact: true }).click();
      await expect(log.getByText('E2E仲間が魔法書: ファイアを読んで、🔥 ファイアを覚えた！（LV1）')).toBeVisible({ timeout: 15_000 });
      await expect(party.getByText('魔法: 🔥ファイア LV1', { exact: false })).toBeVisible();
      await expect(party.getByText('魔法書: ファイア')).toHaveCount(0);
    });

    await step('画面を読み込み直す', 'E2E仲間のアカウントのセーブデータに 回復薬×5 とファイアが入っている', async () => {
      await page.reload();
      await expect(party.getByText('回復薬×5')).toBeVisible();
      await expect.poll(() => mateSave()?.spells ?? []).toContain('fire');
      expect(mateSave()?.items).toContainEqual({ item_id: 'potion', count: 5 });
    });
  }
);

test(
  'E2E-33 RPGで、仲間を選んで回復薬を使うと、仲間の頭の上に「ありがとう♡」の吹き出しが出て、少しすると消える(front#398)',
  caseOf({
    precondition: [
      'sandbox が起動している',
      'E2E 専用のアカウントでログインしている',
      'セーブデータが最初の状態で、回復薬を持っている。パーティは空',
      '仲間の役のアカウント(E2E仲間)は、まだRPGを遊んでいない'
    ],
    expected: [
      '集会場で E2E仲間を呼べる',
      'E2E仲間のHPを30に減らし(自分で回復薬を使う3割より上)、E2E仲間をクリックして回復薬を使うと、ログに「あなたがE2E仲間に回復薬を使った。」と出て、少しあとに(約0.5秒。front#400) E2E仲間の頭の右上に「ありがとう♡」の吹き出しが出る',
      '2秒ほどすると吹き出しが消える'
    ]
  }),
  async ({ page }) => {
    const step = startSteps(page);
    await loginAsE2E(page, step);
    await resetRpg(1, [{ itemId: 'potion', count: 1 }]);
    resetParty();
    const hall = page.getByRole('dialog', { name: '集会場' });
    const items = page.getByRole('region', { name: '持ち物' });
    const log = page.getByRole('region', { name: 'ログ' });
    const thanks = () => page.evaluate(() => (window as any).rpgTest.thanks() as string[]);

    await step('RPG(/rpg)を開き、集会場で E2E仲間を招待して呼び、集会場を閉じる', '「E2E仲間が仲間になった！」と出る', async () => {
      await page.goto('/rpg');
      await clickNpc(page, '集会場の受付 リン');
      const dialog = page.getByRole('dialog', { name: '集会場の受付 リンとの会話' });
      await dialog.waitFor();
      for (let i = 0; i < 5 && (await dialog.isVisible()); i++) await dialog.click();
      await hall.getByRole('button', { name: '✉ 招待メールを送る' }).click();
      await hall.getByLabel('招待するメールアドレス').fill(E2E_MATE_ACCOUNT.email);
      await hall.getByRole('button', { name: '送る' }).click();
      await expect(hall.getByText('集会場に登録しました！', { exact: false })).toBeVisible();
      await hall.getByRole('button', { name: 'もどる' }).click();
      await hall.getByRole('button', { name: '🤝 仲間を呼ぶ' }).click();
      await hall.getByRole('button', { name: 'E2E仲間を呼ぶ' }).click();
      await expect(hall.getByText('E2E仲間が仲間になった！')).toBeVisible();
      await hall.getByRole('button', { name: '閉じる' }).click();
      await expect(hall).toHaveCount(0);
    });

    await step(
      'E2E仲間のHPを30に減らし、E2E仲間をクリックして、持ち物の「回復薬」の「使う」を押す',
      'ログに「あなたがE2E仲間に回復薬を使った。」と出て、少しあとに(約0.5秒。front#400) E2E仲間の頭の右上に「ありがとう♡」の吹き出しが出る',
      async () => {
        await expect.poll(() => page.evaluate(() => (window as any).rpgTest?.isIdle())).toBe(true);
        // 仲間が歩き終わってからクリックする
        await page.waitForTimeout(800);
        await page.evaluate(() => (window as any).rpgTest.hurtMate(30));
        const mate = await page.evaluate(() => (window as any).rpgTest.matePosition() as [number, number]);
        await clickCanvas(page, mate, 30);
        await expect(page.getByRole('status', { name: '選んでいる相手' })).toContainText('E2E仲間');
        await items.getByRole('button', { name: '回復薬を使う' }).click();
        await expect(log.getByText('あなたがE2E仲間に回復薬を使った。', { exact: false })).toBeVisible();
        expect(await thanks()).toEqual(['E2E仲間']);
        // 回復から0.5秒あけて出る(front#400)。吹き出しがぽんと出終わったところを写す
        await page.waitForTimeout(900);
      }
    );

    await step('2秒待つ', '吹き出しが消える', async () => {
      await expect.poll(thanks, { timeout: 3_000 }).toEqual([]);
    });
  }
);

// 効果音の割り当て(front#419)を、テストの中だけ「拾う・開く・閉じる」に音を選んだ状態にする。音のファイルは無音のWAV
async function assignTestSounds(page: Page): Promise<void> {
  const se = { id: 'e2e-se', name: '[E2E]ピコッ', filename: 'e2e-pico.wav', size: 44, createdAt: '2026-10-28T00:00:00' };
  await page.route('**/graphql', async (route) => {
    const body = route.request().postData() ?? '';
    if (body.includes('GetRpgSeSlots')) {
      await route.fulfill({ json: { data: { rpgSeSlots: ['item_pick', 'ui_open', 'ui_close'].map((slot) => ({ slot, seId: se.id })) } } });
    } else if (body.includes('GetRpgSes')) {
      await route.fulfill({ json: { data: { rpgSes: [se] } } });
    } else {
      await route.fallback();
    }
  });
  // 44バイトの無音のWAV(ヘッダーだけ)
  const wav = Buffer.alloc(44);
  wav.write('RIFF', 0); wav.writeUInt32LE(36, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(8000, 24); wav.writeUInt32LE(8000, 28); wav.writeUInt16LE(1, 32); wav.writeUInt16LE(8, 34); wav.write('data', 36); wav.writeUInt32LE(0, 40);
  await page.route(`**/rpg-se/${se.filename}`, (route) => route.fulfill({ body: wav, contentType: 'audio/wav' }));
}

const soundsOf = (page: Page): Promise<string[]> => page.evaluate(() => (window as any).rpgTest.sounds() as string[]);

test(
  'E2E-37 RPGで、アイテムを拾うと「拾う」、設定・ステータスのウィンドウを開く・閉じると「開く」「閉じる」の効果音が鳴る。NPCとの会話では鳴らない(front#419)',
  caseOf({
    precondition: [
      'sandbox が起動している',
      'E2E 専用のアカウントでログインしている',
      'セーブデータが最初の状態',
      '効果音の割り当てを、テストの中だけ「🎒 アイテムを拾う」「📂 ウィンドウを開く」「📁 ウィンドウを閉じる」に音を選んだ状態にする(sandbox のデータは変えない)',
      '鳴った場面は、開発用のビルドだけにあるテスト用の入り口 rpgTest.sounds で確かめる(音そのものは聞かない)'
    ],
    expected: [
      'ゲーム画面をクリックして音を出せるようにしたあと、落ちた回復薬を拾うと「アイテムを拾う」(item_pick)が鳴る',
      '歯車(設定)を押して開くと「開く」(ui_open)、もう一度押して閉じると「閉じる」(ui_close)が鳴る',
      '「ステータス」を開くと「開く」、「閉じる」ボタンで閉じると「閉じる」が鳴る',
      '村長に話しかけて会話の吹き出しが出ても、効果音は増えない'
    ]
  }),
  async ({ page }) => {
    const step = startSteps(page);
    await loginAsE2E(page, step);
    await resetRpg();
    await assignTestSounds(page);
    const log = page.getByRole('region', { name: 'ログ' });

    await step('RPG(/rpg)を開いてゲーム画面をクリックし、プレイヤーの近くに落とした回復薬を拾う', 'ログに「回復薬を拾った」と出て、「アイテムを拾う」(item_pick)が鳴る', async () => {
      await page.goto('/rpg');
      await expect.poll(() => page.evaluate(() => (window as any).rpgTest?.isIdle())).toBe(true);
      // 画面をクリックするまでブラウザは音を出せない。プレイヤーの足元をクリックして、音を出せるようにする
      await clickCanvas(page, await page.evaluate(() => (window as any).rpgTest.playerPosition() as [number, number]));
      const at = await page.evaluate(() => (window as any).rpgTest.dropNearPlayer('potion', 1) as [number, number]);
      await page.waitForTimeout(700);
      await clickCanvas(page, at, 10);
      await expect(log.getByText('回復薬を拾った')).toBeVisible();
      await expect.poll(() => soundsOf(page)).toContain('item_pick');
      expect((await soundsOf(page))[0]).toBe('item_pick');
    });

    await step('歯車(設定)を押して開き、もう一度押して閉じる', '開くと「開く」(ui_open)、閉じると「閉じる」(ui_close)が鳴る', async () => {
      await page.getByRole('button', { name: '設定', exact: true }).click();
      await expect(page.getByRole('dialog', { name: '設定' })).toBeVisible();
      await expect.poll(async () => (await soundsOf(page))[0]).toBe('ui_open');
      await page.getByRole('button', { name: '設定', exact: true }).click();
      await expect(page.getByRole('dialog', { name: '設定' })).toBeHidden();
      await expect.poll(async () => (await soundsOf(page)).slice(0, 2)).toEqual(['ui_close', 'ui_open']);
    });

    await step('「ステータス」を開き、「閉じる」ボタンで閉じる', '開くと「開く」、閉じると「閉じる」が鳴る', async () => {
      // 同じ場面の音は少しの間をあけてから鳴らすので、間をあける
      await page.waitForTimeout(200);
      await page.getByRole('button', { name: /ステータス/ }).click();
      const status = page.getByRole('dialog', { name: 'ステータス' });
      await expect(status).toBeVisible();
      await expect.poll(async () => (await soundsOf(page))[0]).toBe('ui_open');
      await page.waitForTimeout(200);
      await status.getByRole('button', { name: '閉じる' }).click();
      await expect(status).toBeHidden();
      await expect.poll(async () => (await soundsOf(page)).slice(0, 2)).toEqual(['ui_close', 'ui_open']);
    });

    await step('村長に話しかける', '会話の吹き出しが出ても、効果音は増えない', async () => {
      const before = (await soundsOf(page)).length;
      await clickNpc(page, '村長 ゴロウ');
      await expect(page.getByRole('dialog', { name: '村長 ゴロウとの会話' })).toBeVisible();
      await page.waitForTimeout(500);
      expect((await soundsOf(page)).length).toBe(before);
    });
  }
);
