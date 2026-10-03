import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HeaderComponent } from '../../components/header/header.component';
import { RecentMockExamsComponent } from '../../components/recent-mock-exams/recent-mock-exams.component';
import { PointHistoryComponent } from '../../components/point-history/point-history.component';
import { EXAM_SUBJECTS } from '../../config/exam-subjects';
import { firstGenreOf } from '../../config/genre-content';
import { ExamAchievementsService } from '../../services/exam-achievements.service';
import { reviewTargets } from '../../utils/mistake-review';
import { catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-exam-subjects-page',
  standalone: true,
  imports: [CommonModule, RouterLink, HeaderComponent, RecentMockExamsComponent, PointHistoryComponent],
  templateUrl: './exam-subjects.component.html',
  styleUrl: './exam-subjects.component.css'
})
export class ExamSubjectsPageComponent implements OnInit {
  private readonly achievementsService = inject(ExamAchievementsService);

  readonly subjects = EXAM_SUBJECTS;
  // Android版(オフライン)はポイントがないので、ポイントの履歴を出さない。ツール一覧もないので、実績ページへのリンクを出す
  readonly offline = environment.offline;

  // 科目ごとの模擬試験の合格回数。1回以上合格した科目のカードに「合格」スタンプを表示する
  private readonly passCounts = signal<ReadonlyMap<string, number>>(new Map());
  // 科目ごとの、模擬試験で間違えた問題の復習の対象数。1問以上ある科目のカードに復習ボタンを表示する
  private readonly reviewCounts = signal<ReadonlyMap<string, number>>(new Map());

  ngOnInit(): void {
    this.achievementsService.getMockExamRecords().pipe(
      // スタンプ・復習ボタンは補助的な表示なので、取得に失敗してもそれらなしで科目一覧は使えるようにする
      catchError((err) => {
        console.error('Failed to load mock exam records:', err);
        return of([]);
      })
    ).subscribe((records) => {
      const counts = new Map<string, number>();
      for (const r of records) {
        if (r.passed) counts.set(r.examType, (counts.get(r.examType) ?? 0) + 1);
      }
      this.passCounts.set(counts);
      this.reviewCounts.set(new Map(this.subjects.map((s) => [s.key, reviewTargets(records, s.key).length])));
    });
  }

  passCount(examType: string): number {
    return this.passCounts().get(examType) ?? 0;
  }

  reviewCount(examType: string): number {
    return this.reviewCounts().get(examType) ?? 0;
  }

  // 「学習する」はジャンル選択を挟まず、先頭のジャンルのまとめページを開く
  firstGenreKey(examType: string): string | undefined {
    return firstGenreOf(examType)?.genreKey;
  }
}
