import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { SANDBOX_DATA_DIR } from './env';

/**
 * RPG の E2E で使う RPG データ(front#260)。
 * sandbox の RPG データ(手で確認するときに作り変えることがある)の中身や、敵が回復薬を落とすランダムに左右されないよう、
 * テストの間だけ e2e/fixtures/rpg/ のデータに置き換え、終わったら元に戻す。
 * セーブデータ・置物のデフォルトも退避し、空の状態から始める(front#366)。sandbox で作ったアイテム(item1 など)を
 * sandbox のアカウントが持っていたり、置物の中身に入れていたりすると、E2E で作るアイテムと ID がぶつかり、
 * 持っている人の数がずれる・使われているとみなされて消せない・E2E でアイテムを消したときに sandbox の持ち物からも消える、が起きるため。
 * API はこのファイルを毎回読むので、起動し直さなくてよい
 */
const FILES = ['rpg_dungeons.json', 'rpg_maps.json', 'rpg_enemies.json', 'rpg_crafts.json', 'rpg_items.json'];
// テストの間は空にするファイル。E2E のアカウントのセーブデータは各テストが API で作り直す。
// 置物のデフォルト(rpg_objects.json)も、sandbox で中身に sandbox のアイテムを入れていると ID がぶつかるので、何も決めていない状態にする
// ダンジョンの見た目(rpg_themes.json。front#389)も、何も保存していない状態(最初の4つ)にする
const EMPTY_FILES = ['rpg_saves.json', 'rpg_objects.json', 'rpg_themes.json'];
const FIXTURE_DIR = path.resolve(__dirname, '..', 'fixtures', 'rpg');
// 退避先。退避したファイルと、元のファイルがなかったものは manifest に記録し、戻すときに消す
const BACKUP_DIR = path.join(SANDBOX_DATA_DIR, '.e2e-rpg-backup');
const MANIFEST = path.join(BACKUP_DIR, 'manifest.json');

function assertSandboxDir(): void {
  if (!existsSync(path.join(SANDBOX_DATA_DIR, 'users.json'))) {
    throw new Error(
      `sandbox のデータのフォルダ(${SANDBOX_DATA_DIR})が見つかりません。環境変数 SANDBOX_DATA_DIR で場所を指定してください。`
    );
  }
}

/** sandbox の RPG データを退避し、E2E 用のデータを置く。前回途中で止まって退避が残っていれば、先に元へ戻す */
export function useRpgFixture(): void {
  assertSandboxDir();
  restoreRpgData();
  mkdirSync(BACKUP_DIR, { recursive: true });
  const files = [...FILES, ...EMPTY_FILES];
  const existed = files.filter((f) => existsSync(path.join(SANDBOX_DATA_DIR, f)));
  for (const f of existed) copyFileSync(path.join(SANDBOX_DATA_DIR, f), path.join(BACKUP_DIR, f));
  writeFileSync(MANIFEST, JSON.stringify({ files, existed }), 'utf8');
  for (const f of FILES) copyFileSync(path.join(FIXTURE_DIR, f), path.join(SANDBOX_DATA_DIR, f));
  for (const f of EMPTY_FILES) writeFileSync(path.join(SANDBOX_DATA_DIR, f), '[]', 'utf8');
}

/** 退避した RPG データを元に戻す(退避がなければ何もしない) */
export function restoreRpgData(): void {
  if (!existsSync(MANIFEST)) return;
  // 戻すのは、退避したときに対象だったファイルだけ(セーブデータを対象にする前の退避なら、セーブデータは触らない)
  const { files = FILES, existed } = JSON.parse(readFileSync(MANIFEST, 'utf8')) as { files?: string[]; existed: string[] };
  for (const f of files) {
    const target = path.join(SANDBOX_DATA_DIR, f);
    if (existed.includes(f)) copyFileSync(path.join(BACKUP_DIR, f), target);
    else rmSync(target, { force: true });
  }
  rmSync(BACKUP_DIR, { recursive: true, force: true });
}
