import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardService } from '../../services/dashboard.service';
import { Task } from '../../models/dashboard.models';

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tasks.component.html',
  styleUrls: ['./tasks.component.css']
})
export class TasksComponent {
  private dashboardService = inject(DashboardService);

  readonly isCollapsed = signal<boolean>(false);

  readonly tasks = this.dashboardService.todayTasks;
  readonly completedCount = this.dashboardService.completedTaskCount;
  readonly totalCount = this.dashboardService.totalTaskCount;
  readonly progressRate = this.dashboardService.taskProgressRate;

  constructor() {
    // 本日のタスクが全て完了したら自動的に最小化する。ページを開いた時点で
    // 既に全て完了している場合(データ読み込み直後にeffectが走る)も同様に最小化される。
    effect(() => {
      if (this.totalCount() > 0 && this.completedCount() === this.totalCount()) {
        this.isCollapsed.set(true);
      }
    });
  }

  toggleCollapse() {
    this.isCollapsed.update(v => !v);
  }

  toggleTask(task: Task) {
    this.dashboardService.toggleTask(task.id);
  }
}
