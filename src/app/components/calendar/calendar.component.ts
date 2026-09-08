import { Component, inject, signal, computed, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardService } from '../../services/dashboard.service';
import { Schedule } from '../../models/dashboard.models';
import { TimeSelectComponent } from '../time-select/time-select.component';

interface CalendarDay {
  dateString: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  hasEvents: boolean;
  isGreenDot: boolean;
}

interface WeekDay {
  dateString: string;
  dayNumber: number;
  weekdayLabel: string;
  isToday: boolean;
}

interface WeekEventBlock {
  id: string | number;
  schedule: Schedule;
  column: number;
  rowStart: number;
  rowSpan: number;
}

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule, TimeSelectComponent],
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.css']
})
export class CalendarComponent {
  private dashboardService = inject(DashboardService);

  // 表示用(繰り返し予定を実日付に展開したもの)。編集・削除は常に元の予定(マスター)に対して行う
  readonly schedules = this.dashboardService.scheduleOccurrences;
  readonly viewMode = signal<'month' | 'week'>('month');

  // Currently viewed year and month (0-indexed)
  readonly viewYear = signal<number>(new Date().getFullYear());
  readonly viewMonth = signal<number>(new Date().getMonth());

  // Currently viewed week (Sunday, 'YYYY-MM-DD')
  readonly weekStartDate = signal<string>(this.computeWeekStart(new Date()));

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

  // 週表示：時間軸(8〜22時)
  readonly weekTimes = Array.from({ length: 15 }, (_, i) => `${(8 + i).toString().padStart(2, '0')}:00`);

  readonly weekDays = computed<WeekDay[]>(() => {
    const startStr = this.weekStartDate();
    const start = new Date(`${startStr}T00:00:00`);
    const todayStr = this.dashboardService.currentDate();

    const days: WeekDay[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const dStr = this.dateToString(d);
      days.push({
        dateString: dStr,
        dayNumber: d.getDate(),
        weekdayLabel: this.weekdays[d.getDay()],
        isToday: dStr === todayStr
      });
    }
    return days;
  });

  readonly weekRangeLabel = computed(() => {
    const days = this.weekDays();
    const first = new Date(`${days[0].dateString}T00:00:00`);
    const last = new Date(`${days[6].dateString}T00:00:00`);
    return `${first.getFullYear()}年${first.getMonth() + 1}月${first.getDate()}日〜${last.getMonth() + 1}月${last.getDate()}日`;
  });

  // 週表示グリッドの1時間あたりの分割数(5分単位)・高さ
  readonly weekSubRowsPerHour = 12;
  readonly weekSubRowHeightPx = 2.5;

  // 週表示のグリッド上に予定を1つの連結した要素として配置する
  // (grid-row/grid-columnで直接位置指定し、5分単位で始端・終端がマス目の途中になっても実際の時刻通りに描画する)
  readonly weekEventBlocks = computed<WeekEventBlock[]>(() => {
    const days = this.weekDays();
    const schedulesList = this.schedules();
    const subRowMinutes = 60 / this.weekSubRowsPerHour;
    const firstDisplayHour = Number(this.weekTimes[0].substring(0, 2));
    const lastDisplayHour = Number(this.weekTimes[this.weekTimes.length - 1].substring(0, 2));
    const displayStartMinutes = firstDisplayHour * 60;
    const displayEndMinutes = (lastDisplayHour + 1) * 60;

    const blocks: WeekEventBlock[] = [];

    days.forEach((day, dayIndex) => {
      schedulesList
        .filter(s => s.scheduleDate === day.dateString)
        .forEach(s => {
          const startMinutesRaw = this.toMinutes(s.startTime);
          const endMinutesRaw = this.toMinutes(s.endTime);

          let startMinutes = Math.floor(startMinutesRaw / subRowMinutes) * subRowMinutes;
          let endMinutes = Math.ceil(endMinutesRaw / subRowMinutes) * subRowMinutes;
          if (endMinutes <= startMinutes) {
            endMinutes = startMinutes + subRowMinutes;
          }

          const clampedStart = Math.max(startMinutes, displayStartMinutes);
          const clampedEnd = Math.min(endMinutes, displayEndMinutes);
          if (clampedStart >= clampedEnd) {
            return; // 表示範囲(8〜22時)に一切かからない予定は描画しない
          }

          const rowStartSub = (clampedStart - displayStartMinutes) / subRowMinutes;
          const rowSpanSub = (clampedEnd - clampedStart) / subRowMinutes;

          blocks.push({
            id: s.id,
            schedule: s,
            column: dayIndex + 2, // 1列目は時間ラベル列
            rowStart: rowStartSub + 2, // 1行目はヘッダー行
            rowSpan: rowSpanSub
          });
        });
    });

    return blocks;
  });

