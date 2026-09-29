import { Component, computed, input } from '@angular/core';
import { Card } from '../../models/card.models';
import { formatCardNumber, rarityStars } from '../../config/card-game';
import { cardImageUrl } from '../../utils/card-image';

// コレクションの一覧・パックを開けた結果に並べる小さいカード。
// 未所持(locked)のときはイラストを黒く塗ってシルエットにし、名前を伏せる(レア度は見せる)
@Component({
  selector: 'app-card-tile',
  standalone: true,
  templateUrl: './card-tile.component.html',
  styleUrl: './card-tile.component.css'
})
export class CardTileComponent {
  readonly card = input.required<Pick<Card, 'number' | 'name' | 'rarity' | 'imageFilename'>>();
  readonly locked = input(false);
  // 所持枚数。0のときは表示しない
  readonly count = input(0);
  readonly isNew = input(false);
  // ★★★などを光る枠で目立たせる
  readonly shine = input(false);

  readonly numberLabel = computed(() => formatCardNumber(this.card().number));
  readonly stars = computed(() => rarityStars(this.card().rarity));
  readonly imageUrl = computed(() => {
    const filename = this.card().imageFilename;
    return filename ? cardImageUrl(filename) : null;
  });
}
