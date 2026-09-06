import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardService } from '../../services/dashboard.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent {
  private dashboardService = inject(DashboardService);
  private authService = inject(AuthService);

  readonly formattedDate = computed(() => {
    const dateStr = this.dashboardService.currentDate();
    const date = new Date(`${dateStr}T00:00:00`);
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日（${weekdays[date.getDay()]}）`;
  });

  onLogout(): void {
    this.authService.logout();
  }
}
