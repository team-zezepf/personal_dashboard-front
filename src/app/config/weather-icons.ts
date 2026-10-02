/**
 * 天気コード(WMO)を天気の種類にまとめ、種類ごとのアイコンと天気名を決める。
 * アイコンは public/weather-icons/<種類>.svg。同じ名前のファイルを置き換えれば、自作のアイコンに差し替えられる。
 */
export type WeatherKind =
  | 'clear'
  | 'sunny'
  | 'partly-cloudy'
  | 'cloudy'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'showers'
  | 'snow'
  | 'snow-showers'
  | 'thunder'
  | 'unknown';

export interface WeatherAppearance {
  kind: WeatherKind;
  label: string;
  iconUrl: string;
  // 雨や雪が降る天気か(タイムラインで降水確率を添えるかどうかに使う)
  isWet: boolean;
}

const LABELS: Record<WeatherKind, string> = {
  clear: '快晴',
  sunny: '晴れ',
  'partly-cloudy': '晴れ時々曇り',
  cloudy: '曇り',
  fog: '霧',
  drizzle: '霧雨',
  rain: '雨',
  showers: 'にわか雨',
  snow: '雪',
  'snow-showers': 'にわか雪',
  thunder: '雷雨',
  unknown: '不明'
};

const WET_KINDS: ReadonlySet<WeatherKind> = new Set<WeatherKind>(['drizzle', 'rain', 'showers', 'snow', 'snow-showers', 'thunder']);

export function weatherKind(code: number | null | undefined): WeatherKind {
  if (code == null) return 'unknown';
  if (code === 0) return 'clear';
  if (code === 1) return 'sunny';
  if (code === 2) return 'partly-cloudy';
  if (code === 3) return 'cloudy';
  if (code === 45 || code === 48) return 'fog';
  if (code >= 51 && code <= 57) return 'drizzle';
  if (code >= 61 && code <= 67) return 'rain';
  if (code >= 71 && code <= 77) return 'snow';
  if (code >= 80 && code <= 82) return 'showers';
  if (code === 85 || code === 86) return 'snow-showers';
  if (code >= 95 && code <= 99) return 'thunder';
  return 'unknown';
}

export function weatherAppearance(code: number | null | undefined): WeatherAppearance {
  const kind = weatherKind(code);
  return {
    kind,
    label: LABELS[kind],
    iconUrl: `weather-icons/${kind}.svg`,
    isWet: WET_KINDS.has(kind)
  };
}
