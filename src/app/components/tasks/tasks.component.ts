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
    // 本日のタスクが全て完了したら自動的に最小化する(0件の場合も含む)。
    // ページを開いた時点で既に全て完了/0件の場合も、データ読み込み直後に
    // effectが走ることで同様に最小化される。
    // isDataLoaded()を条件に含めるのは、読み込み前の初期状態(tasks=[]によりtotalCount=0)を
    // 「本当に0件」と誤判定して一瞬最小化してしまうのを防ぐため。
    effect(() => {
      if (this.dashboardService.isDataLoaded() && this.completedCount() === this.totalCount()) {
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
