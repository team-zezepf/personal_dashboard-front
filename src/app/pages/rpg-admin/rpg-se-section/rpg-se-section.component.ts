import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { RpgSe } from '../../../models/rpg.models';
import { RPG_BGM_ACCEPT, RPG_SE_MAX_BYTES, RpgService } from '../../../services/rpg.service';
import { SE_GROUP_LABELS, SE_SLOTS } from '../../../rpg/rpg-se';

/**
 * マップ作成画面の「BGM・効果音」タブの効果音(front#278)。
 * 効果音のファイルを登録し(名前の変更・削除・試しに鳴らす)、鳴らす場面(敵を叩く・置物を叩く・敵の攻撃の種類)ごとに選ぶ。
 * 場面の割り当ては、選んだらすぐ保存する
 */
@Component({
  selector: 'app-rpg-se-section',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './rpg-se-section.component.html',
  styleUrl: './rpg-se-section.component.css'
})
export class RpgSeSectionComponent implements OnInit {
  private rpgService = inject(RpgService);

  readonly accept = RPG_BGM_ACCEPT;
  readonly slotDefs = SE_SLOTS;
  readonly groupLabels = SE_GROUP_LABELS;
  readonly ses = signal<RpgSe[]>([]);
  // 場面 → 選んだ効果音のID
  readonly slots = signal<Map<string, string>>(new Map());
  readonly error = signal('');
  readonly uploading = signal(false);
  readonly dragOver = signal(false);
  readonly renamingId = signal<string | null>(null);
  uploadName = '';
  renameText = '';

  // 効果音ごとの、使っている場面の名前
  readonly usage = computed(() => {
    const usage = new Map<string, string[]>();
    for (const def of SE_SLOTS) {
      const id = this.slots().get(def.slot);
      if (id) usage.set(id, [...(usage.get(id) ?? []), def.label]);
    }
    return usage;
  });

  ngOnInit(): void {
    forkJoin({ ses: this.rpgService.getSes(), slots: this.rpgService.getSeSlots() }).subscribe({
      next: ({ ses, slots }) => {
        this.ses.set(ses);
        this.slots.set(new Map(slots.map((s) => [s.slot, String(s.seId)])));
      },
      error: (err: Error) => this.error.set(err.message)
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) this.upload(file);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) this.upload(file);
  }

  private upload(file: File): void {
    this.error.set('');
    if (file.size > RPG_SE_MAX_BYTES) {
      this.error.set('効果音は1つ 1MB までのファイルにしてください');
      return;
    }
    this.uploading.set(true);
    this.rpgService.uploadSe(file, this.uploadName).subscribe({
      next: (se) => {
        this.uploading.set(false);
        this.uploadName = '';
        this.ses.set([...this.ses(), se]);
      },
      error: (err: Error) => {
        this.uploading.set(false);
        this.error.set(err.message);
      }
    });
  }

  /** 試しに鳴らす */
  play(se: RpgSe | undefined): void {
    if (!se) return;
    const audio = new Audio(this.rpgService.seUrl(se));
    audio.volume = 0.8;
    void audio.play().catch(() => this.error.set('この効果音を鳴らせませんでした'));
  }

  seOf(slot: string): RpgSe | undefined {
    const id = this.slots().get(slot);
    return id ? this.ses().find((s) => String(s.id) === id) : undefined;
  }

  setSlot(slot: string, seId: string): void {
    this.error.set('');
    this.rpgService.setSeSlot(slot, seId || null).subscribe({
      next: (slots) => this.slots.set(new Map(slots.map((s) => [s.slot, String(s.seId)]))),
      error: (err: Error) => this.error.set(err.message)
    });
  }

  startRename(se: RpgSe): void {
    this.renameText = se.name;
    this.renamingId.set(se.id);
  }

  rename(se: RpgSe): void {
    const name = this.renameText.trim();
    if (!name || name === se.name) {
      this.renamingId.set(null);
      return;
    }
    this.rpgService.renameSe(se.id, name).subscribe({
      next: (renamed) => {
        this.ses.set(this.ses().map((s) => (s.id === renamed.id ? renamed : s)));
        this.renamingId.set(null);
      },
      error: (err: Error) => this.error.set(err.message)
    });
  }

  remove(se: RpgSe): void {
    const used = this.usage().get(String(se.id)) ?? [];
    const message = used.length
      ? `「${se.name}」は ${used.join('・')} で使っています。消すと、その場面は音なしになります。消しますか？`
      : `「${se.name}」を消しますか？`;
    if (!confirm(message)) return;
    this.rpgService.deleteSe(se.id).subscribe({
      next: () => {
        this.ses.set(this.ses().filter((s) => s.id !== se.id));
        // API側で、その音を選んでいた場面は音なしになっている。画面も合わせる
        this.slots.set(new Map([...this.slots()].filter(([, id]) => id !== String(se.id))));
      },
      error: (err: Error) => this.error.set(err.message)
    });
  }

  formatSize(bytes: number): string {
    return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))}KB` : `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  }
}
