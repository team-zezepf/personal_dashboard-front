export interface ExamSubjectMockExamConfig {
  // 制限時間(分)
  durationMinutes: number;
  // 出題数
  questionCount: number;
  // 合格ボーダー(0〜1の割合)。合格に必要な正解数は Math.ceil(questionCount * passRatio) で求める
  passRatio: number;
}

export interface ExamSubject {
  key: string;
  name: string;
  description: string;
  path: string;
  mockExam: ExamSubjectMockExamConfig;
}

/**
 * 資格学習で選択できる科目のマスタ一覧。ここを追加するだけで、科目選択画面
 * (ExamSubjectListPageComponent)と出題画面(ExamStudyPageComponent, ルート/study/:examType)
 * の両方に反映される。
 */
export const EXAM_SUBJECTS: ExamSubject[] = [
  {
    key: 'kihonjoho',
    name: '基本情報技術者試験',
    description: '基本情報技術者試験の対策問題を、2問ずつ解いていきましょう。',
    path: '/study/kihonjoho',
    mockExam: { durationMinutes: 90, questionCount: 60, passRatio: 0.6 }
  },
  {
    key: 'boki3',
    name: '簿記3級',
    description: '日商簿記3級の対策問題を、2問ずつ解いていきましょう。',
    path: '/study/boki3',
    mockExam: { durationMinutes: 60, questionCount: 100, passRatio: 0.7 }
  },
  {
    key: 'oyojoho',
    name: '応用情報技術者試験',
    description: '応用情報技術者試験の対策問題を、2問ずつ解いていきましょう。',
    path: '/study/oyojoho',
    mockExam: { durationMinutes: 150, questionCount: 80, passRatio: 0.6 }
  }
];

export function findExamSubject(key: string | null | undefined): ExamSubject | undefined {
  return EXAM_SUBJECTS.find((s) => s.key === key);
}
