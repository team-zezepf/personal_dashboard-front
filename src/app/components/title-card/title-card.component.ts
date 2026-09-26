import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { catchError, of } from 'rxjs';
import { ExamAchievementsService } from '../../services/exam-achievements.service';
import { ExamRecord } from '../../models/exam-record.models';
import { ConditionProgress, titleStatus } from '../../utils/title-progress';

/**
 * 実績ページの上部に表示する称号。現在の称号と次の目標(達成率)を表示し、
 * 次の目標の条件ごとの達成状況は展開して確認する。
 */
@Component({
  selector: 'app-title-card',
  standalone: true,
  templateUrl: './title-card.component.html',
  styleUrl: './title-card.component.css'
})
export class TitleCardComponent implements OnInit {
  private readonly achievementsService = inject(ExamAchievementsService);

  readonly records = signal<ExamRecord[] | null>(null);
  readonly errorMessage = signal('');
  readonly isExpanded = signal(false);

  readonly status = computed(() => {
    const records = this.records();
    return records === null ? null : titleStatus(records);
  });

  ngOnInit(): void {
    this.achievementsService.getMockExamRecords().pipe(
      catchError((err) => {
        console.error('Failed to load mock exam records:', err);
        this.errorMessage.set('称号の判定に必要な記録の取得に失敗しました。');
        return of(null);
      })
    ).subscribe((records) => this.records.set(records));
  }

  toggle(): void {
    this.isExpanded.update((v) => !v);
  }

  round(value: number | null): string {
    return value === null ? '—' : `${Math.round(value)}%`;
  }

  // メーターの幅(%)。0〜100に収める
  meterWidth(c: ConditionProgress): number {
    return Math.min(100, Math.max(0, c.average ?? 0));
  }
}
