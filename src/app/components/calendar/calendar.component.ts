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
  hasSchedule: boolean;
  hasTask: boolean;
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

// タスク(scheduleType: 'TASK')は「期間」ではなく「期限」を持つため、
// 時間軸グリッドの行の高さに依存しない固定高さの浮遊チップとして表示する
interface WeekTaskMarker {
  id: string | number;
  schedule: Schedule;
  column: number;
  rowStart: number;
}

// saveModalSchedule()で入力内容を確定する前に、繰り返し予定の編集範囲
// (この回だけ/すべて)を確認する必要がある場合、選択されるまで保持しておくスナップショット。
interface EditFormSnapshot {
  isTask: boolean;
  title: string;
  description: string;
  taskDate: string;
  targetDate: string;
  modalDueTime: string;
  modalStartDate: string;
  modalStartTime: string;
  modalEndTime: string;
  modalRepeatEnabled: boolean;
  modalRepeatFrequency: 'daily' | 'weekly' | 'monthly';
  modalRepeatEndType: 'never' | 'date' | 'count';
  modalRepeatEndDate: string;
  modalRepeatEndCount: number;
}

interface DragState {
  scheduleId: string | number;
  mode: 'move' | 'resize-top' | 'resize-bottom';
  startX: number;
  startY: number;
  origDayIndex: number;
  origRowStart: number;
  origRowSpan: number;
  colWidth: number;
}

interface DuplicateState {
  scheduleId: string | number;
  edge: 'left' | 'right';
  startX: number;
  origDayIndex: number;
  colWidth: number;
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
  // 編集モーダルを開いた際に実際にクリックされた回の日付(繰り返し予定の場合、masterの日付とは限らない)
  private editingOccurrenceDate: string | null = null;

  // 繰り返し予定の削除確認(「この回だけ」/「すべて」の選択待ち)
  readonly deleteConfirmTarget = signal<{ master: Schedule; occurrenceDate: string } | null>(null);

  // 繰り返し予定の編集確認(「この回だけ」/「すべて」の選択待ち)。
  // モーダルの入力内容は、範囲を選ぶまでここにスナップショットとして保持しておく。
  readonly editConfirmTarget = signal<{ master: Schedule; occurrenceDate: string; form: EditFormSnapshot } | null>(null);

  // 週表示：予定ブロックのドラッグ操作(移動・時間変更)
  private dragState: DragState | null = null;
  private dragMoved = false;
  readonly dragPreview = signal<{ id: string | number; column: number; rowStart: number; rowSpan: number } | null>(null);

  // 週表示：予定ブロックの複製操作(左右ハンドル)
  private duplicateState: DuplicateState | null = null;
  readonly duplicatePreview = signal<{ id: string | number; dayIndexes: number[]; rowStart: number; rowSpan: number } | null>(null);

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

    // 「毎日」の繰り返しはほぼ全日にoccurrenceが展開されるため、
    // ドット判定からは除外する(そうしないと毎日ドットが点灯し続けて意味をなさない)
    const dotTargetOccurrences = schedulesList.filter(s => s.repeat?.frequency !== 'daily');
    const scheduleDateSet = new Set(
      dotTargetOccurrences.filter(s => s.scheduleType !== 'TASK').map(s => s.scheduleDate)
    );
    const taskDateSet = new Set(
      dotTargetOccurrences.filter(s => s.scheduleType === 'TASK').map(s => s.scheduleDate)
    );

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
        hasSchedule: scheduleDateSet.has(dStr),
        hasTask: taskDateSet.has(dStr),
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
        hasSchedule: scheduleDateSet.has(dStr),
        hasTask: taskDateSet.has(dStr),
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
        hasSchedule: scheduleDateSet.has(dStr),
        hasTask: taskDateSet.has(dStr),
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

  // 週表示グリッドの1時間あたりの分割数(5分単位)・高さ(既存予定の描画に使う精度)
  readonly weekSubRowsPerHour = 12;
  readonly weekSubRowHeightPx = 2.5;

