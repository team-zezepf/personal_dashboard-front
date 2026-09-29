// デザインテーマ。利用者は背景色・文字色・ヘッダー色・ボタン色の4色を選び、
// パネルの色や罫線などの残りの色は、この4色から計算する(deriveThemeColors)。

export type ThemePresetKey = 'light' | 'dark' | 'sakura' | 'mori' | 'custom';

export interface UserTheme {
  preset: ThemePresetKey;
  background: string;
  text: string;
  header: string;
  button: string;
}

export interface ThemePreset extends UserTheme {
  name: string;
}

// ライトは styles.css の :root の初期値と同じ色にしておくこと
export const THEME_PRESETS: ThemePreset[] = [
  { preset: 'light', name: 'ライト（標準）', background: '#f5f7fa', text: '#1f2937', header: '#6076e0', button: '#13a9df' },
  { preset: 'dark', name: 'ダーク', background: '#111827', text: '#e5e7eb', header: '#1f2a44', button: '#38bdf8' },
  { preset: 'sakura', name: 'さくら', background: '#fdf4f6', text: '#3b2a30', header: '#d9708a', button: '#e0567a' },
  { preset: 'mori', name: 'もり', background: '#f1f5ee', text: '#1f2d1f', header: '#3f6e4a', button: '#4c8a3a' },
];

export const DEFAULT_THEME: UserTheme = THEME_PRESETS[0];

export const THEME_COLOR_FIELDS: { key: keyof Omit<UserTheme, 'preset'>; label: string; where: string }[] = [
  { key: 'background', label: '背景色', where: '画面全体の背景' },
  { key: 'text', label: '文字色', where: '本文・見出し' },
  { key: 'header', label: 'ヘッダー色', where: '画面上部のヘッダー' },
  { key: 'button', label: 'ボタン色', where: 'ボタン・リンク・選択中のタブ' },
];

// 文字色と背景色のコントラスト比がこれより低いと、読みにくいと警告する(WCAG AA の基準)
export const MIN_TEXT_CONTRAST = 4.5;

const hexToRgb = (hex: string): number[] => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const rgbToHex = (rgb: number[]): string => '#' + rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

// a と b を t(0〜1)の割合で混ぜた色
export function mixColors(a: string, b: string, t: number): string {
  const [ra, rb] = [hexToRgb(a), hexToRgb(b)];
  return rgbToHex(ra.map((v, i) => v + (rb[i] - v) * t));
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// 背景の上に置く文字の色(白と濃い色のうち、読みやすい方)
function textColorOn(background: string): string {
  return contrastRatio(background, '#ffffff') >= contrastRatio(background, '#1f2937') ? '#ffffff' : '#1f2937';
}

/**
 * テーマの4色から、画面で使うCSS変数の値を計算する。styles.css の :root の変数と対応している。
 * (--surface や --primary-soft などの中間の色は、styles.css 側で color-mix により自動で決まる)
 */
// 暗い背景か(パネルの色の決め方や、ブラウザ標準の部品を暗くするかの判断に使う)
export function isDarkBackground(background: string): boolean {
  return relativeLuminance(background) < 0.2;
}

export function deriveThemeColors(theme: UserTheme): Record<string, string> {
  const dark = isDarkBackground(theme.background);
  const card = dark ? mixColors(theme.background, '#ffffff', 0.07) : mixColors(theme.background, '#ffffff', 0.85);
  return {
    '--bg': theme.background,
    '--text': theme.text,
    '--header': theme.header,
    '--primary': theme.button,
    '--card': card,
    '--line': mixColors(card, theme.text, dark ? 0.18 : 0.1),
    '--muted': mixColors(theme.text, theme.background, 0.42),
    '--primary-dark': mixColors(theme.button, dark ? '#ffffff' : '#000000', 0.15),
    '--on-primary': textColorOn(theme.button),
    '--header-text': textColorOn(theme.header),
  };
}

export function isSameTheme(a: UserTheme | null | undefined, b: UserTheme | null | undefined): boolean {
  const x = a ?? DEFAULT_THEME, y = b ?? DEFAULT_THEME;
  return x.preset === y.preset && THEME_COLOR_FIELDS.every(({ key }) => x[key].toLowerCase() === y[key].toLowerCase());
}
