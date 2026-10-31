// マップ作成画面の「📜 NPC」タブ(front#453)。全ダンジョンのNPCとクエストを一覧にして、キーワードで探す
import { RpgDungeon, RpgMap, RpgMapNpc, RpgQuest, RpgQuestKind } from '../models/rpg.models';
import { NPC_ROLES } from './rpg-editor';
import { QUEST_KIND_LABELS } from './rpg-quest';

/** 一覧で使う名前(敵・アイテムのIDから名前を引く) */
export interface NameBook {
  enemies: Record<string, string>;
  items: Record<string, string>;
}

/** 見つかったセリフ1行(どのセリフか・その行) */
export interface LineHit {
  label: string;
  line: string;
}

export interface QuestRow {
  quest: RpgQuest;
  // 依頼主の中での番号(マップで開くとき、このクエストの所を開く)
  index: number;
  giver: RpgMapNpc;
  area: RpgMap;
  dungeonId: string;
  place: string;
  kindLabel: string;
  // 「スライムを3体」のように、種類・対象・数から作る(データとしては持っていない)
  content: string;
  reward: string;
  // 会う相手が見つからない(会いに行くクエストだけ)
  lost: boolean;
}

export interface NpcRow {
  npc: RpgMapNpc;
  area: RpgMap;
  dungeonId: string;
  place: string;
  roleLabel: string;
  // このNPCに会いに来るクエスト(依頼主の名前つき)
  visitors: { title: string; giver: string }[];
  // クエスト依頼なのに、クエストを持っていない
  noQuest: boolean;
}

export interface ListFilter {
  keyword: string;
  dungeonId: string;
  kind: RpgQuestKind | '';
  problemOnly: boolean;
}

const LINE_LABELS: [keyof Pick<RpgQuest, 'offerLines' | 'progressLines' | 'doneLines'>, string][] = [
  ['offerLines', '依頼のセリフ'],
  ['progressLines', '受けたあとのセリフ'],
  ['doneLines', '報告のセリフ']
];

/** ダンジョンの並び順、エリアの並び順に並べたエリア */
function sortedAreas(maps: readonly RpgMap[], dungeons: readonly RpgDungeon[]): RpgMap[] {
  const order = new Map(dungeons.map((d) => [d.id, d.sortOrder]));
  return [...maps].sort((a, b) => (order.get(a.dungeonId) ?? 0) - (order.get(b.dungeonId) ?? 0) || a.sortOrder - b.sortOrder);
}

function placeOf(area: RpgMap, dungeons: readonly RpgDungeon[]): string {
  return `${dungeons.find((d) => d.id === area.dungeonId)?.name ?? '?'} ／ ${area.name}`;
}

/** 種類・対象・数から、クエストの内容の文を作る */
export function questContent(q: RpgQuest, maps: readonly RpgMap[], names: NameBook): string {
  if (q.kind === 'defeat') return `${names.enemies[q.target] ?? q.target}を${q.count}体`;
  if (q.kind === 'collect') return `${names.items[q.target] ?? q.target}を${q.count}個`;
  const area = maps.find((m) => m.id === q.targetArea);
  return `${q.target || '（相手未設定）'}（${area?.name ?? 'エリア未設定'}）に会う`;
}

/** 会いに行くクエストで、会う相手が行き先のエリアにいない */
export function lostVisit(q: RpgQuest, maps: readonly RpgMap[]): boolean {
  if (q.kind !== 'visit') return false;
  const area = maps.find((m) => m.id === q.targetArea);
  return !area?.npcs.some((n) => n.name === q.target);
}

export function questRows(maps: readonly RpgMap[], dungeons: readonly RpgDungeon[], names: NameBook): QuestRow[] {
  return sortedAreas(maps, dungeons).flatMap((area) =>
    area.npcs.flatMap((giver) =>
      (giver.role === 'quest' ? (giver.quests ?? []) : []).map((quest, index) => ({
        quest,
        index,
        giver,
        area,
        dungeonId: area.dungeonId,
        place: placeOf(area, dungeons),
        kindLabel: QUEST_KIND_LABELS[quest.kind] ?? quest.kind,
        content: questContent(quest, maps, names),
        reward: [...(quest.rewardGold ? [`${quest.rewardGold}G`] : []), ...quest.rewardItems.map((r) => `${names.items[r.itemId] ?? r.itemId}×${r.count}`)].join('・'),
        lost: lostVisit(quest, maps)
      }))
    )
  );
}

