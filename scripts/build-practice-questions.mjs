/*
 * GitHub Pages の「ランダム出題の練習問題」(docs/<科目>/practice.html)で出題する問題を、
 * 問題データ(personal_dashboard-data/exam_questions.json)から docs/<科目>/questions.js に書き出す(front#170, #175)。
 * 問題データを直したら、このスクリプトを実行し直して docs を更新する: npm run docs:practice
 *
 * 問題データの場所は既定で ../personal_dashboard-data/exam_questions.json。別の場所なら引数で渡す。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/*
 * 出題する科目(問題の exam_type)ごとに、分野(問題の sub_category)と URL(practice.html?genre=<キー>)で使うキーを定義する。
 * キーは目次(docs/index.html)のリンクと合わせる。分野を追加したら、ここと目次の両方に追加する
 */
const EXAMS = {
  'kihonjoho-b': {
    'アルゴリズムとプログラミング': 'algorithms-programming',
    '情報セキュリティ': 'security'
  },
  'oyojoho-pm': {
    '情報セキュリティ': 'security',
    '経営戦略': 'business-strategy',
    'プログラミング': 'programming',
    'システムアーキテクチャ': 'system-architecture',
    'ネットワーク': 'network',
    'データベース': 'database',
    '組込みシステム開発': 'embedded-systems',
    '情報システム開発': 'system-development',
    'プロジェクトマネジメント': 'project-management',
    'サービスマネジメント': 'service-management',
    'システム監査': 'system-audit'
  }
};

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(process.argv[2] ?? resolve(root, '../personal_dashboard-data/exam_questions.json'));
const allQuestions = JSON.parse(readFileSync(source, 'utf-8'));

for (const [examType, genreKeys] of Object.entries(EXAMS)) {
  const output = resolve(root, `docs/${examType}/questions.js`);
  const questions = allQuestions.filter((q) => q.exam_type === examType).sort((a, b) => a.id - b.id);

  if (questions.length === 0) {
    throw new Error(`${source} に ${examType} の問題がありません`);
  }

  // practice.js は1つの正解を選ぶ形式だけに対応している
  const unsupported = questions.filter((q) => q.type !== 'single' || q.correct.length !== 1 || q.image);
  if (unsupported.length > 0) {
    throw new Error(`${examType}: Pages で出題できない形式の問題があります(id: ${unsupported.map((q) => q.id).join(', ')})`);
  }

  const unknownGenres = [...new Set(questions.map((q) => q.sub_category))].filter((g) => !genreKeys[g]);
  if (unknownGenres.length > 0) {
    throw new Error(`${examType}: EXAMS にない分野があります(${unknownGenres.join(', ')})。キーを追加し、目次にもリンクを追加してください`);
  }

  const data = questions.map((q) => ({
    id: q.id,
    genre: q.sub_category,
    genreKey: genreKeys[q.sub_category],
    question: q.question,
    code: q.code ?? null,
    choices: q.choices,
    answer: q.correct[0],
    explanation: q.explanation
  }));

  writeFileSync(
    output,
    '// このファイルは scripts/build-practice-questions.mjs で生成する。直接編集しない(問題データを直して生成し直す)\n' +
      `window.PRACTICE_QUESTIONS = ${JSON.stringify(data, null, 1)};\n`
  );

  console.log(`${examType}: ${data.length}問を ${output} に書き出しました`);
}
