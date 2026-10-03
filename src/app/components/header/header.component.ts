import { Component, ElementRef, HostListener, Input, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { DashboardService } from '../../services/dashboard.service';
import { AuthService } from '../../services/auth.service';
import { AccountService } from '../../services/account.service';
import { avatarUrl } from '../../utils/avatar';
import { TOOL_ACCESS, isElevatedOnly, isRoleAllowed } from '../../config/tool-access';
import { TOOLS, findToolByPath } from '../../config/tools';
import { ToastComponent } from '../toast/toast.component';
import { environment } from '../../../environments/environment';

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
  imports: [CommonModule, RouterLink, RouterLinkActive, ToastComponent],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent {
  @Input() pageTitle = '';

  private dashboardService = inject(DashboardService);
  private authService = inject(AuthService);
  private accountService = inject(AccountService);
  private elementRef = inject(ElementRef<HTMLElement>);

  // Android版(オフライン)は画面名と日付だけを出し、メニューは開かない(画面の切り替えは画面下のタブ)
  readonly offline = environment.offline;
  readonly currentUser = this.authService.currentUser;
  readonly isTitleMenuOpen = signal(false);
  readonly isAvatarMenuOpen = signal(false);

  // トグル処理中のツール(連打による二重リクエストを防ぐため、★を個別に無効化する)
  private readonly pendingFavoritePaths = signal<ReadonlySet<string>>(new Set());

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

  // お気に入り登録済みのツールのうち、今のロールでアクセスできるものだけをツール一覧の並び順で表示する
  readonly favoriteMenuItems = computed(() => {
    const role = this.currentUser()?.role;
    const favoritePaths = new Set(this.currentUser()?.favoriteTools ?? []);
    return TOOLS.filter(tool => favoritePaths.has(tool.path) && isRoleAllowed(role, tool.roles));
  });

  toggleTitleMenu(): void {
    if (this.offline) return;
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

  isFavoritePending(path: string): boolean {
    return this.pendingFavoritePaths().has(path);
  }

  // 行本体(★以外)のクリックでは画面遷移させたいので、★クリック時はイベントの伝播を止める
  toggleFavorite(path: string, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.isFavoritePending(path)) return;

    const tool = findToolByPath(path);
    if (!tool) return;

    this.pendingFavoritePaths.update(paths => new Set(paths).add(path));
    this.accountService.toggleFavoriteTool(tool.name, path).subscribe({
      complete: () => {
        this.pendingFavoritePaths.update(paths => {
          const next = new Set(paths);
          next.delete(path);
          return next;
        });
      }
    });
  }
}
