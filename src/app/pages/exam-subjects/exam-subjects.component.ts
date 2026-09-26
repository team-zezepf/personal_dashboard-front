import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HeaderComponent } from '../../components/header/header.component';
import { RecentMockExamsComponent } from '../../components/recent-mock-exams/recent-mock-exams.component';
import { PointHistoryComponent } from '../../components/point-history/point-history.component';
import { EXAM_SUBJECTS } from '../../config/exam-subjects';
import { getGenreContentsForSubject } from '../../config/genre-content';

@Component({
  selector: 'app-exam-subjects-page',
  standalone: true,
  imports: [CommonModule, RouterLink, HeaderComponent, RecentMockExamsComponent, PointHistoryComponent],
  templateUrl: './exam-subjects.component.html',
  styleUrl: './exam-subjects.component.css'
})
export class ExamSubjectsPageComponent {
  readonly subjects = EXAM_SUBJECTS;

  hasGenres(examType: string): boolean {
    return getGenreContentsForSubject(examType).length > 0;
  }
}
