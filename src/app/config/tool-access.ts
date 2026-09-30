export type Role = 'GENERAL' | 'ADMIN' | 'DEVELOPER';

export const ALL_ROLES: ReadonlySet<Role> = new Set(['GENERAL', 'ADMIN', 'DEVELOPER']);
export const ELEVATED_ROLES: ReadonlySet<Role> = new Set(['ADMIN', 'DEVELOPER']);

/**
 * 各画面(パス)にアクセスできるロールの一覧。
 * ヘッダーの画面切り替えメニューとツール一覧画面の両方から参照し、
 * どちらか片方だけ定義がずれることを防ぐ。
 */
export const TOOL_ACCESS: Record<string, ReadonlySet<Role>> = {
  '/': ALL_ROLES,
  '/users': ELEVATED_ROLES,
  '/register': ALL_ROLES,
  '/tools': ALL_ROLES,
  '/study': ALL_ROLES,
  '/achievements': ALL_ROLES,
  '/developer-qa': ELEVATED_ROLES,
  '/cards': ALL_ROLES,
  '/cards/admin': ELEVATED_ROLES,
  '/interview-prep': ALL_ROLES,
  '/settings/theme': ALL_ROLES
};

export function isRoleAllowed(role: string | null | undefined, allowed: ReadonlySet<Role>): boolean {
  return allowed.has((role ?? 'GENERAL') as Role);
}

export function isElevatedOnly(allowed: ReadonlySet<Role>): boolean {
  return !allowed.has('GENERAL');
}
