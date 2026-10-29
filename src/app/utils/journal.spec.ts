import { Journal } from '../models/exam-question.models';
import {
  draftToJournal, emptyDraft, isCorrectJournal, isJournal, isJournalAnswered, journalTableRows, journalToDraft, parseAmount
} from './journal';

// 商品80,000円を仕入れ、30,000円は現金、残りは掛け
const correct: Journal = {
  debit: [{ account: '仕入', amount: 80000 }],
  credit: [{ account: '現金', amount: 30000 }, { account: '買掛金', amount: 50000 }]
};

describe('parseAmount', () => {
  it('カンマ・全角数字・「円」・空白があっても数として読む', () => {
    expect(parseAmount('30000')).toBe(30000);
    expect(parseAmount('30,000')).toBe(30000);
    expect(parseAmount('３０，０００')).toBe(30000);
    expect(parseAmount(' 30000円 ')).toBe(30000);
  });

  it('空や数として読めない入力は null にする', () => {
    expect(parseAmount('')).toBeNull();
    expect(parseAmount('3万')).toBeNull();
    expect(parseAmount('-100')).toBeNull();
    expect(parseAmount('1.5')).toBeNull();
  });
});

describe('draftToJournal / journalToDraft', () => {
  it('勘定科目も金額も空の行は無視し、どちらかを入れた行だけを仕訳にする', () => {
    const draft = emptyDraft();
    draft.debit[2] = { account: '仕入', amount: '80,000' };
    draft.credit[0] = { account: '現金', amount: '' };
    draft.credit[3] = { account: '', amount: '50000' };

    expect(draftToJournal(draft)).toEqual({
      debit: [{ account: '仕入', amount: 80000 }],
      credit: [{ account: '現金', amount: null }, { account: '', amount: 50000 }]
    });
  });

  it('入力欄の行数は問題によらず4行で、入力した仕訳を上の行から戻す(金額はカンマ区切り)', () => {
    const draft = journalToDraft(correct);

    expect(draft.debit).toHaveLength(4);
    expect(draft.credit).toHaveLength(4);
    expect(draft.credit[0]).toEqual({ account: '現金', amount: '30,000' });
    expect(draft.credit[1]).toEqual({ account: '買掛金', amount: '50,000' });
    expect(draft.credit[2]).toEqual({ account: '', amount: '' });
    expect(draftToJournal(draft)).toEqual(correct);
  });
});

describe('isCorrectJournal', () => {
  it('借方・貸方それぞれで、勘定科目と金額の組が一致すれば、行の順番に関係なく正解にする', () => {
    expect(isCorrectJournal(correct, {
      debit: [{ account: '仕入', amount: 80000 }],
      credit: [{ account: '買掛金', amount: 50000 }, { account: '現金', amount: 30000 }]
    })).toBe(true);
  });

  it('金額・勘定科目の違い、行の不足・余分、借方と貸方の入れ違いは不正解にする', () => {
    const credit = correct.credit;
    expect(isCorrectJournal(correct, { debit: [{ account: '仕入', amount: 8000 }], credit })).toBe(false);
    expect(isCorrectJournal(correct, { debit: [{ account: '仕入', amount: 80000 }], credit: [credit[0], { account: '未払金', amount: 50000 }] })).toBe(false);
    expect(isCorrectJournal(correct, { debit: [{ account: '仕入', amount: 80000 }], credit: [credit[1]] })).toBe(false);
    expect(isCorrectJournal(correct, { debit: [{ account: '仕入', amount: 80000 }, { account: '現金', amount: 0 }], credit })).toBe(false);
    expect(isCorrectJournal(correct, { debit: credit, credit: correct.debit })).toBe(false);
  });

  it('金額を入れていない行があれば不正解にする', () => {
    expect(isCorrectJournal(correct, { debit: [{ account: '仕入', amount: null }], credit: correct.credit })).toBe(false);
  });
});

describe('isJournal / isJournalAnswered', () => {
  it('選択肢の番号の配列は仕訳として扱わない', () => {
    expect(isJournal([0])).toBe(false);
    expect(isJournal(undefined)).toBe(false);
    expect(isJournal(correct)).toBe(true);
  });

  it('1行でも入力していれば回答済みにする', () => {
    expect(isJournalAnswered({ debit: [], credit: [] })).toBe(false);
    expect(isJournalAnswered({ debit: [], credit: [{ account: '現金', amount: null }] })).toBe(true);
    expect(isJournalAnswered(null)).toBe(false);
  });
});

describe('journalTableRows', () => {
  it('借方・貸方を横に並べ、行数の多いほうに合わせる', () => {
    const rows = journalTableRows(correct);

    expect(rows).toHaveLength(2);
    expect(rows[0].debit?.line).toEqual({ account: '仕入', amount: 80000 });
    expect(rows[1].debit).toBeNull();
    expect(rows[1].credit?.line).toEqual({ account: '買掛金', amount: 50000 });
    expect(rows.every((r) => !r.debit?.wrong && !r.credit?.wrong)).toBe(true);
  });

  it('正解と比べるときは、正解にない行だけに印を付け、同じ行を2回書いた分も印を付ける', () => {
    const given: Journal = {
      debit: [{ account: '仕入', amount: 80000 }],
      credit: [{ account: '買掛金', amount: 80000 }, { account: '現金', amount: 30000 }, { account: '現金', amount: 30000 }]
    };
    const rows = journalTableRows(given, correct);

    expect(rows.map((r) => r.debit?.wrong ?? null)).toEqual([false, null, null]);
    expect(rows.map((r) => r.credit?.wrong)).toEqual([true, false, true]);
  });
});
