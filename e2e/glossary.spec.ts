import { caseOf, expect, loginAsE2E, startSteps, test } from './support/evidence';

test(
  'E2E-09 まとめページの用語集で用語を探し、関連するまとめの見出しに移動できる',
  caseOf({
    precondition: ['sandbox が起動している', 'E2E 専用のアカウントでログインしている'],
    expected: [
      'サイドバーの一番上に「用語集」があり、開くと用語が50音順に並び、目次の代わりに50音の索引が出る',
      '検索欄に入力すると、一致する用語だけに絞り込まれる(カタカナの用語もひらがなで探せる)',
      '分野のボタンで絞り込める',
      '用語の関連リンクを押すと、そのまとめの見出しの位置に移動する'
    ]
  }),
  async ({ page }) => {
    const step = startSteps(page);
    const glossary = page.locator('.genre-article.glossary');
    const term = (name: string) => glossary.locator('.gl-term', { has: page.locator('.gl-name', { hasText: name }) });

    await loginAsE2E(page, step);

    await step('基本情報技術者試験(科目A)の「基礎理論」のまとめを開き、サイドバーの一番上の「用語集」を押す', '用語集が開き、50音の索引と用語が表示される', async () => {
      await page.goto('/study/kihonjoho/genre/kiso-riron');
      const sidebar = page.getByRole('navigation', { name: 'ジャンルと目次' });
      await sidebar.getByRole('link', { name: /用語集/ }).click();
      await page.waitForURL('**/study/kihonjoho/genre/glossary');
      await expect(page.getByRole('heading', { name: '用語集', level: 1 })).toBeVisible();
      await expect(sidebar.getByLabel('50音の索引').getByRole('link', { name: 'さ', exact: true })).toBeVisible();
      await expect(term('サブネットマスク')).toBeVisible();
    });

    await step('検索欄に「はっしゅ」と入力する', 'ハッシュ関数などカタカナの用語も見つかり、関係のない用語は表示されない', async () => {
      await glossary.getByRole('searchbox', { name: '用語を探す' }).fill('はっしゅ');
      await expect(term('ハッシュ関数')).toBeVisible();
      await expect(term('サブネットマスク')).toBeHidden();
      await expect(glossary.locator('.gl-count')).toContainText('全');
    });

    await step('検索欄を空にして、分野の「ストラテジ系」を押す', 'ストラテジ系の用語だけが表示される', async () => {
      await glossary.getByRole('searchbox', { name: '用語を探す' }).fill('');
      await glossary.getByRole('button', { name: 'ストラテジ系' }).click();
      await expect(term('SWOT分析')).toBeVisible();
      await expect(term('サブネットマスク')).toBeHidden();
    });

    await step('分野を「すべて」に戻し、「サブネットマスク」の関連リンクを押す', 'ネットワークのまとめの「IPアドレスとサブネットマスク」の見出しに移動する', async () => {
      await glossary.getByRole('button', { name: 'すべて' }).click();
      await term('サブネットマスク').getByRole('link', { name: /IPアドレスとサブネットマスク/ }).click();
      await page.waitForURL('**/study/kihonjoho/genre/network#topic-2');
      await expect(page.getByRole('heading', { name: 'ネットワークのまとめ', level: 1 })).toBeVisible();
      await expect(page.locator('#topic-2')).toBeInViewport();
    });
  }
);
