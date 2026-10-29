import { Component, computed, input } from '@angular/core';
import { Journal } from '../../models/exam-question.models';
import { formatAmount, journalTableRows } from '../../utils/journal';

/**
 * 仕訳を、借方・貸方を横に並べた表で表示する(front#429)。
 * compareTo に正解の仕訳を渡すと、正解と一致しない行を赤字にする(「あなたの回答」の表示に使う)。
 */
@Component({
  selector: 'app-journal-table',
  standalone: true,
  templateUrl: './journal-table.component.html',
  styleUrl: './journal-table.component.css'
})
export class JournalTableComponent {
  readonly journal = input.required<Journal>();
  readonly compareTo = input<Journal | null>(null);

  readonly rows = computed(() => journalTableRows(this.journal(), this.compareTo()));

  amountText(amount: number | null): string {
    return amount === null ? '—' : formatAmount(amount);
  }
}
