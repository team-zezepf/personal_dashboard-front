import { Component, ElementRef, HostListener, Input, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { DashboardService } from '../../services/dashboard.service';
import { AuthService } from '../../services/auth.service';
import { avatarUrl } from '../../utils/avatar';
import { TOOL_ACCESS, isElevatedOnly, isRoleAllowed } from '../../config/tool-access';

interface TitleMenuItem {
  label: string;
  path: string;
  exact?: boolean;
  elevatedOnly: boolean;
}

const TITLE_MENU_ITEMS: TitleMenuItem[] = [
  { label: 'Dashboard', path: '/', exact: true, elevatedOnly: isElevatedOnly(TOOL_ACCESS['/']) },
  { label: 'ユーザー管理', path: '/users', elevatedOnly: isElevatedOnly(TOOL_ACCESS['/users']) },
  { label: 'ツール一覧', path: '/tools', elevatedOnly: isElevatedOnly(TOOL_ACCESS['/tools']) }
];

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent {
  @Input() pageTitle = '';

  private dashboardService = inject(DashboardService);
  private authService = inject(AuthService);
  private elementRef = inject(ElementRef<HTMLElement>);

  readonly currentUser = this.authService.currentUser;
  readonly isTitleMenuOpen = signal(false);
  readonly isAvatarMenuOpen = signal(false);

  readonly formattedDate = computed(() => {
    const dateStr = this.dashboardService.currentDate();
    const date = new Date(`${dateStr}T00:00:00`);
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日（${weekdays[date.getDay()]}）`;
  });

  readonly avatarSrc = computed(() => avatarUrl(this.currentUser()?.avatarFilename));

  // ログイン中ユーザーのロールでアクセスできない項目はメニューから除外する
  readonly visibleTitleMenuItems = computed(() => {
    const role = this.currentUser()?.role;
    return TITLE_MENU_ITEMS.filter(item => isRoleAllowed(role, TOOL_ACCESS[item.path]));
  });

  toggleTitleMenu(): void {
    this.isTitleMenuOpen.update(v => !v);
    this.isAvatarMenuOpen.set(false);
  }

  closeTitleMenu(): void {
    this.isTitleMenuOpen.set(false);
  }

  toggleAvatarMenu(): void {
    this.isAvatarMenuOpen.update(v => !v);
    this.isTitleMenuOpen.set(false);
  }

  closeAvatarMenu(): void {
    this.isAvatarMenuOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.isTitleMenuOpen() && !this.isAvatarMenuOpen()) return;
    if (!this.elementRef.nativeElement.contains(event.target as Node)) {
      this.closeTitleMenu();
      this.closeAvatarMenu();
    }
  }

  onLogout(): void {
    this.closeAvatarMenu();
    this.authService.logout();
  }
}
