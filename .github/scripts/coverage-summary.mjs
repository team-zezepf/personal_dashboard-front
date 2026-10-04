// Vitest(istanbul 形式)の coverage-summary.json から、カバレッジの表(Markdown)を作る。
// CI のジョブサマリーに出すために使う。
// 使い方: node .github/scripts/coverage-summary.mjs coverage/personal_dashboard-front/coverage-summary.json
import { readFileSync } from 'node:fs';

const summary = JSON.parse(readFileSync(process.argv[2], 'utf8'));

// 「21.2%(770 / 3636)」の形にする。数える対象がなければ「-」
function cell(metric, bold = false) {
  if (!metric || metric.total === 0) return '-';
  const rate = `${((metric.covered / metric.total) * 100).toFixed(1)}%`;
  return `${bold ? `**${rate}**` : rate}(${metric.covered} / ${metric.total})`;
}

// src/app/ からのフォルダ(components/calendar など、2階層まで)ごとに集計する
function folderOf(path) {
  const relative = path.replaceAll('\\', '/').split('/src/app/')[1] ?? path;
  const parts = relative.split('/');
  if (parts.length > 2) return parts.slice(0, 2).join('/');
  if (parts.length === 2) return parts[0];
  return '(src/app 直下)';
}

const groups = new Map();
for (const [path, file] of Object.entries(summary)) {
  if (path === 'total') continue;
  const folder = folderOf(path);
  const group = groups.get(folder) ?? { lines: { total: 0, covered: 0 }, branches: { total: 0, covered: 0 } };
  for (const key of ['lines', 'branches']) {
    group[key].total += file[key].total;
    group[key].covered += file[key].covered;
  }
  groups.set(folder, group);
}

const rate = (g) => (g.lines.total === 0 ? 1 : g.lines.covered / g.lines.total);
const rows = [...groups.entries()]
  .sort(([a, ga], [b, gb]) => rate(ga) - rate(gb) || a.localeCompare(b))
  .map(([folder, g]) => `| ${folder} | ${cell(g.lines)} | ${cell(g.branches)} |`);

console.log([
  '## テストのカバレッジ(フロント)',
  '',
  '| | 行 | 分岐 |',
  '|---|---|---|',
  `| **全体** | ${cell(summary.total.lines, true)} | ${cell(summary.total.branches, true)} |`,
  '',
  'テストから一度も読み込まれていないファイルも 0% として数えている。',
  '',
  '<details><summary>フォルダごと(行のカバレッジが低い順)</summary>',
  '',
  '| フォルダ | 行 | 分岐 |',
  '|---|---|---|',
  ...rows,
  '',
  '</details>',
  '',
  '詳しいレポート(ファイル・行ごと)は、このページ下部の Artifacts の `coverage-report` にある HTML を開く。'
].join('\n'));
