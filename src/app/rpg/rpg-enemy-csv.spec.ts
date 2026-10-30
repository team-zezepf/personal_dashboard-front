import { DEFAULT_ENEMIES, EnemyDef } from './rpg-enemy';
import { ENEMY_CSV_COLUMNS, decodeCsv, enemiesToCsv, parseCsv, readEnemyCsv } from './rpg-enemy-csv';

describe('敵の CSV(front#297)', () => {
  const enemies: EnemyDef[] = DEFAULT_ENEMIES.slice(0, 3).map((e) => ({ ...e }));
  const rows = () => enemies.map((def) => ({ def }));
  // 書き出した CSV の、(行, 列の見出し) のセルを書き換える
  const edit = (csv: string, changes: [number, string, string][]) => {
    const table = parseCsv(csv);
    for (const [row, label, value] of changes) table[row][table[0].indexOf(label)] = value;
    return table.map((r) => r.join(',')).join('\r\n');
  };

  it('攻撃の種類は「水 LV2」のように属性と LV で書く。前の名前(暗黒・魔法陣・雷)で書いた CSV も取り込める(front#435)', () => {
    const csv = edit(enemiesToCsv(rows()), [[1, '攻撃の種類', '水 LV2'], [2, '攻撃の種類', '魔法陣'], [3, '攻撃の種類', '暗黒']]);
    expect(parseCsv(csv)[1]).toContain('水 LV2');
    const result = readEnemyCsv(csv, enemies, enemies[0]);
    expect(result.errors).toEqual([]);
    expect(result.changes.map((c) => c.def.attack)).toEqual(['splash', 'circle', 'dark']);
    expect(result.changes[1].diffs).toEqual([{ label: '攻撃の種類', before: '体当たり', after: '闇 LV2' }]);
    expect(readEnemyCsv(edit(enemiesToCsv(rows()), [[3, '攻撃の種類', '雷']]), enemies, enemies[0]).changes[0].def.attack).toBe('thunder');
  });

  it('属性は「火」のように書き、空なら属性なし。知らない属性はエラー。属性の列がない前の CSV は今の属性のまま取り込める(front#437)', () => {
    const withFire = enemies.map((e, i) => (i === 2 ? { ...e, element: 'fire' as const } : e));
    const csv = enemiesToCsv(withFire.map((def) => ({ def })));
    const table = parseCsv(csv);
    const at = table[0].indexOf('属性');
    expect([table[1][at], table[3][at]]).toEqual(['', '火']);

    const result = readEnemyCsv(edit(csv, [[1, '属性', '水'], [3, '属性', '']]), withFire, withFire[0]);
    expect(result.errors).toEqual([]);
    expect(result.changes.map((c) => c.def.element)).toEqual(['water', null]);
    expect(result.changes[1].diffs).toEqual([{ label: '属性', before: '火', after: '（なし）' }]);

    const bad = readEnemyCsv(edit(csv, [[1, '属性', '風']]), withFire, withFire[0]);
    expect(bad.errors[0]).toMatchObject({ line: 2, column: '属性', allowed: '火、水、木、光、闇（空にすると属性なし）' });

    // 属性の列がない(前に書き出した) CSV
    const old = table.map((r) => r.filter((_, i) => i !== at).join(',')).join('\r\n');
    const imported = readEnemyCsv(old, withFire, withFire[0]);
    expect(imported.errors).toEqual([]);
    expect(imported.unchanged).toBe(3);
  });

  it('BOM 付きで、見出しは日本語、名前で書き、落とす物の列は入れない', () => {
    const csv = enemiesToCsv(rows());
    expect(csv.startsWith('﻿')).toBe(true);
    const table = parseCsv(csv);
    expect(table[0]).toEqual(ENEMY_CSV_COLUMNS.map((c) => c.label));
    expect(table[0]).not.toContain('落とすアイテム');
    expect(table[0].some((h) => h.includes('確率'))).toBe(false);
    const slime = Object.fromEntries(table[0].map((h, i) => [h, table[1][i]]));
    expect(slime).toMatchObject({ ID: 'slime', 名前: 'スライム', 体の形: 'スライム', 攻撃の種類: '体当たり', 光る: '0', ボス: '0', 叩いたときの音: '' });
  });

  it('まだ保存していない新しい敵は ID を空で書き出す', () => {
    const table = parseCsv(enemiesToCsv([{ def: { ...enemies[0], id: 'new-1' }, isNew: true }]));
    expect(table[1][0]).toBe('');
  });

  it('書き出した CSV をそのまま取り込むと、変更なし', () => {
    const result = readEnemyCsv(enemiesToCsv(rows()), enemies, enemies[0]);
    expect(result).toMatchObject({ rowCount: 3, changes: [], additions: [], unchanged: 3, errors: [] });
  });

  it('変えた項目だけを前 → 後で出し、落とす物などは今の値のまま', () => {
    const csv = edit(enemiesToCsv(rows()), [[1, 'HP', '26'], [1, '叩いたときの音', '岩'], [2, 'ボス', '1']]);
    const result = readEnemyCsv(csv, enemies, enemies[0]);
    expect(result.unchanged).toBe(1);
    expect(result.changes.map((c) => [c.id, c.line, c.diffs])).toEqual([
      ['slime', 2, [{ label: 'HP', before: '22', after: '26' }, { label: '叩いたときの音', before: '（体の形から決める）', after: '岩' }]],
      ['blue', 3, [{ label: 'ボス', before: 'いいえ', after: 'はい' }]]
    ]);
    expect(result.changes[0].def).toMatchObject({ hp: 26, hitMaterial: 'stone', drop: 'potion', dropRate: 0.25, material: 'slime_jelly' });
  });

  it('ID が空の行は新しい敵になり、落とす物はなし', () => {
    const csv = edit(enemiesToCsv(rows()), [[3, 'ID', ''], [3, '名前', 'ほのおスライム'], [3, '攻撃の種類', '炎']]);
    const result = readEnemyCsv(csv, enemies, enemies[0]);
    expect(result.additions).toHaveLength(1);
    expect(result.additions[0]).toMatchObject({ line: 4, name: 'ほのおスライム' });
    expect(result.additions[0].def).toMatchObject({ attack: 'fire', drop: null, dropRate: 0, material: null, materialRate: 0 });
    expect(result.unchanged).toBe(2);
  });

  it('範囲の外・知らない名前・整数でない・色でない・名前が空はエラーにし、何行目のどの列かと使える値を出す', () => {
    const csv = edit(enemiesToCsv(rows()), [
      [1, '大きさ', '3'],
      [2, '体の形', 'きのこ'],
      [2, 'HP', '10.5'],
      [3, '明るい色（体）', 'red'],
      [3, '名前', '']
    ]);
    const result = readEnemyCsv(csv, enemies, enemies[0]);
    expect(result.errors.map((e) => [e.line, e.column])).toEqual([
      [2, '大きさ'], [3, '体の形'], [3, 'HP'], [4, '名前'], [4, '明るい色（体）']
    ]);
    expect(result.errors[0].message).toContain('0.8〜1.6');
    expect(result.errors[1].allowed).toContain('キノコ');
    expect(result.changes).toEqual([]);
  });

  it('見出しの列が足りない・同じ ID が2行あるときはエラー', () => {
    const missing = readEnemyCsv('ID,名前\r\nslime,スライム', enemies, enemies[0]);
    expect(missing.errors[0].message).toContain('体の形');

    const table = parseCsv(enemiesToCsv(rows()));
    const dup = [...table, table[1]].map((r) => r.join(',')).join('\n');
    expect(readEnemyCsv(dup, enemies, enemies[0]).errors).toEqual([expect.objectContaining({ line: 5, column: 'ID' })]);
  });

  it('Excel のくせ(TRUE/FALSE・末尾の空行・ダブルクォート)も読める', () => {
    const csv = edit(enemiesToCsv(rows()), [[1, '光る', 'TRUE'], [1, '名前', '"スライム, 改"']]) + '\r\n,,,\r\n';
    const result = readEnemyCsv(csv, enemies, enemies[0]);
    expect(result.errors).toEqual([]);
    expect(result.changes[0].def).toMatchObject({ glow: true, name: 'スライム, 改' });
  });

  it('UTF-8 で読めないファイルは Shift_JIS として読む', () => {
    // 「名前」を Shift_JIS で書いたもの
    const sjis = new Uint8Array([0x96, 0xbc, 0x91, 0x4f]).buffer;
    expect(decodeCsv(sjis)).toBe('名前');
    // UTF-8 は BOM を取り除いて読む
    expect(decodeCsv(new TextEncoder().encode('﻿ID').buffer)).toBe('ID');
  });
});
