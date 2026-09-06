import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HeaderComponent } from '../../components/header/header.component';

interface ToolRow {
  name: string;
  path: string;
  roles: ('GENERAL' | 'ADMIN' | 'DEVELOPER')[];
}

const ROLE_LABELS: Record<string, string> = {
  GENERAL: '一般',
  ADMIN: '管理者',
  DEVELOPER: '開発者'
};

const ROLE_BADGE_CLASSES: Record<string, string> = {
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
  readonly tools: ToolRow[] = [
    { name: 'ダッシュボード', path: '/', roles: ['GENERAL', 'ADMIN', 'DEVELOPER'] },
    { name: 'ユーザー管理', path: '/users', roles: ['ADMIN', 'DEVELOPER'] },
    { name: 'ユーザー登録', path: '/register', roles: ['ADMIN', 'DEVELOPER'] }
  ];

  roleLabel(role: string): string {
    return ROLE_LABELS[role] ?? role;
  }

  roleBadgeClass(role: string): string {
    return ROLE_BADGE_CLASSES[role] ?? 'role-general';
  }
}
