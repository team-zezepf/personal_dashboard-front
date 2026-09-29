import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { HeaderComponent } from '../../components/header/header.component';
import { CardTileComponent } from '../../components/card-tile/card-tile.component';
import { CardPackViewComponent } from '../../components/card-pack-view/card-pack-view.component';
import { CardService } from '../../services/card.service';
import { AuthService } from '../../services/auth.service';
import { CardCollection, CardPack, OpenedCard } from '../../models/card.models';
import {
  CARDS_PER_PACK,
  GUARANTEED_SLOT_RATES_LABEL,
  NORMAL_SLOT_RATES_LABEL
} from '../../config/card-game';

@Component({
  selector: 'app-card-packs-page',
  standalone: true,
  imports: [RouterLink, HeaderComponent, CardTileComponent, CardPackViewComponent],
  templateUrl: './card-packs.component.html',
  styleUrl: './card-packs.component.css'
})
export class CardPacksPageComponent {
  private cardService = inject(CardService);
  private authService = inject(AuthService);

  readonly cardsPerPack = CARDS_PER_PACK;
  readonly normalRatesLabel = NORMAL_SLOT_RATES_LABEL;
  readonly guaranteedRatesLabel = GUARANTEED_SLOT_RATES_LABEL;

  readonly collection = signal<CardCollection | null>(null);
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');

  // 開けている最中(抽選結果の待ち)のパック
  readonly openingPackId = signal<string | null>(null);
  // 開けたパックと、その結果。めくったカードの位置を revealed に持つ
  readonly openedPack = signal<CardPack | null>(null);
  readonly openedCards = signal<OpenedCard[]>([]);
  readonly revealed = signal<ReadonlySet<number>>(new Set());

  readonly points = computed(() => this.authService.currentUser()?.points ?? 0);
  readonly packs = computed(() => this.collection()?.packs ?? []);

  // パックごとの「集めた種類 / 全種類」
  readonly progressByPack = computed(() => {
    const progress = new Map<string, { owned: number; total: number }>();
    for (const item of this.collection()?.cards ?? []) {
      const entry = progress.get(item.card.packId) ?? { owned: 0, total: 0 };
      entry.total++;
      if (item.count > 0) entry.owned++;
      progress.set(item.card.packId, entry);
    }
    return progress;
  });

  readonly allRevealed = computed(() =>
    this.openedCards().length > 0 && this.revealed().size === this.openedCards().length
  );

  constructor() {
    this.loadCollection();
  }

  private loadCollection(): void {
    this.cardService.getCollection().pipe(
      catchError((err) => {
        console.error('Failed to load card packs:', err);
        this.errorMessage.set('パックの取得に失敗しました');
        return of(null);
      })
    ).subscribe((collection) => {
      this.isLoading.set(false);
      if (collection) this.collection.set(collection);
    });
  }

  shortage(pack: CardPack): number {
    return Math.max(0, pack.price - this.points());
  }

  openPack(pack: CardPack): void {
    if (this.openingPackId() || this.shortage(pack) > 0) return;
    this.errorMessage.set('');
    this.openingPackId.set(pack.id);
    this.cardService.openPack(pack.id).pipe(
      catchError((err) => {
        console.error('Failed to open card pack:', err);
        // ポイント不足などの理由は API のエラーメッセージに入っている
        this.errorMessage.set(err instanceof Error && err.message ? err.message : 'パックを開けられませんでした');
        return of(null);
      })
    ).subscribe((result) => {
      this.openingPackId.set(null);
      if (!result) return;
      this.openedPack.set(pack);
      this.openedCards.set(result.cards);
      this.revealed.set(new Set());
      this.loadCollection();
    });
  }

  reveal(index: number): void {
    this.revealed.update((current) => new Set(current).add(index));
  }

  revealAll(): void {
    this.revealed.set(new Set(this.openedCards().map((_, i) => i)));
  }

  openAgain(): void {
    const pack = this.openedPack();
    this.closeOpening();
    if (pack) this.openPack(pack);
  }

  closeOpening(): void {
    this.openedPack.set(null);
    this.openedCards.set([]);
    this.revealed.set(new Set());
  }

  isGuaranteedSlot(index: number): boolean {
    return index === CARDS_PER_PACK - 1;
  }
}
