import { RpgMap, RpgMapNpc, RpgQuest } from '../models/rpg.models';
import { QuestLog, allQuests } from './rpg-quest';
import { lookFromColors } from './rpg-look';

const quest = (id: string, partial: Partial<RpgQuest> = {}): RpgQuest => ({
  id, title: id, kind: 'defeat', target: 'slime', targetArea: null, count: 3,
  offerLines: ['たのむ'], progressLines: ['まだか'], doneLines: ['ありがとう'], rewardGold: 50, rewardItems: [],
  ...partial
});

const npc = (name: string, quests: RpgQuest[], role: RpgMapNpc['role'] = 'quest'): RpgMapNpc => ({
  name, x: 1, y: 1, hair: '#000000', body: '#000000', role, notice: false, lines: ['こんにちは'], look: lookFromColors('#000000', '#000000'), quests
});

const area = (id: string, npcs: RpgMapNpc[]): RpgMap => ({
  id, name: id, dungeonId: id, gridX: 0, gridY: 0, width: 12, height: 12,
  ground: Array.from({ length: 12 }, () => 'g'.repeat(12)), heights: Array.from({ length: 12 }, () => '0'.repeat(12)),
  objects: [], npcs, enemies: [], links: [], sortOrder: 1
});

describe('QuestLog(クエスト。front#239)', () => {
  const chief = npc('村長', [quest('q1'), quest('q2', { kind: 'collect', target: 'potion', count: 2 })]);
  const ken = npc('旅人 ケン', [], 'talk');
  const maps = [area('plain', [chief, ken]), area('forest', [npc('長老', [quest('q3', { kind: 'visit', target: '旅人 ケン', targetArea: 'plain', count: 1 })])])];
  const entries = allQuests(maps);
  let log: QuestLog;

  beforeEach(() => {
    log = new QuestLog();
  });

  it('受けられる新しいクエストがあると「!」、受けて未達成なら印なし、達成すると「?」', () => {
    expect(log.markOf(chief, {})).toBe('!');
    log.accept(chief.quests[0]);
    expect(log.markOf(chief, {})).toBeNull();

    expect(log.onDefeat('mushroom', entries)).toEqual([]);
    log.onDefeat('slime', entries);
    log.onDefeat('slime', entries);
    expect(log.progressOf(chief.quests[0], {})).toBe(2);
    expect(log.onDefeat('slime', entries).map((e) => e.giver)).toEqual(['村長']);
    expect(log.markOf(chief, {})).toBe('?');
  });

  it('報告すると、次のクエストが受けられるようになり、すべて終わると印は出ない', () => {
    log.accept(chief.quests[0]);
    for (let i = 0; i < 3; i++) log.onDefeat('slime', entries);
    log.complete(chief.quests[0]);
    expect(log.currentQuest(chief)?.id).toBe('q2');
    expect(log.markOf(chief, {})).toBe('!');

    // アイテムを集めるクエストは、持ち物の数で達成が決まる
    log.accept(chief.quests[1]);
    expect(log.isCleared(chief.quests[1], { potion: 1 })).toBe(false);
    expect(log.markOf(chief, { potion: 2 })).toBe('?');
    log.complete(chief.quests[1]);
    expect(log.currentQuest(chief)).toBeNull();
    expect(log.markOf(chief, {})).toBeNull();
  });

  it('NPCに会うクエストは、決めたエリアのそのNPCに話しかけると達成する', () => {
    const q3 = entries.find((e) => e.quest.id === 'q3')!;
    log.accept(q3.quest);
    expect(log.onTalk('forest', '旅人 ケン', entries)).toEqual([]);
    expect(log.onTalk('plain', '道具屋', entries)).toEqual([]);
    expect(log.onTalk('plain', '旅人 ケン', entries)).toEqual([q3]);
    expect(log.isCleared(q3.quest, {})).toBe(true);
  });

  it('クエスト依頼でないNPCは、クエストを出さない', () => {
    expect(log.currentQuest(npc('道具屋', [quest('qx')], 'shop'))).toBeNull();
    expect(entries.map((e) => e.quest.id)).toEqual(['q1', 'q2', 'q3']);
  });

  it('進み具合を保存する形に戻し、読み込める', () => {
    log.accept(chief.quests[0]);
    log.onDefeat('slime', entries);
    const saved = log.toList();
    expect(saved).toEqual([{ id: 'q1', state: 'active', count: 1 }]);

    const other = new QuestLog();
    other.load(saved);
    expect(other.progressOf(chief.quests[0], {})).toBe(1);
    expect(other.activeQuests(entries).map((e) => e.quest.id)).toEqual(['q1']);
  });
});
