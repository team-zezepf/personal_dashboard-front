import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HeaderComponent } from '../../components/header/header.component';
import { UserService } from '../../services/user.service';
import { User, UserRole } from '../../models/dashboard.models';

const PAGE_SIZE = 10;

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
  selector: 'app-user-list-page',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent],
  templateUrl: './user-list.component.html',
  styleUrl: './user-list.component.css'
})
export class UserListPageComponent implements OnInit {
  private userService = inject(UserService);
  private router = inject(Router);

  readonly users = this.userService.users;
  readonly isLoading = this.userService.isLoading;
  readonly loadError = this.userService.loadError;

  keyword = '';
  roleFilter = '';

  private appliedKeyword = signal('');
  private appliedRole = signal('');

  readonly currentPage = signal(1);

  readonly filteredUsers = computed<User[]>(() => {
    const keyword = this.appliedKeyword().trim().toLowerCase();
    const role = this.appliedRole();

    return this.users().filter(u => {
      const matchesKeyword =
        !keyword ||
        u.name.toLowerCase().includes(keyword) ||
        u.email.toLowerCase().includes(keyword);
      const matchesRole = !role || u.role === role;
      return matchesKeyword && matchesRole;
    });
  });

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filteredUsers().length / PAGE_SIZE)));

  readonly pagedUsers = computed<User[]>(() => {
    const page = this.currentPage();
    const start = (page - 1) * PAGE_SIZE;
    return this.filteredUsers().slice(start, start + PAGE_SIZE);
  });

  readonly pageNumbers = computed<number[]>(() =>
    Array.from({ length: this.totalPages() }, (_, i) => i + 1)
  );

  // 編集モーダル
  readonly isModalOpen = signal(false);
  readonly editingUser = signal<User | null>(null);
  readonly isSaving = signal(false);
  readonly saveError = signal('');
  modalRole: UserRole = 'GENERAL';

  ngOnInit(): void {
    this.userService.loadUsers();
  }

  onSearch(): void {
    this.appliedKeyword.set(this.keyword);
    this.appliedRole.set(this.roleFilter);
    this.currentPage.set(1);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
  }

  roleLabel(role: string): string {
    return ROLE_LABELS[role] ?? role;
  }

  roleBadgeClass(role: string): string {
    return ROLE_BADGE_CLASSES[role] ?? 'role-general';
  }

  formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return '-';
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    return `${y}/${m}/${d}`;
  }

  goToRegister(): void {
    this.router.navigateByUrl('/register');
  }

  openEditModal(user: User): void {
    this.editingUser.set(user);
    this.modalRole = user.role;
    this.saveError.set('');
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.editingUser.set(null);
  }

  saveRole(): void {
    const user = this.editingUser();
    if (!user) return;

    this.isSaving.set(true);
    this.saveError.set('');

    this.userService.updateUserRole(user.id, this.modalRole).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.closeModal();
      },
      error: () => {
        this.isSaving.set(false);
        this.saveError.set('ロールの更新に失敗しました');
      }
    });
  }
}
