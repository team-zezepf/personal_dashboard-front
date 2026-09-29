import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HeaderComponent } from '../../components/header/header.component';
import { InterviewPrepService } from '../../services/interview-prep.service';
import { InterviewPrep } from '../../models/interview-prep.models';
import { POSITION_KEY, TEMPLATE_ITEM_COUNT, allTemplateItems, answerMap, filledCount } from '../../config/interview-prep-template';

interface PrepRow {
  prep: InterviewPrep;
  filled: number;
  position: string | null;
  updated: string;
}

@Component({
  selector: 'app-interview-prep-list-page',
  standalone: true,
  imports: [FormsModule, RouterLink, HeaderComponent],
  templateUrl: './interview-prep-list.component.html',
  styleUrl: './interview-prep-list.component.css'
})
export class InterviewPrepListPageComponent implements OnInit {
  private readonly interviewPrepService = inject(InterviewPrepService);
  private readonly router = inject(Router);

  readonly total = TEMPLATE_ITEM_COUNT;

  readonly isLoading = signal(true);
  readonly isCreating = signal(false);
  readonly errorMessage = signal('');
  readonly newCompanyName = signal('');
  private readonly preps = signal<InterviewPrep[]>([]);

  readonly rows = computed<PrepRow[]>(() => {
    const items = allTemplateItems();
    return this.preps().map((prep) => {
      const answers = answerMap(prep.answers);
      return {
        prep,
        filled: filledCount(answers, items),
        position: answers.get(POSITION_KEY)?.trim() || null,
        updated: formatDate(prep.updatedAt)
      };
    });
  });

  ngOnInit(): void {
    this.interviewPrepService.getAll().subscribe({
      next: (preps) => {
        this.preps.set(preps);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load interview preps:', err);
        this.errorMessage.set('面接準備シートの取得に失敗しました。しばらくしてから再度お試しください。');
        this.isLoading.set(false);
      }
    });
  }

  create(): void {
    const name = this.newCompanyName().trim();
    if (!name || this.isCreating()) return;
    this.isCreating.set(true);
    this.errorMessage.set('');
    this.interviewPrepService.create(name).subscribe({
      next: (prep) => this.router.navigate(['/interview-prep', prep.id]),
      error: (err) => {
        console.error('Failed to create interview prep:', err);
        this.errorMessage.set('シートを作れませんでした。しばらくしてから再度お試しください。');
        this.isCreating.set(false);
      }
    });
  }

  progressPercent(row: PrepRow): number {
    return this.total === 0 ? 0 : Math.round((row.filled / this.total) * 100);
  }
}

// "2026-09-29T21:04:55" → "9/29"
function formatDate(iso: string): string {
  const [, m, d] = iso.split('T')[0].split('-');
  return `${Number(m)}/${Number(d)}`;
}
