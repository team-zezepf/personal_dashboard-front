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
}
