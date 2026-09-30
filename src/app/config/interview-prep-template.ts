import { InterviewPrepAnswer } from '../models/interview-prep.models';

export interface TemplateItem {
  // 保存に使うキー。入力済みの内容と結び付くので、一度決めたら変えない
  key: string;
  label: string;
  // 章の中の小見出し(「事業」「サービス」など)。同じ group が続く項目の先頭にだけ表示する
  group?: string;
}

export interface TemplateSection {
  // 目次に出す短い名前
  shortTitle: string;
  title: string;
  items: TemplateItem[];
}

/**
 * 面接準備シートの項目。ここに項目を足すと、すべての企業のシートに表示される
 * (回答はキーごとに保存するので、APIやデータの変更はいらない)。
 * 項目を消しても入力済みの内容はデータに残り、画面に出なくなるだけ。
 */
export const INTERVIEW_PREP_TEMPLATE: TemplateSection[] = [
  {
    shortTitle: '①事前調査',
    title: '① サービスや事業の事前調査',
    items: [
      { key: 'business', group: '事業', label: 'どんな事業をやっているのか？' },
      { key: 'service-users', group: 'サービス', label: '対象ユーザーは？' },
      { key: 'service-problems', group: 'サービス', label: '主にどういった課題を解決する？' },
      { key: 'service-domain', group: 'サービス', label: '担っている領域はどの部分か' }
    ]
  },
  {
    shortTitle: '②採用枠',
    title: '② 今回の採用枠について',
    items: [
      { key: 'position', label: 'どのポジションになるか？' }
    ]
  },
  {
    shortTitle: '③志望理由',
    title: '③ 志望理由',
    items: [
      { key: 'appeal', label: '何に魅力を感じたのか？' },
      { key: 'contribution', label: 'どのように貢献したいのか？' }
    ]
  },
  {
    shortTitle: '④エピソード',
    title: '④ 志望動機につながるエピソードは？',
    items: [
      { key: 'episode-problem', label: '何が問題だったか' },
      { key: 'episode-action', label: '自分は何をしたか' },
      { key: 'episode-result', label: '結果' }
    ]
  }
];

// 一覧でポジションとして表示する項目
export const POSITION_KEY = 'position';

export const TEMPLATE_ITEM_COUNT = INTERVIEW_PREP_TEMPLATE.reduce((sum, s) => sum + s.items.length, 0);

export function answerMap(answers: InterviewPrepAnswer[]): Map<string, string> {
  return new Map(answers.map((a) => [a.key, a.value]));
}

export function isFilled(value: string | undefined): boolean {
  return (value ?? '').trim().length > 0;
}

// 記入済みの項目数。今のテンプレートにない項目(消した項目)の回答は数えない
export function filledCount(answers: ReadonlyMap<string, string>, items: TemplateItem[]): number {
  return items.filter((item) => isFilled(answers.get(item.key))).length;
}

export function allTemplateItems(): TemplateItem[] {
  return INTERVIEW_PREP_TEMPLATE.flatMap((s) => s.items);
}
