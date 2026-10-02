import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardService } from '../../services/dashboard.service';
import { WeatherService } from '../../services/weather.service';
import { HeaderComponent } from '../../components/header/header.component';
import { ScheduleComponent } from '../../components/schedule/schedule.component';
import { CalendarComponent } from '../../components/calendar/calendar.component';
import { TasksComponent } from '../../components/tasks/tasks.component';
import { StockComponent } from '../../components/stock/stock.component';
import { TopicsComponent } from '../../components/topics/topics.component';
import { FooterComponent } from '../../components/footer/footer.component';
import { WeatherComponent } from '../../components/weather/weather.component';

// 天気を読み込み直す間隔(API 側のキャッシュと同じ30分)
const WEATHER_REFRESH_MS = 30 * 60 * 1000;

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [
    CommonModule,
    HeaderComponent,
    ScheduleComponent,
    CalendarComponent,
    TasksComponent,
    StockComponent,
    TopicsComponent,
    FooterComponent,
    WeatherComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardPageComponent implements OnInit, OnDestroy {
  private dashboardService = inject(DashboardService);
  private weatherService = inject(WeatherService);
  private weatherTimerId: ReturnType<typeof setInterval> | null = null;

  ngOnInit() {
    this.dashboardService.loadDashboardData();
    this.weatherService.load();
    this.weatherTimerId = setInterval(() => this.weatherService.load(), WEATHER_REFRESH_MS);
  }

  ngOnDestroy() {
    if (this.weatherTimerId) {
      clearInterval(this.weatherTimerId);
    }
  }
}
