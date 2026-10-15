import { ENEMY_ATTACKS, ENEMY_LIMITS, ENEMY_SHAPES, EnemyDef, HIT_MATERIALS } from './rpg-enemy';

// 敵の CSV の書き出し・取り込み(front#297)。画面(コンポーネント)から切り離して、テストできるようにしておく。
// 落とすアイテム・落とす素材とその確率は、1体が複数の物を落とす(1対多)ようになったときに表で扱えないため、CSV には入れない

type ColumnKind = 'id' | 'name' | 'color' | 'number' | 'int' | 'shape' | 'attack' | 'hit' | 'bool';

interface EnemyColumn {
  key: keyof EnemyDef;
  label: string;
  kind: ColumnKind;
  limit?: readonly [number, number];
}

export const ENEMY_CSV_COLUMNS: EnemyColumn[] = [
  { key: 'id', label: 'ID', kind: 'id' },
  { key: 'name', label: '名前', kind: 'name' },
  { key: 'shape', label: '体の形', kind: 'shape' },
  { key: 'color', label: '明るい色（体）', kind: 'color' },
  { key: 'dark', label: '暗い色（影・ふち）', kind: 'color' },
  { key: 'size', label: '大きさ', kind: 'number', limit: ENEMY_LIMITS.size },
  { key: 'hp', label: 'HP', kind: 'int', limit: ENEMY_LIMITS.hp },
  { key: 'atk', label: '攻撃', kind: 'int', limit: ENEMY_LIMITS.stat },
  { key: 'def', label: '防御', kind: 'int', limit: ENEMY_LIMITS.stat },
  { key: 'interval', label: '攻撃の間隔（秒）', kind: 'number', limit: ENEMY_LIMITS.interval },
  { key: 'speed', label: '歩く速さ（マス/秒）', kind: 'number', limit: ENEMY_LIMITS.speed },
  { key: 'exp', label: '経験値', kind: 'int', limit: ENEMY_LIMITS.reward },
  { key: 'gold', label: 'ゴールド', kind: 'int', limit: ENEMY_LIMITS.reward },
  { key: 'hitMaterial', label: '叩いたときの音', kind: 'hit' },
  { key: 'glow', label: '光る', kind: 'bool' },
  { key: 'sight', label: '襲ってくる距離（マス）', kind: 'number', limit: ENEMY_LIMITS.sight },
  { key: 'respawn', label: '復活までの秒数', kind: 'int', limit: ENEMY_LIMITS.respawn },
  { key: 'boss', label: 'ボス', kind: 'bool' },
  { key: 'attack', label: '攻撃の種類', kind: 'attack' },
  { key: 'dash', label: '突っ込む・跳ぶ距離（マス）', kind: 'int', limit: ENEMY_LIMITS.dash },
  { key: 'charge', label: 'ためる時間（秒）', kind: 'number', limit: ENEMY_LIMITS.charge },
  { key: 'range', label: '射程（マス）', kind: 'int', limit: ENEMY_LIMITS.range },
  { key: 'radius', label: '範囲（まわり何マス）', kind: 'int', limit: ENEMY_LIMITS.radius }
];

const NAME_MAX = 20;
const NAMES: Partial<Record<ColumnKind, [string, string][]>> = {
  shape: ENEMY_SHAPES,
  attack: ENEMY_ATTACKS.map((a) => [a.id, a.label]),
  hit: HIT_MATERIALS.map(([id, label]) => [id, label])
};

/** 敵を CSV にする(Excel で文字化けしないよう BOM 付き。改行は CRLF) */
export function enemiesToCsv(enemies: { def: EnemyDef; isNew?: boolean }[]): string {
  const lines = [ENEMY_CSV_COLUMNS.map((c) => c.label), ...enemies.map((e) => ENEMY_CSV_COLUMNS.map((c) => (c.kind === 'id' && e.isNew ? '' : cellOf(c, e.def))))];
  return '﻿' + lines.map((cells) => cells.map(quote).join(',')).join('\r\n') + '\r\n';
}

function cellOf(column: EnemyColumn, def: EnemyDef): string {
  const value = def[column.key];
  switch (column.kind) {
    case 'bool':
      return value ? '1' : '0';
    case 'shape':
    case 'attack':
    case 'hit':
      return NAMES[column.kind]!.find(([id]) => id === value)?.[1] ?? '';
    default:
      return value === null || value === undefined ? '' : String(value);
  }
}

function quote(cell: string): string {
  return /[",\r\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell;
}

/** CSV のファイルの中身を文字にする。UTF-8 で読めなければ、Excel が保存する Shift_JIS として読む */
export function decodeCsv(bytes: ArrayBuffer): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder('shift_jis').decode(bytes);
  }
}

