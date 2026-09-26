export interface ExamQuestion {
  id: string | number;
  category: string;
  subCategory: string;
  type: 'single' | 'multi' | string;
  question: string;
  choices: string[];
  correct: number[];
  explanation: string;
  image?: string | null;
  // 基本情報 科目Bなどの擬似言語のプログラム。改行・インデントを保持し、〔a〕のような空欄を含む
  code?: string | null;
}
