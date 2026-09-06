import { Component, ElementRef, HostListener, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { DashboardService } from '../../services/dashboard.service';
import { AuthService } from '../../services/auth.service';
import { avatarUrl } from '../../utils/avatar';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent {
  private dashboardService = inject(DashboardService);
  private authService = inject(AuthService);
  private elementRef = inject(ElementRef<HTMLElement>);

  readonly currentUser = this.authService.currentUser;
  readonly isAvatarMenuOpen = signal(false);

  readonly formattedDate = computed(() => {
    const dateStr = this.dashboardService.currentDate();
    const date = new Date(`${dateStr}T00:00:00`);
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日（${weekdays[date.getDay()]}）`;
  });

  readonly avatarSrc = computed(() => avatarUrl(this.currentUser()?.avatarFilename));

  toggleAvatarMenu(): void {
    this.isAvatarMenuOpen.update(v => !v);
  }

  closeAvatarMenu(): void {
    this.isAvatarMenuOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.isAvatarMenuOpen()) return;
    if (!this.elementRef.nativeElement.contains(event.target as Node)) {
      this.closeAvatarMenu();
    }
  }

  onLogout(): void {
    this.closeAvatarMenu();
    this.authService.logout();
  }
}
