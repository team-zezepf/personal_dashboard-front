/*
 * GitHub Pages の「基本情報 科目Bの練習問題」(docs/kihonjoho-b/practice.html)で出題する問題を、
 * 問題データ(personal_dashboard-data/exam_questions.json)から docs/kihonjoho-b/questions.js に書き出す(front#170)。
 * 問題データを直したら、このスクリプトを実行し直して docs を更新する: npm run docs:kihonjoho-b
 *
 * 問題データの場所は既定で ../personal_dashboard-data/exam_questions.json。別の場所なら引数で渡す。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const EXAM_TYPE = 'kihonjoho-b';

// 分野(問題の sub_category)と、URL(practice.html?genre=<キー>)で使うキー。目次のリンクと合わせる
const GENRE_KEYS = {
  'アルゴリズムとプログラミング': 'algorithms-programming',
  '情報セキュリティ': 'security'
};

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(process.argv[2] ?? resolve(root, '../personal_dashboard-data/exam_questions.json'));
const output = resolve(root, 'docs/kihonjoho-b/questions.js');

const questions = JSON.parse(readFileSync(source, 'utf-8'))
  .filter((q) => q.exam_type === EXAM_TYPE)
  .sort((a, b) => a.id - b.id);

if (questions.length === 0) {
  throw new Error(`${source} に ${EXAM_TYPE} の問題がありません`);
}

// practice.js は1つの正解を選ぶ形式だけに対応している
const unsupported = questions.filter((q) => q.type !== 'single' || q.correct.length !== 1 || q.image);
if (unsupported.length > 0) {
  throw new Error(`Pages で出題できない形式の問題があります(id: ${unsupported.map((q) => q.id).join(', ')})`);
}

const unknownGenres = [...new Set(questions.map((q) => q.sub_category))].filter((g) => !GENRE_KEYS[g]);
if (unknownGenres.length > 0) {
  throw new Error(`GENRE_KEYS にない分野があります(${unknownGenres.join(', ')})。キーを追加し、目次にもリンクを追加してください`);
}

const data = questions.map((q) => ({
  id: q.id,
  genre: q.sub_category,
  genreKey: GENRE_KEYS[q.sub_category],
  question: q.question,
  code: q.code ?? null,
  choices: q.choices,
  answer: q.correct[0],
  explanation: q.explanation
}));

writeFileSync(
  output,
  '// このファイルは scripts/build-kihonjoho-b-questions.mjs で生成する。直接編集しない(問題データを直して生成し直す)\n' +
    `window.PRACTICE_QUESTIONS = ${JSON.stringify(data, null, 1)};\n`
);

console.log(`${data.length}問を ${output} に書き出しました`);