/** CSV を行・列に分ける(ダブルクォートで囲んだ中の , と改行も扱う) */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  const body = text.replace(/^﻿/, '');
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (quoted) {
      if (ch === '"' && body[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && body[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }
  if (cell !== '' || row.length) {
    row.push(cell);
    rows.push(row);
  }
  // 中身がすべて空の行(Excel が末尾に付ける空行など)は除く
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

export interface CsvDiff {
  label: string;
  before: string;
  after: string;
}

export interface CsvChange {
  line: number;
  id: string;
  name: string;
  diffs: CsvDiff[];
  // 書き換えたあとの敵(落とす物などの CSV にない項目は、今の値のまま)
  def: EnemyDef;
}

export interface CsvAddition {
  line: number;
  name: string;
  // ID は仮(空)。落とす物はなし
  def: Omit<EnemyDef, 'id'>;
}

export interface CsvError {
  line: number | null;
  name: string;
  column: string;
  message: string;
  allowed?: string;
}

export interface CsvImport {
  rowCount: number;
  changes: CsvChange[];
  additions: CsvAddition[];
  unchanged: number;
  errors: CsvError[];
}

/** CSV を読んで、今の敵と比べる(画面の敵はまだ変えない) */
export function readEnemyCsv(text: string, current: EnemyDef[], template: EnemyDef): CsvImport {
  const result: CsvImport = { rowCount: 0, changes: [], additions: [], unchanged: 0, errors: [] };
  const rows = parseCsv(text);
  if (!rows.length) {
    result.errors.push({ line: null, name: '', column: '', message: 'CSV が空です。' });
    return result;
  }
  const header = rows[0].map((h) => h.trim());
  const index = new Map(ENEMY_CSV_COLUMNS.map((c) => [c.key, header.indexOf(c.label)]));
  const missing = ENEMY_CSV_COLUMNS.filter((c) => index.get(c.key)! < 0);
  if (missing.length) {
    result.errors.push({
      line: 1, name: '見出しの行', column: '',
      message: `次の列が見つかりません：${missing.map((c) => c.label).join('、')}。書き出した CSV の 1 行目（見出し）を変えずに使ってください。`
    });
    return result;
  }

  const byId = new Map(current.map((e) => [e.id, e]));
  const seen = new Set<string>();
  rows.slice(1).forEach((cells, i) => {
    const line = i + 2;
    result.rowCount++;
    const get = (c: EnemyColumn) => (cells[index.get(c.key)!] ?? '').trim();
    const id = get(ENEMY_CSV_COLUMNS[0]);
    const name = get(ENEMY_CSV_COLUMNS[1]) || '（名前なし）';
    const base = (id && byId.get(id)) || null;
    if (id && seen.has(id)) {
      result.errors.push({ line, name, column: 'ID', message: `ID「${id}」の行がほかにもあります。1 体につき 1 行にしてください。` });
      return;
    }
    if (id) seen.add(id);

    const values: Partial<Record<keyof EnemyDef, unknown>> = {};
    let ok = true;
    for (const column of ENEMY_CSV_COLUMNS.slice(1)) {
      const parsed = parseCell(column, get(column));
      if ('error' in parsed) {
        ok = false;
        result.errors.push({ line, name, column: column.label, message: parsed.error, allowed: parsed.allowed });
      } else {
        values[column.key] = parsed.value;
      }
    }
    if (!ok) return;

    if (!base) {
      // ID が空・今ない ID の行は新しい敵。落とす物はなしで作る
      const { id: _id, ...rest } = template;
      const def = { ...rest, drop: null, dropRate: 0, material: null, materialRate: 0, ...values } as Omit<EnemyDef, 'id'>;
      result.additions.push({ line, name: def.name, def });
      return;
    }
    const diffs = ENEMY_CSV_COLUMNS.slice(1)
      .filter((c) => !same(c, base[c.key], values[c.key]))
      .map((c) => ({ label: c.label, before: shown(c, base), after: shown(c, { ...base, ...values } as EnemyDef) }));
    if (!diffs.length) {
      result.unchanged++;
      return;
    }
    result.changes.push({ line, id: base.id, name: base.name, diffs, def: { ...base, ...values } as EnemyDef });
  });
  return result;
}

// 光る・叩いたときの音は、古いデータでは値がないことがある(ないときは、光らない・体の形から決める)
function same(column: EnemyColumn, a: unknown, b: unknown): boolean {
  return column.kind === 'bool' ? !!a === !!b : (a ?? null) === (b ?? null);
}

// 確認の画面に出す値(叩いたときの音が空なら「体の形から決める」)
function shown(column: EnemyColumn, def: EnemyDef): string {
  const cell = cellOf(column, def);
  if (column.kind === 'hit' && !cell) return '（体の形から決める）';
  if (column.kind === 'bool') return cell === '1' ? 'はい' : 'いいえ';
  return cell;
}

function parseCell(column: EnemyColumn, raw: string): { value: unknown } | { error: string; allowed?: string } {
  switch (column.kind) {
    case 'name':
      if (!raw) return { error: '名前が空です。' };
      if (raw.length > NAME_MAX) return { error: `名前は ${NAME_MAX} 文字までです（${raw.length} 文字）。` };
      return { value: raw };
    case 'color':
      return /^#[0-9a-fA-F]{6}$/.test(raw) ? { value: raw.toLowerCase() } : { error: `「${raw}」は色として読めません。#7ddc6f のように # と 6 けたで書いてください。` };
    case 'number':
    case 'int': {
      const n = Number(raw);
      const [min, max] = column.limit!;
      if (raw === '' || !Number.isFinite(n)) return { error: `「${raw}」は数として読めません。` };
      if (column.kind === 'int' && !Number.isInteger(n)) return { error: `「${raw}」は整数で書いてください。` };
      if (n < min || n > max) return { error: `「${raw}」は範囲の外です。${min}〜${max} で書いてください。` };
      return { value: n };
    }
    case 'bool':
      if (['1', 'true', 'はい'].includes(raw.toLowerCase())) return { value: true };
      if (['0', 'false', 'いいえ', ''].includes(raw.toLowerCase())) return { value: false };
      return { error: `「${raw}」は 1（はい）か 0（いいえ）で書いてください。` };
    case 'shape':
    case 'attack':
    case 'hit': {
      const list = NAMES[column.kind]!;
      if (column.kind === 'hit' && !raw) return { value: null };
      const found = list.find(([, label]) => label === raw);
      return found
        ? { value: found[0] }
        : { error: `「${raw}」という${column.label}はありません。`, allowed: list.map(([, label]) => label).join('、') + (column.kind === 'hit' ? '（空にすると体の形から決める）' : '') };
    }
    default:
      return { value: raw };
  }
}
