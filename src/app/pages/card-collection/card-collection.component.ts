import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { HeaderComponent } from '../../components/header/header.component';
import { CardTileComponent } from '../../components/card-tile/card-tile.component';
import { CardViewComponent } from '../../components/card-view/card-view.component';
import { CardService } from '../../services/card.service';
import { CardCollection, CardPack, CollectionCard } from '../../models/card.models';
import { CARD_RARITIES, rarityStars } from '../../config/card-game';

type OwnershipFilter = 'all' | 'owned';

@Component({
  selector: 'app-card-collection-page',
  standalone: true,
  imports: [RouterLink, HeaderComponent, CardTileComponent, CardViewComponent],
  templateUrl: './card-collection.component.html',
  styleUrl: './card-collection.component.css'
})
export class CardCollectionPageComponent {
  private cardService = inject(CardService);

  readonly rarities = CARD_RARITIES;
  readonly rarityStars = rarityStars;

  readonly collection = signal<CardCollection | null>(null);
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');

  // 選んでいるパック。未選択なら先頭のパックを表示する
  private readonly chosenPackId = signal<string | null>(null);
  readonly rarityFilter = signal<number | null>(null);
  readonly ownershipFilter = signal<OwnershipFilter>('all');
  readonly selected = signal<CollectionCard | null>(null);

  readonly packs = computed(() => this.collection()?.packs ?? []);

  readonly selectedPack = computed<CardPack | null>(() => {
    const packs = this.packs();
    return packs.find((p) => p.id === this.chosenPackId()) ?? packs[0] ?? null;
  });

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

  readonly selectedProgress = computed(() => {
    const pack = this.selectedPack();
    return (pack && this.progressByPack().get(pack.id)) || { owned: 0, total: 0 };
  });

  readonly progressPercent = computed(() => {
    const { owned, total } = this.selectedProgress();
    return total === 0 ? 0 : Math.round((owned / total) * 100);
  });

  readonly visibleCards = computed(() => {
    const pack = this.selectedPack();
    const rarity = this.rarityFilter();
    const ownedOnly = this.ownershipFilter() === 'owned';
    return (this.collection()?.cards ?? []).filter((item) =>
      item.card.packId === pack?.id &&
      (rarity === null || item.card.rarity === rarity) &&
      (!ownedOnly || item.count > 0)
    );
  });

  readonly selectedEmblem = computed(() => {
    const card = this.selected()?.card;
    return this.packs().find((p) => p.id === card?.packId)?.emblem ?? null;
  });

  readonly selectedFootnote = computed(() => {
    const item = this.selected();
    if (!item) return null;
    const firstDate = item.firstObtainedAt?.slice(0, 10).replaceAll('-', '/');
    return `所持 ${item.count}枚` + (firstDate ? ` ・ はじめて手に入れた日 ${firstDate}` : '');
  });

  constructor() {
    this.cardService.getCollection().pipe(
      catchError((err) => {
        console.error('Failed to load card collection:', err);
        this.errorMessage.set('コレクションの取得に失敗しました');
        return of(null);
      })
    ).subscribe((collection) => {
      this.isLoading.set(false);
      this.collection.set(collection);
    });
  }

  selectPack(packId: string): void {
    this.chosenPackId.set(packId);
  }

  toggleRarity(rarity: number): void {
    this.rarityFilter.update((current) => (current === rarity ? null : rarity));
  }

  openDetail(item: CollectionCard): void {
    if (item.count === 0) return;
    this.selected.set(item);
    if (!item.seen) {
      // NEWバッジは画面上ですぐ消し、保存に失敗しても次に開いたときにもう一度消すだけなので通知はしない
      this.markSeenLocally(item.card.id);
      this.cardService.markSeen(item.card.id).pipe(
        catchError((err) => {
          console.error('Failed to mark card as seen:', err);
          return of(false);
        })
      ).subscribe();
    }
  }

  closeDetail(): void {
    this.selected.set(null);
  }

  private markSeenLocally(cardId: string): void {
    this.collection.update((collection) => collection && {
      ...collection,
      cards: collection.cards.map((item) => (item.card.id === cardId ? { ...item, seen: true } : item))
    });
  }
}
