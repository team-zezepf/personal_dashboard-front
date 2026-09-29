import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { HeaderComponent } from '../../components/header/header.component';
import { ThemeService } from '../../services/theme.service';
import { NotificationService } from '../../services/notification.service';
import {
  MIN_TEXT_CONTRAST,
  THEME_COLOR_FIELDS,
  THEME_PRESETS,
  ThemePreset,
  UserTheme,
  contrastRatio,
  deriveThemeColors,
  isSameTheme
} from '../../config/theme';

type ColorKey = (typeof THEME_COLOR_FIELDS)[number]['key'];

// テーマ設定。選んだテーマ・色は保存する前から画面全体に反映し(プレビュー)、
// 保存せずにこの画面を離れたときは保存済みのテーマに戻す
@Component({
  selector: 'app-theme-settings-page',
  standalone: true,
  imports: [HeaderComponent],
  templateUrl: './theme-settings.component.html',
  styleUrl: './theme-settings.component.css'
})
export class ThemeSettingsPageComponent {
  private themeService = inject(ThemeService);
  private notificationService = inject(NotificationService);

  readonly fields = THEME_COLOR_FIELDS;
  readonly minContrast = MIN_TEXT_CONTRAST;
  // プリセットの小さなプレビューに使う色
  readonly presets = THEME_PRESETS.map((p) => ({ ...p, colors: deriveThemeColors(p) }));

  readonly selected = signal<UserTheme>({ ...this.themeService.savedTheme() });
  readonly isSaving = signal(false);

  readonly contrast = computed(() => contrastRatio(this.selected().text, this.selected().background));
  readonly isLowContrast = computed(() => this.contrast() < MIN_TEXT_CONTRAST);
  readonly isChanged = computed(() => !isSameTheme(this.selected(), this.themeService.savedTheme()));

  constructor() {
    inject(DestroyRef).onDestroy(() => this.themeService.restoreSaved());
  }

  selectPreset(preset: ThemePreset): void {
    const { name, ...theme } = preset;
    this.update(theme);
  }

  // 「カスタム」を押したときは、今の色のままカスタムにする(色は下のパレットで変える)
  selectCustom(): void {
    this.update({ ...this.selected(), preset: 'custom' });
  }

  onColorInput(key: ColorKey, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.update({ ...this.selected(), preset: 'custom', [key]: value });
  }

  reset(): void {
    this.update({ ...this.themeService.savedTheme() });
  }

  save(): void {
    if (this.isSaving()) return;
    this.isSaving.set(true);
    this.themeService.save(this.selected()).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.notificationService.showResult('テーマを保存しました', 'success');
      },
      error: (err) => {
        console.error('Failed to save theme:', err);
        this.isSaving.set(false);
        this.notificationService.showResult('テーマの保存に失敗しました', 'error', null);
      }
    });
  }

  private update(theme: UserTheme): void {
    this.selected.set(theme);
    this.themeService.apply(theme);
  }
}
