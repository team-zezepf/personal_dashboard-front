import { INTERVIEW_PREP_TEMPLATE, TEMPLATE_ITEM_COUNT, allTemplateItems, answerMap, filledCount } from './interview-prep-template';

describe('INTERVIEW_PREP_TEMPLATE', () => {
  it('項目のキーが重複していない(キーごとに回答を保存するため)', () => {
    const keys = allTemplateItems().map((item) => item.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('項目数は全ての章の項目の合計', () => {
    expect(TEMPLATE_ITEM_COUNT).toBe(INTERVIEW_PREP_TEMPLATE.flatMap((s) => s.items).length);
  });
});

describe('filledCount', () => {
  it('空白だけの回答と、今のテンプレートにない項目の回答は数えない', () => {
    const answers = answerMap([
      { key: 'business', value: 'SaaS' },
      { key: 'position', value: '   ' },
      { key: 'removed-item', value: '昔の項目の回答' }
    ]);

    expect(filledCount(answers, allTemplateItems())).toBe(1);
  });
});
