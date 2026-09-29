import { Role, TOOL_ACCESS } from './tool-access';

export interface ToolRow {
  name: string;
  path: string;
  roles: ReadonlySet<Role>;
}

/**
 * ツール一覧・ヘッダーのお気に入りメニューなど、画面名を表示する箇所で共通して使う
 * ツールのマスタ一覧。片方だけ更新して表示名がずれることのないよう、ここを唯一の情報源とする。
 */
export const TOOLS: ToolRow[] = [
  { name: 'Dashboard', path: '/', roles: TOOL_ACCESS['/'] },
  { name: 'ユーザー管理', path: '/users', roles: TOOL_ACCESS['/users'] },
  { name: 'ユーザー登録', path: '/register', roles: TOOL_ACCESS['/register'] },
  { name: '資格学習', path: '/study', roles: TOOL_ACCESS['/study'] },
  { name: '実績', path: '/achievements', roles: TOOL_ACCESS['/achievements'] },
  { name: '開発Q&A', path: '/developer-qa', roles: TOOL_ACCESS['/developer-qa'] },
  { name: 'カードコレクション', path: '/cards', roles: TOOL_ACCESS['/cards'] },
  { name: 'カード登録', path: '/cards/admin', roles: TOOL_ACCESS['/cards/admin'] },
  { name: 'テーマ設定', path: '/settings/theme', roles: TOOL_ACCESS['/settings/theme'] }
];

export function findToolByPath(path: string): ToolRow | undefined {
  return TOOLS.find((tool) => tool.path === path);
}
