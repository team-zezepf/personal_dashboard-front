import { Component, inject, signal, computed, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardService } from '../../services/dashboard.service';
import { Schedule } from '../../models/dashboard.models';

interface CalendarDay {
  dateString: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  hasEvents: boolean;
  isGreenDot: boolean;
}

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.css']
})
export class CalendarComponent {
  private dashboardService = inject(DashboardService);

  readonly schedules = this.dashboardService.schedules;
  readonly viewMode = signal<'month' | 'week'>('month');

  // Currently viewed year and month (0-indexed)
  readonly viewYear = signal<number>(new Date().getFullYear());
  readonly viewMonth = signal<number>(new Date().getMonth());

  // Selected date for details card (null means closed)
  readonly selectedDate = signal<string | null>(null);

  // Modal states
  readonly isModalOpen = signal<boolean>(false);
  readonly isEditing = signal<boolean>(false);
  readonly editingScheduleId = signal<string | number | null>(null);

  // Modal form model
  modalTitle = '';
  modalNote = '';
  modalScheduleType: 'task' | 'schedule' = 'task';
  modalDueDate = '';
  modalDueTime = '';
  modalStartDate = '';
  modalStartTime = '10:00';
  modalEndDate = '';
  modalEndTime = '11:00';
  modalRepeatEnabled = false;
  modalRepeatFrequency: 'daily' | 'weekly' | 'monthly' = 'daily';
  modalRepeatWeekday = '1';
  modalRepeatMonthlyMode: 'date' | 'weekday' = 'date';
  modalRepeatMonthlyDate = 10;
  modalRepeatMonthlyDateTime = '';
  modalRepeatMonthlyNth = '1';
  modalRepeatMonthlyWeekday = '1';
  modalRepeatMonthlyWeekdayTime = '';
  modalRepeatEndType: 'never' | 'date' | 'count' = 'never';
  modalRepeatEndDate = '';
  modalRepeatEndCount = 10;
  modalDailyTime = '';
  modalWeeklyTime = '';

  readonly currentMonthLabel = computed(() => {
    return `${this.viewYear()}年 ${this.viewMonth() + 1}月`;
  });

  readonly weekdays = ['日', '月', '火', '水', '木', '金', '土'];

  readonly calendarDays = computed<CalendarDay[]>(() => {
    const year = this.viewYear();
    const month = this.viewMonth();
    const todayStr = this.dashboardService.currentDate();
    const schedulesList = this.schedules();

    const scheduleDateSet = new Set(schedulesList.map(s => s.scheduleDate));

    if (this.viewMode() === 'week') {
      // Week view around selectedDate or today
      const refDateStr = this.selectedDate() || todayStr;
      const refDate = new Date(`${refDateStr}T00:00:00`);
      const dayOfWeek = refDate.getDay();
      const startOfWeek = new Date(refDate);
      startOfWeek.setDate(refDate.getDate() - dayOfWeek);

      const days: CalendarDay[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(startOfWeek);
        d.setDate(startOfWeek.getDate() + i);
        const y = d.getFullYear();
        const m = (d.getMonth() + 1).toString().padStart(2, '0');
        const dayNum = d.getDate().toString().padStart(2, '0');
        const dStr = `${y}-${m}-${dayNum}`;

        days.push({
          dateString: dStr,
          dayNumber: d.getDate(),
          isCurrentMonth: d.getMonth() === month,
          isToday: dStr === todayStr,
          hasEvents: scheduleDateSet.has(dStr),
          isGreenDot: dStr === '2026-08-07'
        });
      }
      return days;
    }

    // Month view
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const days: CalendarDay[] = [];

    // Preceding days from previous month
    const startDayOfWeek = firstDay.getDay();
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const prevDate = new Date(year, month - 1, prevMonthLastDay - i);
      const y = prevDate.getFullYear();
      const m = (prevDate.getMonth() + 1).toString().padStart(2, '0');
      const d = prevDate.getDate().toString().padStart(2, '0');
      const dStr = `${y}-${m}-${d}`;
      days.push({
        dateString: dStr,
        dayNumber: prevDate.getDate(),
        isCurrentMonth: false,
        isToday: dStr === todayStr,
        hasEvents: scheduleDateSet.has(dStr),
        isGreenDot: false
      });
    }

    // Current month days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const curDate = new Date(year, month, i);
      const y = curDate.getFullYear();
      const m = (curDate.getMonth() + 1).toString().padStart(2, '0');
      const d = i.toString().padStart(2, '0');
      const dStr = `${y}-${m}-${d}`;
      days.push({
        dateString: dStr,
        dayNumber: i,
        isCurrentMonth: true,
        isToday: dStr === todayStr,
        hasEvents: scheduleDateSet.has(dStr),
        isGreenDot: dStr === '2026-08-07'
      });
    }

    // Trailing days from next month to complete grid (up to 35 or 42)
    const totalSlots = days.length <= 35 ? 35 : 42;
    const remaining = totalSlots - days.length;
    for (let i = 1; i <= remaining; i++) {
      const nextDate = new Date(year, month + 1, i);
      const y = nextDate.getFullYear();
      const m = (nextDate.getMonth() + 1).toString().padStart(2, '0');
      const d = i.toString().padStart(2, '0');
      const dStr = `${y}-${m}-${d}`;
      days.push({
        dateString: dStr,
        dayNumber: i,
        isCurrentMonth: false,
        isToday: dStr === todayStr,
        hasEvents: scheduleDateSet.has(dStr),
        isGreenDot: false
      });
    }

