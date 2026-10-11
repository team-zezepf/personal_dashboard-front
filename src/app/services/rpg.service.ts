import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, map, tap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { GraphQLService } from './graphql.service';
import { AuthService } from './auth.service';
import { RpgBgm, RpgExchangeResult, RpgMap, RpgMapInput, RpgPointShopItem, RpgSave, RpgSaveInput } from '../models/rpg.models';

// BGMの音楽ファイルの大きさの上限(APIと合わせる)
export const RPG_BGM_MAX_BYTES = 10 * 1024 * 1024;
export const RPG_BGM_ACCEPT = '.mp3,.ogg,.m4a,.wav';

const SAVE_FIELDS = `
  level exp hp gold weapon armor
  items { itemId count }
  area x y
  stats { hp atk def mag spd luk }
  statPoints updatedAt
`;

const MAP_FIELDS = `
  id name recommendedLevel theme width height ground
  objects { type x y roof torch }
  npcs { name x y hair body role notice lines }
  enemies { type x y }
  portals { x y to toX toY }
  startX startY sortOrder bgmId updatedAt
`;

const BGM_FIELDS = `id name filename size createdAt`;

const SAVE_MUTATION = `
  mutation SaveRpg($input: RpgSaveInput!) {
    saveRpg(input: $input) { ${SAVE_FIELDS} }
  }
`;

@Injectable({ providedIn: 'root' })
export class RpgService {
  private graphql = inject(GraphQLService);
  private authService = inject(AuthService);
  private http = inject(HttpClient);

  // ===== BGM(front#218) =====

  getBgms(): Observable<RpgBgm[]> {
    const query = `query GetRpgBgms { rpgBgms { ${BGM_FIELDS} } }`;
    return this.graphql.query<{ rpgBgms: RpgBgm[] }>(query).pipe(map((res) => res.rpgBgms));
  }

  // 音楽ファイルは <audio> でプレーンに読むため、カードのイラストと同じくREST(multipart)でアップロードする
  uploadBgm(file: File, name: string): Observable<RpgBgm> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    if (name.trim()) formData.append('name', name.trim());
    return this.http.post<RpgBgm>(`${environment.apiBaseUrl}/api/rpg-bgm`, formData).pipe(
      map((bgm) => ({ ...bgm, id: String(bgm.id) })),
      catchError((err: HttpErrorResponse) =>
        throwError(() => new Error(err.error?.message ?? (err.status === 413 ? '1曲 10MB までのファイルにしてください' : 'BGMの登録に失敗しました')))
      )
    );
  }

  renameBgm(id: string, name: string): Observable<RpgBgm> {
    const mutation = `mutation RenameRpgBgm($id: ID!, $name: String!) { renameRpgBgm(id: $id, name: $name) { ${BGM_FIELDS} } }`;
    return this.graphql.mutation<{ renameRpgBgm: RpgBgm }>(mutation, { id, name }).pipe(map((res) => res.renameRpgBgm));
  }

  deleteBgm(id: string): Observable<boolean> {
    const mutation = `mutation DeleteRpgBgm($id: ID!) { deleteRpgBgm(id: $id) }`;
    return this.graphql.mutation<{ deleteRpgBgm: boolean }>(mutation, { id }).pipe(map((res) => res.deleteRpgBgm));
  }

  bgmUrl(bgm: RpgBgm): string {
    return `${environment.apiBaseUrl}/rpg-bgm/${encodeURIComponent(bgm.filename)}`;
  }

  getSave(): Observable<RpgSave> {
    const query = `query GetRpgSave { rpgSave { ${SAVE_FIELDS} } }`;
    return this.graphql.query<{ rpgSave: RpgSave }>(query).pipe(map((res) => res.rpgSave));
  }

  getMaps(): Observable<RpgMap[]> {
    const query = `query GetRpgMaps { rpgMaps { ${MAP_FIELDS} } }`;
    return this.graphql.query<{ rpgMaps: RpgMap[] }>(query).pipe(map((res) => res.rpgMaps));
  }

  // 管理者・開発者だけが保存できる(api#82)
  saveMap(input: RpgMapInput): Observable<RpgMap> {
    const mutation = `
      mutation SaveRpgMap($input: RpgMapInput!) {
        saveRpgMap(input: $input) { ${MAP_FIELDS} }
      }
    `;
    return this.graphql.mutation<{ saveRpgMap: RpgMap }>(mutation, { input }).pipe(map((res) => res.saveRpgMap));
  }

  getPointShop(): Observable<RpgPointShopItem[]> {
    const query = `query GetRpgPointShop { rpgPointShop { id name point description } }`;
    return this.graphql.query<{ rpgPointShop: RpgPointShopItem[] }>(query).pipe(map((res) => res.rpgPointShop));
  }

  save(input: RpgSaveInput): Observable<RpgSave> {
    return this.graphql
      .mutation<{ saveRpg: RpgSave }>(SAVE_MUTATION, { input })
      .pipe(map((res) => res.saveRpg));
  }

  // タブを閉じる・再読み込みするときの保存。画面が消えても送信を続けられるよう keepalive で送る
  // (HttpClient は画面が消えると途中で止まることがある)。結果は待たない
  saveOnUnload(input: RpgSaveInput): void {
    const token = this.authService.getToken();
    if (!token) return;
    try {
      fetch(`${environment.apiBaseUrl}/graphql`, {
        method: 'POST',
        keepalive: true,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ query: SAVE_MUTATION, variables: { input } })
      }).catch(() => undefined);
    } catch {
      // 送れなくても、30秒ごとの保存までの分が戻るだけなので何もしない
    }
  }

  // ポイントの減算はAPI側で行う。交換した後の残高をヘッダーのポイント表示に反映する
  exchangePoints(itemId: string, current: RpgSaveInput): Observable<RpgExchangeResult> {
    const mutation = `
      mutation ExchangeRpgPoints($itemId: ID!, $current: RpgSaveInput!) {
        exchangeRpgPoints(itemId: $itemId, current: $current) {
          save { ${SAVE_FIELDS} }
          points
        }
      }
    `;
    return this.graphql
      .mutation<{ exchangeRpgPoints: RpgExchangeResult }>(mutation, { itemId, current })
      .pipe(
        map((res) => res.exchangeRpgPoints),
        tap((result) => this.authService.updateStoredUser({ points: result.points }))
      );
  }
}
