export interface ExamSubjectMockExamConfig {
  // 制限時間(分)
  durationMinutes: number;
  // 出題数
  questionCount: number;
  // 合格ボーダー(0〜1の割合)。合格に必要な正解数は Math.ceil(questionCount * passRatio) で求める
  passRatio: number;
  // 1ページに表示する問題数
  questionsPerPage: number;
  // 分野ごとの出題数。省略した科目は、全ての問題からランダムに questionCount 問を出題する
  composition?: MockExamComposition;
}

/**
 * 模擬試験の出題構成。応用情報(午後)の本番のように、必須の分野と、受験者が選ぶ分野からなる。
 * required と elective の出題数の合計は questionCount と一致させる。
 */
export interface MockExamComposition {
  // 必ず出題する分野(問題の subCategory)と出題数
  required: { genre: string; count: number }[];
  // 受験者が開始画面で選ぶ分野の候補、選ぶ数、選んだ1分野当たりの出題数
  elective: { genres: string[]; pickCount: number; countPerGenre: number };
}

export interface ExamSubjectPracticeConfig {
  // 1回の練習で出題する問題数
  questionsPerSession: number;
  // 何問ごとに正誤・解説のページを挟むか
  questionsPerRound: number;
}

export interface ExamSubject {
  key: string;
  name: string;
  description: string;
  path: string;
  practice: ExamSubjectPracticeConfig;
  // 1問正解するごとに付与するポイント(練習・模擬試験で共通)
  pointsPerCorrectAnswer: number;
  // 省略した科目は模擬試験を提供しない(科目一覧に「模擬試験を受ける」ボタンを出さない)
  mockExam?: ExamSubjectMockExamConfig;
}

export type MockExamSubject = ExamSubject & { mockExam: ExamSubjectMockExamConfig };

const DEFAULT_PRACTICE: ExamSubjectPracticeConfig = { questionsPerSession: 10, questionsPerRound: 2 };
const DEFAULT_POINTS_PER_CORRECT_ANSWER = 10;

/**
 * 資格学習で選択できる科目のマスタ一覧。ここを追加するだけで、科目選択画面
 * (ExamSubjectListPageComponent)と出題画面(ExamStudyPageComponent, ルート/study/:examType)
 * の両方に反映される。
 */
export const EXAM_SUBJECTS: ExamSubject[] = [
  {
    key: 'kihonjoho',
    name: '基本情報技術者試験（科目A）',
    description: '基本情報技術者試験 科目Aの対策問題を、2問ずつ解いていきましょう。',
    path: '/study/kihonjoho',
    practice: DEFAULT_PRACTICE,
    pointsPerCorrectAnswer: DEFAULT_POINTS_PER_CORRECT_ANSWER,
    mockExam: { durationMinutes: 90, questionCount: 60, passRatio: 0.6, questionsPerPage: 2 }
  },
  {
    // 科目Bは1問が長いため、1問ずつ正誤・解説を確認できるようにしている
    key: 'kihonjoho-b',
    name: '基本情報技術者試験（科目B）',
    description: '擬似言語のプログラムや情報セキュリティの問題を、1問ずつじっくり解いていきましょう。',
    path: '/study/kihonjoho-b',
    practice: { questionsPerSession: 5, questionsPerRound: 1 },
    pointsPerCorrectAnswer: DEFAULT_POINTS_PER_CORRECT_ANSWER,
    mockExam: { durationMinutes: 100, questionCount: 20, passRatio: 0.6, questionsPerPage: 1 }
  },
  {
    key: 'boki3',
    name: '簿記3級',
    description: '日商簿記3級の対策問題を、2問ずつ解いていきましょう。',
    path: '/study/boki3',
    practice: DEFAULT_PRACTICE,
    pointsPerCorrectAnswer: DEFAULT_POINTS_PER_CORRECT_ANSWER,
    mockExam: { durationMinutes: 60, questionCount: 100, passRatio: 0.7, questionsPerPage: 2 }
  },
  {
    key: 'oyojoho',
    name: '応用情報技術者試験（午前）',
    description: '応用情報技術者試験 午前の対策問題を、2問ずつ解いていきましょう。',
    path: '/study/oyojoho',
    practice: DEFAULT_PRACTICE,
    // 基本情報より難易度が高いため、1問あたりのポイントを多めにしている
    pointsPerCorrectAnswer: 20,
    mockExam: { durationMinutes: 150, questionCount: 80, passRatio: 0.6, questionsPerPage: 2 }
  },
  {
    // 本番の午後は記述式だが、アプリでは事例を読んで選択肢で答える形にしている。1問が長いため1問ずつ出題する
    key: 'oyojoho-pm',
    name: '応用情報技術者試験（午後）',
    description: '事例を読んで答える午後の問題を、1問ずつじっくり解いていきましょう。',
    path: '/study/oyojoho-pm',
    practice: { questionsPerSession: 5, questionsPerRound: 1 },
    pointsPerCorrectAnswer: 20,
    // 本番と同じく、情報セキュリティは必須で、ほかの10分野から4分野を選んで解答する
    mockExam: {
      durationMinutes: 150,
      questionCount: 25,
      passRatio: 0.6,
      questionsPerPage: 1,
      composition: {
        required: [{ genre: '情報セキュリティ', count: 5 }],
        elective: {
          genres: [
            '経営戦略', 'プログラミング', 'システムアーキテクチャ', 'ネットワーク', 'データベース',
            '組込みシステム開発', '情報システム開発', 'プロジェクトマネジメント', 'サービスマネジメント', 'システム監査'
          ],
          pickCount: 4,
          countPerGenre: 5
        }
      }
    }
  }
];

export function findExamSubject(key: string | null | undefined): ExamSubject | undefined {
  return EXAM_SUBJECTS.find((s) => s.key === key);
}

export function hasMockExam(subject: ExamSubject | undefined): subject is MockExamSubject {
  return subject?.mockExam !== undefined;
}
