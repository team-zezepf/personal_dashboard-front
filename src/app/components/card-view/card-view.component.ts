import { Component, computed, input } from '@angular/core';
import { Card } from '../../models/card.models';
import { DEFAULT_PACK_EMBLEM, formatCardNumber, rarityStars } from '../../config/card-game';
import { cardImageUrl } from '../../utils/card-image';

// カードの表に出す項目(登録画面のプレビューでは保存前の入力値を渡す)
export type CardFace = Pick<
  Card,
  'number' | 'name' | 'rarity' | 'typeLabel' | 'habitat' | 'favoriteFood' | 'personality' | 'quote' | 'imageFilename'
>;

// カードの詳細(大きく表示するカード)。コレクションの詳細・登録画面のプレビューで使う
@Component({
  selector: 'app-card-view',
  standalone: true,
  templateUrl: './card-view.component.html',
  styleUrl: './card-view.component.css'
})
export class CardViewComponent {
  readonly card = input.required<CardFace>();
  // 左上のマーク。収録パックのマークを使う
  readonly emblem = input<string | null>(null);
  // カードの下に添える一言(所持枚数など)
  readonly footnote = input<string | null>(null);

  readonly numberLabel = computed(() => formatCardNumber(this.card().number));
  readonly stars = computed(() => rarityStars(this.card().rarity));
  readonly emblemLabel = computed(() => this.emblem() || DEFAULT_PACK_EMBLEM);
  readonly imageUrl = computed(() => {
    const filename = this.card().imageFilename;
    return filename ? cardImageUrl(filename) : null;
  });
}
