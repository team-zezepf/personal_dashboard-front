import { Component, computed, input, output, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RpgDungeon, RpgEnemy, RpgMap, RpgQuestKind } from '../../../models/rpg.models';
import { QUEST_KIND_LABELS } from '../../../rpg/rpg-quest';
import { ListFilter, filterNpcs, filterQuests, npcRows, questRows, splitByKeyword } from '../../../rpg/rpg-npc-list';

/** 「マップで開く」で開く所。クエストの行なら、そのクエストの番号もつける */
export interface NpcOpenRequest {
  areaId: string;
  npcName: string;
  questIndex: number | null;
}

/**
 * マップ作成画面の「📜 NPC」タブ(front#453)。全ダンジョンのNPCとクエストを一覧で見て、キーワードで探す。
 * 一覧は見るだけで、直すときは「マップで開く」でマップタブのNPCの設定を開く(open で知らせる)。
 * 保存していない変更も出すため、マップを変えるたびに増える version を受け取って作り直す
 */
@Component({
  selector: 'app-rpg-npc-page',
  imports: [FormsModule, NgTemplateOutlet],
  templateUrl: './rpg-npc-page.component.html',
  styleUrl: './rpg-npc-page.component.css'
})
export class RpgNpcPageComponent {
  readonly maps = input.required<RpgMap[]>();
  readonly dungeons = input.required<RpgDungeon[]>();
  readonly enemies = input.required<RpgEnemy[]>();
  // アイテムと合成の装備(ITEMS)の名前
  readonly items = input.required<{ id: string; name: string }[]>();
  readonly version = input(0);
  readonly open = output<NpcOpenRequest>();

  readonly mode = signal<'quest' | 'npc'>('quest');
  readonly keyword = signal('');
  readonly dungeonId = signal('');
  readonly kind = signal<RpgQuestKind | ''>('');
  readonly problemOnly = signal(false);
  readonly kinds = Object.entries(QUEST_KIND_LABELS) as [RpgQuestKind, string][];

  readonly sortedDungeons = computed(() => [...this.dungeons()].sort((a, b) => a.sortOrder - b.sortOrder));

  private readonly filter = computed<ListFilter>(() => ({
    keyword: this.keyword(),
    dungeonId: this.dungeonId(),
    kind: this.kind(),
    problemOnly: this.problemOnly()
  }));

  readonly questList = computed(() => {
    this.version();
    const names = {
      enemies: Object.fromEntries(this.enemies().map((e) => [e.id, e.name])),
      items: Object.fromEntries(this.items().map((i) => [i.id, i.name]))
    };
    return filterQuests(questRows(this.maps(), this.dungeons(), names), this.filter());
  });

  readonly npcList = computed(() => {
    this.version();
    return filterNpcs(npcRows(this.maps(), this.dungeons()), this.filter());
  });

  readonly count = computed(() => (this.mode() === 'quest' ? this.questList().length : this.npcList().length));

  parts(text: string): { text: string; hit: boolean }[] {
    return splitByKeyword(text, this.keyword());
  }
}
