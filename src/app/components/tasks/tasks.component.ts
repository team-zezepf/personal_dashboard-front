import { Component, inject, signal } from '@angular/core';
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

  toggleCollapse() {
    this.isCollapsed.update(v => !v);
  }

  toggleTask(task: Task) {
    this.dashboardService.toggleTask(task.id);
  }
}
