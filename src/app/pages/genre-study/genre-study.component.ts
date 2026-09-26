import { Component, ElementRef, OnDestroy, afterNextRender, computed, effect, inject, signal, untracked, Injector } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { HeaderComponent } from '../../components/header/header.component';
import { findExamSubject } from '../../config/exam-subjects';
import { adjacentGenres, findGenreContent, groupGenresByCategory } from '../../config/genre-content';
import { GenreContentBlock } from '../../models/genre-content.models';

@Component({
  selector: 'app-genre-study-page',
  standalone: true,
  imports: [CommonModule, RouterLink, HeaderComponent],
  templateUrl: './genre-study.component.html',
  styleUrl: './genre-study.component.css'
})
export class GenreStudyPageComponent implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly injector = inject(Injector);

  // サイドバーでジャンルを切り替えると同じコンポーネントが使い回されるため、
  // snapshot ではなく paramMap の変化に追従する
  private readonly params = toSignal(this.route.paramMap, { requireSync: true });
  private readonly examType = computed(() => this.params().get('examType') ?? '');
  private readonly genreKey = computed(() => this.params().get('genreKey') ?? '');

  readonly subject = computed(() => findExamSubject(this.examType()));
  readonly content = computed(() => findGenreContent(this.examType(), this.genreKey()));
  readonly categoryGroups = computed(() => groupGenresByCategory(this.examType()));
  readonly adjacent = computed(() => adjacentGenres(this.examType(), this.genreKey()));

  readonly activeTopicIndex = signal(0);

  private observer: IntersectionObserver | null = null;

  constructor() {
    effect(() => {
      const subject = this.subject();
      const content = this.content();
      if (!subject || !content) {
        untracked(() => this.router.navigateByUrl('/study'));
        return;
      }
      // ジャンルが切り替わったら、表示が更新された後に見出しの追跡をやり直し、ページとサイドバーの位置を合わせる
      untracked(() => {
        this.activeTopicIndex.set(0);
        afterNextRender(() => this.onGenreRendered(), { injector: this.injector });
      });
    });

    // スマホ幅の見出しボタンは横スクロールなので、本文のスクロールで現在の見出しが変わったら、そのボタンが見える位置に合わせる
    effect(() => {
      this.activeTopicIndex();
      untracked(() => afterNextRender(() => this.scrollActiveChipIntoView(), { injector: this.injector }));
    });
  }

  private scrollActiveChipIntoView(): void {
    const host = this.elementRef.nativeElement as HTMLElement;
    const chips = host.querySelector<HTMLElement>('.sp-chips');
    const active = host.querySelector<HTMLElement>('.sp-chips a.active');
    if (!chips || !active || chips.offsetParent === null) return;
    chips.scrollTo({ left: Math.max(0, active.offsetLeft - chips.offsetLeft - 12), behavior: 'smooth' });
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  private onGenreRendered(): void {
    const host = this.elementRef.nativeElement as HTMLElement;
    window.scrollTo({ top: 0 });
    this.observeTopics(host);

    // サイドバーの中だけをスクロールして、開いているジャンルが見える位置に合わせる(ページ全体はスクロールさせない)
    const sidebar = host.querySelector<HTMLElement>('.sidebar-card');
    const openGenre = host.querySelector<HTMLElement>('.sb-genre.open');
    if (sidebar && openGenre) {
      sidebar.scrollTop = Math.max(0, openGenre.offsetTop - sidebar.offsetTop - 48);
    }
  }

  private observeTopics(host: HTMLElement): void {
    this.observer?.disconnect();
    const sections = Array.from(host.querySelectorAll('section.topic')) as HTMLElement[];
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

  // スマホ幅のプルダウンでジャンルを選んだとき
  selectGenre(genreKey: string): void {
    const subject = this.subject();
    if (subject && genreKey !== this.genreKey()) {
      this.router.navigate([subject.path, 'genre', genreKey]);
    }
  }
}
