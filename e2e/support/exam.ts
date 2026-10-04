import { Page } from '@playwright/test';
import { expect } from './evidence';

/** 表示中の問題それぞれで、最初の選択肢の文字をクリックして選ぶ(正解かどうかは問わない) */
export async function chooseFirstChoices(page: Page): Promise<void> {
  const choiceLists = page.locator('main ul').filter({ has: page.locator('li.choice-item') });
  for (const list of await choiceLists.all()) {
    const first = list.locator('li.choice-item').first();
    await first.locator('label span').click();
    await expect(first).toHaveClass(/selected/);
  }
}
