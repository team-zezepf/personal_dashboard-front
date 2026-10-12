// RPGのクエスト(front#239)。受けたクエストの進み具合と、NPCの頭の印(「!」「?」)・報告できるかを決める。
// 1人1回きりで、NPCは持っているクエストを上から順に1つずつ出す。報告先は、どの種類でも依頼主
import { RpgMap, RpgMapNpc, RpgQuest, RpgQuestProgress, RpgQuestState } from '../models/rpg.models';

export type QuestMark = '!' | '?' | null;

/** クエストと、それを出す依頼主(名前と、いるエリア) */
export interface QuestEntry {
  quest: RpgQuest;
  giver: string;
  area: string;
}

export const QUEST_KIND_LABELS: Record<string, string> = { defeat: '敵を倒す', collect: 'アイテムを集める', visit: 'NPCに会う' };

/** 全エリアのクエスト(依頼主ごと) */
export function allQuests(maps: readonly RpgMap[]): QuestEntry[] {
  return maps.flatMap((m) =>
    m.npcs.filter((n) => n.role === 'quest').flatMap((n) => (n.quests ?? []).filter((q) => q.id).map((quest) => ({ quest, giver: n.name, area: m.id })))
  );
}

export class QuestLog {
  private readonly progress = new Map<string, { state: RpgQuestState; count: number }>();

  load(list: readonly RpgQuestProgress[] | null | undefined): void {
    this.progress.clear();
    for (const p of list ?? []) this.progress.set(p.id, { state: p.state, count: Math.max(0, p.count) });
  }

  toList(): RpgQuestProgress[] {
    return [...this.progress.entries()].map(([id, p]) => ({ id, state: p.state, count: p.count }));
  }

  stateOf(quest: RpgQuest): RpgQuestState | null {
    return (quest.id && this.progress.get(quest.id)?.state) || null;
  }

  countOf(quest: RpgQuest): number {
    return (quest.id && this.progress.get(quest.id)?.count) || 0;
  }

  /** NPCが今出しているクエスト(上から順に、報告がまだのもの)。すべて終わっていれば null */
  currentQuest(npc: RpgMapNpc): RpgQuest | null {
    if (npc.role !== 'quest') return null;
    return (npc.quests ?? []).find((q) => q.id && this.stateOf(q) !== 'completed') ?? null;
  }

  /**
   * いまの進み具合(たおした数・持っている個数・会えたか)。
   * アイテムを集めるクエストは、持ち物の数で決まる(報告するときに渡す)
   */
  progressOf(quest: RpgQuest, inventory: Record<string, number>): number {
    switch (quest.kind) {
      case 'defeat': return Math.min(quest.count, this.countOf(quest));
      case 'collect': return Math.min(quest.count, inventory[quest.target] ?? 0);
      default: return this.stateOf(quest) === 'cleared' ? 1 : 0;
    }
  }

  /** 報告できるか(達成している) */
  isCleared(quest: RpgQuest, inventory: Record<string, number>): boolean {
    const state = this.stateOf(quest);
    if (state === 'cleared') return true;
    return state === 'active' && quest.kind === 'collect' && (inventory[quest.target] ?? 0) >= quest.count;
  }

  /** 頭の印。受けられる新しいクエストがあれば「!」、達成して報告できれば「?」 */
  markOf(npc: RpgMapNpc, inventory: Record<string, number>): QuestMark {
    const quest = this.currentQuest(npc);
    if (!quest) return null;
    if (!this.stateOf(quest)) return '!';
    return this.isCleared(quest, inventory) ? '?' : null;
  }

  accept(quest: RpgQuest): void {
    if (quest.id && !this.stateOf(quest)) this.progress.set(quest.id, { state: 'active', count: 0 });
  }

  /** 敵をたおした。たおす数に届いたクエストを返す */
  onDefeat(enemyType: string, quests: readonly QuestEntry[]): QuestEntry[] {
    const done: QuestEntry[] = [];
    for (const e of quests) {
      const q = e.quest;
      const p = q.id ? this.progress.get(q.id) : undefined;
      if (!p || p.state !== 'active' || q.kind !== 'defeat' || q.target !== enemyType) continue;
      p.count++;
      if (p.count >= q.count) {
        p.state = 'cleared';
        done.push(e);
      }
    }
    return done;
  }

  /** NPC(area にいる name)に話しかけた。会えたクエストを返す */
  onTalk(area: string, name: string, quests: readonly QuestEntry[]): QuestEntry[] {
    const done: QuestEntry[] = [];
    for (const e of quests) {
      const q = e.quest;
      const p = q.id ? this.progress.get(q.id) : undefined;
      if (!p || p.state !== 'active' || q.kind !== 'visit' || q.target !== name || q.targetArea !== area) continue;
      p.state = 'cleared';
      done.push(e);
    }
    return done;
  }

  complete(quest: RpgQuest): void {
    if (quest.id) this.progress.set(quest.id, { state: 'completed', count: this.countOf(quest) });
  }

  /** 受けていて、まだ報告していないクエスト(右の欄に出す) */
  activeQuests(quests: readonly QuestEntry[]): QuestEntry[] {
    return quests.filter((e) => {
      const s = this.stateOf(e.quest);
      return s === 'active' || s === 'cleared';
    });
  }
}
