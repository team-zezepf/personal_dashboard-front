import { Component, inject, computed, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardService } from '../../services/dashboard.service';
import { Schedule } from '../../models/dashboard.models';
import { WeatherService } from '../../services/weather.service';
import { WeatherAppearance, weatherAppearance } from '../../config/weather-icons';

interface TimelineHour {
  hour: number;
  rowStart: number;
  rowSpan: number;
  timeLabel: string;
  hasEvent: boolean;
  // 1〜3時間後の正時に出す天気(取得できていなければ null)
  weather: TimelineWeather | null;
}

interface TimelineWeather {
  appearance: WeatherAppearance;
  // 雨や雪のときだけ出す降水確率
  precipitationProbability: number | null;
}

interface TimelineEventBlock {
  id: string | number;
  schedule: Schedule;
  rowStart: number;
  rowSpan: number;
  isActive: boolean;
}

const SUBROWS_PER_HOUR = 12; // 5分刻み
const SUBROW_MINUTES = 60 / SUBROWS_PER_HOUR;
const HOUR_COUNT = 3; // 3時間分のスロット（例: 11:00, 12:00, 13:00）
const WEATHER_HOURS_AHEAD = 3; // 先頭(今の時間帯)の次から、この数の正時に天気を出す

@Component({
  selector: 'app-schedule',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './schedule.component.html',
  styleUrls: ['./schedule.component.css']
})
export class ScheduleComponent implements OnInit, OnDestroy {
  private dashboardService = inject(DashboardService);
  private weatherService = inject(WeatherService);
  private timerId: any = null;

  // 現在時刻をSUBROW_MINUTES(5分)単位で切り捨てた「分」(0〜1435)。
  // タイムラインの表示開始位置をこの値に合わせることで、実際の残り時間がそのまま高さに反映される
  readonly currentSlotStart = signal<number>(this.computeCurrentSlotStart());
  readonly todaySchedules = this.dashboardService.todaySchedules;

  readonly subRowHeightPx = 6;
  readonly totalSubRows = HOUR_COUNT * SUBROWS_PER_HOUR;

  ngOnInit() {
    this.timerId = setInterval(() => {
      const s = this.computeCurrentSlotStart();
      if (this.currentSlotStart() !== s) {
        this.currentSlotStart.set(s);
      }
    }, 30000);
  }

  ngOnDestroy() {
    if (this.timerId) {
      clearInterval(this.timerId);
    }
  }

  private computeCurrentSlotStart(): number {
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    return Math.floor(nowMinutes / SUBROW_MINUTES) * SUBROW_MINUTES;
  }

  private get displayStartMinutes(): number {
    return this.currentSlotStart();
  }

  private get displayEndMinutes(): number {
    return this.currentSlotStart() + HOUR_COUNT * 60;
  }

  // 表示範囲を「時」の境界(xx:00)で区切り、先頭と末尾は実際の残り分数に応じた
  // 部分時間(part-hour)としてラベル・行数を割り当てる
  readonly timelineHours = computed<TimelineHour[]>(() => {
    const displayStart = this.displayStartMinutes;
    const displayEnd = this.displayEndMinutes;
    const schedules = this.todaySchedules();
    const weather = this.weatherService.weather();

    const hours: TimelineHour[] = [];
    let cursor = displayStart;
    let rowCursor = 1;

    while (cursor < displayEnd) {
      const hour = Math.floor(cursor / 60) % 24;
      const nextHourBoundary = (Math.floor(cursor / 60) + 1) * 60;
      const segmentEnd = Math.min(nextHourBoundary, displayEnd);
      const rowSpan = (segmentEnd - cursor) / SUBROW_MINUTES;

      const hasEvent = schedules.some(s => {
        const startMinutes = this.toMinutes(s.startTime);
        // 所要時間0分の予定はtimelineEventBlocks()側と同様に最低5分として扱う
        // (揃えないと、この判定だけfalseになり空き枠と予定ブロックが二重に描画される)
        let endMinutes = this.toMinutes(s.endTime);
        if (endMinutes <= startMinutes) {
          endMinutes = startMinutes + SUBROW_MINUTES;
        }
        return startMinutes < segmentEnd && endMinutes > cursor;
      });

      hours.push({
        hour,
        rowStart: rowCursor,
        rowSpan,
        timeLabel: `${hour.toString().padStart(2, '0')}:00`,
        hasEvent,
        weather: weather && hours.length >= 1 && hours.length <= WEATHER_HOURS_AHEAD ? this.weatherAt(cursor) : null
      });

      rowCursor += rowSpan;
      cursor = segmentEnd;
    }
    return hours;
  });

  // 予定の開始・終了を5分単位に丸め、表示範囲(現在時刻から3時間)にクランプして
  // 実際の分に応じた位置・高さで描画できるようにする(マス目の途中で始端/終端になってもよい)
  readonly timelineEventBlocks = computed<TimelineEventBlock[]>(() => {
    const schedules = this.todaySchedules();
    const displayStart = this.displayStartMinutes;
    const displayEnd = this.displayEndMinutes;
    const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();

    const blocks: TimelineEventBlock[] = [];

    schedules.forEach(s => {
      const startMinutesRaw = this.toMinutes(s.startTime);
      const endMinutesRaw = this.toMinutes(s.endTime);

      let startMinutes = Math.floor(startMinutesRaw / SUBROW_MINUTES) * SUBROW_MINUTES;
      let endMinutes = Math.ceil(endMinutesRaw / SUBROW_MINUTES) * SUBROW_MINUTES;
      if (endMinutes <= startMinutes) {
        endMinutes = startMinutes + SUBROW_MINUTES;
      }

      const clampedStart = Math.max(startMinutes, displayStart);
      const clampedEnd = Math.min(endMinutes, displayEnd);
      if (clampedStart >= clampedEnd) {
        return; // 表示範囲に一切かからない予定は描画しない
      }

      const rowStartSub = (clampedStart - displayStart) / SUBROW_MINUTES;
      const rowSpanSub = (clampedEnd - clampedStart) / SUBROW_MINUTES;

      blocks.push({
        id: s.id,
        schedule: s,
        rowStart: rowStartSub + 1,
        rowSpan: rowSpanSub,
        isActive: startMinutesRaw <= nowMinutes && endMinutesRaw > nowMinutes
      });
    });

    return blocks;
  });

  // 今日の0時からの分(24時以降は翌日)の時間帯の天気
  private weatherAt(minutesFromToday: number): TimelineWeather | null {
    const d = new Date(`${this.dashboardService.currentDate()}T00:00:00`);
    d.setMinutes(Math.floor(minutesFromToday / 60) * 60);
    const pad = (n: number) => n.toString().padStart(2, '0');
    const time = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:00`;
    const hourly = this.weatherService.hourlyFor(time);
    if (!hourly || hourly.weatherCode == null) return null;
    const appearance = weatherAppearance(hourly.weatherCode);
    return {
      appearance,
      precipitationProbability: appearance.isWet ? hourly.precipitationProbability : null
    };
  }

  private toMinutes(time: string): number {
    return Number(time.substring(0, 2)) * 60 + Number(time.substring(3, 5));
  }
}
