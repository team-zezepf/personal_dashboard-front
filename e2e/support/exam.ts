import { Page } from '@playwright/test';
import { expect } from './evidence';

/**
 * 表示中の問題それぞれで、最初の選択肢を選ぶ(正解かどうかは問わない)。
 * 選択肢は行(li)のクリックで選ぶ作り。文字の部分をクリックすると、複数選択の問題では
 * 選んですぐ外れる不具合(front#204)があるため、行の端(文字の外)をクリックする。
 */
export async function chooseFirstChoices(page: Page): Promise<void> {
  const choiceLists = page.locator('main ul').filter({ has: page.locator('li.choice-item') });
  for (const list of await choiceLists.all()) {
    const first = list.locator('li.choice-item').first();
    await first.click({ position: { x: 4, y: 4 } });
    await expect(first).toHaveClass(/selected/);
  }
}
