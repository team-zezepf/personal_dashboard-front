import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardService } from './services/dashboard.service';
import { HeaderComponent } from './components/header/header.component';
import { ScheduleComponent } from './components/schedule/schedule.component';
import { CalendarComponent } from './components/calendar/calendar.component';
import { TasksComponent } from './components/tasks/tasks.component';
import { StockComponent } from './components/stock/stock.component';
import { TopicsComponent } from './components/topics/topics.component';
import { FooterComponent } from './components/footer/footer.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    HeaderComponent,
    ScheduleComponent,
    CalendarComponent,
    TasksComponent,
    StockComponent,
    TopicsComponent,
    FooterComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  private dashboardService = inject(DashboardService);

  ngOnInit() {
    this.dashboardService.loadDashboardData();
  }
}