export function npcRows(maps: readonly RpgMap[], dungeons: readonly RpgDungeon[]): NpcRow[] {
  const quests = maps.flatMap((m) => m.npcs.flatMap((n) => (n.role === 'quest' ? (n.quests ?? []) : []).map((q) => ({ q, giver: n.name }))));
  return sortedAreas(maps, dungeons).flatMap((area) =>
    area.npcs.map((npc) => ({
      npc,
      area,
      dungeonId: area.dungeonId,
      place: placeOf(area, dungeons),
      roleLabel: NPC_ROLES[npc.role] ?? npc.role,
      visitors: quests.filter(({ q }) => q.kind === 'visit' && q.target === npc.name && q.targetArea === area.id).map(({ q, giver }) => ({ title: q.title, giver })),
      noQuest: npc.role === 'quest' && !(npc.quests ?? []).length
    }))
  );
}

/** 大文字・小文字を区別せずに、キーワードを含むか */
export function includesKeyword(text: string, keyword: string): boolean {
  return !!keyword && text.toLowerCase().includes(keyword.toLowerCase());
}

/** キーワードを含むセリフの行 */
export function questLineHits(q: RpgQuest, keyword: string): LineHit[] {
  if (!keyword) return [];
  return LINE_LABELS.flatMap(([key, label]) => (q[key] ?? []).filter((line) => includesKeyword(line, keyword)).map((line) => ({ label, line })));
}

/** 絞り込んだクエストの行と、セリフで見つかった行 */
export function filterQuests(rows: readonly QuestRow[], f: ListFilter): { row: QuestRow; hits: LineHit[] }[] {
  const keyword = f.keyword.trim();
  return rows
    .filter((r) => (!f.dungeonId || r.dungeonId === f.dungeonId) && (!f.kind || r.quest.kind === f.kind) && (!f.problemOnly || r.lost))
    .map((row) => ({ row, hits: questLineHits(row.quest, keyword) }))
    .filter(({ row, hits }) => {
      if (!keyword || hits.length) return true;
      const r = row;
      return [r.quest.title, r.giver.name, r.content, r.reward, r.place, r.kindLabel].some((t) => includesKeyword(t, keyword));
    });
}

export function filterNpcs(rows: readonly NpcRow[], f: ListFilter): NpcRow[] {
  const keyword = f.keyword.trim();
  return rows.filter((r) => {
    if (f.dungeonId && r.dungeonId !== f.dungeonId) return false;
    if (f.problemOnly && !r.noQuest) return false;
    if (!keyword) return true;
    const texts = [r.npc.name, r.roleLabel, r.place, ...(r.npc.quests ?? []).map((q) => q.title), ...r.visitors.flatMap((v) => [v.title, v.giver])];
    return texts.some((t) => includesKeyword(t, keyword));
  });
}

/** 文を、キーワードの所とそれ以外に分ける(キーワードの所を目立たせる) */
export function splitByKeyword(text: string, keyword: string): { text: string; hit: boolean }[] {
  const k = keyword.trim();
  if (!k) return [{ text, hit: false }];
  const parts: { text: string; hit: boolean }[] = [];
  const lower = text.toLowerCase();
  const lk = k.toLowerCase();
  let i = 0;
  for (let j = lower.indexOf(lk); j >= 0; j = lower.indexOf(lk, i)) {
    if (j > i) parts.push({ text: text.slice(i, j), hit: false });
    parts.push({ text: text.slice(j, j + k.length), hit: true });
    i = j + k.length;
  }
  if (i < text.length) parts.push({ text: text.slice(i), hit: false });
  return parts;
}
