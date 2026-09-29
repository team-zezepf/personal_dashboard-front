import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Observable, catchError, forkJoin, of } from 'rxjs';
import { HeaderComponent } from '../../components/header/header.component';
import { CardViewComponent } from '../../components/card-view/card-view.component';
import { CardPackViewComponent } from '../../components/card-pack-view/card-pack-view.component';
import { CardService } from '../../services/card.service';
import { NotificationService } from '../../services/notification.service';
import { Card, CardInput, CardPack, CardPackInput } from '../../models/card.models';
import { ImageCropDialogComponent } from '../../components/image-crop-dialog/image-crop-dialog.component';
import {
  CARD_IMAGE_SIZE,
  CARD_RARITIES,
  PACK_IMAGE_SIZE,
  DEFAULT_PACK_COLOR,
  DEFAULT_PACK_EMBLEM,
  formatCardNumber,
  rarityStars
} from '../../config/card-game';

const MAX_CARD_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

type AdminTab = 'cards' | 'packs';

function errorMessageOf(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

// カード・パックの登録(開発者/管理者向け)。入力するとすぐ右側のプレビューに反映されるよう、
// フォームの値は signal で持ち、項目ごとに patch する
@Component({
  selector: 'app-card-admin-page',
  standalone: true,
  imports: [FormsModule, HeaderComponent, CardViewComponent, CardPackViewComponent, ImageCropDialogComponent],
  templateUrl: './card-admin.component.html',
  styleUrl: './card-admin.component.css'
})
export class CardAdminPageComponent {
  private cardService = inject(CardService);
  private notificationService = inject(NotificationService);

  readonly rarities = CARD_RARITIES;
  readonly rarityStars = rarityStars;
  readonly formatCardNumber = formatCardNumber;

  readonly tab = signal<AdminTab>('cards');
  readonly packs = signal<CardPack[]>([]);
  readonly cards = signal<Card[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');
  readonly isSubmitting = signal(false);
  readonly isUploadingImage = signal(false);
  // 切り抜きダイアログで切り抜き中の画像と、切り抜いた後にどちら(カード/パック)の画像にするか
  readonly cropRequest = signal<{ file: File; target: AdminTab } | null>(null);
  readonly cardImageSize = CARD_IMAGE_SIZE;
  readonly packImageSize = PACK_IMAGE_SIZE;

  // 編集中のカード・パック。editing*Id が null で form が入っていれば新規作成
  readonly editingCardId = signal<string | null>(null);
  readonly cardForm = signal<CardInput | null>(null);
  readonly editingPackId = signal<string | null>(null);
  readonly packForm = signal<CardPackInput | null>(null);

  readonly packById = computed(() => new Map(this.packs().map((p) => [p.id, p])));

  readonly editingCard = computed(() => this.cards().find((c) => c.id === this.editingCardId()) ?? null);

  // 持っている人がいるカードは削除できない
  readonly canDeleteCard = computed(() => {
    const card = this.editingCard();
    return card !== null && (card.ownerCount ?? 0) === 0;
  });

  // パックごとの、レア度別の収録数(★1〜★3)
  readonly rarityCountsByPack = computed(() => {
    const counts = new Map<string, number[]>();
    for (const card of this.cards()) {
      const entry = counts.get(card.packId) ?? [0, 0, 0];
      entry[card.rarity - 1]++;
      counts.set(card.packId, entry);
    }
    return counts;
  });

  // カードが入っているパックは削除できない
  readonly canDeletePack = computed(() => {
    const id = this.editingPackId();
    return id !== null && !this.cards().some((c) => c.packId === id);
  });

  readonly cardPreviewEmblem = computed(() => {
    const packId = this.cardForm()?.packId;
    return (packId && this.packById().get(packId)?.emblem) || null;
  });

  constructor() {
    this.reload();
  }

  private reload(): void {
    forkJoin({ packs: this.cardService.getPacks(), cards: this.cardService.getCards() }).pipe(
      catchError((err) => {
        console.error('Failed to load cards:', err);
        this.errorMessage.set('カード・パックの取得に失敗しました');
        return of(null);
      })
    ).subscribe((result) => {
      this.isLoading.set(false);
      if (!result) return;
      this.packs.set(result.packs);
      this.cards.set(result.cards);
    });
  }

  switchTab(tab: AdminTab): void {
    this.tab.set(tab);
    this.errorMessage.set('');
  }

  packLabel(packId: string): string {
    const pack = this.packById().get(packId);
    return pack ? `第${pack.seriesNumber}弾` : '—';
  }

  // ===== カード =====

  newCard(): void {
    const nextNumber = Math.max(0, ...this.cards().map((c) => c.number)) + 1;
    this.editingCardId.set(null);
    this.errorMessage.set('');
    this.cardForm.set({
      packId: this.packs()[0]?.id ?? '',
      number: nextNumber,
      name: '',
      rarity: 1,
      typeLabel: '',
      habitat: '',
      favoriteFood: '',
      personality: '',
      quote: '',
      imageFilename: null,
      // パックが非公開のうちはカードを公開にしてもパックから出ないので、既定は公開にしておく
      published: true
    });
  }

  editCard(card: Card): void {
    const { id, ownerCount, ...input } = card;
    this.editingCardId.set(id);
    this.errorMessage.set('');
    this.cardForm.set(input);
  }

  patchCard(patch: Partial<CardInput>): void {
    this.cardForm.update((form) => form && { ...form, ...patch });
  }

  saveCard(): void {
    const form = this.cardForm();
    if (!form || this.isSubmitting()) return;
    this.submit(this.cardService.saveCard(this.editingCardId(), form), 'カードを保存しました', (saved) => {
      this.editingCardId.set(saved.id);
    });
  }

  deleteCard(): void {
    const card = this.editingCard();
    if (!card || !this.canDeleteCard()) return;
    if (!confirm(`「${card.name}」を削除しますか？`)) return;
    this.submit(this.cardService.deleteCard(card.id), 'カードを削除しました', () => {
      this.editingCardId.set(null);
      this.cardForm.set(null);
    });
  }

  // ===== パック =====

  newPack(): void {
    const nextSeries = Math.max(0, ...this.packs().map((p) => p.seriesNumber)) + 1;
    this.editingPackId.set(null);
    this.errorMessage.set('');
    this.packForm.set({
      seriesNumber: nextSeries,
      name: '',
      price: 300,
      emblem: DEFAULT_PACK_EMBLEM,
      color: DEFAULT_PACK_COLOR,
      imageFilename: null,
      // 作ったばかりのパックにはカードがないので、非公開から始める
      published: false
    });
  }

  editPack(pack: CardPack): void {
    const { id, ...input } = pack;
    this.editingPackId.set(id);
    this.errorMessage.set('');
    this.packForm.set(input);
  }

  patchPack(patch: Partial<CardPackInput>): void {
    this.packForm.update((form) => form && { ...form, ...patch });
  }

  savePack(): void {
    const form = this.packForm();
    if (!form || this.isSubmitting()) return;
    this.submit(this.cardService.savePack(this.editingPackId(), form), 'パックを保存しました', (saved) => {
      this.editingPackId.set(saved.id);
    });
  }

  deletePack(): void {
    const id = this.editingPackId();
    if (!id || !this.canDeletePack()) return;
    if (!confirm(`「${this.packForm()?.name}」を削除しますか？`)) return;
    this.submit(this.cardService.deletePack(id), 'パックを削除しました', () => {
      this.editingPackId.set(null);
      this.packForm.set(null);
    });
  }

  // ===== 共通 =====

  // 画像を選んだら、すぐにはアップロードせず切り抜きダイアログを開く
  onImageSelected(event: Event, target: AdminTab): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = '';
    if (!file) return;
    this.errorMessage.set('');
    this.cropRequest.set({ file, target });
  }

  onCropped(file: File): void {
    const request = this.cropRequest();
    this.cropRequest.set(null);
    if (request) this.uploadImage(file, request.target);
  }

  onCropCancelled(): void {
    this.cropRequest.set(null);
  }

  // 切り抜いて縮めた後の画像をアップロードする(元の画像が大きくても、ここでは数百KB程度になる)
  private uploadImage(file: File, target: AdminTab): void {
    if (file.size > MAX_CARD_IMAGE_SIZE_BYTES) {
      this.errorMessage.set('画像ファイルは5MB以下にしてください');
      return;
    }

    this.isUploadingImage.set(true);
    this.cardService.uploadImage(file).pipe(
      catchError((err) => {
        console.error('Failed to upload card image:', err);
        this.errorMessage.set('画像のアップロードに失敗しました');
        return of(null);
      })
    ).subscribe((filename) => {
      this.isUploadingImage.set(false);
      if (!filename) return;
      if (target === 'cards') {
        this.patchCard({ imageFilename: filename });
      } else {
        this.patchPack({ imageFilename: filename });
      }
    });
  }

  private submit<T>(request: Observable<T>, successMessage: string, onSuccess: (result: T) => void): void {
    this.isSubmitting.set(true);
    this.errorMessage.set('');
    request.subscribe({
      next: (result) => {
        this.isSubmitting.set(false);
        onSuccess(result);
        this.notificationService.showResult(successMessage, 'success');
        this.reload();
      },
      error: (err) => {
        console.error('Failed to save card data:', err);
        this.isSubmitting.set(false);
        // 公開できない理由などは API のエラーメッセージに入っている
        this.errorMessage.set(errorMessageOf(err, '保存に失敗しました'));
      }
    });
  }
}
