import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HeaderComponent } from '../../components/header/header.component';
import { EXAM_SUBJECTS } from '../../config/exam-subjects';
import { getGenreContentsForSubject } from '../../config/genre-content';
import { GenreContent } from '../../models/genre-content.models';

@Component({
  selector: 'app-exam-subjects-page',
  standalone: true,
  imports: [CommonModule, RouterLink, HeaderComponent],
  templateUrl: './exam-subjects.component.html',
  styleUrl: './exam-subjects.component.css'
})
export class ExamSubjectsPageComponent {
  readonly subjects = EXAM_SUBJECTS;

  // ジャンル別まとめの展開状態(科目のexamTypeをキーに保持)。カードの高さがジャンル数に
  // 左右されないよう、既定では折りたたんでおく。
  private readonly expandedGenres = signal<ReadonlySet<string>>(new Set());

  genresFor(examType: string): GenreContent[] {
    return getGenreContentsForSubject(examType);
  }

  isGenresExpanded(examType: string): boolean {
    return this.expandedGenres().has(examType);
  }

  toggleGenres(examType: string): void {
    const next = new Set(this.expandedGenres());
    if (next.has(examType)) {
      next.delete(examType);
    } else {
      next.add(examType);
    }
    this.expandedGenres.set(next);
  }
}
