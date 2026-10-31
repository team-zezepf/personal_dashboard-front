import { RpgDungeon, RpgMap, RpgMapNpc, RpgQuest } from '../models/rpg.models';
import { blankMap } from './rpg-editor';
import { lookFromColors } from './rpg-look';
import { ListFilter, filterNpcs, filterQuests, npcRows, questRows, splitByKeyword } from './rpg-npc-list';

// front#453: 「📜 NPC」タブの一覧の作り方と、キーワード・絞り込み
const NAMES = { enemies: { slime: 'スライム' }, items: { potion: '回復薬', mushroom_spore: 'キノコの胞子' } };
const ALL: ListFilter = { keyword: '', dungeonId: '', kind: '', problemOnly: false };

function quest(over: Partial<RpgQuest>): RpgQuest {
  return {
    id: 'q', title: 'クエスト', kind: 'defeat', target: 'slime', targetArea: null, count: 3,
    offerLines: [], progressLines: [], doneLines: [], rewardGold: 0, rewardItems: [], ...over
  };
}

function npc(name: string, over: Partial<RpgMapNpc> = {}): RpgMapNpc {
  return { name, x: 1, y: 2, hair: '#000', body: '#000', role: 'talk', notice: false, lines: [], look: lookFromColors('#000', '#000'), quests: [], ...over };
}

describe('NPC・クエストの一覧(front#453)', () => {
  let maps: RpgMap[];
  let dungeons: RpgDungeon[];

  beforeEach(() => {
    dungeons = [
      { id: 'forest', name: '精霊の森', theme: 'forest', sortOrder: 1 },
      { id: 'plain', name: '始まりの草原', theme: 'plain', sortOrder: 0 }
    ];
    const village = blankMap('village', 'はじまりの村', 'plain', 0, 0, 12, 12);
    const lake = blankMap('lake', 'しずかな湖畔', 'plain', 1, 0, 12, 12);
    const woods = blankMap('woods', '森の入り口', 'forest', 0, 0, 12, 12);
    village.npcs = [
      npc('村長 ゴロウ', {
        role: 'quest',
        quests: [
          quest({ title: 'スライム退治', count: 3, offerLines: ['スライムをたおしてきてくれんかの？'], rewardGold: 10, rewardItems: [{ itemId: 'potion', count: 1 }] }),
          quest({ title: '胞子集め', kind: 'collect', target: 'mushroom_spore', count: 5 })
        ]
      }),
      npc('子ども ポポ', { role: 'quest', quests: [quest({ title: 'おとうさんへの伝言', kind: 'visit', target: '釣り人 ジン', targetArea: 'lake', count: 1 })] }),
      npc('迷子', { role: 'quest', quests: [quest({ title: 'いない人に会う', kind: 'visit', target: 'だれか', targetArea: 'lake', count: 1 })] }),
      npc('道具屋 ミナ', { role: 'shop' })
    ];
    lake.npcs = [npc('釣り人 ジン')];
    woods.npcs = [npc('森番 ハンス', { role: 'quest' })];
    // わざと森を先に入れて、ダンジョンの並び順で並ぶことを確かめる
    maps = [woods, village, lake];
  });

  it('クエストの内容は、種類・対象・数と、敵・アイテム・エリアの名前から作る', () => {
    const rows = questRows(maps, dungeons, NAMES);
    expect(rows.map((r) => r.content)).toEqual(['スライムを3体', 'キノコの胞子を5個', '釣り人 ジン（しずかな湖畔）に会う', 'だれか（しずかな湖畔）に会う']);
    expect(rows[0].reward).toBe('10G・回復薬×1');
    expect(rows[0].place).toBe('始まりの草原 ／ はじまりの村');
    expect(rows[1].index).toBe(1);
  });

  it('NPCはダンジョンの並び順に並び、会いに来るクエストもわかる', () => {
    const rows = npcRows(maps, dungeons);
    expect(rows.map((r) => r.npc.name)).toEqual(['村長 ゴロウ', '子ども ポポ', '迷子', '道具屋 ミナ', '釣り人 ジン', '森番 ハンス']);
    expect(rows.find((r) => r.npc.name === '釣り人 ジン')?.visitors).toEqual([{ title: 'おとうさんへの伝言', giver: '子ども ポポ' }]);
  });

  it('キーワードで探せる。セリフで見つかったときは、その行もわかる', () => {
    const rows = questRows(maps, dungeons, NAMES);
    const byTitle = filterQuests(rows, { ...ALL, keyword: '伝言' });
    expect(byTitle.map((r) => r.row.quest.title)).toEqual(['おとうさんへの伝言']);
    expect(byTitle[0].hits).toEqual([]);
    const byLine = filterQuests(rows, { ...ALL, keyword: 'たおしてきて' });
    expect(byLine.map((r) => r.row.quest.title)).toEqual(['スライム退治']);
    expect(byLine[0].hits).toEqual([{ label: '依頼のセリフ', line: 'スライムをたおしてきてくれんかの？' }]);
    // 敵・アイテムの名前、報酬でも探せる
    expect(filterQuests(rows, { ...ALL, keyword: '胞子' }).map((r) => r.row.quest.title)).toEqual(['胞子集め']);
    expect(filterQuests(rows, { ...ALL, keyword: '回復薬' }).map((r) => r.row.quest.title)).toEqual(['スライム退治']);
  });

  it('ダンジョン・種類で絞り込める', () => {
    const rows = questRows(maps, dungeons, NAMES);
    expect(filterQuests(rows, { ...ALL, kind: 'visit' })).toHaveLength(2);
    expect(filterQuests(rows, { ...ALL, dungeonId: 'forest' })).toHaveLength(0);
    expect(filterNpcs(npcRows(maps, dungeons), { ...ALL, dungeonId: 'forest' }).map((r) => r.npc.name)).toEqual(['森番 ハンス']);
  });

  it('「問題があるものだけ」は、会う相手が見つからないクエストと、クエストのないクエスト依頼のNPC', () => {
    const quests = filterQuests(questRows(maps, dungeons, NAMES), { ...ALL, problemOnly: true });
    expect(quests.map((r) => r.row.quest.title)).toEqual(['いない人に会う']);
    const npcs = filterNpcs(npcRows(maps, dungeons), { ...ALL, problemOnly: true });
    expect(npcs.map((r) => r.npc.name)).toEqual(['森番 ハンス']);
  });

  it('キーワードの所を分けて目立たせる(大文字・小文字は区別しない)', () => {
    expect(splitByKeyword('Slimeとslime', 'SLIME')).toEqual([
      { text: 'Slime', hit: true },
      { text: 'と', hit: false },
      { text: 'slime', hit: true }
    ]);
    expect(splitByKeyword('スライム', '')).toEqual([{ text: 'スライム', hit: false }]);
  });
});
