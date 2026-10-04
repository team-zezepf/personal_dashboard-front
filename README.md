# PersonalDashboardFront

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.2.22.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

ブラウザでの主な操作(ログイン・予定の登録・練習・模擬試験・つぶやき・メニューの出し分け)を、[Playwright](https://playwright.dev/) で確かめる(`e2e/`)。

1. 動作確認用の環境(sandbox)を起動しておく(ルートの `start-sandbox.bat`。フロント 4201 / API 8081)
2. 実行する。Issue の証跡として残すときは、`E2E_EVIDENCE` に `<repo>-issue<番号>-<内容>` の形のフォルダ名を指定する(報告書に Issue へのリンクが出る)。修正前・修正後など、実行の目的は `E2E_NOTE` にメモする(実行日時のフォルダ名の後ろと、報告書に出る)

```bash
npm run e2e                                         # 証跡は ../test/e2e/<実行日時>/ に残る
E2E_EVIDENCE=front-issue204-multi-choice-click E2E_NOTE=修正前 npm run e2e
                                                    # 証跡は ../test/front-issue204-multi-choice-click/<実行日時>-修正前/ に残る
npm run e2e -- --headed                             # ブラウザを表示しながら実行する
npm run e2e -- e2e/calendar.spec.ts                 # 1つのファイルだけ実行する
```

PowerShell では、環境変数を先に設定する(続けて実行するときは、前に設定した値が残る点に注意)。

```powershell
$env:E2E_EVIDENCE = "front-issue204-multi-choice-click"; $env:E2E_NOTE = "修正前"; npm run e2e
```

- 証跡(報告書)は、テストケース(前提・期待する結果)と、手順ごとの結果(OK / NG)・スクリーンショットを並べた HTML(`index.html`)。実行のたびに実行日時のフォルダを作る
- E2E 専用のアカウント(`e2e@example.com`)を使う。なければ最初に作る。手で確認するときの `sandbox@example.com` には触らない
- テストで作った予定・つぶやきは、テストの終わりに消す。失敗して残ったもの(タイトルが `[E2E]` で始まるもの)は、次の実行の最初に消す
- 練習・模擬試験の記録とポイントは、E2E 専用のアカウントに溜まっていく
- ブラウザはインストール済みの Chrome を使う(Playwright のブラウザはダウンロードしない)
- API のコードを変えたときは、sandbox の API を起動し直してから実行する
- 失敗したときは、操作の記録(trace)が `test-results/` に残る(`npx playwright show-trace <trace.zip>` で開ける)

## Android版アプリ

Dashboard（予定・カレンダー・タスク）と資格学習だけを使える、Android 用のオフライン版アプリです（#184）。[Capacitor](https://capacitorjs.com/) でこのフロントをそのまま Android アプリにしています。API には通信せず、データは端末の中だけに保存します。

- 予定・タスク・成績は端末内（WebView の localStorage）に保存します。アプリを消すとデータも消えます
- PC 版とは、予定・タスク・成績をファイルでやり取りできます（#185）。Android 版は 設定 →「PC 版とのやり取り」、PC 版はアバターメニュー →「データの書き出し・取り込み」。予定・タスクは取り込んだ内容で置き換え、成績は追加します
- 問題データ（`personal_dashboard-data/exam_questions.json`）は、APK を作るときに同梱します。問題を追加・修正したら、APK を作り直して入れ直してください
- 天気・株価・トピック・ポイント・ログイン画面などは出しません
- しくみ: `environment.offline`（`src/environments/environment.android.ts`）が true のとき、`GraphQLService` が API の代わりに `OfflineBackendService` を呼びます

### 必要なもの

- [Android Studio](https://developer.android.com/studio)（付属の JDK 21 と Android SDK を使います。SDK のライセンスには Android Studio の初回起動時に同意しておきます）
- 足りない SDK（Platform 36 / Build-Tools など）は、初回のビルドで自動でダウンロードされます

### APK の作り方

```bash
npm run android:apk
```

問題データが既定の場所（`../personal_dashboard-data/exam_questions.json`）にないときは、場所を渡します。

```bash
npm run android:apk -- C:/zezepf/personal_dashboard/personal_dashboard-data/exam_questions.json
```

`android/app/build/outputs/apk/debug/app-debug.apk` ができるので、スマホにコピーして開くとインストールできます（「提供元不明のアプリ」のインストールを許可する必要があります）。USB でつないでいれば、`adb install -r android/app/build/outputs/apk/debug/app-debug.apk` でも入れられます。`-r` を付ければ、データを残したまま上書きでインストールします。

### アイコンを変える

元画像は `assets/icon.png`（透明な背景に丸い絵）です。差し替えたら、各サイズのアイコンを書き出してから APK を作り直します。

```bash
npm run android:icons
npm run android:apk
```

背景は透明で、Pixel など丸く切り抜く端末では丸い絵がちょうど収まります。四角・角丸に切り抜く端末では四隅が透明になります。

### ブラウザで確認する

Android 版の画面は、ブラウザでも確認できます（データはそのブラウザの localStorage に保存されます）。

```bash
npm run start:android
```

http://localhost:4202 を開き、開発者ツールでスマホの画面幅にして確認します。

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
