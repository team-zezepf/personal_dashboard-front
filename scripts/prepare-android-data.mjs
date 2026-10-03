/*
 * Android版アプリ(オフライン)に同梱する問題データを、問題データ(personal_dashboard-data/exam_questions.json)から
 * src/offline-data/ に書き出す(front#184)。npm run build:android の最初に自動で実行される。
 * 問題データを直したら、APK を作り直して入れ直す(npm run android:apk)。
 *
 * 問題データの場所は既定で ../personal_dashboard-data/exam_questions.json。別の場所なら引数で渡す。
 *
 * 書き出すもの
 * - exam_questions.json: API(GraphQL)の examQuestions と同じ形(キーは examType / subCategory などのキャメルケース)
 * - meta.json: 問題データの更新日時と問題数(設定画面に表示し、入れ直した APK の問題データが新しくなったか確認できるようにする)
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(process.argv[2] ?? resolve(root, '../personal_dashboard-data/exam_questions.json'));
const outDir = resolve(root, 'src/offline-data');

let raw;
try {
  raw = readFileSync(source, 'utf8');
} catch {
  console.error(`問題データが見つかりません: ${source}`);
  console.error('personal_dashboard-data の exam_questions.json の場所を引数で渡してください。');
  console.error('例: node scripts/prepare-android-data.mjs C:/zezepf/personal_dashboard/personal_dashboard-data/exam_questions.json');
  process.exit(1);
}

const questions = JSON.parse(raw).map((q) => ({
  id: q.id,
  examType: q.exam_type,
  category: q.category,
  subCategory: q.sub_category,
  type: q.type,
  question: q.question,
  choices: q.choices,
  correct: q.correct,
  explanation: q.explanation,
  image: q.image ?? null,
  code: q.code ?? null
}));

// 更新日時は最後にコミットした日時を使う(ファイルの更新日時は git の取得や切り替えでも変わってしまうため)。
// git で管理していない場所ならファイルの更新日時を使う
function updatedAt(file) {
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%cI', '--', file], { cwd: dirname(file), encoding: 'utf8' }).trim();
    if (out) return new Date(out).toISOString();
  } catch {
    // git がない・管理外のときは下へ
  }
  return statSync(file).mtime.toISOString();
}

mkdirSync(outDir, { recursive: true });
writeFileSync(resolve(outDir, 'exam_questions.json'), JSON.stringify(questions));
writeFileSync(
  resolve(outDir, 'meta.json'),
  JSON.stringify({ questionsUpdatedAt: updatedAt(source), questionCount: questions.length }, null, 2)
);
console.log(`src/offline-data に問題データを書き出しました(${questions.length}問): ${source}`);
