import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HeaderComponent } from '../../components/header/header.component';
import { Role, TOOL_ACCESS } from '../../config/tool-access';

interface ToolRow {
  name: string;
  path: string;
  roles: ReadonlySet<Role>;
}

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
  // バッジは常にこの順番で並べ、対象外のロールは薄く表示することで列を揃える
  readonly allRoles: Role[] = ['GENERAL', 'ADMIN', 'DEVELOPER'];

  readonly tools: ToolRow[] = [
    { name: 'Dashboard', path: '/', roles: TOOL_ACCESS['/'] },
    { name: 'ユーザー管理', path: '/users', roles: TOOL_ACCESS['/users'] },
    { name: 'ユーザー登録', path: '/register', roles: TOOL_ACCESS['/register'] }
  ];

  isAllowed(tool: ToolRow, role: Role): boolean {
    return tool.roles.has(role);
  }

  roleLabel(role: Role): string {
    return ROLE_LABELS[role];
  }

  roleBadgeClass(role: Role): string {
    return ROLE_BADGE_CLASSES[role];
  }
}
