/*
 * 資格学習のまとめの「用語集」(docs/<科目>/glossary.html)を、用語のデータ(scripts/glossary/<科目>/<ジャンル>.json)から書き出す(front#209)。
 * 用語を直したら、このスクリプトを実行し直して docs を更新する: npm run docs:glossary
 *
 * - 用語は50音順(英字で始まる用語は「A–Z」)に並べ、行ごとに section.topic にする(アプリではサイドバーの目次になる)
 * - 関連するまとめへのリンクの文言(ジャンル名・見出し)は docs/<科目>/<ジャンル>.html から読む。見出しがなければエラーにする
 * - 同じ用語が複数のジャンルにあるときは1つにまとめる(説明は先に出てきたほう、関連リンクは全て)
 * - 応用情報(oyojoho)は、基本情報(kihonjoho)の用語集にない用語だけを載せる(重なる用語は基本情報の用語集を見てもらう)
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// 用語集を作る科目。base を指定すると、その科目の用語集にある用語は載せず、base の用語集へのリンクを置く
const EXAMS = [
  { examType: 'kihonjoho' },
  { examType: 'oyojoho', base: 'kihonjoho' },
  { examType: 'boki3' }
];

// ジャンルの並び順(用語が複数のジャンルにあるとき、先のジャンルの説明を使う)。アプリの src/app/config/genre-content.ts と同じ順
const GENRE_ORDER = readGenreOrder();

const ROWS = [
  ['あ', 'あいうえおぁぃぅぇぉゔ'],
  ['か', 'かきくけこがぎぐげご'],
  ['さ', 'さしすせそざじずぜぞ'],
  ['た', 'たちつてとだぢづでどっ'],
  ['な', 'なにぬねの'],
  ['は', 'はひふへほばびぶべぼぱぴぷぺぽ'],
  ['ま', 'まみむめも'],
  ['や', 'やゆよゃゅょ'],
  ['ら', 'らりるれろ'],
  ['わ', 'わをん']
];
const LATIN_ROW = 'A–Z';
// 用語テストの1回の問題数(assets/glossary.js の QUESTIONS と合わせる)
const QUIZ_QUESTIONS = 10;

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const collator = new Intl.Collator('ja');
const glossaries = {};

for (const exam of EXAMS) {
  const { examType } = exam;
  const genres = loadGenres(examType);
  const examName = genres[0].examName;
  let terms = loadTerms(examType, genres);

  let skipped = 0;
  if (exam.base) {
    const baseNames = new Set(glossaries[exam.base].map((t) => t.term));
    skipped = terms.filter((t) => baseNames.has(t.term)).length;
    terms = terms.filter((t) => !baseNames.has(t.term));
  }
  glossaries[examType] = terms;

  const rows = groupByRow(terms);
  const categories = [...new Set(genres.map((g) => g.category))];
  const html = renderPage({ examType, examName, rows, categories, count: terms.length, base: exam.base && { examType: exam.base, examName: loadGenres(exam.base)[0].examName } });
  writeFileSync(resolve(root, `docs/${examType}/glossary.html`), html);
  console.log(`docs/${examType}/glossary.html: ${terms.length}語` + (skipped ? `(${exam.base}の用語集と重なる ${skipped}語は載せない)` : ''));
}

function readGenreOrder() {
  const src = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../src/app/config/genre-content.ts'), 'utf-8');
  const order = {};
  for (const m of src.matchAll(/examType: '([^']+)', genreKey: '([^']+)'/g)) {
    (order[m[1]] ??= []).push(m[2]);
  }
  return order;
}

// docs/<科目>/<ジャンル>.html から、ジャンル名・大分類・見出しを読む
function loadGenres(examType) {
  return GENRE_ORDER[examType].map((genreKey) => {
    const path = resolve(root, `docs/${examType}/${genreKey}.html`);
    const html = readFileSync(path, 'utf-8');
    const category = html.match(/<article class="genre-article"[^>]*data-category="([^"]+)"/)?.[1];
    const breadcrumb = html.match(/<nav class="docs-breadcrumb">(.*?)<\/nav>/)?.[1].split('›').map((s) => s.replace(/<[^>]+>/g, '').trim());
    const topics = [...html.matchAll(/<section class="topic" id="topic-(\d+)">\s*<h2>([\s\S]*?)<\/h2>/g)].map((m) =>
      m[2].replace(/<span class="topic-no">[^<]*<\/span>/, '').replace(/<[^>]+>/g, '').trim()
    );
    if (!category || !breadcrumb || topics.length === 0) throw new Error(`${path}: 大分類・パンくず・見出しが読めません`);
    return { examType, genreKey, genreName: breadcrumb[2], examName: breadcrumb[1], category, topics };
  });
}

function loadTerms(examType, genres) {
  const dir = resolve(root, `scripts/glossary/${examType}`);
  const files = readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, ''));
  const unknown = files.filter((f) => !genres.some((g) => g.genreKey === f));
  if (unknown.length) throw new Error(`scripts/glossary/${examType}: まとめにないジャンルのファイルがあります(${unknown.join(', ')})`);

  const byName = new Map();
  for (const genre of genres) {
    const file = resolve(dir, `${genre.genreKey}.json`);
    if (!existsSync(file)) continue;
    for (const entry of JSON.parse(readFileSync(file, 'utf-8'))) {
      const where = `scripts/glossary/${examType}/${genre.genreKey}.json の「${entry.term}」`;
      if (!entry.term) throw new Error(`${where}: term は必須です`);
      if (entry.reading && !/^[ぁ-ゖー]+$/.test(entry.reading)) throw new Error(`${where}: reading はひらがなで書いてください(${entry.reading})`);
      const topicNos = [entry.topic ?? []].flat();
      if (topicNos.length === 0) throw new Error(`${where}: topic(関連する見出しの番号。1始まり)は必須です`);
      const links = topicNos.map((no) => {
        const title = genre.topics[no - 1];
        if (!title) throw new Error(`${where}: ${genre.genreName}に ${no} 番目の見出しはありません`);
        return { genreKey: genre.genreKey, genreName: genre.genreName, topicIndex: no - 1, title };
      });

      const existing = byName.get(entry.term);
      if (existing) {
        if (entry.desc && existing.desc !== entry.desc) {
          throw new Error(`${where}: 同じ用語が ${existing.links[0].genreName} にもあります。説明は1か所に書き、こちらは desc を省いてください`);
        }
        existing.links.push(...links);
        continue;
      }
      // 2つ目以降のジャンルでは term と topic だけ書けばよい(関連リンクだけ追加する)
      if (!entry.desc) throw new Error(`${where}: desc(説明)は、最初に出てくるジャンルで書いてください`);
      // 読みは50音の行を決めるのに使うため、英字で始まる用語(A–Z に並べる)以外は必須
      if (!entry.reading && !/^[A-Za-z]/.test(entry.term)) throw new Error(`${where}: reading(読み)は必須です`);
      byName.set(entry.term, { term: entry.term, reading: entry.reading ?? '', en: entry.en ?? '', desc: entry.desc, category: genre.category, links });
    }
  }
  return [...byName.values()];
}

// 英字で始まる用語は A–Z(用語で並べる)、それ以外は読みの最初の文字で50音の行に分ける
function rowOf(t) {
  if (/^[A-Za-z]/.test(t.term)) return LATIN_ROW;
  const first = t.reading[0];
  const row = ROWS.find(([, chars]) => chars.includes(first));
  if (!row) throw new Error(`「${t.term}」の読み(${t.reading})から50音の行を決められません`);
  return row[0];
}

function groupByRow(terms) {
  const rows = [...ROWS.map(([label]) => label), LATIN_ROW].map((label) => ({ label, terms: [] }));
  for (const t of terms) rows.find((r) => r.label === rowOf(t)).terms.push(t);
  for (const r of rows) {
    r.terms.sort((a, b) =>
      r.label === LATIN_ROW
        ? a.term.localeCompare(b.term, 'en', { sensitivity: 'base' })
        : collator.compare(a.reading, b.reading) || collator.compare(a.term, b.term)
    );
  }
  return rows.filter((r) => r.terms.length > 0);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function renderPage({ examType, examName, rows, categories, count, base }) {
  const sections = rows.map((row, i) => {
    const label = row.label === LATIN_ROW ? LATIN_ROW : `${row.label}行`;
    const items = row.terms.map((t) => {
      const links = t.links.map((l) =>
        `<a href="${l.genreKey}.html#topic-${l.topicIndex}" data-genre-key="${l.genreKey}" data-topic-index="${l.topicIndex}">${escapeHtml(l.genreName)} › ${l.topicIndex + 1}. ${escapeHtml(l.title)}</a>`
      ).join('、');
      const reading = [t.reading, t.en].filter(Boolean).map(escapeHtml).join(' / ');
      return [
        // data-reading は用語テスト(assets/glossary.js)で、読みでの回答を正解にするのに使う
        `        <div class="gl-term" data-category="${escapeHtml(t.category)}" data-reading="${escapeHtml(t.reading)}">`,
        `          <dt><span class="gl-name">${escapeHtml(t.term)}</span><span class="gl-reading">${reading}</span><span class="gl-cat">${escapeHtml(t.category)}</span></dt>`,
        `          <dd><p class="gl-desc">${escapeHtml(t.desc)}</p><p class="gl-rel">関連: ${links}</p></dd>`,
        `        </div>`
      ].join('\n');
    }).join('\n');
    return [
      `    <section class="topic gl-row" id="topic-${i}">`,
      `      <h2>${label}</h2>`,
      `      <dl class="gl-list">`,
      items,
      `      </dl>`,
      `    </section>`
    ].join('\n');
  }).join('\n\n');

  const filters = ['すべて', ...categories].map((c, i) =>
    `<button type="button" data-category="${i === 0 ? '' : escapeHtml(c)}"${i === 0 ? ' class="on" aria-pressed="true"' : ' aria-pressed="false"'}>${escapeHtml(c)}</button>`
  ).join('');
  const baseNote = base
    ? `\n      <p class="gl-base">${escapeHtml(base.examName)}と共通の用語は<a href="../${base.examType}/glossary.html" data-exam-type="${base.examType}" data-genre-key="glossary">${escapeHtml(base.examName)}の用語集</a>にあります。</p>`
    : '';
  const categoryFilter = categories.length > 1 ? `\n      <div class="gl-filters"><span class="gl-filters-label">分野</span>${filters}</div>` : '';

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>用語集 | ${escapeHtml(examName)}</title>
  <link rel="stylesheet" href="../assets/study.css">
  <script src="../assets/glossary.js" defer></script>
</head>
<body class="docs-page">
  <!-- このファイルは scripts/build-glossary.mjs で生成する。直接編集せず、scripts/glossary/ の用語を直して npm run docs:glossary を実行する -->
  <header class="docs-header"><a href="../index.html">資格学習のまとめ</a></header>
  <main class="docs-main">
    <nav class="docs-breadcrumb"><a href="../index.html">目次</a> › ${escapeHtml(examName)} › 用語集</nav>

    <!-- アプリでは、この article の中だけを取り出して表示する -->
    <article class="genre-article glossary" data-exam-type="${examType}" data-genre-key="glossary">
    <header class="genre-header">
      <h1>用語集</h1>
      <p class="genre-description">${escapeHtml(examName)}のまとめに出てくる用語(${count}語)を50音順にまとめています。リンクから関連するまとめの見出しに移動できます。</p>
    </header>

    <div class="gl-tools">${baseNote}
      <input type="search" class="gl-search" placeholder="用語・読み・英語名・説明で探す" aria-label="用語を探す">${categoryFilter}
      <p class="gl-count" aria-live="polite">${count}語</p>
      <p class="gl-empty" hidden>一致する用語がありません</p>
      <button type="button" class="gl-quiz-start">📝 用語テスト(${QUIZ_QUESTIONS}問)</button>
    </div>

${sections}
    </article>
  </main>
</body>
</html>
`;
}
