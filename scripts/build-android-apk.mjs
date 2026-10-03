/*
 * Android版アプリ(オフライン)の APK を作る(front#184)。npm run android:apk で実行する。
 *
 * 1. 問題データを src/offline-data に書き出す(scripts/prepare-android-data.mjs)
 * 2. Android 用にビルドする(ng build --configuration android → dist/android/browser)
 * 3. ビルドしたものを Android プロジェクトへコピーする(npx cap sync android)
 * 4. APK を作る(android/gradlew assembleDebug)
 *    → android/app/build/outputs/apk/debug/app-debug.apk
 *
 * 問題データの場所が既定(../personal_dashboard-data/exam_questions.json)と違うときは引数で渡す:
 *   npm run android:apk -- C:/zezepf/personal_dashboard/personal_dashboard-data/exam_questions.json
 *
 * 必要なもの: Android Studio(付属の JDK と Android SDK を使う)。詳しくは README の「Android版アプリ」
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const isWindows = process.platform === 'win32';
const env = { ...process.env };

// Capacitor 8 の Android ビルドには JDK 21 が要る。Android Studio 付属の JDK があればそれを使う
const studioJdk = isWindows ? 'C:/Program Files/Android/Android Studio/jbr' : '/Applications/Android Studio.app/Contents/jbr/Contents/Home';
if (existsSync(studioJdk)) env.JAVA_HOME = studioJdk;

// Android SDK の場所。未設定なら Android Studio の既定の場所を使う
if (!env.ANDROID_HOME && !env.ANDROID_SDK_ROOT) {
  const defaultSdk = isWindows ? join(env.LOCALAPPDATA ?? '', 'Android/Sdk') : join(env.HOME ?? '', 'Library/Android/sdk');
  if (existsSync(defaultSdk)) env.ANDROID_HOME = defaultSdk;
}

function run(command, args, cwd = root) {
  console.log(`\n> ${command} ${args.join(' ')}`);
  // Windows の .cmd / .bat は shell 経由でないと起動できない
  const result = spawnSync(isWindows ? `"${command}"` : command, args, { cwd, env, stdio: 'inherit', shell: isWindows });
  if (result.status !== 0) {
    console.error(`\n失敗しました: ${command} ${args.join(' ')}`);
    process.exit(result.status ?? 1);
  }
}

// npx は npm run の中から呼ぶと node_modules の中の npm を探して失敗することがあるので、CLI を node で直接起動する
run(process.execPath, ['scripts/prepare-android-data.mjs', ...process.argv.slice(2)]);
run(process.execPath, ['node_modules/@angular/cli/bin/ng.js', 'build', '--configuration', 'android']);
run(process.execPath, ['node_modules/@capacitor/cli/bin/capacitor', 'sync', 'android']);
// 今いるフォルダのコマンドを探さない設定(NoDefaultCurrentDirectoryInExePath)でも動くよう、フルパスで指定する
run(join(root, 'android', isWindows ? 'gradlew.bat' : 'gradlew'), ['assembleDebug'], join(root, 'android'));

console.log(`\nAPK を作りました: ${join(root, 'android/app/build/outputs/apk/debug/app-debug.apk')}`);
