import { Injectable, effect, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Observable, map, tap } from 'rxjs';
import { AuthService } from './auth.service';
import { GraphQLService } from './graphql.service';
import { DEFAULT_THEME, UserTheme, deriveThemeColors, isDarkBackground, isSameTheme } from '../config/theme';

/**
 * ログイン中の利用者のデザインテーマを画面に適用する。テーマの色は CSS 変数として :root に設定し、
 * 標準(ライト)のときは設定を外して styles.css の初期値に戻す。
 * アプリの起動時(App)から読み込み、ログイン・ログアウトやテーマの保存に合わせて自動で切り替える。
 */
@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private authService = inject(AuthService);
  private graphql = inject(GraphQLService);
  private root = inject(DOCUMENT).documentElement;
  private appliedKeys: string[] = [];

  constructor() {
    effect(() => this.apply(this.authService.currentUser()?.theme ?? null));
  }

  // 保存済みのテーマ(未設定なら標準)
  savedTheme(): UserTheme {
    return this.authService.currentUser()?.theme ?? DEFAULT_THEME;
  }

  // テーマを画面に反映する(保存はしない)。テーマ設定画面で選んでいる途中のプレビューにも使う
  apply(theme: UserTheme | null): void {
    this.appliedKeys.forEach((key) => this.root.style.removeProperty(key));
    this.appliedKeys = [];
    this.root.style.removeProperty('color-scheme');
    if (!theme || isSameTheme(theme, DEFAULT_THEME)) return;
    for (const [key, value] of Object.entries(deriveThemeColors(theme))) {
      this.root.style.setProperty(key, value);
      this.appliedKeys.push(key);
    }
    // 暗い背景のテーマでは、ブラウザ標準の部品(選択肢の一覧・ファイル選択・スクロールバーなど)も暗くする
    if (isDarkBackground(theme.background)) this.root.style.setProperty('color-scheme', 'dark');
  }

  // 保存済みのテーマに戻す(テーマ設定画面で保存せずに離れたときなど)
  restoreSaved(): void {
    this.apply(this.authService.currentUser()?.theme ?? null);
  }

  save(theme: UserTheme): Observable<UserTheme> {
    const mutation = `
      mutation UpdateTheme($input: ThemeInput!) {
        updateTheme(input: $input) {
          theme { preset background text header button }
        }
      }
    `;
    const input = { preset: theme.preset, background: theme.background, text: theme.text, header: theme.header, button: theme.button };
    return this.graphql.mutation<{ updateTheme: { theme: UserTheme } }>(mutation, { input }).pipe(
      map((res) => res.updateTheme.theme),
      tap((saved) => this.authService.updateStoredUser({ theme: saved }))
    );
  }
}
