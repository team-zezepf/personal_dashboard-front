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

## ジャンルを追加するとき

1. `docs/<examType>/<genreKey>.html` を追加する(既存のページをコピーすると早い)
2. アプリのジャンル一覧 `src/app/config/genre-content.ts` の `GENRES` に登録する(並び順がサイドバーと前後のジャンルの順になる)
3. `docs/index.html` の目次と、前後のジャンルのページの「前のジャンル／次のジャンル」のリンクを更新する
