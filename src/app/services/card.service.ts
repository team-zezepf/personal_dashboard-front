import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { GraphQLService } from './graphql.service';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';
import {
  Card,
  CardCollection,
  CardInput,
  CardPack,
  CardPackInput,
  OpenCardPackResult
} from '../models/card.models';

const CARD_PACK_FIELDS = `
  id
  seriesNumber
  name
  price
  emblem
  color
  imageFilename
  published
`;

const CARD_FIELDS = `
  id
  packId
  number
  name
  rarity
  typeLabel
  habitat
  favoriteFood
  personality
  quote
  imageFilename
  published
`;

@Injectable({
  providedIn: 'root'
})
export class CardService {
  private graphql = inject(GraphQLService);
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private imageUploadUrl = `${environment.apiBaseUrl}/api/card-images`;

  // ===== コレクション・パックを開ける =====

  getCollection(): Observable<CardCollection> {
    const query = `
      query GetCardCollection {
        cardCollection {
          packs { ${CARD_PACK_FIELDS} }
          cards {
            card { ${CARD_FIELDS} }
            count
            seen
            firstObtainedAt
          }
          points
        }
      }
    `;
    // ヘッダーのポイントはログイン時点の値なので、他の画面・端末で増減していても最新にしておく
    return this.graphql.query<{ cardCollection: CardCollection }>(query).pipe(
      map((res) => res.cardCollection),
      tap((collection) => this.authService.updateStoredUser({ points: collection.points }))
    );
  }

  // 抽選・ポイントの減算は API 側で行う。開けた後の残高をヘッダーのポイント表示に反映する
  openPack(packId: string): Observable<OpenCardPackResult> {
    const mutation = `
      mutation OpenCardPack($packId: ID!) {
        openCardPack(packId: $packId) {
          cards {
            card { ${CARD_FIELDS} }
            isNew
          }
          points
        }
      }
    `;
    return this.graphql.mutation<{ openCardPack: OpenCardPackResult }>(mutation, { packId }).pipe(
      map((res) => res.openCardPack),
      tap((result) => this.authService.updateStoredUser({ points: result.points }))
    );
  }

  markSeen(cardId: string): Observable<boolean> {
    const mutation = `
      mutation MarkCardSeen($cardId: ID!) {
        markCardSeen(cardId: $cardId)
      }
    `;
    return this.graphql.mutation<{ markCardSeen: boolean }>(mutation, { cardId }).pipe(
      map((res) => res.markCardSeen)
    );
  }

  // ===== 登録(非公開も含む) =====

  getPacks(): Observable<CardPack[]> {
    const query = `
      query GetCardPacks {
        cardPacks { ${CARD_PACK_FIELDS} }
      }
    `;
    return this.graphql.query<{ cardPacks: CardPack[] }>(query).pipe(map((res) => res.cardPacks));
  }

  getCards(): Observable<Card[]> {
    const query = `
      query GetCards {
        cards {
          ${CARD_FIELDS}
          ownerCount
        }
      }
    `;
    return this.graphql.query<{ cards: Card[] }>(query).pipe(map((res) => res.cards));
  }

  savePack(id: string | null, input: CardPackInput): Observable<CardPack> {
    if (id === null) {
      const mutation = `
        mutation CreateCardPack($input: CardPackInput!) {
          createCardPack(input: $input) { ${CARD_PACK_FIELDS} }
        }
      `;
      return this.graphql.mutation<{ createCardPack: CardPack }>(mutation, { input }).pipe(
        map((res) => res.createCardPack)
      );
    }
    const mutation = `
      mutation UpdateCardPack($id: ID!, $input: CardPackInput!) {
        updateCardPack(id: $id, input: $input) { ${CARD_PACK_FIELDS} }
      }
    `;
    return this.graphql.mutation<{ updateCardPack: CardPack }>(mutation, { id, input }).pipe(
      map((res) => res.updateCardPack)
    );
  }

  deletePack(id: string): Observable<boolean> {
    const mutation = `
      mutation DeleteCardPack($id: ID!) {
        deleteCardPack(id: $id)
      }
    `;
    return this.graphql.mutation<{ deleteCardPack: boolean }>(mutation, { id }).pipe(
      map((res) => res.deleteCardPack)
    );
  }

  saveCard(id: string | null, input: CardInput): Observable<Card> {
    if (id === null) {
      const mutation = `
        mutation CreateCard($input: CardInput!) {
          createCard(input: $input) { ${CARD_FIELDS} ownerCount }
        }
      `;
      return this.graphql.mutation<{ createCard: Card }>(mutation, { input }).pipe(
        map((res) => res.createCard)
      );
    }
    const mutation = `
      mutation UpdateCard($id: ID!, $input: CardInput!) {
        updateCard(id: $id, input: $input) { ${CARD_FIELDS} ownerCount }
      }
    `;
    return this.graphql.mutation<{ updateCard: Card }>(mutation, { id, input }).pipe(
      map((res) => res.updateCard)
    );
  }

  deleteCard(id: string): Observable<boolean> {
    const mutation = `
      mutation DeleteCard($id: ID!) {
        deleteCard(id: $id)
      }
    `;
    return this.graphql.mutation<{ deleteCard: boolean }>(mutation, { id }).pipe(
      map((res) => res.deleteCard)
    );
  }

  // 画像は<img>でプレーン参照する都合上GraphQLを経由せず、Q&Aの画像と同じくREST(multipart)で
  // アップロードする。返ってきたfilenameをカード・パックのimageFilenameに入れて保存する。
  uploadImage(file: File): Observable<string> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.http.post<{ filename: string }>(this.imageUploadUrl, formData).pipe(
      map((res) => res.filename)
    );
  }
}
