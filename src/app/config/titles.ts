/**
 * 称号のマスタ一覧(レベルの低い順)。各称号の条件は全て満たす必要がある。
 * 判定は模擬試験の「直近N回の平均正答率」で行い、平均が下がれば称号も下がる。
 */
export interface TitleCondition {
  // 対象の科目(EXAM_SUBJECTS の key)。'advanced' は高度資格のいずれか1種を表す
  examType: string | 'advanced';
  label: string;
  // 直近何回の平均で判定するか
  recentCount: number;
  // 必要な平均正答率(%)
  minRate: number;
}

export interface TitleDefinition {
  level: number;
  name: string;
  // 称号バッジ(丸い枠)の中で改行する位置。単語の途中で折り返さないよう行ごとに分ける
  badgeLines: string[];
  conditions: TitleCondition[];
}

export const ADVANCED_EXAM = 'advanced';

export const TITLES: TitleDefinition[] = [
  {
    level: 1,
    name: 'ジュニアエンジニア',
    badgeLines: ['ジュニア', 'エンジニア'],
    conditions: [
      { examType: 'kihonjoho', label: '基本情報(科目A)', recentCount: 10, minRate: 60 },
      { examType: 'kihonjoho-b', label: '基本情報(科目B)', recentCount: 10, minRate: 50 },
      { examType: 'oyojoho', label: '応用情報', recentCount: 10, minRate: 50 }
    ]
  },
  {
    level: 2,
    name: 'ミドルエンジニア',
    badgeLines: ['ミドル', 'エンジニア'],
    conditions: [
      { examType: 'kihonjoho', label: '基本情報(科目A)', recentCount: 10, minRate: 75 },
      { examType: 'kihonjoho-b', label: '基本情報(科目B)', recentCount: 10, minRate: 75 },
      { examType: 'oyojoho', label: '応用情報', recentCount: 5, minRate: 60 },
      { examType: ADVANCED_EXAM, label: '高度資格 いずれか1種', recentCount: 5, minRate: 50 }
    ]
  },
  {
    level: 3,
    name: 'シニアエンジニア',
    badgeLines: ['シニア', 'エンジニア'],
    conditions: [
      { examType: 'oyojoho', label: '応用情報', recentCount: 5, minRate: 80 },
      { examType: ADVANCED_EXAM, label: '高度資格 いずれか1種', recentCount: 5, minRate: 60 }
    ]
  }
];

// 高度資格として扱う科目(EXAM_SUBJECTS の key)。高度資格の科目を追加したらここに加える。
// 空の間は、高度資格の条件を含む称号に「COMING SOON」を表示する。
export const ADVANCED_EXAM_TYPES: string[] = [];
