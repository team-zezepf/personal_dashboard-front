import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../components/header/header.component';
import { ExamAchievementsService } from '../../services/exam-achievements.service';
import { ExamRecord, ExamRecordMode } from '../../models/exam-record.models';
import { catchError, of } from 'rxjs';

interface AchievementCalendarDay {
  dateString: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
}

type AchievementTab = 'practice' | 'mock';

function dateToString(d: Date): string {
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

@Component({
  selector: 'app-achievements-page',
  standalone: true,
  imports: [CommonModule, HeaderComponent],
  templateUrl: './achievements.component.html',
  styleUrl: './achievements.component.css'
})
export class AchievementsPageComponent {
  private achievementsService = inject(ExamAchievementsService);

  readonly viewYear = signal(new Date().getFullYear());
  readonly viewMonth = signal(new Date().getMonth());
  readonly achievedDates = signal<ReadonlySet<string>>(new Set());
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');
  readonly tab = signal<AchievementTab>('practice');

  readonly weekdays = ['日', '月', '火', '水', '木', '金', '土'];

  readonly currentMonthLabel = computed(() => `${this.viewYear()}年 ${this.viewMonth() + 1}月`);

  // ダッシュボードのCalendarComponent(月表示)と同じグリッドの組み方を踏襲した、
  // 実績表示専用の軽量な月カレンダー(編集・予定登録は行わない閲覧専用)
  readonly calendarDays = computed<AchievementCalendarDay[]>(() => {
    const year = this.viewYear();
    const month = this.viewMonth();
    const todayStr = dateToString(new Date());

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: AchievementCalendarDay[] = [];

    const startDayOfWeek = firstDay.getDay();
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthLastDay - i);
      const dStr = dateToString(d);
      days.push({ dateString: dStr, dayNumber: d.getDate(), isCurrentMonth: false, isToday: dStr === todayStr });
    }

    for (let i = 1; i <= lastDay.getDate(); i++) {
      const d = new Date(year, month, i);
      const dStr = dateToString(d);
      days.push({ dateString: dStr, dayNumber: i, isCurrentMonth: true, isToday: dStr === todayStr });
    }

    const totalSlots = days.length <= 35 ? 35 : 42;
    const remaining = totalSlots - days.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      const dStr = dateToString(d);
      days.push({ dateString: dStr, dayNumber: i, isCurrentMonth: false, isToday: dStr === todayStr });
    }

    return days;
  });

  constructor() {
    this.loadRecordsForCurrentMonth();
  }

  isAchieved(dateString: string): boolean {
    return this.achievedDates().has(dateString);
  }

  switchTab(tab: AchievementTab): void {
    if (this.tab() === tab) return;
    this.tab.set(tab);
    this.loadRecordsForCurrentMonth();
  }

  prevMonth(): void {
    if (this.viewMonth() === 0) {
      this.viewYear.update((y) => y - 1);
      this.viewMonth.set(11);
    } else {
      this.viewMonth.update((m) => m - 1);
    }
    this.loadRecordsForCurrentMonth();
  }

  nextMonth(): void {
    if (this.viewMonth() === 11) {
      this.viewYear.update((y) => y + 1);
      this.viewMonth.set(0);
    } else {
      this.viewMonth.update((m) => m + 1);
    }
    this.loadRecordsForCurrentMonth();
  }

  private loadRecordsForCurrentMonth(): void {
    const days = this.calendarDays();
    if (days.length === 0) return;
    const startDate = days[0].dateString;
    const endDate = days[days.length - 1].dateString;

    this.isLoading.set(true);
    this.errorMessage.set('');

    const mode: ExamRecordMode = this.tab() === 'practice' ? 'PRACTICE' : 'MOCK_EXAM';
    this.achievementsService.getRecords(startDate, endDate, undefined, mode).pipe(
      catchError((err) => {
        console.error('Failed to load exam records:', err);
        this.errorMessage.set('実績の取得に失敗しました。しばらくしてから再度お試しください。');
        return of([] as ExamRecord[]);
      })
    ).subscribe((records) => {
      this.isLoading.set(false);
      this.achievedDates.set(new Set(records.map((r) => r.date)));
    });
  }
}
