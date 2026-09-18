import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HeaderComponent } from '../../components/header/header.component';
import { Role } from '../../config/tool-access';
import { ToolRow, TOOLS } from '../../config/tools';
import { AuthService } from '../../services/auth.service';
import { AccountService } from '../../services/account.service';

const ROLE_LABELS: Record<Role, string> = {
  GENERAL: '一般',
  ADMIN: '管理者',
  DEVELOPER: '開発者'
};

const ROLE_BADGE_CLASSES: Record<Role, string> = {
  GENERAL: 'role-general',
  ADMIN: 'role-admin',
  DEVELOPER: 'role-developer'
};

@Component({
  selector: 'app-tool-list-page',
  standalone: true,
  imports: [CommonModule, RouterLink, HeaderComponent],
  templateUrl: './tool-list.component.html',
  styleUrl: './tool-list.component.css'
})
export class ToolListPageComponent {
  private authService = inject(AuthService);
  private accountService = inject(AccountService);

  // バッジは常にこの順番で並べ、対象外のロールは薄く表示することで列を揃える
  readonly allRoles: Role[] = ['GENERAL', 'ADMIN', 'DEVELOPER'];

  readonly tools: ToolRow[] = TOOLS;

  // トグル処理中のツール(連打による二重リクエストを防ぐため、ボタンを個別に無効化する)
  private readonly pendingPaths = signal<ReadonlySet<string>>(new Set());

  isAllowed(tool: ToolRow, role: Role): boolean {
    return tool.roles.has(role);
  }

  roleLabel(role: Role): string {
    return ROLE_LABELS[role];
  }

  roleBadgeClass(role: Role): string {
    return ROLE_BADGE_CLASSES[role];
  }

  isFavorite(tool: ToolRow): boolean {
    return this.authService.currentUser()?.favoriteTools?.includes(tool.path) ?? false;
  }

  isPending(tool: ToolRow): boolean {
    return this.pendingPaths().has(tool.path);
  }

  toggleFavorite(tool: ToolRow): void {
    if (this.isPending(tool)) return;

    this.pendingPaths.update((paths) => new Set(paths).add(tool.path));
    this.accountService.toggleFavoriteTool(tool.name, tool.path).subscribe({
      complete: () => {
        this.pendingPaths.update((paths) => {
          const next = new Set(paths);
          next.delete(tool.path);
          return next;
        });
      }
    });
  }
}
