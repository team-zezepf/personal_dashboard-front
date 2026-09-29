import { Component, computed, input } from '@angular/core';
import { CardPack } from '../../models/card.models';
import { DEFAULT_PACK_COLOR, DEFAULT_PACK_EMBLEM } from '../../config/card-game';
import { cardImageUrl } from '../../utils/card-image';

// パックの見た目。イラスト画像があればその上にパック名を重ね、なければ色とマークで表示する
@Component({
  selector: 'app-card-pack-view',
  standalone: true,
  templateUrl: './card-pack-view.component.html',
  styleUrl: './card-pack-view.component.css'
})
export class CardPackViewComponent {
  readonly pack = input.required<Pick<CardPack, 'seriesNumber' | 'name' | 'emblem' | 'color' | 'imageFilename'>>();

  readonly color = computed(() => this.pack().color || DEFAULT_PACK_COLOR);
  readonly emblem = computed(() => this.pack().emblem || DEFAULT_PACK_EMBLEM);
  readonly imageUrl = computed(() => {
    const filename = this.pack().imageFilename;
    return filename ? cardImageUrl(filename) : null;
  });
}
