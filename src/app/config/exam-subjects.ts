export interface ExamSubject {
  key: string;
  name: string;
  description: string;
  path: string;
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
    path: '/study/kihonjoho'
  },
  {
    key: 'boki3',
    name: '簿記3級',
    description: '日商簿記3級の対策問題を、2問ずつ解いていきましょう。',
    path: '/study/boki3'
  }
];

export function findExamSubject(key: string | null | undefined): ExamSubject | undefined {
  return EXAM_SUBJECTS.find((s) => s.key === key);
}
