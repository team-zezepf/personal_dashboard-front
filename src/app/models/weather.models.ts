// API(query weather / weatherLocations)の型。天気コードは WMO の天気コード、時刻は日本時間

export interface WeatherLocation {
  id: string;
  name: string;
  // 地方(北海道 / 東北 / 関東 など)
  region: string;
}

export interface CurrentWeather {
  time: string;
  weatherCode: number;
  temperature: number;
  apparentTemperature: number | null;
  // m/s
  windSpeed: number | null;
  // %
  humidity: number | null;
}

export interface HourlyWeather {
  // 'YYYY-MM-DDTHH:00'
  time: string;
  weatherCode: number | null;
  precipitationProbability: number | null;
}

export interface DailyWeather {
  // 'YYYY-MM-DD'
  date: string;
  weatherCode: number | null;
  temperatureMax: number | null;
  temperatureMin: number | null;
  precipitationProbability: number | null;
}

export interface Weather {
  location: WeatherLocation;
  fetchedAt: string;
  current: CurrentWeather;
  hourly: HourlyWeather[];
  daily: DailyWeather[];
}
