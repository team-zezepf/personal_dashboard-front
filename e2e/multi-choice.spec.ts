import { Locator, Page } from '@playwright/test';
import { caseOf, expect, loginAsE2E, startSteps, Step, test } from './support/evidence';

// テスト用の複数選択の問題(正解はア・ウ)。問題データにある複数選択の問題は少なく、出題がランダムなので差し替える
const MULTI_QUESTIONS = [9001, 9002].map((id) => ({
  id,
  category: 'テクノロジ',
  subCategory: 'E2E テスト',
  type: 'multi',
  question: `複数選択の問題(E2E テスト用 ${id})`,
  choices: ['ア', 'イ', 'ウ', 'エ'],
  correct: [0, 2],
  explanation: '正解はアとウ',
  image: null,
  code: null
}));

// 復習の画面で使う、テスト用の問題をどちらも間違えた模擬試験の記録
const MISTAKE_RECORD = {
  id: 9001,
  userId: 1,
  examType: 'kihonjoho',
  mode: 'MOCK_EXAM',
  date: '2026-10-01',
  correctCount: 0,
  totalCount: 2,
  passed: false,
  createdAt: '2026-10-01T10:00:00',
  answers: MULTI_QUESTIONS.map((q) => ({ questionId: q.id, selected: [1], correct: false }))
};

// 問題データ・模擬試験の記録の取得だけを差し替え、ほかの通信(採点の記録など)は sandbox の API に送る
async function useMultiChoiceQuestions(page: Page): Promise<void> {
  await page.route('**/graphql', async (route) => {
    const body = route.request().postData() ?? '';
    if (body.includes('examQuestions')) return route.fulfill({ json: { data: { examQuestions: MULTI_QUESTIONS } } });
    if (body.includes('GetMockExamRecords')) return route.fulfill({ json: { data: { examRecords: [MISTAKE_RECORD] } } });
    return route.continue();
  });
}

// 1問目の選択肢の行
const choice = (page: Page, text: string): Locator =>
  page.locator('main ul').filter({ has: page.locator('li.choice-item') }).first().locator('li.choice-item', { hasText: text });

async function expectChosen(page: Page, chosen: string[]): Promise<void> {
  for (const text of ['ア', 'イ', 'ウ', 'エ']) {
    const item = choice(page, text);
    if (chosen.includes(text)) {
      await expect(item).toHaveClass(/selected/);
      await expect(item.getByRole('checkbox')).toBeChecked();
    } else {
      await expect(item).not.toHaveClass(/selected/);
      await expect(item.getByRole('checkbox')).not.toBeChecked();
    }
  }
}

// 選択肢の文字をクリックして2つ選び、1つを外し、チェックボックスそのものでも選べることを確かめる
async function checkClickingChoices(page: Page, step: Step, screen: string): Promise<void> {
  await step(`${screen}: 1問目の選択肢「ア」「ウ」の文字をクリックする`, '「ア」「ウ」の2つが選ばれた状態になる', async () => {
    await choice(page, 'ア').getByText('ア', { exact: true }).click();
    await choice(page, 'ウ').getByText('ウ', { exact: true }).click();
    await expectChosen(page, ['ア', 'ウ']);
  });

  await step(`${screen}: 選択肢「ア」の文字をもう一度クリックする`, '「ア」が外れ、「ウ」だけが選ばれた状態になる', async () => {
    await choice(page, 'ア').getByText('ア', { exact: true }).click();
    await expectChosen(page, ['ウ']);
  });

  await step(`${screen}: 選択肢「エ」のチェックボックスをクリックする`, '「ウ」「エ」が選ばれた状態になる(チェックボックスでも選べる)', async () => {
    await choice(page, 'エ').getByRole('checkbox').click();
    await expectChosen(page, ['ウ', 'エ']);
  });
}

test(
  'E2E-08 複数選択の問題で、選択肢の文字をクリックして選んだり外したりできる(練習・模擬試験・復習)',
  caseOf({
    precondition: [
      'sandbox が起動している',
      'E2E 専用のアカウントでログインしている',
      '問題データは、テスト用の複数選択の問題2問(正解はア・ウ)に差し替える',
      '復習の画面では、その2問を間違えた模擬試験の記録があることにする'
    ],
    expected: [
      '練習・模擬試験・間違えた問題の復習のどの画面でも、選択肢の文字をクリックすると選ばれる(front#204)',
      'もう一度クリックすると外れる',
      'チェックボックスそのものをクリックしても選べる'
    ]
  }),
  async ({ page }) => {
    const step = startSteps(page);
    await useMultiChoiceQuestions(page);
    await loginAsE2E(page, step);

    await step('練習(基本情報技術者試験（科目A）)を開始する', 'テスト用の複数選択の問題が表示される', async () => {
      await page.goto('/study/kihonjoho');
      await page.getByRole('button', { name: '学習を始める' }).click();
      await expect(page.getByText(/複数選択の問題\(E2E テスト用/).first()).toBeVisible();
    });
    await checkClickingChoices(page, step, '練習');

    await step('模擬試験(基本情報技術者試験（科目A）)を開始する', 'テスト用の複数選択の問題が表示される', async () => {
      await page.goto('/study/kihonjoho/mock-exam');
      await page.getByRole('button', { name: '模擬試験を開始する' }).click();
      await expect(page.getByText(/複数選択の問題\(E2E テスト用/).first()).toBeVisible();
    });
    await checkClickingChoices(page, step, '模擬試験');

    await step('模擬試験を棄権する(確認でも「棄権する」を押す)', '記録を残さずに、科目一覧(/study)に戻る', async () => {
      await page.getByRole('button', { name: '棄権する' }).click();
      await page.getByRole('button', { name: '棄権する' }).last().click();
      await expect(page).toHaveURL(/\/study$/);
    });

    await step('間違えた問題の復習(基本情報技術者試験（科目A）)を開き、「復習を始める」を押す', 'テスト用の複数選択の問題が表示される', async () => {
      await page.goto('/study/kihonjoho/review');
      await page.getByRole('button', { name: '復習を始める' }).click();
      await expect(page.getByText(/複数選択の問題\(E2E テスト用/).first()).toBeVisible();
    });
    await checkClickingChoices(page, step, '復習');
  }
);