  // ドラッグ操作(移動・時間変更)で時刻をスナップする単位(分)。
  // 表示グリッドと同じ5分刻みだと細かすぎて意図しない時刻になりやすいため30分単位にする
  readonly dragSnapMinutes = 30;

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
        .filter(s => s.scheduleDate === day.dateString && s.scheduleType !== 'TASK')
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

  // タスクは期限(startTime)の位置にのみマーカーを立てる(所要時間の概念がないため
  // weekEventBlocksのような期間ベースの配置はせず、固定高さのチップとして描画する)
  readonly weekTaskMarkers = computed<WeekTaskMarker[]>(() => {
    const days = this.weekDays();
    const schedulesList = this.schedules();
    const subRowMinutes = 60 / this.weekSubRowsPerHour;
    const firstDisplayHour = Number(this.weekTimes[0].substring(0, 2));
    const lastDisplayHour = Number(this.weekTimes[this.weekTimes.length - 1].substring(0, 2));
    const displayStartMinutes = firstDisplayHour * 60;
    const displayEndMinutes = (lastDisplayHour + 1) * 60;

    const markers: WeekTaskMarker[] = [];

    days.forEach((day, dayIndex) => {
      schedulesList
        .filter(s => s.scheduleDate === day.dateString && s.scheduleType === 'TASK')
        .forEach(s => {
          const dueMinutesRaw = this.toMinutes(s.startTime);
          const dueMinutes = Math.floor(dueMinutesRaw / subRowMinutes) * subRowMinutes;
          if (dueMinutes < displayStartMinutes || dueMinutes >= displayEndMinutes) {
            return; // 表示範囲(8〜22時)外の期限は描画しない
          }

          const rowStartSub = (dueMinutes - displayStartMinutes) / subRowMinutes;

          markers.push({
            id: s.id,
            schedule: s,
            column: dayIndex + 2, // 1列目は時間ラベル列
            rowStart: rowStartSub + 2 // 1行目はヘッダー行
          });
        });
    });

    return markers;
  });

  private toMinutes(time: string): number {
    return Number(time.substring(0, 2)) * 60 + Number(time.substring(3, 5));
  }

  // 複製ドラッグ中に表示するゴースト(仮)ブロック
  readonly duplicateGhostBlocks = computed<WeekEventBlock[]>(() => {
    const preview = this.duplicatePreview();
    if (!preview) return [];
    const source = this.weekEventBlocks().find(b => b.id === preview.id);
    if (!source) return [];
    return preview.dayIndexes.map(dayIndex => ({
      id: `ghost-${dayIndex}`,
      schedule: source.schedule,
      column: dayIndex + 2,
      rowStart: preview.rowStart,
      rowSpan: preview.rowSpan
    }));
  });

  // ドラッグ中のブロックは live プレビュー位置を、それ以外は通常の位置を返す
  blockColumn(block: WeekEventBlock): number {
    const preview = this.dragPreview();
    return preview && preview.id === block.schedule.id ? preview.column : block.column;
  }

  blockRowStyle(block: WeekEventBlock): string {
    const preview = this.dragPreview();
    if (preview && preview.id === block.schedule.id) {
      return `${preview.rowStart} / span ${preview.rowSpan}`;
    }
    return `${block.rowStart} / span ${block.rowSpan}`;
  }

