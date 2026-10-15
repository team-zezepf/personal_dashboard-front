import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, forkJoin, map, of, tap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { GraphQLService } from './graphql.service';
import { AuthService } from './auth.service';
import {
  RpgBgm,
  RpgCraft,
  RpgCraftInput,
  RpgDungeon,
  RpgDungeonInput,
  RpgEnemy,
  RpgEnemyInput,
  RpgExchangeResult,
  RpgItemCount,
  RpgMap,
  RpgMapInput,
  RpgPointShopItem,
  RpgSave,
  RpgSaveInput,
  RpgSe,
  RpgSeSlot
} from '../models/rpg.models';

// BGMの音楽ファイルの大きさの上限(APIと合わせる)
export const RPG_BGM_MAX_BYTES = 10 * 1024 * 1024;
export const RPG_BGM_ACCEPT = '.mp3,.ogg,.m4a,.wav';

// 効果音のファイルの大きさの上限(APIと合わせる。front#278)
export const RPG_SE_MAX_BYTES = 1024 * 1024;

const LOOK_FIELDS = `hair hairColor skin eyes eyeColor mouth clothes clothesColor accentColor`;

const SAVE_FIELDS = `
  level exp hp gold weapon armor
  items { itemId count }
  area x y
  stats { hp atk def mag spd luk }
  statPoints updatedAt
  look { ${LOOK_FIELDS} }
  quests { id state count }
`;

const MAP_FIELDS = `
  id name dungeonId gridX gridY width height ground heights
  objects { type x y roof torch shape rotation lowRoof wall noWindow contents { kind id count chance } }
  npcs {
    name x y hair body role notice lines look { ${LOOK_FIELDS} }
    quests {
      id title kind target targetArea count offerLines progressLines doneLines rewardGold
      rewardItems { itemId count }
    }
  }
  enemies { type x y }
  links { dx dy to }
  startX startY sortOrder updatedAt
`;

const DUNGEON_FIELDS = `id name recommendedLevel theme bgmId sortOrder updatedAt`;

const BGM_FIELDS = `id name filename size createdAt`;

const SE_FIELDS = `id name filename size createdAt`;

const CRAFT_FIELDS = `id name icon type power gold materials { itemId count } sortOrder updatedAt`;

