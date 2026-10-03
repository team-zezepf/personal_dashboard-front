import { Component, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { HeaderComponent } from '../../components/header/header.component';
import { DataTransferService } from '../../services/data-transfer.service';
import { NotificationService } from '../../services/notification.service';
import { ImportDataResult } from '../../models/data-transfer.models';
import { environment } from '../../../environments/environment';

// 取り込む前の確認ダイアログに出す内容
interface PendingImport {
  fileName: string;
  data: string;
  preview: ImportDataResult;
}

/**
 * PC 版と Android 版の間で、予定・タスク・成績をファイルでやり取りする画面(front#185)。
 * PC 版はアバターメニュー、Android 版は設定タブから開く。
 * - 書き出し: 予定・タスク・成績を 1 つの JSON ファイルにする(PC 版はダウンロード、Android 版は共有メニュー)
 * - 取り込み: もう一方で書き出したファイルを選び、件数を確認してから反映する。予定・タスクは置き換え、成績は追加
 */
@Component({
  selector: 'app-data-transfer-page',
  standalone: true,
  imports: [HeaderComponent],
  templateUrl: './data-transfer.component.html',
  styleUrl: './data-transfer.component.css'
})
export class DataTransferPageComponent {
  private dataTransfer = inject(DataTransferService);
  private notification = inject(NotificationService);

  // 画面の文言を、今使っている側(この端末 / PC 版)と相手側に合わせる
  readonly offline = environment.offline;
  readonly here = this.offline ? 'この端末' : 'PC 版';
  readonly other = this.offline ? 'PC 版' : 'Android 版';

  readonly lastExportedAt = this.dataTransfer.lastExportedAt;
  readonly lastImportedAt = this.dataTransfer.lastImportedAt;
  readonly isExporting = signal(false);
  readonly isImporting = signal(false);
  readonly error = signal<string | null>(null);
  readonly pending = signal<PendingImport | null>(null);

  async export(): Promise<void> {
    this.error.set(null);
    this.isExporting.set(true);
    try {
      const json = await firstValueFrom(this.dataTransfer.exportData());
      await this.dataTransfer.saveExportedFile(json);
    } catch (e) {
      this.error.set(`書き出せませんでした: ${errorMessage(e)}`);
    } finally {
      this.isExporting.set(false);
    }
  }

  // ファイルを選んだら、保存せずに件数だけを確かめて確認ダイアログを出す
  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // 同じファイルを選び直しても change が起きるようにする
    if (!file) return;
    this.error.set(null);
    this.isImporting.set(true);
    try {
      const data = await file.text();
      const preview = await firstValueFrom(this.dataTransfer.importData(data, true));
      this.pending.set({ fileName: file.name, data, preview });
    } catch (e) {
      this.error.set(`このファイルは取り込めません: ${errorMessage(e)}`);
    } finally {
      this.isImporting.set(false);
    }
  }

  cancelImport(): void {
    this.pending.set(null);
  }

  async confirmImport(): Promise<void> {
    const pending = this.pending();
    if (!pending) return;
    this.isImporting.set(true);
    try {
      const result = await firstValueFrom(this.dataTransfer.importData(pending.data, false));
      this.dataTransfer.markImported();
      this.pending.set(null);
      this.notification.showResult(
        `取り込みました(予定 ${result.schedules}件・タスク ${result.tasks}件・成績 +${result.addedExamRecords}件)`,
        'success'
      );
    } catch (e) {
      this.pending.set(null);
      this.error.set(`取り込めませんでした: ${errorMessage(e)}`);
    } finally {
      this.isImporting.set(false);
    }
  }

  sourceLabel(source: string): string {
    return source === 'android' ? 'Android 版' : 'PC 版';
  }

  // 2026-10-03T21:10:00 などを「10月3日 21:10」にする
  formatDateTime(value: string): string {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return `${d.getMonth() + 1}月${d.getDate()}日 ${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
  }
}

function errorMessage(e: unknown): string {
  // API・端末内の処理が返した理由は Error の message に入っている。通信エラーのときは英語の詳細を出さない
  const message = (e as { message?: string })?.message;
  return message && !message.startsWith('Http failure') ? message : '通信できませんでした';
}
