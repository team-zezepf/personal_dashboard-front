import { Component, computed, inject, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { LinkCardComponent } from '../link-card/link-card.component';
import { PostComposerComponent } from '../post-composer/post-composer.component';
import { PostImagesComponent } from '../post-images/post-images.component';
import { PostInput, TimelinePost } from '../../models/timeline.models';
import { TimelineService } from '../../services/timeline.service';
import { NotificationService } from '../../services/notification.service';
import { avatarUrl } from '../../utils/avatar';
import { formatPostTime, splitBody, timelineErrorMessage } from '../../utils/timeline';

/**
 * つぶやき1件。いいね・ブックマーク・編集・削除はこの中でAPIを呼び、結果を親に知らせる。
 */
@Component({
  selector: 'app-post-item',
  standalone: true,
  imports: [RouterLink, LinkCardComponent, PostComposerComponent, PostImagesComponent],
  templateUrl: './post-item.component.html',
  styleUrl: './post-item.component.css'
})
export class PostItemComponent {
  private readonly timelineService = inject(TimelineService);
  private readonly notificationService = inject(NotificationService);

  readonly post = input.required<TimelinePost>();
  // スレッド画面の元の投稿は大きめに表示する
  readonly large = input(false);
  // ブックマーク一覧などで、返信のときに「〇〇さんへの返信」を出す
  readonly showReplyTo = input(false);

  readonly updated = output<TimelinePost>();
  readonly removed = output<TimelinePost>();

  readonly isEditing = signal(false);
  readonly isBusy = signal(false);

  readonly avatarSrc = computed(() => avatarUrl(this.post().author.avatarFilename));
  readonly segments = computed(() => splitBody(this.post().body));
  readonly time = computed(() => formatPostTime(this.post().createdAt));
  readonly isReply = computed(() => this.post().replyToId != null);
  // 返信には返信できないので、💬 は返信ではない投稿にだけ出す。スレッドは返信のときは元の投稿のスレッドを開く
  readonly threadId = computed(() => this.post().replyToId ?? this.post().id);

  toggleLike(): void {
    this.run(this.timelineService.toggleLike(this.post().id), 'いいねできませんでした');
  }

  toggleBookmark(): void {
    this.run(this.timelineService.toggleBookmark(this.post().id), 'ブックマークできませんでした');
  }

  saveEdit(input: PostInput): void {
    this.run(this.timelineService.update(this.post().id, input), '保存できませんでした', () => {
      this.isEditing.set(false);
      this.notificationService.showResult('保存しました', 'success');
    });
  }

  delete(): void {
    const post = this.post();
    const note = post.replyCount > 0 ? `\n付いている返信${post.replyCount}件も一緒に消えます。` : '';
    if (!window.confirm(`この投稿を削除しますか？\n削除すると元に戻せません。添付画像・いいねも一緒に消えます。${note}`)) return;

    this.isBusy.set(true);
    this.timelineService.delete(post.id).subscribe({
      next: () => {
        this.isBusy.set(false);
        this.notificationService.showResult('削除しました', 'success');
        this.removed.emit(post);
      },
      error: (err) => {
        console.error('Failed to delete post:', err);
        this.isBusy.set(false);
        this.notificationService.showResult(timelineErrorMessage(err, '削除できませんでした'), 'error');
      }
    });
  }

  private run(request: Observable<TimelinePost>, failure: string, done?: () => void): void {
    if (this.isBusy()) return;
    this.isBusy.set(true);
    request.subscribe({
      next: (post) => {
        this.isBusy.set(false);
        this.updated.emit(post);
        done?.();
      },
      error: (err) => {
        console.error(`${failure}:`, err);
        this.isBusy.set(false);
        this.notificationService.showResult(timelineErrorMessage(err, failure), 'error');
      }
    });
  }
}
