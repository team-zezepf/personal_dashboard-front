import { Component, OnInit, input, output, signal } from '@angular/core';
import { Journal } from '../../models/exam-question.models';
import { JournalDraft, JournalSide, draftToJournal, journalToDraft } from '../../utils/journal';

/**
 * 仕訳入力の問題の入力欄(front#429)。借方・貸方それぞれ、勘定科目のプルダウンと金額の入力欄を同じ行数だけ並べる。
 * 入力が変わるたびに、何か入力した行だけを取り出した仕訳を changed で知らせる。
 */
@Component({
  selector: 'app-journal-input',
  standalone: true,
  templateUrl: './journal-input.component.html',
  styleUrl: './journal-input.component.css'
})
export class JournalInputComponent implements OnInit {
  // 勘定科目の候補(問題の choices)
  readonly accounts = input.required<string[]>();
  // 前に入力した仕訳(模擬試験で別の問題から戻ってきたときに、入力欄に戻す)
  readonly value = input<Journal | null | undefined>(null);
  // 読み上げ用の、問題の番号などのラベル(例: 「第3問」)
  readonly label = input('');
  readonly changed = output<Journal>();

  readonly draft = signal<JournalDraft>(journalToDraft(null));
  readonly sides: { key: JournalSide; name: string }[] = [
    { key: 'debit', name: '借方' },
    { key: 'credit', name: '貸方' }
  ];

  // 入力中の文字(「30,」など)を消さないよう、入力欄は最初に一度だけ前の仕訳から作る
  ngOnInit(): void {
    this.draft.set(journalToDraft(this.value()));
  }

  setAccount(side: JournalSide, index: number, account: string): void {
    this.update(side, index, { account });
  }

  setAmount(side: JournalSide, index: number, amount: string): void {
    this.update(side, index, { amount });
  }

  private update(side: JournalSide, index: number, patch: Partial<{ account: string; amount: string }>): void {
    const draft = this.draft();
    const rows = draft[side].map((row, i) => (i === index ? { ...row, ...patch } : row));
    const next = { ...draft, [side]: rows };
    this.draft.set(next);
    this.changed.emit(draftToJournal(next));
  }
}
