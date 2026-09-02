import { Component, inject, computed, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardService } from '../../services/dashboard.service';
import { Schedule } from '../../models/dashboard.models';

interface TimelineSlot {
  timeLabel: string;
  schedule?: Schedule;
  isActive?: boolean;
}

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

  readonly timelineSlots = computed<TimelineSlot[]>(() => {
    const baseHour = this.currentHour();
    const schedules = this.todaySchedules();

    const slots: TimelineSlot[] = [];
    const slotCount = 3; // 3時間分のスロット（例: 11:00, 12:00, 13:00）

    for (let i = 0; i < slotCount; i++) {
      const h = (baseHour + i) % 24;
      const hStr = h.toString().padStart(2, '0');
      const timeLabel = `${hStr}:00`;

      // Find schedule that falls into this hour slot (e.g. starts in this hour or overlaps)
      const matchedSchedule = schedules.find(s => {
        const startH = parseInt(s.startTime.substring(0, 2), 10);
        return startH === h;
      });

      slots.push({
        timeLabel,
        schedule: matchedSchedule,
        isActive: i === 0
      });
    }

    return slots;
  });
}
