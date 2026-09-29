import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { catchError, of } from 'rxjs';
import { AccountService, PointHistoryEntry } from '../../services/account.service';
import { AuthService } from '../../services/auth.service';

const PAGE_SIZE = 10;

/**
 * 資格学習の科目一覧の画面に表示する、ポイントの獲得・使用の履歴(新しい順)。
 * 最初は PAGE_SIZE 件を表示し、「もっと見る」で続きを読み込む。
 */
@Component({
  selector: 'app-point-history',
  standalone: true,
  templateUrl: './point-history.component.html',
  styleUrl: './point-history.component.css'
})
export class PointHistoryComponent implements OnInit {
  private readonly accountService = inject(AccountService);
  private readonly authService = inject(AuthService);

  readonly points = computed(() => this.authService.currentUser()?.points ?? 0);
  readonly entries = signal<PointHistoryEntry[]>([]);
  readonly hasMore = signal(false);
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');

  ngOnInit(): void {
    this.loadMore();
  }

  loadMore(): void {
    this.isLoading.set(true);
    // 1件多く取得して、続きがあるかどうかを判定する
    this.accountService.getPointHistory(PAGE_SIZE + 1, this.entries().length).pipe(
      catchError((err) => {
        console.error('Failed to load point history:', err);
        this.errorMessage.set('ポイントの履歴の取得に失敗しました。');
        return of(null);
      })
    ).subscribe((page) => {
      this.isLoading.set(false);
      if (!page) return;
      this.entries.update((current) => [...current, ...page.slice(0, PAGE_SIZE)]);
      this.hasMore.set(page.length > PAGE_SIZE);
    });
  }

  // "2026-09-26T16:36:19" → "9/26 16:36"
  formatDate(iso: string): string {
    const [date, time = ''] = iso.split('T');
    const [, m, d] = date.split('-');
    return `${Number(m)}/${Number(d)} ${time.slice(0, 5)}`.trim();
  }

  formatPoints(value: number): string {
    return value.toLocaleString('ja-JP');
  }

  // 履歴の額。獲得は「+」、使った分(カードパックなど)は「-」を付ける
  formatSignedPoints(value: number): string {
    return (value >= 0 ? '+' : '-') + this.formatPoints(Math.abs(value));
  }
}
