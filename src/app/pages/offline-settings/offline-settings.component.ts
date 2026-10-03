import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { HeaderComponent } from '../../components/header/header.component';
import { OfflineBackendService } from '../../services/offline-backend.service';

// scripts/prepare-android-data.mjs が APK に同梱する問題データの情報
interface BundledDataMeta {
  questionsUpdatedAt: string;
  questionCount: number;
}

/**
 * Android版(オフライン)の「設定」タブ(front#184)。データの保存先と件数、テーマ設定へのリンク、
 * アプリと同梱した問題データの版を表示する。問題データの版は、APK を入れ直したときに新しくなったかの確認に使う。
 */
@Component({
  selector: 'app-offline-settings-page',
  standalone: true,
  imports: [RouterLink, HeaderComponent],
  templateUrl: './offline-settings.component.html',
  styleUrl: './offline-settings.component.css'
})
export class OfflineSettingsPageComponent implements OnInit {
  private http = inject(HttpClient);
  private offlineBackend = inject(OfflineBackendService);

  readonly counts = this.offlineBackend.counts();
  readonly appVersion = signal<string | null>(null);
  readonly dataMeta = signal<BundledDataMeta | null>(null);

  ngOnInit(): void {
    this.http.get<BundledDataMeta>('offline-data/meta.json').subscribe({
      next: (meta) => this.dataMeta.set(meta),
      error: () => this.dataMeta.set(null)
    });
    // アプリのバージョンは Android の端末上でだけ取れる(ブラウザで開いたときは表示しない)
    import('@capacitor/app')
      .then(({ App }) => App.getInfo())
      .then((info) => this.appVersion.set(info.version))
      .catch(() => this.appVersion.set(null));
  }

  formatDate(iso: string): string {
    const d = new Date(iso);
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  }
}
