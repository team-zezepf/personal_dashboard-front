import { Component, DestroyRef, OnInit, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { HeaderComponent } from '../../components/header/header.component';
import { PostComposerComponent } from '../../components/post-composer/post-composer.component';
import { PostItemComponent } from '../../components/post-item/post-item.component';
import { PostInput, TimelineFilter, TimelinePost } from '../../models/timeline.models';
import { TimelineService } from '../../services/timeline.service';
import { NotificationService } from '../../services/notification.service';
import { AuthService } from '../../services/auth.service';
import { avatarUrl } from '../../utils/avatar';
import { timelineErrorMessage } from '../../utils/timeline';

interface TimelineTab {
  filter: TimelineFilter;
  label: string;
  empty: string;
}

const TABS: TimelineTab[] = [
  { filter: 'ALL', label: 'すべて', empty: 'まだ投稿がありません。最初のつぶやきを投稿してみましょう。' },
  { filter: 'MINE', label: '自分の投稿', empty: 'まだ自分の投稿がありません。' },
  { filter: 'BOOKMARKED', label: 'ブックマーク', empty: 'ブックマークした投稿はまだありません。☆ を押すとここに保存されます。' }
];

@Component({
  selector: 'app-timeline-page',
  standalone: true,
  imports: [HeaderComponent, PostComposerComponent, PostItemComponent],
  templateUrl: './timeline.component.html',
  styleUrl: './timeline.component.css'
})
export class TimelinePageComponent implements OnInit {
  private readonly timelineService = inject(TimelineService);
  private readonly notificationService = inject(NotificationService);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  private readonly composer = viewChild.required(PostComposerComponent);

  readonly tabs = TABS;
  readonly myAvatarSrc = avatarUrl(this.authService.currentUser()?.avatarFilename);

  // タブはURL(?tab=mine)に持たせ、スレッドから戻ったときも同じタブを開く
  readonly activeTab = signal<TimelineTab>(TABS[0]);
  readonly posts = signal<TimelinePost[]>([]);
  readonly isLoading = signal(true);
  readonly isPosting = signal(false);
  readonly errorMessage = signal('');

  ngOnInit(): void {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const filter = (params.get('tab') ?? 'all').toUpperCase();
      this.activeTab.set(TABS.find((tab) => tab.filter === filter) ?? TABS[0]);
      this.load();
    });
  }

  selectTab(tab: TimelineTab): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: tab.filter === 'ALL' ? null : tab.filter.toLowerCase() }
    });
  }

  load(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.timelineService.getTimeline(this.activeTab().filter).subscribe({
      next: (posts) => {
        this.posts.set(posts);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load timeline:', err);
        this.errorMessage.set('タイムラインの取得に失敗しました。しばらくしてから再度お試しください。');
        this.isLoading.set(false);
      }
    });
  }

  create(input: PostInput): void {
    this.isPosting.set(true);
    this.timelineService.create(input).subscribe({
      next: (post) => {
        this.isPosting.set(false);
        this.composer().reset();
        // ブックマークのタブには出ないので、すべて・自分の投稿のタブのときだけ先頭に足す
        if (this.activeTab().filter !== 'BOOKMARKED') {
          this.posts.update((posts) => [post, ...posts]);
        }
      },
      error: (err) => {
        console.error('Failed to create post:', err);
        this.isPosting.set(false);
        this.notificationService.showResult(timelineErrorMessage(err, '投稿できませんでした'), 'error');
      }
    });
  }

  replace(updated: TimelinePost): void {
    this.posts.update((posts) => posts.map((post) => (post.id === updated.id ? updated : post)));
  }

  remove(removed: TimelinePost): void {
    // 投稿を消すと付いていた返信も消えるので、ブックマークのタブの返信も一緒に外す
    this.posts.update((posts) => posts.filter((post) => post.id !== removed.id && post.replyToId !== removed.id));
  }
}
