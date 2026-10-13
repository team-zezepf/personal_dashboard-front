import { restoreRpgData } from './rpg-fixture';

/** テストが終わったあと(失敗しても)1回だけ実行する。global-setup で置き換えた sandbox の RPG データを元に戻す(front#260) */
export default async function globalTeardown(): Promise<void> {
  restoreRpgData();
}