  // 繰り返し予定はドラッグ操作(移動・時間変更・複製)の対象外とする
  // (個々の回だけを動かす「例外」の概念がまだないため、シリーズ全体への意図しない影響を避ける)
  isDragLocked(schedule: Schedule): boolean {
    return Boolean(schedule.isRepeatOccurrence || schedule.repeat?.enabled);
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  private getColumnWidth(target: EventTarget | null): number {
    const gridEl = (target as HTMLElement)?.closest?.('.week-grid') as HTMLElement | null;
    const header = gridEl?.querySelector('.week-day-header') as HTMLElement | null;
    return header ? header.getBoundingClientRect().width : 80;
  }

  private minutesToTimeString(totalMinutes: number): string {
    const clamped = this.clamp(totalMinutes, 0, 23 * 60 + 59);
    const h = Math.floor(clamped / 60).toString().padStart(2, '0');
    const m = (clamped % 60).toString().padStart(2, '0');
    return `${h}:${m}:00`;
  }

  // ---- 移動・時間変更(上下ハンドル)のドラッグ ----

  onEventBodyMouseDown(event: MouseEvent, block: WeekEventBlock) {
    if (this.isDragLocked(block.schedule)) return;
    event.preventDefault();
    this.dragState = {
      scheduleId: block.schedule.id,
      mode: 'move',
      startX: event.clientX,
      startY: event.clientY,
      origDayIndex: block.column - 2,
      origRowStart: block.rowStart,
      origRowSpan: block.rowSpan,
      colWidth: this.getColumnWidth(event.currentTarget)
    };
    this.dragMoved = false;
    this.attachDragListeners();
  }

  onResizeMouseDown(event: MouseEvent, block: WeekEventBlock, edge: 'top' | 'bottom') {
    if (this.isDragLocked(block.schedule)) return;
    event.preventDefault();
    event.stopPropagation();
    this.dragState = {
      scheduleId: block.schedule.id,
      mode: edge === 'top' ? 'resize-top' : 'resize-bottom',
      startX: event.clientX,
      startY: event.clientY,
      origDayIndex: block.column - 2,
      origRowStart: block.rowStart,
      origRowSpan: block.rowSpan,
      colWidth: this.getColumnWidth(event.currentTarget)
    };
    this.dragMoved = false;
    this.attachDragListeners();
  }

  private attachDragListeners() {
    const onMove = (e: MouseEvent) => this.handleDragMouseMove(e);
    const onUp = () => {
      this.handleDragMouseUp();
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  private handleDragMouseMove(event: MouseEvent) {
    const state = this.dragState;
    if (!state) return;

    const dx = event.clientX - state.startX;
    const dy = event.clientY - state.startY;
    if (!this.dragMoved && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
      this.dragMoved = true;
    }
    if (!this.dragMoved) return;

    const subRowMinutes = 60 / this.weekSubRowsPerHour;
    const dyMinutes = (dy / this.weekSubRowHeightPx) * subRowMinutes;
    const dayDelta = Math.round(dx / state.colWidth);

    const displayStartMinutes = Number(this.weekTimes[0].substring(0, 2)) * 60;
    const displayEndMinutes = displayStartMinutes + this.weekTimes.length * 60;
    const snap = this.dragSnapMinutes;

    const origStartMinutes = displayStartMinutes + (state.origRowStart - 2) * subRowMinutes;
    const origSpanMinutes = state.origRowSpan * subRowMinutes;
    const origEndMinutes = origStartMinutes + origSpanMinutes;

    let column: number;
    let startMinutes: number;
    let spanMinutes: number;

    if (state.mode === 'move') {
      const newDayIndex = this.clamp(state.origDayIndex + dayDelta, 0, 6);
      column = newDayIndex + 2;
      spanMinutes = origSpanMinutes;
      const rawStart = origStartMinutes + dyMinutes;
      startMinutes = this.clamp(
        Math.round(rawStart / snap) * snap,
        displayStartMinutes,
        displayEndMinutes - spanMinutes
      );
    } else if (state.mode === 'resize-top') {
      column = state.origDayIndex + 2;
      const rawStart = origStartMinutes + dyMinutes;
      const maxStart = origEndMinutes - snap;
      startMinutes = this.clamp(Math.round(rawStart / snap) * snap, displayStartMinutes, maxStart);
      spanMinutes = origEndMinutes - startMinutes;
    } else {
      column = state.origDayIndex + 2;
      startMinutes = origStartMinutes;
      const rawEnd = origEndMinutes + dyMinutes;
      const minEnd = origStartMinutes + snap;
      const endMinutes = this.clamp(Math.round(rawEnd / snap) * snap, minEnd, displayEndMinutes);
      spanMinutes = endMinutes - startMinutes;
    }

    const rowStart = Math.round((startMinutes - displayStartMinutes) / subRowMinutes) + 2;
    const rowSpan = Math.round(spanMinutes / subRowMinutes);

    this.dragPreview.set({ id: state.scheduleId, column, rowStart, rowSpan });
  }

  private handleDragMouseUp() {
    const state = this.dragState;
    this.dragState = null;
    if (!state) return;

    if (!this.dragMoved) {
      // 実質的な移動がなければ単なるクリックとして扱う(編集モーダルはonWeekEventClickに任せる)
      this.dragPreview.set(null);
      return;
    }

    const preview = this.dragPreview();
    this.dragPreview.set(null);
    if (!preview) return;

    const master = this.dashboardService.schedules().find(s => s.id === state.scheduleId);
    if (!master) return;

    const dayIndex = preview.column - 2;
    const newDate = this.weekDays()[dayIndex]?.dateString;
    if (!newDate) return;

    const subRowMinutes = 60 / this.weekSubRowsPerHour;
    const displayStartMinutes = Number(this.weekTimes[0].substring(0, 2)) * 60;
    const newStartMinutes = displayStartMinutes + (preview.rowStart - 2) * subRowMinutes;
    const newEndMinutes = newStartMinutes + preview.rowSpan * subRowMinutes;

    this.dashboardService.updateSchedule({
      ...master,
      scheduleDate: newDate,
      startTime: this.minutesToTimeString(newStartMinutes),
      endTime: this.minutesToTimeString(newEndMinutes)
    });
  }

  // ---- 複製(左右ハンドル)のドラッグ ----

  onDuplicateMouseDown(event: MouseEvent, block: WeekEventBlock, edge: 'left' | 'right') {
    if (this.isDragLocked(block.schedule)) return;
    event.preventDefault();
    event.stopPropagation();
    this.duplicateState = {
      scheduleId: block.schedule.id,
      edge,
      startX: event.clientX,
      origDayIndex: block.column - 2,
      colWidth: this.getColumnWidth(event.currentTarget),
      rowStart: block.rowStart,
      rowSpan: block.rowSpan
    };

    const onMove = (e: MouseEvent) => this.handleDuplicateMouseMove(e);
    const onUp = () => {
      this.handleDuplicateMouseUp();
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  private handleDuplicateMouseMove(event: MouseEvent) {
    const state = this.duplicateState;
    if (!state) return;

    const dx = event.clientX - state.startX;
    const delta = Math.round(dx / state.colWidth);
    const reach = state.edge === 'left'
      ? this.clamp(-delta, 0, state.origDayIndex)
      : this.clamp(delta, 0, 6 - state.origDayIndex);

    if (reach === 0) {
      this.duplicatePreview.set(null);
      return;
    }

    const dayIndexes: number[] = [];
    for (let i = 1; i <= reach; i++) {
      dayIndexes.push(state.edge === 'left' ? state.origDayIndex - i : state.origDayIndex + i);
    }
    this.duplicatePreview.set({ id: state.scheduleId, dayIndexes, rowStart: state.rowStart, rowSpan: state.rowSpan });
  }

  private handleDuplicateMouseUp() {
    const state = this.duplicateState;
    this.duplicateState = null;
    const preview = this.duplicatePreview();
    this.duplicatePreview.set(null);
    if (!state || !preview || preview.dayIndexes.length === 0) return;

    const master = this.dashboardService.schedules().find(s => s.id === state.scheduleId);
    if (!master) return;

    const days = this.weekDays();
    for (const dayIndex of preview.dayIndexes) {
      const dateString = days[dayIndex]?.dateString;
      if (!dateString) continue;
      const { id, createdAt, updatedAt, _dirty, isRepeatOccurrence, repeatMasterId, ...rest } = master;
      this.dashboardService.addSchedule({
        ...rest,
        title: `${master.title}(コピー)`,
        scheduleDate: dateString
      });
    }
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
    if (this.dragMoved) {
      // ドラッグ操作の一環として発火したclickは無視する(実際の移動/リサイズはmouseupで処理済み)
      this.dragMoved = false;
      return;
    }
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
    this.editingOccurrenceDate = scheduleOrOccurrence.scheduleDate;
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

    if (this.modalRepeatEnabled) {
      const master = this.dashboardService.schedules().find(s => s.id === id);
      if (master) {
        this.deleteConfirmTarget.set({
          master,
          occurrenceDate: this.editingOccurrenceDate || master.scheduleDate
        });
        this.closeModal();
        return;
      }
    }

    if (window.confirm(`「${this.modalTitle || 'この予定'}」を削除しますか？`)) {
      const master = this.dashboardService.schedules().find(s => s.id === id);
      if (master?.taskId != null) {
        this.dashboardService.deleteTask(master.taskId);
      }
      this.dashboardService.deleteSchedule(id);
      this.closeModal();
    }
  }

  saveModalSchedule() {
    const targetDate = this.selectedDate() || this.dashboardService.currentDate();
    const isTask = this.modalScheduleType === 'task';

    const existingMaster = this.isEditing() && this.editingScheduleId() !== null
      ? this.dashboardService.schedules().find(s => s.id === this.editingScheduleId())
      : null;

    const title = this.modalTitle.trim() || '新しい予定';
    const description = this.modalNote.trim();
    const taskDate = isTask ? (this.modalDueDate || targetDate) : (this.modalStartDate || targetDate);

    const form: EditFormSnapshot = {
      isTask,
      title,
      description,
      taskDate,
      targetDate,
      modalDueTime: this.modalDueTime,
      modalStartDate: this.modalStartDate,
      modalStartTime: this.modalStartTime,
      modalEndTime: this.modalEndTime,
      modalRepeatEnabled: this.modalRepeatEnabled,
      modalRepeatFrequency: this.modalRepeatFrequency,
      modalRepeatEndType: this.modalRepeatEndType,
      modalRepeatEndDate: this.modalRepeatEndDate,
      modalRepeatEndCount: this.modalRepeatEndCount
    };

    // 既存の繰り返し予定を編集する場合は、削除と同様にどの範囲(この回だけ/すべて)へ
    // 反映するかを確認してから確定する
    if (existingMaster?.repeat?.enabled) {
      this.editConfirmTarget.set({
        master: existingMaster,
        occurrenceDate: this.editingOccurrenceDate || existingMaster.scheduleDate,
        form
      });
      this.closeModal();
      return;
    }

    this.applyScheduleEdit(this.isEditing() && this.editingScheduleId() !== null, this.editingScheduleId(), existingMaster, form);
    this.closeModal();
  }

  // 予定の追加・更新を実際に確定する。繰り返し予定の「すべて変更」時はマスターをそのまま更新し、
  // 「この回だけ変更」時はisEditingFlag=false・existingMaster=nullで呼び出して新規の単発予定として作成する。
  private applyScheduleEdit(
    isEditingFlag: boolean,
    editingId: string | number | null,
    existingMaster: Schedule | null | undefined,
    form: EditFormSnapshot
  ) {
    // 編集時、既存の除外日(個別削除された回)はモーダルのフォームで扱っていないため、
    // 上書きしないようここで引き継ぐ
    const existingExcludedDates = existingMaster?.repeat?.excludedDates || null;

    // カレンダーの「タスク」種別の予定は、「本日のタスク」ウィジェットが参照する
    // Taskレコードとtask idで紐付ける。タスク種別への新規追加/切り替え時はTaskを新規作成し、
    // 既存の紐付けタスクがあれば内容を追従、タスク種別でなくなった場合は紐付けタスクを削除する。
    let resolvedTaskId: string | number | null = existingMaster?.taskId ?? null;
    if (form.isTask) {
      if (resolvedTaskId != null) {
        this.dashboardService.updateTaskFields(resolvedTaskId, { title: form.title, description: form.description, taskDate: form.taskDate });
      } else {
        const newTask = this.dashboardService.addTask({
          userId: 1,
          title: form.title,
          description: form.description,
          taskDate: form.taskDate,
          status: 'TODO',
          completedAt: null
        });
        resolvedTaskId = newTask.id;
      }
    } else if (resolvedTaskId != null) {
      this.dashboardService.deleteTask(resolvedTaskId);
      resolvedTaskId = null;
    }

    const scheduleData: Omit<Schedule, 'id'> = {
      userId: 1,
      taskId: resolvedTaskId,
      title: form.title,
      description: form.description,
      scheduleDate: form.isTask ? form.taskDate : (form.modalStartDate || form.targetDate),
      startTime: form.isTask ? (form.modalDueTime ? `${form.modalDueTime}:00` : '09:00:00') : `${form.modalStartTime}:00`,
      endTime: form.isTask ? (form.modalDueTime ? `${form.modalDueTime}:00` : '10:00:00') : `${form.modalEndTime}:00`,
      scheduleType: form.isTask ? 'TASK' : 'SCHEDULE',
      repeat: form.modalRepeatEnabled ? {
        enabled: true,
        frequency: form.modalRepeatFrequency,
        endType: form.modalRepeatEndType,
        endDate: form.modalRepeatEndDate || null,
        endCount: form.modalRepeatEndCount || null,
        excludedDates: existingExcludedDates
      } : null
    };

    if (isEditingFlag && editingId !== null) {
      this.dashboardService.updateSchedule({
        ...scheduleData,
        id: editingId
      });
    } else {
      this.dashboardService.addSchedule(scheduleData);
    }
  }

  // 繰り返し予定の編集確認：シリーズ全体(マスター)を編集後の内容で直接更新する
  confirmEditAllOccurrences() {
    const target = this.editConfirmTarget();
    if (!target) return;
    this.applyScheduleEdit(true, target.master.id, target.master, target.form);
    this.editConfirmTarget.set(null);
  }

  // 繰り返し予定の編集確認：対象日だけを除外日に加えてマスターは維持し、
  // 編集後の内容でその日1件だけの新しい単発予定を作る
  confirmEditOccurrenceOnly() {
    const target = this.editConfirmTarget();
    if (!target) return;
    const { master, occurrenceDate, form } = target;

    const excludedDates = [...(master.repeat?.excludedDates || []), occurrenceDate];
    this.dashboardService.updateSchedule({
      ...master,
      repeat: { ...master.repeat!, excludedDates }
    });

    // 分割後の単発予定は対象の回の日付に固定する(モーダルの日付欄はマスターの日付を
    // 引き継いだままの場合があるため、編集対象の回の日付を優先する)
    this.applyScheduleEdit(false, null, null, {
      ...form,
      taskDate: occurrenceDate,
      modalStartDate: occurrenceDate,
      modalRepeatEnabled: false
    });

    this.editConfirmTarget.set(null);
  }

  cancelEditConfirm() {
    this.editConfirmTarget.set(null);
  }

  deleteSchedule(scheduleOrOccurrence: Schedule) {
    const master = this.resolveToMasterSchedule(scheduleOrOccurrence);
    if (master.repeat?.enabled) {
      this.deleteConfirmTarget.set({
        master,
        occurrenceDate: scheduleOrOccurrence.scheduleDate
      });
      return;
    }
    if (window.confirm(`「${master.title}」を削除しますか？`)) {
      if (master.taskId != null) {
        this.dashboardService.deleteTask(master.taskId);
      }
      this.dashboardService.deleteSchedule(master.id);
    }
  }

  // 繰り返し予定の削除確認：この回だけ除外日に加えて残りは維持する
  confirmDeleteOccurrenceOnly() {
    const target = this.deleteConfirmTarget();
    if (!target) return;
    const { master, occurrenceDate } = target;
    const excludedDates = [...(master.repeat?.excludedDates || []), occurrenceDate];
    this.dashboardService.updateSchedule({
      ...master,
      repeat: { ...master.repeat!, excludedDates }
    });
    this.deleteConfirmTarget.set(null);
  }

  // 繰り返し予定の削除確認：シリーズ全体(マスター)を削除する
  confirmDeleteAllOccurrences() {
    const target = this.deleteConfirmTarget();
    if (!target) return;
    if (target.master.taskId != null) {
      this.dashboardService.deleteTask(target.master.taskId);
    }
    this.dashboardService.deleteSchedule(target.master.id);
    this.deleteConfirmTarget.set(null);
  }

  cancelDeleteConfirm() {
    this.deleteConfirmTarget.set(null);
  }
}
