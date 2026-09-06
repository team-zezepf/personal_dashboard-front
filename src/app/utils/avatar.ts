const AVATAR_BASE_URL = 'http://localhost:8080/avatars';
const DEFAULT_AVATAR_FILENAME = 'default.png';

export function avatarUrl(filename?: string | null): string {
  return `${AVATAR_BASE_URL}/${filename || DEFAULT_AVATAR_FILENAME}`;
}
