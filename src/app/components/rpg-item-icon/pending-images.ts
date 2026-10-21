import { signal } from '@angular/core';

/**
 * 選んだけれど、まだアップロードしていない画像(front#347)。
 * アイテム・装備の ID ごとに、画像のファイルとプレビュー用の URL(blob:)を持つ。
 * アップロードは保存するときに行うので、保存しなければ API には何も残らない
 */
export class PendingImages {
  private readonly files = signal<ReadonlyMap<string, { file: File; url: string }>>(new Map());

  /** 選んだ画像を持つ(前に選んでいた画像のプレビューは捨てる) */
  set(id: string, file: File): void {
    this.revoke(id);
    this.files.update((m) => new Map(m).set(id, { file, url: URL.createObjectURL(file) }));
  }

  /** 選んだ画像を捨てる(画像を外した・保存した・アイテムを消したとき) */
  remove(id: string): void {
    if (!this.files().has(id)) return;
    this.revoke(id);
    this.files.update((m) => {
      const next = new Map(m);
      next.delete(id);
      return next;
    });
  }

  /** プレビュー用の URL(選んでいなければ null) */
  url(id: string): string | null {
    return this.files().get(id)?.url ?? null;
  }

  file(id: string): File | null {
    return this.files().get(id)?.file ?? null;
  }

  /** 画面を閉じるときに、プレビューをすべて捨てる */
  clear(): void {
    for (const id of this.files().keys()) this.revoke(id);
    this.files.set(new Map());
  }

  private revoke(id: string): void {
    const url = this.files().get(id)?.url;
    if (url) URL.revokeObjectURL(url);
  }
}
