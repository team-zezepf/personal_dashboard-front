import { AfterViewInit, Component, ElementRef, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { HeaderComponent } from '../../components/header/header.component';
import { findExamSubject } from '../../config/exam-subjects';
import { findGenreContent } from '../../config/genre-content';
import { GenreContentBlock } from '../../models/genre-content.models';

@Component({
  selector: 'app-genre-study-page',
  standalone: true,
  imports: [CommonModule, RouterLink, HeaderComponent],
  templateUrl: './genre-study.component.html',
  styleUrl: './genre-study.component.css'
})
export class GenreStudyPageComponent implements AfterViewInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly elementRef = inject(ElementRef<HTMLElement>);

  private readonly examTypeParam = this.route.snapshot.paramMap.get('examType') ?? '';
  private readonly genreKeyParam = this.route.snapshot.paramMap.get('genreKey') ?? '';

  readonly subject = findExamSubject(this.examTypeParam);
  readonly content = findGenreContent(this.examTypeParam, this.genreKeyParam);

  readonly activeTopicIndex = signal(0);

  private observer: IntersectionObserver | null = null;

  constructor() {
    if (!this.subject || !this.content) {
      this.router.navigateByUrl('/study');
    }
  }

  ngAfterViewInit(): void {
    if (!this.content) return;

    const sections = Array.from(this.elementRef.nativeElement.querySelectorAll('section.topic')) as HTMLElement[];
    if (sections.length === 0) return;

    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const index = Number((entry.target as HTMLElement).dataset['topicIndex']);
            this.activeTopicIndex.set(index);
          }
        }
      },
      { rootMargin: '-15% 0px -70% 0px', threshold: 0 }
    );

    sections.forEach((section) => this.observer!.observe(section));
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  trustedHtml(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  blockType(block: GenreContentBlock): string {
    return block.type;
  }

  // <base href="/">があるSPAでは href="#topic-N" だけのアンカーはルート相対("/#topic-N")に
  // 解決されて別ページへ飛んでしまうため、href任せにせずスクロールで移動する。
  scrollToTopic(index: number, event: Event): void {
    event.preventDefault();
    const target = this.elementRef.nativeElement.querySelector(`#topic-${index}`);
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
