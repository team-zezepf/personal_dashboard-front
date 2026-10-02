import { WeatherKind, weatherAppearance, weatherKind } from './weather-icons';

describe('weatherKind', () => {
  it('WMO の天気コードを天気の種類にまとめる', () => {
    const cases: [number, WeatherKind][] = [
      [0, 'clear'],
      [1, 'sunny'],
      [2, 'partly-cloudy'],
      [3, 'cloudy'],
      [45, 'fog'],
      [51, 'drizzle'],
      [63, 'rain'],
      [75, 'snow'],
      [81, 'showers'],
      [86, 'snow-showers'],
      [95, 'thunder']
    ];
    for (const [code, kind] of cases) {
      expect(weatherKind(code)).toBe(kind);
    }
  });

  it('値がない・知らないコードは unknown', () => {
    expect(weatherKind(null)).toBe('unknown');
    expect(weatherKind(undefined)).toBe('unknown');
    expect(weatherKind(42)).toBe('unknown');
  });
});

describe('weatherAppearance', () => {
  it('雨や雪の天気だけ isWet になる(タイムラインで降水確率を添える)', () => {
    expect(weatherAppearance(61).isWet).toBe(true);
    expect(weatherAppearance(71).isWet).toBe(true);
    expect(weatherAppearance(3).isWet).toBe(false);
  });

  it('アイコンは種類ごとのファイル(public/weather-icons/<種類>.svg)', () => {
    expect(weatherAppearance(2).iconUrl).toBe('weather-icons/partly-cloudy.svg');
    expect(weatherAppearance(null).iconUrl).toBe('weather-icons/unknown.svg');
  });
});
