import { Component, inject, computed, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardService } from '../../services/dashboard.service';
import { Schedule } from '../../models/dashboard.models';

interface TimelineHour {
  hour: number;
  rowIndex: number;
  timeLabel: string;
  hasEvent: boolean;
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

@Component({
  selector: 'app-schedule',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './schedule.component.html',
  styleUrls: ['./schedule.component.css']
})
export class ScheduleComponent implements OnInit, OnDestroy {
  private dashboardService = inject(DashboardService);
  private timerId: any = null;

  readonly currentHour = signal<number>(new Date().getHours());
  readonly todaySchedules = this.dashboardService.todaySchedules;

  readonly subRowHeightPx = 6;

  ngOnInit() {
    this.timerId = setInterval(() => {
      const h = new Date().getHours();
      if (this.currentHour() !== h) {
        this.currentHour.set(h);
      }
    }, 30000);
  }

  ngOnDestroy() {
    if (this.timerId) {
      clearInterval(this.timerId);
    }
  }

  private get displayStartMinutes(): number {
    return this.currentHour() * 60;
  }

  private get displayEndMinutes(): number {
    return (this.currentHour() + HOUR_COUNT) * 60;
  }

  readonly timelineHours = computed<TimelineHour[]>(() => {
    const baseHour = this.currentHour();
    const schedules = this.todaySchedules();

    const hours: TimelineHour[] = [];
    for (let i = 0; i < HOUR_COUNT; i++) {
      const hour = (baseHour + i) % 24;
      const hourStartMinutes = (baseHour + i) * 60;
      const hourEndMinutes = hourStartMinutes + 60;

      const hasEvent = schedules.some(s => {
        const startMinutes = this.toMinutes(s.startTime);
        const endMinutes = this.toMinutes(s.endTime);
        return startMinutes < hourEndMinutes && endMinutes > hourStartMinutes;
      });

      hours.push({
        hour,
        rowIndex: i,
        timeLabel: `${hour.toString().padStart(2, '0')}:00`,
        hasEvent
      });
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

  private toMinutes(time: string): number {
    return Number(time.substring(0, 2)) * 60 + Number(time.substring(3, 5));
  }
}
