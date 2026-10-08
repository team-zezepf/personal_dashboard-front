# 資格学習のまとめ(docs/)

資格学習のジャンル別まとめの本文です。アプリのジャンル別まとめページと、GitHub Pages の両方で同じ HTML を使います。

- アプリ: ビルド時に `docs/` の HTML を同梱し、各ページの `<article class="genre-article">` の中(見出しと本文)だけを表示します。サイドバーや前後のジャンルはアプリ側で作ります。
- GitHub Pages: 公開元を `main` ブランチの `/docs` にしています。`index.html` が目次です。

## 構成

```
docs/
  index.html                  目次(科目 → 系統 → ジャンル)
  assets/study.css            共通のスタイル(アプリでも読み込む)
  <examType>/<genreKey>.html  ジャンルごとのページ
```

## ジャンルのページの書き方

```html
<article class="genre-article" data-exam-type="kihonjoho" data-genre-key="kiso-riron" data-category="テクノロジ系">
  <header class="genre-header">
    <h1>基礎理論のまとめ</h1>
    <p class="genre-description">ページの説明(アプリではタイトルの下に表示する)</p>
  </header>

  <section class="topic" id="topic-0">
    <h2><span class="topic-no">1</span>見出し(アプリのサイドバーの目次になる)</h2>
    <p>本文</p>
  </section>
</article>
```

- 見出しごとに `<section class="topic" id="topic-N">`(N は0から)を作り、最初に `<h2>` を置きます。
- 使える部品(スタイルは `assets/study.css`):
  - 表: `<table class="ref-table">`
  - 例題・注意点・公式の枠: `<div class="example-box">` / `<div class="pitfall-box">` / `<div class="formula-box">`(中に `<span class="label">見出し</span>` と本文)
  - 図: `<figure class="fig">` に SVG と `<figcaption class="fig-caption">`
  - アイコンの並び(論理ゲートなど): `<div class="gate-grid">` に `<div class="gate-card">`
- `<article>` の外(ヘッダー・パンくず・前後のジャンルへのリンク)は GitHub Pages で単体表示するときだけ使います。

## 練習問題を置くとき

節(`section.topic`)の最後に `<div class="practice">` を置くと、その場で解ける練習問題になります(今は簿記3級の各節にあります)。動きは `assets/quiz.js`、見た目は `assets/study.css` にあります。

- GitHub Pages: ページの `<head>` で `<script src="../assets/quiz.js" defer></script>` を読み込む
- アプリ: 本文は `innerHTML` で差し込むため本文中の `<script>` は動かない。`angular.json` の `scripts` で `docs/assets/quiz.js` を読み込んでいる(ページ側の対応は不要)

```html
<div class="practice">
  <div class="practice-head">練習問題 <span class="practice-score">0 / 2問 正解</span></div>

  <!-- 4択: data-answer は正解の位置(0始まり) -->
  <div class="quiz quiz-choice" data-answer="2">
    <p class="quiz-q">問1　問題文</p>
    <div class="quiz-choices">
      <button type="button">ア　選択肢</button>
      <button type="button">イ　選択肢</button>
      <button type="button">ウ　選択肢(正解)</button>
      <button type="button">エ　選択肢</button>
    </div>
    <div class="quiz-result" hidden aria-live="polite"></div>
    <p class="quiz-explain" hidden>解説(答えた後に表示する)</p>
  </div>

  <!-- 仕訳の入力: data-accounts は選べる勘定科目、data-debit / data-credit は正しい借方・貸方(科目:金額 をカンマ区切り) -->
  <div class="quiz quiz-journal" data-accounts="現金,売掛金,買掛金,仕入,売上" data-debit="現金:30000,売掛金:70000" data-credit="売上:100000">
    <p class="quiz-q">問2　問題文</p>
    <div class="journal"></div>
    <button type="button" class="quiz-check">答え合わせ</button>
    <div class="quiz-result" hidden aria-live="polite"></div>
    <p class="quiz-explain" hidden>解説</p>
  </div>
</div>
```

