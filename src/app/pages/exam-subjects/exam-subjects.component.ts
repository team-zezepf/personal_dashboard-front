import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HeaderComponent } from '../../components/header/header.component';
import { RecentMockExamsComponent } from '../../components/recent-mock-exams/recent-mock-exams.component';
import { PointHistoryComponent } from '../../components/point-history/point-history.component';
import { EXAM_SUBJECTS } from '../../config/exam-subjects';
import { firstGenreOf } from '../../config/genre-content';
import { ExamAchievementsService } from '../../services/exam-achievements.service';
import { catchError, of } from 'rxjs';

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

  // 科目ごとの模擬試験の合格回数。1回以上合格した科目のカードに「合格」スタンプを表示する
  private readonly passCounts = signal<ReadonlyMap<string, number>>(new Map());

  ngOnInit(): void {
    this.achievementsService.getMockExamRecords().pipe(
      // スタンプは補助的な表示なので、取得に失敗してもスタンプなしで科目一覧は使えるようにする
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
    });
  }

  passCount(examType: string): number {
    return this.passCounts().get(examType) ?? 0;
  }

  // 「学習する」はジャンル選択を挟まず、先頭のジャンルのまとめページを開く
  firstGenreKey(examType: string): string | undefined {
    return firstGenreOf(examType)?.genreKey;
  }
}
