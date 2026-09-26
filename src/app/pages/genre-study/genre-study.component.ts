import { Component, ElementRef, OnDestroy, afterNextRender, computed, effect, inject, signal, untracked, Injector } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { catchError, map, of, switchMap } from 'rxjs';
import { HeaderComponent } from '../../components/header/header.component';
import { findExamSubject } from '../../config/exam-subjects';
import { GenreEntry, adjacentGenres, findGenre, genreDocPath, groupGenresByCategory } from '../../config/genre-content';

// docs/ のHTMLから取り出した、アプリで表示する本文
interface GenreDoc {
  genreKey: string;
  description: string;
  topicTitles: string[];
  // section.topic をそのまま並べたHTML
  html: SafeHtml;
}

type DocState = { status: 'loading' } | { status: 'error' } | { status: 'loaded'; doc: GenreDoc };

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
  private readonly http = inject(HttpClient);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly injector = inject(Injector);

  // サイドバーでジャンルを切り替えると同じコンポーネントが使い回されるため、
  // snapshot ではなく paramMap の変化に追従する
  private readonly params = toSignal(this.route.paramMap, { requireSync: true });
  private readonly examType = computed(() => this.params().get('examType') ?? '');
  private readonly genreKey = computed(() => this.params().get('genreKey') ?? '');

  readonly subject = computed(() => findExamSubject(this.examType()));
  readonly genre = computed(() => findGenre(this.examType(), this.genreKey()));
  readonly categoryGroups = computed(() => groupGenresByCategory(this.examType()));
  readonly adjacent = computed(() => adjacentGenres(this.examType(), this.genreKey()));

  // 本文は docs/<examType>/<genreKey>.html から読み込む。ジャンルを素早く切り替えたときは前の読み込みを取り消す
  readonly docState = toSignal(
    toObservable(this.genre).pipe(
      switchMap((genre) => (genre ? this.loadDoc(genre) : of<DocState>({ status: 'error' })))
    ),
    { initialValue: { status: 'loading' } as DocState }
  );
  readonly doc = computed(() => {
    const state = this.docState();
    return state.status === 'loaded' ? state.doc : null;
  });

  readonly activeTopicIndex = signal(0);

  private observer: IntersectionObserver | null = null;

  constructor() {
    effect(() => {
      if (!this.subject() || !this.genre()) {
        untracked(() => this.router.navigateByUrl('/study'));
      }
    });

    // 本文を表示し終えたら、見出しの追跡をやり直し、ページとサイドバーの位置を合わせる
    effect(() => {
      if (!this.doc()) return;
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

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  private loadDoc(genre: GenreEntry) {
    return this.http.get(genreDocPath(genre), { responseType: 'text' }).pipe(
      map((html): DocState => ({ status: 'loaded', doc: this.parseDoc(genre, html) })),
      catchError((err) => {
        console.error('Failed to load genre document:', err);
        return of<DocState>({ status: 'error' });
      })
    );
  }

  // docs/ のHTMLは単体でも読めるようにヘッダーや前後のリンクを含むため、article の中の見出しと本文だけを使う
  private parseDoc(genre: GenreEntry, html: string): GenreDoc {
    const article = new DOMParser().parseFromString(html, 'text/html').querySelector('article.genre-article');
    if (!article) throw new Error(`article.genre-article が見つからない: ${genreDocPath(genre)}`);
    const sections = Array.from(article.querySelectorAll<HTMLElement>('section.topic'));
    const topicTitles = sections.map((section, i) => {
      section.dataset['topicIndex'] = String(i);
      const heading = section.querySelector('h2')?.cloneNode(true) as HTMLElement | undefined;
      heading?.querySelector('.topic-no')?.remove();
      return heading?.textContent?.trim() ?? '';
    });
    return {
      genreKey: genre.genreKey,
      description: article.querySelector('.genre-description')?.textContent?.trim() ?? '',
      topicTitles,
      // 自前の docs/ のHTML(図のSVGを含む)であり、利用者の入力ではないため、サニタイズをバイパスする
      html: this.sanitizer.bypassSecurityTrustHtml(sections.map((s) => s.outerHTML).join('\n'))
    };
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

  private scrollActiveChipIntoView(): void {
    const host = this.elementRef.nativeElement as HTMLElement;
    const chips = host.querySelector<HTMLElement>('.sp-chips');
    const active = host.querySelector<HTMLElement>('.sp-chips a.active');
    if (!chips || !active || chips.offsetParent === null) return;
    chips.scrollTo({ left: Math.max(0, active.offsetLeft - chips.offsetLeft - 12), behavior: 'smooth' });
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
