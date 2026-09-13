import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardService } from '../../services/dashboard.service';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.css']
})
export class FooterComponent {
  private dashboardService = inject(DashboardService);

  readonly saveStatus = this.dashboardService.saveStatus;
  readonly saveMessage = this.dashboardService.saveMessage;
  readonly hasChanges = this.dashboardService.hasChanges;

  onSave() {
    this.dashboardService.saveChanges();
  }
}
