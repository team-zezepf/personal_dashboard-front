import { Page } from '@playwright/test';
import { API_URL, E2E_ACCOUNT } from './support/env';
import { caseOf, expect, loginAsE2E, startSteps, test } from './support/evidence';

// 前回の実行の続きにならないよう、セーブデータを最初の状態(始まりの草原の村・30G・回復薬×3)に戻す。
// level を上げると、そのレベルまでの分のステータスのポイント((level-1)×3)を、振り分けていない状態で持つ。
// 見た目も最初の見た目(ショート・シャツ)に戻し、受けたクエストもなくす(front#239)。
// ポイント交換で使う10ptも足しておく(交換で同じだけ減るので、実行のたびに増え続けない)
async function resetRpg(level = 1): Promise<void> {
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
      level, exp: 0, hp: 50, gold: 30, weapon: 'wood_sword', armor: 'cloth',
      items: [{ itemId: 'potion', count: 3 }, { itemId: 'wood_sword', count: 1 }, { itemId: 'cloth', count: 1 }],
      area: 'plain', x: 6, y: 7,
      stats: { hp: 0, atk: 0, def: 0, mag: 0, spd: 0, luk: 0 }, statPoints: (level - 1) * 3, quests: [],
      look: {
        hair: 'short', hairColor: '#6b3f1f', skin: '#ffe0bd', eyes: 'normal', eyeColor: '#3b2f2f',
        mouth: 'smile', clothes: 'shirt', clothesColor: '#3b82f6', accentColor: '#f8fafc'
      }
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
      'サイド欄の「見た目を変える」を押すと「見た目」の画面が開き、今の見た目(ショート・ふつう・シャツ)が選ばれている',
      '目を「メガネ」にすると、目の色の欄が消える',
      '「やめる」で閉じると、見た目は変わらない',
      '髪型・目・服・服の色を選んで「決める」を押すと、画面が閉じ、ログに「見た目を変えた」と出る',
      '画面を読み込み直して「見た目を変える」を開いても、選んだ見た目のまま'
    ]
  }),
  async ({ page }) => {
    const step = startSteps(page);
    await resetRpg();
    await loginAsE2E(page, step);
    const dialog = page.getByRole('dialog', { name: '見た目' });
    const option = (group: string, name: string) => dialog.getByRole('group', { name: group, exact: true }).getByRole('button', { name: `${group} ${name}` });

    await step('RPG(/rpg)を開き、サイド欄の「見た目を変える」を押す', '「見た目」の画面が開き、ショート・ふつう・シャツが選ばれている', async () => {
      await page.goto('/rpg');
      await page.getByRole('button', { name: '🧑 見た目を変える' }).click();
      await expect(option('髪型', 'ショート')).toHaveAttribute('aria-pressed', 'true');
      await expect(option('目', 'ふつう')).toHaveAttribute('aria-pressed', 'true');
      await expect(option('服', 'シャツ')).toHaveAttribute('aria-pressed', 'true');
    });

    await step('目の「メガネ」を押す', '目の色の欄が消える', async () => {
      await expect(dialog.getByRole('group', { name: '目の色' })).toBeVisible();
      await option('目', 'メガネ').click();
      await expect(dialog.getByRole('group', { name: '目の色' })).toHaveCount(0);
    });

    await step('「やめる」で閉じて、もう一度開く', '目は「ふつう」のまま', async () => {
      await dialog.getByRole('button', { name: 'やめる' }).click();
      await expect(dialog).toHaveCount(0);
      await page.getByRole('button', { name: '🧑 見た目を変える' }).click();
      await expect(option('目', 'ふつう')).toHaveAttribute('aria-pressed', 'true');
    });

    await step('ポニーテール・メガネ・ローブ・紫の服を選んで「決める」を押す', '画面が閉じ、ログに「見た目を変えた」と出る', async () => {
      await option('髪型', 'ポニーテール').click();
      await option('目', 'メガネ').click();
      await option('服', 'ローブ').click();
      await dialog.getByRole('button', { name: '服の色 #8b5cf6' }).click();
      await dialog.getByRole('button', { name: '決める' }).click();
      await expect(dialog).toHaveCount(0);
      await expect(page.getByRole('region', { name: 'ログ' }).getByText('見た目を変えた')).toBeVisible();
    });

    await step('画面を読み込み直して「見た目を変える」を押す', 'ポニーテール・メガネ・ローブ・紫の服のまま', async () => {
      // 見た目は「決める」ですぐ保存する。保存が終わるのを待ってから読み込み直す
      await page.waitForLoadState('networkidle');
      await page.reload();
      await page.getByRole('button', { name: '🧑 見た目を変える' }).click();
      await expect(option('髪型', 'ポニーテール')).toHaveAttribute('aria-pressed', 'true');
      await expect(option('目', 'メガネ')).toHaveAttribute('aria-pressed', 'true');
      await expect(option('服', 'ローブ')).toHaveAttribute('aria-pressed', 'true');
      await expect(dialog.getByRole('button', { name: '服の色 #8b5cf6' })).toHaveAttribute('aria-pressed', 'true');
    });
  }
);

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
