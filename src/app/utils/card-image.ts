import { environment } from '../../environments/environment';

const CARD_IMAGE_BASE_URL = `${environment.apiBaseUrl}/card-images`;

export function cardImageUrl(filename: string): string {
  return `${CARD_IMAGE_BASE_URL}/${filename}`;
}
