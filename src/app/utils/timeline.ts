import { environment } from '../../environments/environment';

const POST_IMAGE_BASE_URL = `${environment.apiBaseUrl}/post-images`;

export const MAX_POST_LENGTH = 200;
export const MAX_POST_IMAGES = 4;
export const MAX_POST_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

export function postImageUrl(filename: string): string {
  return `${POST_IMAGE_BASE_URL}/${filename}`;
}

// 絵文字なども1文字と数える(APIの文字数チェックと揃える)
export function postLength(body: string): number {
  return [...body.trim()].length;
}

// API(LinkUrls)と同じ規則。日本語の文が続いても切れるよう、URLに使える ASCII 文字だけを拾う
const URL_PATTERN = /https?:\/\/[A-Za-z0-9\-._~:/?#[\]@!$&'()*+,;=%]+/g;

function trimTrailing(url: string): string {
  let u = url;
  while (u.length > 0) {
    const last = u[u.length - 1];
    const opens = u.split('(').length - 1;
    const closes = u.split(')').length - 1;
    if (`.,!?;:'"`.includes(last) || (last === ')' && opens < closes)) {
      u = u.slice(0, -1);
    } else {
      break;
    }
  }
  return u;
}

export interface BodySegment {
  text: string;
  url?: string;
}

// 本文をテキストとURLに分ける(innerHTMLを使わずにリンクを表示するため)
export function splitBody(body: string): BodySegment[] {
  const segments: BodySegment[] = [];
  let last = 0;
  for (const match of body.matchAll(URL_PATTERN)) {
    const url = trimTrailing(match[0]);
    if (url.length <= 'https://'.length) continue;
    const start = match.index ?? 0;
    if (start > last) segments.push({ text: body.slice(last, start) });
    segments.push({ text: url, url });
    last = start + url.length;
  }
  if (last < body.length) segments.push({ text: body.slice(last) });
  return segments;
}

export function firstUrl(body: string): string | null {
  return splitBody(body).find((s) => s.url)?.url ?? null;
}

// APIが理由を返したエラー(「ほかの人の投稿は編集できません」など)はそのまま、それ以外は fallback を出す
export function timelineErrorMessage(err: unknown, fallback: string): string {
  const message = err instanceof Error ? err.message : '';
  return message && !message.includes('INTERNAL_ERROR') && /[ぁ-んァ-ヶ一-龠]/.test(message) ? message : fallback;
}

/**
 * 投稿時刻の表示。1分未満「たった今」、1時間未満「N分前」、24時間未満「N時間前」、
 * 前日「昨日 22:15」、それより前は「9/28 22:15」(年が違えば「2025/9/28」)。
 */
export function formatPostTime(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  const diffMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);
  const hm = `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;

  if (diffMinutes < 1) return 'たった今';
  if (diffMinutes < 60) return `${diffMinutes}分前`;
  if (diffMinutes < 24 * 60 && date.getDate() === now.getDate()) return `${Math.floor(diffMinutes / 60)}時間前`;

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return `昨日 ${hm}`;
  if (date.getFullYear() === now.getFullYear()) return `${date.getMonth() + 1}/${date.getDate()} ${hm}`;
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
}
