import { environment } from '../../environments/environment';

const QA_IMAGE_BASE_URL = `${environment.apiBaseUrl}/qa-images`;

export function qaImageUrl(filename: string): string {
  return `${QA_IMAGE_BASE_URL}/${filename}`;
}
