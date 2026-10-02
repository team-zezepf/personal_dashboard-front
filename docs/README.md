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

## ジャンルを追加するとき

1. `docs/<examType>/<genreKey>.html` を追加する(既存のページをコピーすると早い)
2. アプリのジャンル一覧 `src/app/config/genre-content.ts` の `GENRES` に登録する(並び順がサイドバーと前後のジャンルの順になる)
3. `docs/index.html` の目次と、前後のジャンルのページの「前のジャンル／次のジャンル」のリンクを更新する
