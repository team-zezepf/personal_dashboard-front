import { Journal, JournalLine } from '../models/exam-question.models';

/**
 * 仕訳入力の問題(front#429)で使う、仕訳の入力・判定・表示の共通処理。
 */

// 入力欄の行数(借方・貸方それぞれ)。正解の行数が分からないよう、問題によらず同じ数にする(本番のネット試験と同じ)
export const JOURNAL_INPUT_ROWS = 4;

// 入力欄の1行(勘定科目と、入力したままの金額の文字列)
export interface JournalDraftRow {
  account: string;
  amount: string;
}

export interface JournalDraft {
  debit: JournalDraftRow[];
  credit: JournalDraftRow[];
}

export type JournalSide = 'debit' | 'credit';

export function isJournal(value: unknown): value is Journal {
  return !!value && !Array.isArray(value) && typeof value === 'object' && 'debit' in value && 'credit' in value;
}

// 「30,000」「３００００」「30000円」なども数として読む。数として読めないときや空のときは null
export function parseAmount(text: string): number | null {
  const normalized = text
    .replace(/[０-９]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0xfee0))
    .replace(/[,，、円\s]/g, '');
  if (!/^\d+$/.test(normalized)) return null;
  return Number(normalized);
}

export function formatAmount(amount: number | null): string {
  return amount === null ? '' : amount.toLocaleString('ja-JP');
}

export function emptyDraft(rows = JOURNAL_INPUT_ROWS): JournalDraft {
  const side = () => Array.from({ length: rows }, () => ({ account: '', amount: '' }));
  return { debit: side(), credit: side() };
}

// 入力した仕訳(Journal)を入力欄に戻す(模擬試験で別の問題から戻ってきたときなど)
export function journalToDraft(journal: Journal | null | undefined, rows = JOURNAL_INPUT_ROWS): JournalDraft {
  const draft = emptyDraft(rows);
  if (!journal) return draft;
  (['debit', 'credit'] as const).forEach((side) => {
    journal[side].slice(0, rows).forEach((line, i) => {
      draft[side][i] = { account: line.account, amount: formatAmount(line.amount) };
    });
  });
  return draft;
}

// 入力欄から、何か入力した行だけを取り出して仕訳にする(勘定科目も金額も空の行は無視する)
export function draftToJournal(draft: JournalDraft): Journal {
  const lines = (rows: JournalDraftRow[]): JournalLine[] =>
    rows
      .filter((r) => r.account !== '' || r.amount.trim() !== '')
      .map((r) => ({ account: r.account, amount: parseAmount(r.amount) }));
  return { debit: lines(draft.debit), credit: lines(draft.credit) };
}

export function isJournalAnswered(journal: Journal | null | undefined): boolean {
  return !!journal && journal.debit.length + journal.credit.length > 0;
}

const lineKey = (line: JournalLine) => `${line.account}\u0000${line.amount}`;

function sameLines(given: JournalLine[], correct: JournalLine[]): boolean {
  const g = given.map(lineKey).sort();
  const c = correct.map(lineKey).sort();
  return g.length === c.length && g.every((v, i) => v === c[i]);
}

// 借方・貸方それぞれで、勘定科目と金額の組が過不足なく一致すれば正解(行の順番は問わない)
export function isCorrectJournal(correct: Journal, given: Journal): boolean {
  return sameLines(given.debit, correct.debit) && sameLines(given.credit, correct.credit);
}

// 表示用の1行。正解と比べたときに一致しない行は wrong を true にする
export interface JournalTableCell {
  line: JournalLine;
  wrong: boolean;
}

export interface JournalTableRow {
  debit: JournalTableCell | null;
  credit: JournalTableCell | null;
}

// 仕訳を表(借方・貸方を横に並べた行)にする。compareTo を渡すと、正解にない行(同じ組が重複する分も含む)に印を付ける
export function journalTableRows(journal: Journal, compareTo?: Journal | null): JournalTableRow[] {
  const mark = (lines: JournalLine[], correct: JournalLine[] | undefined): JournalTableCell[] => {
    const remaining = (correct ?? []).map(lineKey);
    return lines.map((line) => {
      if (!correct) return { line, wrong: false };
      const i = remaining.indexOf(lineKey(line));
      if (i >= 0) remaining.splice(i, 1);
      return { line, wrong: i < 0 };
    });
  };
  const debit = mark(journal.debit, compareTo?.debit);
  const credit = mark(journal.credit, compareTo?.credit);
  const count = Math.max(debit.length, credit.length);
  return Array.from({ length: count }, (_, i) => ({ debit: debit[i] ?? null, credit: credit[i] ?? null }));
}