- 仕訳の入力欄(`.journal` の中身)は `quiz.js` が組み立てる。行数は借方・貸方の正解の行数の多いほう(最低2行)
- 仕訳は、入力した行の科目と金額が正解とすべて一致し、過不足がないときに正解とする(行の順番は問わない)
- 解いた結果は保存しない(ページを開き直すと最初から)

## ランダム出題の練習問題(基本情報 科目B・応用情報 午後)

`kihonjoho-b/practice.html` と `oyojoho-pm/practice.html` は、問題を5問ずつランダムに出題するページです(GitHub Pages だけで使い、アプリには載せない。アプリでは「問題を解く」で解ける)。解いた結果は保存しません。

- 分野は目次のリンクの `?genre=<キー>` で指定する(指定なしはすべての分野)。開くとすぐ出題が始まる
- 問題は各フォルダの `questions.js`。`personal_dashboard-data/exam_questions.json` から生成するので、直接編集しない
- 問題データを直したら、front で `npm run docs:practice` を実行して `questions.js` を生成し直し、コミットする(生成は `scripts/build-practice-questions.mjs`。全科目をまとめて生成する)
- 分野が増えたら、生成スクリプトの `EXAMS` にキーを追加し、目次にリンクを追加する(キーがない分野があると生成はエラーになる)
- 科目を増やすときは、`EXAMS` に科目を追加し、既存の `practice.html` をコピーして試験名(パンくず・`data-exam-name`)と戻り先(`data-toc-href`)を書き換え、目次に欄を追加する
- 動きは `assets/practice.js`、見た目は `assets/practice.css`。1回の出題数はページの `data-per-session` で変えられる

## ジャンルを追加するとき

1. `docs/<examType>/<genreKey>.html` を追加する(既存のページをコピーすると早い)
2. アプリのジャンル一覧 `src/app/config/genre-content.ts` の `GENRES` に登録する(並び順がサイドバーと前後のジャンルの順になる)
3. `docs/index.html` の目次と、前後のジャンルのページの「前のジャンル／次のジャンル」のリンクを更新する

## 用語集(docs/<examType>/glossary.html)

まとめに出てくる用語を50音順に並べたページです(front#209)。アプリではまとめページのサイドバーの一番上に「用語集」として表示します。

- `glossary.html` は生成物なので直接編集しない。用語は `scripts/glossary/<examType>/<genreKey>.json` に書き、front で `npm run docs:glossary` を実行して生成し直す(生成は `scripts/build-glossary.mjs`)
- 1語の書き方: `{ "term": "用語", "reading": "ひらがなの読み", "en": "英語の正式名(任意)", "desc": "1〜2行の説明", "topic": 関連する見出しの番号(1始まり。複数なら [1, 3]) }`
  - 読みは50音の行を決めるのに使う。英字で始まる用語は「A–Z」に並ぶので省略してよい
  - 同じ用語が別のジャンルにも出てくるときは、2つ目以降のジャンルでは `term` と `topic` だけ書く(関連リンクが追加される)。説明は最初のジャンル(`genre-content.ts` の並び順)に書く
  - 見出しの番号がまとめにないとエラーになる。まとめの見出しを増減したら、用語集も生成し直す
- 応用情報(oyojoho)には、基本情報(kihonjoho)の用語集にない用語だけを書く(重なる用語は生成時に除かれ、基本情報の用語集へのリンクを置く)
- 検索・分野の絞り込みは `assets/glossary.js`(アプリでは `angular.json` の `scripts` で読み込む)、見た目は `assets/study.css`
- 関連リンクは `data-genre-key` / `data-topic-index` を持ち、アプリではまとめページのその見出しへ移動する
- 用語テスト(front#211): 用語集の「用語テスト(10問)」で、説明を見て用語を入力して答える。分野で絞り込んでいるときはその分野から出題する。正解は、用語そのもの・読み(`data-reading`)・かっこの外・かっこの中のどれか(カタカナ/ひらがな・全角/半角・大文字/小文字・空白は区別しない)。動きは `assets/glossary.js`、結果は保存しない