    return days;
  });

  // Selected date events
  readonly selectedDateEvents = computed<Schedule[]>(() => {
    const selDate = this.selectedDate();
    if (!selDate) return [];
    return this.schedules()
      .filter(s => s.scheduleDate === selDate)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  });

  readonly selectedDateTitle = computed(() => {
    const selDate = this.selectedDate();
    if (!selDate) return '';
    const date = new Date(`${selDate}T00:00:00`);
    return `${date.getMonth() + 1}月${date.getDate()}日の予定`;
  });

  readonly selectedDateSubTitle = computed(() => {
    const selDate = this.selectedDate();
    if (!selDate) return '';
    const date = new Date(`${selDate}T00:00:00`);
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const isToday = selDate === this.dashboardService.currentDate();
    return `${date.getMonth() + 1}月${date.getDate()}日（${weekdays[date.getDay()]}）${isToday ? ' ・ 今日' : ''}`;
  });

  setViewMode(mode: 'month' | 'week') {
    this.viewMode.set(mode);
  }

  prevMonth() {
    if (this.viewMonth() === 0) {
      this.viewYear.set(this.viewYear() - 1);
      this.viewMonth.set(11);
    } else {
      this.viewMonth.set(this.viewMonth() - 1);
    }
  }

  nextMonth() {
    if (this.viewMonth() === 11) {
      this.viewYear.set(this.viewYear() + 1);
      this.viewMonth.set(0);
    } else {
      this.viewMonth.set(this.viewMonth() + 1);
    }
  }

  onDayClick(day: CalendarDay) {
    if (this.selectedDate() === day.dateString) {
      this.selectedDate.set(null);
    } else {
      this.selectedDate.set(day.dateString);
    }
  }

  openRegisterModal() {
    const targetDate = this.selectedDate() || this.dashboardService.currentDate();
    this.isEditing.set(false);
    this.editingScheduleId.set(null);
    this.modalTitle = '';
    this.modalNote = '';
    this.modalScheduleType = 'task';
    this.modalDueDate = targetDate;
    this.modalDueTime = '';
    this.modalStartDate = targetDate;
    this.modalStartTime = '10:00';
    this.modalEndDate = targetDate;
    this.modalEndTime = '11:00';
    this.modalRepeatEnabled = false;
    this.modalRepeatFrequency = 'daily';
    this.isModalOpen.set(true);
  }

  openEditModal(schedule: Schedule) {
    this.isEditing.set(true);
    this.editingScheduleId.set(schedule.id);
    this.modalTitle = schedule.title;
    this.modalNote = schedule.description || '';
    this.modalScheduleType = schedule.scheduleType === 'TASK' ? 'task' : 'schedule';
    this.modalDueDate = schedule.scheduleDate;
    this.modalDueTime = schedule.startTime ? schedule.startTime.substring(0, 5) : '';
    this.modalStartDate = schedule.scheduleDate;
    this.modalStartTime = schedule.startTime ? schedule.startTime.substring(0, 5) : '10:00';
    this.modalEndDate = schedule.scheduleDate;
    this.modalEndTime = schedule.endTime ? schedule.endTime.substring(0, 5) : '11:00';
    this.modalRepeatEnabled = Boolean(schedule.repeat?.enabled);
    this.isModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
  }

  saveModalSchedule() {
    const targetDate = this.selectedDate() || this.dashboardService.currentDate();
    const isTask = this.modalScheduleType === 'task';

    const scheduleData: Omit<Schedule, 'id'> = {
      userId: 1,
      taskId: isTask ? 1 : null,
      title: this.modalTitle.trim() || '新しい予定',
      description: this.modalNote.trim(),
      scheduleDate: isTask ? (this.modalDueDate || targetDate) : (this.modalStartDate || targetDate),
      startTime: isTask ? (this.modalDueTime ? `${this.modalDueTime}:00` : '09:00:00') : `${this.modalStartTime}:00`,
      endTime: isTask ? (this.modalDueTime ? `${this.modalDueTime}:00` : '10:00:00') : `${this.modalEndTime}:00`,
      scheduleType: isTask ? 'TASK' : 'SCHEDULE',
      repeat: this.modalRepeatEnabled ? {
        enabled: true,
        frequency: this.modalRepeatFrequency,
        endType: this.modalRepeatEndType,
        endDate: this.modalRepeatEndDate || null,
        endCount: this.modalRepeatEndCount || null
      } : null
    };

    if (this.isEditing() && this.editingScheduleId() !== null) {
      this.dashboardService.updateSchedule({
        ...scheduleData,
        id: this.editingScheduleId()!
      });
    } else {
      this.dashboardService.addSchedule(scheduleData);
    }

    this.closeModal();
  }

  deleteSchedule(schedule: Schedule) {
    if (window.confirm(`「${schedule.title}」を削除しますか？`)) {
      this.dashboardService.deleteSchedule(schedule.id);
    }
  }
}