  private toMinutes(time: string): number {
    return Number(time.substring(0, 2)) * 60 + Number(time.substring(3, 5));
  }

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
    if (mode === 'week') {
      const baseDate = this.selectedDate() ? new Date(`${this.selectedDate()}T00:00:00`) : new Date();
      this.weekStartDate.set(this.computeWeekStart(baseDate));
    }
    this.viewMode.set(mode);
  }

  prevWeek() {
    const start = new Date(`${this.weekStartDate()}T00:00:00`);
    start.setDate(start.getDate() - 7);
    this.weekStartDate.set(this.dateToString(start));
  }

  nextWeek() {
    const start = new Date(`${this.weekStartDate()}T00:00:00`);
    start.setDate(start.getDate() + 7);
    this.weekStartDate.set(this.dateToString(start));
  }

  onWeekEventClick(schedule: Schedule) {
    this.selectedDate.set(schedule.scheduleDate);
    this.openEditModal(schedule);
  }

  onWeekCellClick(dateString: string, time: string) {
    this.selectedDate.set(dateString);
    this.openRegisterModal(time);
  }

  private dateToString(d: Date): string {
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private computeWeekStart(d: Date): string {
    const start = new Date(d);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - start.getDay());
    return this.dateToString(start);
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

  openRegisterModal(timeOverride?: string) {
    const targetDate = this.selectedDate() || this.dashboardService.currentDate();
    const defaultTime = timeOverride || this.getDefaultTime(targetDate);
    this.isEditing.set(false);
    this.editingScheduleId.set(null);
    this.modalTitle = '';
    this.modalNote = '';
    this.modalScheduleType = 'task';
    this.modalDueDate = targetDate;
    this.modalDueTime = defaultTime;
    this.modalStartDate = targetDate;
    this.modalStartTime = defaultTime;
    this.modalEndDate = targetDate;
    this.modalEndTime = this.addOneHour(defaultTime);
    this.modalRepeatEnabled = false;
    this.modalRepeatFrequency = 'daily';
    this.isModalOpen.set(true);
  }

  // 選択日が当日なら現在時刻(5分単位切り捨て・時刻選択の範囲内にクランプ)、当日以外は10:00
  private getDefaultTime(targetDate: string): string {
    if (targetDate !== this.dashboardService.currentDate()) {
      return '10:00';
    }
    const now = new Date();
    const hour = Math.min(Math.max(now.getHours(), 6), 23);
    const minute = Math.floor(now.getMinutes() / 5) * 5;
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  }

  private addOneHour(time: string): string {
    const [hour, minute] = time.split(':').map(Number);
    const newHour = Math.min(hour + 1, 23);
    return `${newHour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  }

  // 繰り返し予定の展開分(仮想的な1回分)がクリックされた場合、編集・削除の対象は
  // 常に元の予定(マスター)にする(展開分は保存対象として存在しないため)
  private resolveToMasterSchedule(schedule: Schedule): Schedule {
    if (schedule.isRepeatOccurrence && schedule.repeatMasterId != null) {
      const master = this.dashboardService.schedules().find(s => s.id === schedule.repeatMasterId);
      if (master) return master;
    }
    return schedule;
  }

  openEditModal(scheduleOrOccurrence: Schedule) {
    const schedule = this.resolveToMasterSchedule(scheduleOrOccurrence);
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

  deleteCurrentSchedule() {
    const id = this.editingScheduleId();
    if (id === null) return;
    const confirmMessage = this.modalRepeatEnabled
      ? `「${this.modalTitle || 'この予定'}」を削除しますか？(繰り返し予定のため、すべての回が削除されます)`
      : `「${this.modalTitle || 'この予定'}」を削除しますか？`;
    if (window.confirm(confirmMessage)) {
      this.dashboardService.deleteSchedule(id);
      this.closeModal();
    }
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

  deleteSchedule(scheduleOrOccurrence: Schedule) {
    const schedule = this.resolveToMasterSchedule(scheduleOrOccurrence);
    const confirmMessage = schedule.repeat?.enabled
      ? `「${schedule.title}」を削除しますか？(繰り返し予定のため、すべての回が削除されます)`
      : `「${schedule.title}」を削除しますか？`;
    if (window.confirm(confirmMessage)) {
      this.dashboardService.deleteSchedule(schedule.id);
    }
  }
}