const ENEMY_FIELDS = `
  id name shape color dark size hp atk def interval speed exp gold drop dropRate material materialRate hitMaterial glow sight respawn boss
  attack dash charge range radius sortOrder updatedAt
`;

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

  // ===== 効果音(front#278) =====

  getSes(): Observable<RpgSe[]> {
    const query = `query GetRpgSes { rpgSes { ${SE_FIELDS} } }`;
    return this.graphql.query<{ rpgSes: RpgSe[] }>(query).pipe(map((res) => res.rpgSes));
  }

  getSeSlots(): Observable<RpgSeSlot[]> {
    const query = `query GetRpgSeSlots { rpgSeSlots { slot seId } }`;
    return this.graphql.query<{ rpgSeSlots: RpgSeSlot[] }>(query).pipe(map((res) => res.rpgSeSlots));
  }

  // BGMと同じく、音のファイルはREST(multipart)でアップロードする
  uploadSe(file: File, name: string): Observable<RpgSe> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    if (name.trim()) formData.append('name', name.trim());
    return this.http.post<RpgSe>(`${environment.apiBaseUrl}/api/rpg-se`, formData).pipe(
      map((se) => ({ ...se, id: String(se.id) })),
      catchError((err: HttpErrorResponse) =>
        throwError(() => new Error(err.error?.message ?? (err.status === 413 ? '効果音は1つ 1MB までのファイルにしてください' : '効果音の登録に失敗しました')))
      )
    );
  }

  renameSe(id: string, name: string): Observable<RpgSe> {
    const mutation = `mutation RenameRpgSe($id: ID!, $name: String!) { renameRpgSe(id: $id, name: $name) { ${SE_FIELDS} } }`;
    return this.graphql.mutation<{ renameRpgSe: RpgSe }>(mutation, { id, name }).pipe(map((res) => res.renameRpgSe));
  }

  deleteSe(id: string): Observable<boolean> {
    const mutation = `mutation DeleteRpgSe($id: ID!) { deleteRpgSe(id: $id) }`;
    return this.graphql.mutation<{ deleteRpgSe: boolean }>(mutation, { id }).pipe(map((res) => res.deleteRpgSe));
  }

  /** 場面に鳴らす効果音を選ぶ(seId が null なら音なし)。選んだあとの場面の一覧を返す */
  setSeSlot(slot: string, seId: string | null): Observable<RpgSeSlot[]> {
    const mutation = `mutation SetRpgSeSlot($slot: String!, $seId: ID) { setRpgSeSlot(slot: $slot, seId: $seId) { slot seId } }`;
    return this.graphql.mutation<{ setRpgSeSlot: RpgSeSlot[] }>(mutation, { slot, seId }).pipe(map((res) => res.setRpgSeSlot));
  }

  seUrl(se: RpgSe): string {
    return `${environment.apiBaseUrl}/rpg-se/${encodeURIComponent(se.filename)}`;
  }

  /** 場面ごとの音のファイルの URL(ゲームで鳴らす)。読めなければ、どの場面も音なし */
  getSeSounds(): Observable<Map<string, string>> {
    return forkJoin({ ses: this.getSes(), slots: this.getSeSlots() }).pipe(
      map(({ ses, slots }) => {
        const urls = new Map<string, string>();
        for (const s of slots) {
          const se = ses.find((x) => String(x.id) === String(s.seId));
          if (se) urls.set(s.slot, this.seUrl(se));
        }
        return urls;
      }),
      catchError(() => of(new Map<string, string>()))
    );
  }

  // ===== 敵(front#229) =====

  getEnemies(): Observable<RpgEnemy[]> {
    const query = `query GetRpgEnemies { rpgEnemies { ${ENEMY_FIELDS} } }`;
    return this.graphql.query<{ rpgEnemies: RpgEnemy[] }>(query).pipe(map((res) => res.rpgEnemies));
  }

  // 管理者・開発者だけが保存・削除できる(api#94)
  saveEnemy(input: RpgEnemyInput): Observable<RpgEnemy> {
    const mutation = `mutation SaveRpgEnemy($input: RpgEnemyInput!) { saveRpgEnemy(input: $input) { ${ENEMY_FIELDS} } }`;
    return this.graphql.mutation<{ saveRpgEnemy: RpgEnemy }>(mutation, { input }).pipe(map((res) => res.saveRpgEnemy));
  }

  deleteEnemy(id: string): Observable<boolean> {
    const mutation = `mutation DeleteRpgEnemy($id: ID!) { deleteRpgEnemy(id: $id) }`;
    return this.graphql.mutation<{ deleteRpgEnemy: boolean }>(mutation, { id }).pipe(map((res) => res.deleteRpgEnemy));
  }

  // ===== 合成の装備とレシピ(front#288) =====

  getCrafts(): Observable<RpgCraft[]> {
    const query = `query GetRpgCrafts { rpgCrafts { ${CRAFT_FIELDS} } }`;
    return this.graphql.query<{ rpgCrafts: RpgCraft[] }>(query).pipe(map((res) => res.rpgCrafts));
  }

  // 装備ごとの、持っている人の数(管理者・開発者だけ。api#134)
  getCraftOwners(): Observable<RpgItemCount[]> {
    const query = `query GetRpgCraftOwners { rpgCraftOwners { itemId count } }`;
    return this.graphql.query<{ rpgCraftOwners: RpgItemCount[] }>(query).pipe(map((res) => res.rpgCraftOwners));
  }

  // 管理者・開発者だけが保存・削除できる(api#134)
  saveCraft(input: RpgCraftInput): Observable<RpgCraft> {
    const mutation = `mutation SaveRpgCraft($input: RpgCraftInput!) { saveRpgCraft(input: $input) { ${CRAFT_FIELDS} } }`;
    return this.graphql.mutation<{ saveRpgCraft: RpgCraft }>(mutation, { input }).pipe(map((res) => res.saveRpgCraft));
  }

  // マップ・敵で使っている装備は消せない。消すと持ち物から外し、装備していたら初期装備に戻す
  deleteCraft(id: string): Observable<boolean> {
    const mutation = `mutation DeleteRpgCraft($id: ID!) { deleteRpgCraft(id: $id) }`;
    return this.graphql.mutation<{ deleteRpgCraft: boolean }>(mutation, { id }).pipe(map((res) => res.deleteRpgCraft));
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

  // ===== ダンジョン(front#234 / api#96) =====

  getDungeons(): Observable<RpgDungeon[]> {
    const query = `query GetRpgDungeons { rpgDungeons { ${DUNGEON_FIELDS} } }`;
    return this.graphql.query<{ rpgDungeons: RpgDungeon[] }>(query).pipe(map((res) => res.rpgDungeons));
  }

  // 管理者・開発者だけが保存できる
  saveDungeon(input: RpgDungeonInput): Observable<RpgDungeon> {
    const mutation = `mutation SaveRpgDungeon($input: RpgDungeonInput!) { saveRpgDungeon(input: $input) { ${DUNGEON_FIELDS} } }`;
    return this.graphql.mutation<{ saveRpgDungeon: RpgDungeon }>(mutation, { input }).pipe(map((res) => res.saveRpgDungeon));
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
