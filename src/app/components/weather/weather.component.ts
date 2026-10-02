import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WeatherService } from '../../services/weather.service';
import { NotificationService } from '../../services/notification.service';
import { DashboardService } from '../../services/dashboard.service';
import { WeatherLocation } from '../../models/weather.models';
import { weatherAppearance } from '../../config/weather-icons';

interface RegionGroup {
  region: string;
  locations: WeatherLocation[];
}

// 天気の詳細カード。右上の ⚙ から天気の地点を選ぶモーダルを開く
@Component({
  selector: 'app-weather',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './weather.component.html',
  styleUrls: ['./weather.component.css']
})
export class WeatherComponent {
  private weatherService = inject(WeatherService);
  private notificationService = inject(NotificationService);
  private dashboardService = inject(DashboardService);

  readonly defaultLocationId = 'sapporo';

  readonly weather = this.weatherService.weather;
  readonly loadFailed = this.weatherService.loadFailed;

  readonly current = computed(() => {
    const weather = this.weather();
    if (!weather) return null;
    const today = weather.daily.find((d) => d.date === this.dashboardService.currentDate()) ?? null;
    return {
      ...weather.current,
      appearance: weatherAppearance(weather.current.weatherCode),
      today,
      updatedTime: weather.fetchedAt.substring(11, 16)
    };
  });

  // 地点の設定モーダル
  readonly isModalOpen = signal(false);
  readonly draftLocationId = signal<string | null>(null);
  readonly isSaving = signal(false);

  readonly regionGroups = computed<RegionGroup[]>(() => {
    const groups: RegionGroup[] = [];
    for (const location of this.weatherService.locations()) {
      const group = groups.find((g) => g.region === location.region);
      if (group) {
        group.locations.push(location);
      } else {
        groups.push({ region: location.region, locations: [location] });
      }
    }
    return groups;
  });

  readonly draftLocationName = computed(() =>
    this.weatherService.locations().find((l) => l.id === this.draftLocationId())?.name ?? ''
  );

  openModal(): void {
    this.weatherService.loadLocations();
    this.draftLocationId.set(this.weather()?.location.id ?? this.defaultLocationId);
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    if (this.isSaving()) return;
    this.isModalOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isModalOpen()) this.closeModal();
  }

  selectLocation(id: string): void {
    this.draftLocationId.set(id);
  }

  canSave(): boolean {
    const draft = this.draftLocationId();
    return !!draft && draft !== this.weather()?.location.id && !this.isSaving();
  }

  save(): void {
    const draft = this.draftLocationId();
    if (!draft || !this.canSave()) return;
    this.isSaving.set(true);
    this.weatherService.saveLocation(draft).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.isModalOpen.set(false);
        this.notificationService.showResult('天気の地点を保存しました', 'success');
      },
      error: (err) => {
        console.error('Failed to save weather location', err);
        this.isSaving.set(false);
        this.notificationService.showResult('天気の地点の保存に失敗しました', 'error', null);
      }
    });
  }
}
