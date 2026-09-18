import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../../services/notification.service';

/**
 * 画面下部に浮くトースト通知。全画面共通のHeaderComponentから読み込むことで、
 * どの画面(お気に入りのトグルはヘッダー自身からも行える)からの通知も表示できるようにする。
 */
@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast.component.html',
  styleUrl: './toast.component.css'
})
export class ToastComponent {
  private notificationService = inject(NotificationService);

  readonly status = this.notificationService.status;
  readonly message = this.notificationService.message;
}
