import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
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

// 開ける演出の段階。sealed: 切る前(点線をなぞる) → torn: 上部が飛んでいく → cards: カードを並べてめくる
type OpeningStage = 'sealed' | 'torn' | 'cards';

// 点線をパックの幅のこの割合までなぞったら開ける
const CUT_THRESHOLD = 0.6;
// 「タップで開ける」で切り口が端まで伸びる時間と、上部が飛んでいってからカードを出すまでの時間(CSSと合わせる)
const AUTO_CUT_MS = 300;
const TEAR_MS = 900;

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

  readonly stage = signal<OpeningStage>('sealed');
  // 切り口の長さ(パックの幅に対する割合 0〜1)と、なぞった向き(右から左なら -1)
  readonly cutProgress = signal(0);
  readonly cutDirection = signal<1 | -1>(1);
  // 「タップで開ける」で切り口を自動で伸ばしている最中(このときだけ伸びる動きにtransitionを付ける)
  readonly isAutoCutting = signal(false);
  private cutStart: { x: number; width: number } | null = null;
  private timers: ReturnType<typeof setTimeout>[] = [];

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

  // 切り口の線の位置(右から左になぞったときは右端から伸ばす)
  readonly cutLineLeft = computed(() => (this.cutDirection() === 1 ? 0 : (1 - this.cutProgress()) * 100));
  readonly scissorsLeft = computed(() =>
    this.cutDirection() === 1 ? this.cutProgress() * 100 : (1 - this.cutProgress()) * 100
  );

  constructor() {
    this.loadCollection();
    inject(DestroyRef).onDestroy(() => this.clearTimers());
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
      this.resetCut();
      this.loadCollection();
    });
  }

  // ===== パックの上部を切り開く =====

  onCutStart(event: PointerEvent): void {
    if (this.stage() !== 'sealed' || this.isAutoCutting()) return;
    const target = event.currentTarget as HTMLElement;
    target.setPointerCapture(event.pointerId);
    this.cutStart = { x: event.clientX, width: target.getBoundingClientRect().width };
  }

  onCutMove(event: PointerEvent): void {
    if (!this.cutStart || this.stage() !== 'sealed') return;
    const delta = event.clientX - this.cutStart.x;
    const progress = Math.min(1, Math.abs(delta) / this.cutStart.width);
    // 少し戻しても切り口は短くならない(実物と同じく、一度切ったところはそのまま)
    if (progress > this.cutProgress()) {
      this.cutDirection.set(delta < 0 ? -1 : 1);
      this.cutProgress.set(progress);
    }
    if (progress >= CUT_THRESHOLD) {
      this.tear();
    }
  }

  onCutEnd(): void {
    this.cutStart = null;
    // 途中でやめたら、切り口は元に戻す(もう一度なぞり直す)
    if (this.stage() === 'sealed' && !this.isAutoCutting()) {
      this.cutProgress.set(0);
    }
  }

  // なぞらずに開ける(ボタン・キーボード操作用)。切り口を端まで伸ばしてから開く
  cutByTap(): void {
    if (this.stage() !== 'sealed' || this.isAutoCutting()) return;
    this.isAutoCutting.set(true);
    this.cutDirection.set(1);
    this.cutProgress.set(1);
    this.later(() => this.tear(), AUTO_CUT_MS);
  }

  private tear(): void {
    if (this.stage() !== 'sealed') return;
    this.cutStart = null;
    this.cutProgress.set(1);
    this.stage.set('torn');
    this.later(() => this.stage.set('cards'), TEAR_MS);
  }

  private resetCut(): void {
    this.clearTimers();
    this.cutStart = null;
    this.cutProgress.set(0);
    this.cutDirection.set(1);
    this.isAutoCutting.set(false);
    this.stage.set('sealed');
  }

  private later(fn: () => void, ms: number): void {
    // 「視差効果を減らす」設定のときは演出を待たずに進める
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    this.timers.push(setTimeout(fn, reduced ? 0 : ms));
  }

  private clearTimers(): void {
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers = [];
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
    this.resetCut();
    this.openedPack.set(null);
    this.openedCards.set([]);
    this.revealed.set(new Set());
  }

  isGuaranteedSlot(index: number): boolean {
    return index === CARDS_PER_PACK - 1;
  }
}
