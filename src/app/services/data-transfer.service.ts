import { Injectable, inject, signal } from '@angular/core';
import { Observable, map } from 'rxjs';
import { GraphQLService } from './graphql.service';
import { ImportDataResult } from '../models/data-transfer.models';
import { environment } from '../../environments/environment';

const LAST_EXPORTED_KEY = 'dataTransfer.lastExportedAt';
const LAST_IMPORTED_KEY = 'dataTransfer.lastImportedAt';

/**
 * PC 版と Android 版の間で、予定・タスク・成績をファイルでやり取りする(front#185)。
 * 書き出し・取り込みの中身は、PC 版は API(api#62)、Android 版は OfflineBackendService が同じ GraphQL の形で処理する。
 * ここではファイルの保存(PC 版はダウンロード、Android 版は共有メニュー)と、最後に書き出し・取り込みした日時を扱う。
 */
@Injectable({
  providedIn: 'root'
})
export class DataTransferService {
  private graphql = inject(GraphQLService);

  // 最後に書き出し・取り込みした日時(この端末・ブラウザで行った分だけ)
  readonly lastExportedAt = signal<string | null>(readStorage(LAST_EXPORTED_KEY));
  readonly lastImportedAt = signal<string | null>(readStorage(LAST_IMPORTED_KEY));

  exportData(): Observable<string> {
    return this.graphql.query<{ exportData: string }>('query ExportData { exportData }').pipe(map((res) => res.exportData));
  }

  // dryRun のときは保存せず、件数だけを返す(取り込む前の確認ダイアログに使う)
  importData(data: string, dryRun: boolean): Observable<ImportDataResult> {
    const mutation = `
      mutation ImportData($data: String!, $dryRun: Boolean) {
        importData(data: $data, dryRun: $dryRun) {
          source
          exportedAt
          schedules
          tasks
          addedExamRecords
          currentSchedules
          currentTasks
        }
      }
    `;
    return this.graphql.mutation<{ importData: ImportDataResult }>(mutation, { data, dryRun }).pipe(map((res) => res.importData));
  }

  // 書き出した JSON をファイルにする。PC 版はダウンロードし、Android 版は共有メニュー(ファイルに保存・ドライブ・Gmail など)を開く
  async saveExportedFile(json: string): Promise<void> {
    const fileName = `personal-dashboard-${fileTimestamp(new Date())}.json`;
    // Android アプリとして動いているときだけ共有メニューを使う(npm run start:android でブラウザで開いたときはダウンロード)
    const isNativeApp = environment.offline && (await import('@capacitor/core')).Capacitor.isNativePlatform();
    if (isNativeApp) {
      const [{ Filesystem, Directory, Encoding }, { Share }] = await Promise.all([
        import('@capacitor/filesystem'),
        import('@capacitor/share')
      ]);
      const { uri } = await Filesystem.writeFile({ path: fileName, data: json, directory: Directory.Cache, encoding: Encoding.UTF8 });
      try {
        await Share.share({ title: fileName, files: [uri] });
      } catch (e) {
        // 共有メニューを閉じただけのときは書き出し失敗にしない
        if (!String((e as Error)?.message ?? e).toLowerCase().includes('cancel')) throw e;
        return;
      }
    } else {
      const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    }
    this.lastExportedAt.set(writeStorage(LAST_EXPORTED_KEY));
  }

  markImported(): void {
    this.lastImportedAt.set(writeStorage(LAST_IMPORTED_KEY));
  }
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

// ファイル名に入れる日時(例: 20261003-2110)
function fileTimestamp(d: Date): string {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

// 今の日時を保存して返す
function writeStorage(key: string): string {
  const now = new Date().toISOString();
  try {
    localStorage.setItem(key, now);
  } catch {
    // localStorage が使えない環境では覚えておけないが、書き出し・取り込み自体には関係ないので無視する
  }
  return now;
}
