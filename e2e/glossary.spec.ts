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

test(
  'E2E-10 用語集の用語テストで、説明を見て用語を入力して答え、結果で間違えた用語を確かめられる',
  caseOf({
    precondition: ['sandbox が起動している', 'E2E 専用のアカウントでログインしている'],
    expected: [
      '分野で絞り込んでから「用語テスト(10問)」を押すと、その分野の用語から出題される',
      'ヒントで最初の1文字と文字数が出る',
      '読み(ひらがな)で答えても正解になる。違う答えは不正解になり、正しい用語が表示される',
      '10問終えると正解数と、間違えた用語(自分の答え付き)が表示され、用語集に戻れる'
    ]
  }),
  async ({ page }) => {
    const step = startSteps(page);
    const glossary = page.locator('.genre-article.glossary');
    const quiz = glossary.locator('.gl-quiz');

    // 表示中の説明(答えは〇〇に隠れている)と用語集の本文を照らし合わせて、答えの用語と読みを求める
    const currentAnswer = () =>
      page.evaluate(() => {
        const shown = document.querySelector('.gl-quiz-desc')!.textContent!;
        for (const el of Array.from(document.querySelectorAll('section.gl-row .gl-term'))) {
          const name = el.querySelector('.gl-name')!.textContent!;
          const m = name.match(/^(.+?)\((.+)\)$/);
          const masks = [name, ...(m ? [m[1], m[2]] : [])].sort((a, b) => b.length - a.length);
          let desc = el.querySelector('.gl-desc')!.textContent!;
          for (const w of masks) desc = desc.split(w).join('〇〇');
          if (desc === shown) return { name, reading: el.getAttribute('data-reading') ?? '' };
        }
        throw new Error(`説明に一致する用語が見つからない: ${shown}`);
      });

    await loginAsE2E(page, step);

    await step('基本情報技術者試験(科目A)の用語集を開き、分野の「ストラテジ系」を押してから「用語テスト(10問)」を押す', '1問目が表示され、ストラテジ系のテストであることが分かる', async () => {
      await page.goto('/study/kihonjoho/genre/glossary');
      await glossary.getByRole('button', { name: 'ストラテジ系' }).click();
      await glossary.getByRole('button', { name: /用語テスト/ }).click();
      await expect(quiz.getByText('第 1 問 / 全 10 問')).toBeVisible();
      await expect(quiz.getByText('用語テスト(ストラテジ系)')).toBeVisible();
      await expect(glossary.locator('section.gl-row').first()).toBeHidden();
    });

    await step('「ヒント」を押し、答えの用語を読み(ひらがな)で入力して「回答する」を押す', 'ヒントに最初の1文字と文字数が出て、「○ 正解」と表示される', async () => {
      const answer = await currentAnswer();
      await quiz.getByRole('button', { name: /ヒント/ }).click();
      await expect(quiz.locator('.gl-quiz-hint')).toContainText('文字');
      await quiz.getByRole('textbox', { name: '答えの用語' }).fill(answer.reading || answer.name);
      await quiz.getByRole('button', { name: '回答する' }).click();
      await expect(quiz.getByText('○ 正解')).toBeVisible();
    });

    await step('「次へ」を押し、2問目に「まちがい」と入力して Enter を押す', '「× 不正解」と正しい用語が表示される', async () => {
      await quiz.getByRole('button', { name: '次へ' }).click();
      await expect(quiz.getByText('第 2 問 / 全 10 問')).toBeVisible();
      const answer = await currentAnswer();
      await quiz.getByRole('textbox', { name: '答えの用語' }).fill('まちがい');
      await page.keyboard.press('Enter');
      await expect(quiz.getByText('× 不正解')).toBeVisible();
      await expect(quiz.locator('.gl-quiz-answer')).toHaveText(answer.name);
    });

    await step('残りの8問は「わからない」を押して進め、最後に「結果を見る」を押す', '正解数「1 / 10」と、間違えた用語9語(2問目は自分の答え「まちがい」付き)が表示される', async () => {
      for (let i = 3; i <= 10; i++) {
        await quiz.getByRole('button', { name: '次へ' }).click();
        await expect(quiz.getByText(`第 ${i} 問 / 全 10 問`)).toBeVisible();
        await quiz.getByRole('button', { name: 'わからない' }).click();
      }
      await quiz.getByRole('button', { name: '結果を見る' }).click();
      await expect(quiz.locator('.gl-quiz-score')).toContainText('1 / 10');
      await expect(quiz.locator('.gl-quiz-missed .gl-term')).toHaveCount(9);
      await expect(quiz.getByText('あなたの答え: まちがい')).toBeVisible();
    });

    await step('「用語集に戻る」を押す', 'テストが閉じ、用語の一覧と検索欄が表示される', async () => {
      await quiz.getByRole('button', { name: '用語集に戻る' }).click();
      await expect(quiz).toHaveCount(0);
      await expect(glossary.getByRole('searchbox', { name: '用語を探す' })).toBeVisible();
      await expect(glossary.locator('section.gl-row').first()).toBeVisible();
    });
  }
);
