import { Component, DestroyRef, OnInit, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HeaderComponent } from '../../components/header/header.component';
import { PostComposerComponent } from '../../components/post-composer/post-composer.component';
import { PostItemComponent } from '../../components/post-item/post-item.component';
import { PostInput, TimelinePost } from '../../models/timeline.models';
import { TimelineService } from '../../services/timeline.service';
import { NotificationService } from '../../services/notification.service';
import { AuthService } from '../../services/auth.service';
import { avatarUrl } from '../../utils/avatar';
import { timelineErrorMessage } from '../../utils/timeline';

// つぶやきのスレッド(元の投稿・返信欄・返信の一覧)
@Component({
  selector: 'app-post-thread-page',
  standalone: true,
  imports: [RouterLink, HeaderComponent, PostComposerComponent, PostItemComponent],
  templateUrl: './post-thread.component.html',
  styleUrl: './post-thread.component.css'
})
export class PostThreadPageComponent implements OnInit {
  private readonly timelineService = inject(TimelineService);
  private readonly notificationService = inject(NotificationService);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  private readonly composer = viewChild(PostComposerComponent);

  readonly myAvatarSrc = avatarUrl(this.authService.currentUser()?.avatarFilename);

  readonly post = signal<TimelinePost | null>(null);
  readonly replies = signal<TimelinePost[]>([]);
  readonly isLoading = signal(true);
  readonly isReplying = signal(false);
  readonly errorMessage = signal('');

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.load(params.get('id') ?? '');
    });
  }

  private load(id: string): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.timelineService.getThread(id).subscribe({
      next: (thread) => {
        this.post.set(thread.post);
        this.replies.set(thread.replies);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load post thread:', err);
        this.post.set(null);
        this.errorMessage.set(timelineErrorMessage(err, 'スレッドの取得に失敗しました。しばらくしてから再度お試しください。'));
        this.isLoading.set(false);
      }
    });
  }

  reply(input: PostInput): void {
    const parent = this.post();
    if (!parent) return;
    this.isReplying.set(true);
    this.timelineService.create(input, parent.id).subscribe({
      next: (reply) => {
        this.isReplying.set(false);
        this.composer()?.reset();
        this.replies.update((replies) => [...replies, reply]);
        this.post.update((post) => (post ? { ...post, replyCount: post.replyCount + 1 } : post));
      },
      error: (err) => {
        console.error('Failed to reply:', err);
        this.isReplying.set(false);
        this.notificationService.showResult(timelineErrorMessage(err, '返信できませんでした'), 'error');
      }
    });
  }

  replaceReply(updated: TimelinePost): void {
    this.replies.update((replies) => replies.map((reply) => (reply.id === updated.id ? updated : reply)));
  }

  removeReply(removed: TimelinePost): void {
    this.replies.update((replies) => replies.filter((reply) => reply.id !== removed.id));
    this.post.update((post) => (post ? { ...post, replyCount: post.replyCount - 1 } : post));
  }

  // 元の投稿を消したら、返信も消えているのでタイムラインに戻る
  onParentRemoved(): void {
    this.router.navigate(['/timeline']);
  }
}
