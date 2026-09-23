import { environment } from '../../environments/environment';

const AVATAR_BASE_URL = `${environment.apiBaseUrl}/avatars`;
const DEFAULT_AVATAR_FILENAME = 'default.png';

export function avatarUrl(filename?: string | null): string {
  return `${AVATAR_BASE_URL}/${filename || DEFAULT_AVATAR_FILENAME}`;
}
