import { Injectable, inject, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { GraphQLService } from './graphql.service';
import { Weather, WeatherLocation } from '../models/weather.models';

/**
 * ダッシュボードに表示する天気(現在の予定・天気カード・カレンダーで共有する)。
 * 地点はユーザーごとに API に保存され、未設定なら札幌。API 側で30分キャッシュしている。
 */
@Injectable({
  providedIn: 'root'
})
export class WeatherService {
  private graphql = inject(GraphQLService);

  readonly weather = signal<Weather | null>(null);
  // 天気を取得できなかったとき(前回取得した天気があればそれを表示し続ける)
  readonly loadFailed = signal(false);
  readonly locations = signal<WeatherLocation[]>([]);

  load(): void {
    const query = `
      query Weather {
        weather {
          location { id name region }
          fetchedAt
          current { time weatherCode temperature apparentTemperature windSpeed humidity }
          hourly { time weatherCode precipitationProbability }
          daily { date weatherCode temperatureMax temperatureMin precipitationProbability }
        }
      }
    `;
    this.graphql.query<{ weather: Weather }>(query).subscribe({
      next: (res) => {
        this.weather.set(res.weather);
        this.loadFailed.set(false);
      },
      error: (err) => {
        console.error('Failed to load weather', err);
        this.loadFailed.set(true);
      }
    });
  }

  loadLocations(): void {
    if (this.locations().length > 0) return;
    const query = `query WeatherLocations { weatherLocations { id name region } }`;
    this.graphql.query<{ weatherLocations: WeatherLocation[] }>(query).subscribe({
      next: (res) => this.locations.set(res.weatherLocations),
      error: (err) => console.error('Failed to load weather locations', err)
    });
  }

  // 地点を保存し、保存できたらその地点の天気を読み込み直す
  saveLocation(locationId: string): Observable<string> {
    const mutation = `
      mutation UpdateWeatherLocation($locationId: ID!) {
        updateWeatherLocation(locationId: $locationId) { weatherLocation }
      }
    `;
    return this.graphql.mutation<{ updateWeatherLocation: { weatherLocation: string } }>(mutation, { locationId }).pipe(
      map((res) => res.updateWeatherLocation.weatherLocation),
      tap(() => this.load())
    );
  }

  // 'YYYY-MM-DD' の日の天気(取得範囲外なら null)
  dailyFor(date: string) {
    return this.weather()?.daily.find((d) => d.date === date) ?? null;
  }

  // 'YYYY-MM-DDTHH:00' の時間帯の天気(取得範囲外なら null)
  hourlyFor(time: string) {
    return this.weather()?.hourly.find((h) => h.time === time) ?? null;
  }
}
