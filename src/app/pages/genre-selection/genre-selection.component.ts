import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HeaderComponent } from '../../components/header/header.component';
import { findExamSubject } from '../../config/exam-subjects';
import { getGenreContentsForSubject } from '../../config/genre-content';
import { GenreContent } from '../../models/genre-content.models';

interface GenreCategoryGroup {
  category: string;
  genres: GenreContent[];
}

@Component({
  selector: 'app-genre-selection-page',
  standalone: true,
  imports: [CommonModule, RouterLink, HeaderComponent],
  templateUrl: './genre-selection.component.html',
  styleUrl: './genre-selection.component.css'
})
export class GenreSelectionPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly examTypeParam = this.route.snapshot.paramMap.get('examType') ?? '';
  readonly subject = findExamSubject(this.examTypeParam);
  readonly examType = this.examTypeParam;

  constructor() {
    const genres = getGenreContentsForSubject(this.examTypeParam);
    if (!this.subject || genres.length === 0) {
      this.router.navigateByUrl('/study');
    }
  }

  // 登録順を保ったまま、カテゴリ(テクノロジ系/マネジメント系/ストラテジ系など)ごとにまとめる
  readonly categoryGroups = computed<GenreCategoryGroup[]>(() => {
    const genres = getGenreContentsForSubject(this.examTypeParam);
    const groups: GenreCategoryGroup[] = [];
    for (const genre of genres) {
      let group = groups.find((g) => g.category === genre.category);
      if (!group) {
        group = { category: genre.category, genres: [] };
        groups.push(group);
      }
      group.genres.push(genre);
    }
    return groups;
  });
}
