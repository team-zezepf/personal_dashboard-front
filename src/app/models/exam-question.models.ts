export interface ExamQuestion {
  id: string | number;
  category: string;
  subCategory: string;
  // single: 4択 / multi: 複数選択 / journal: 仕訳入力(勘定科目を選び金額を入力する。choices は勘定科目の候補)
  type: 'single' | 'multi' | 'journal' | string;
  question: string;
  choices: string[];
  correct: number[];
  explanation: string;
  image?: string | null;
  // 基本情報 科目Bなどの擬似言語のプログラム。改行・インデントを保持し、〔a〕のような空欄を含む
  code?: string | null;
  // 仕訳入力の問題の正解の仕訳(ほかの問題では null)(front#429)
  journal?: Journal | null;
}

// 仕訳の1行。入力した仕訳では、金額を入れずに勘定科目だけを選んだ行の amount は null
export interface JournalLine {
  account: string;
  amount: number | null;
}

export interface Journal {
  debit: JournalLine[];
  credit: JournalLine[];
}

// 1問への回答。4択・複数選択は選んだ選択肢の番号(0始まり)、仕訳入力は入力した仕訳
export type QuestionAnswer = number[] | Journal;

// 問題を取得するクエリで、仕訳入力の正解を受け取るための項目
export const JOURNAL_FIELDS = 'journal { debit { account amount } credit { account amount } }';
