import { Component, DestroyRef, afterNextRender, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Observable, concat, switchMap, toArray } from 'rxjs';
import { RpgCraft, RpgEnemy, RpgItem, RpgItemInput, RpgItemType, RpgMap, RpgObjectDef, RpgPointShopItem } from '../../../models/rpg.models';
import { RpgService } from '../../../services/rpg.service';
import { STATIC_NAMES, StaticType, rpgItemImageUrl, sellPriceOf, setItems } from '../../../rpg/rpg-data';
import { MAX_SPELL_LEVEL, SPELLS, SPELL_IDS, SpellId, isSpellId, levelRateOf, spellLabel } from '../../../rpg/rpg-magic';
import { RpgItemIconComponent } from '../../../components/rpg-item-icon/rpg-item-icon.component';
import { PendingImages } from '../../../components/rpg-item-icon/pending-images';
import { EquipLookValue, RpgEquipLookFieldComponent } from '../../../components/rpg-equip-look-field/rpg-equip-look-field.component';

type Source = 'shop' | 'point' | 'craft' | 'other';
type Where = 'drop' | 'material' | 'object' | 'quest' | 'craft' | 'point' | 'locked';

// 一覧に出すアイテム(保存したアイテムと、まだ保存していない新しいアイテム)
interface ItemRow {
  item: RpgItem;
  // まだ保存していない新しいアイテム(ID は仮のもの)
  isNew: boolean;
}

// アイテムの問題。ng は保存できない、そうでなければ注意だけ
export interface ItemProblem {
  ng: boolean;
  text: string;
}

// アイテムを使っている場所の1行
export interface ItemUsage {
  where: Where;
  name: string;
  how: string;
}

// 強さの並びの1行
interface Rung {
  id: string;
  name: string;
  icon: string;
  // 画像のファイル名(front#345)
  image?: string | null;
  power: number;
  source: Source;
  cost: string;
}

// APIの値の範囲(api#163 の RpgItemService と合わせる)
export const ITEM_LIMITS = { name: 20, desc: 40, power: [1, 999], price: [1, 99_999] } as const;

// アップロードできる画像の大きさ(api#166 の RpgItemImageStorageService と同じ)
export const IMAGE_MAX_BYTES = 1024 * 1024;

// 消せないアイテム(api#163 の RpgItemService.LOCKED と同じ)
export const LOCKED_ITEMS: Record<string, string> = { wood_sword: '初期装備', cloth: '初期装備', potion: '初めの持ち物' };

// revive: たおれた人を起き上がらせる道具(front#358)。強さは起き上がるときのHPの割合(%)
// book: 魔法書(front#383)。強さはなく、覚える魔法を選ぶ
export const TYPE_LABELS: Record<RpgItemType, string> = { use: '回復の道具', revive: '復活の道具', weapon: '武器', armor: '防具', material: '素材', book: '魔法書' };
const TYPE_ICONS: Record<RpgItemType, string> = { use: '🧪', revive: '🕊️', weapon: '🗡️', armor: '🛡️', material: '💎', book: '📕' };
const TYPES = Object.keys(TYPE_LABELS) as RpgItemType[];
type StatType = Exclude<RpgItemType, 'material' | 'book'>;
const STAT_LABELS: Record<StatType, string> = { use: 'HPの回復量', revive: '起き上がるHP（%）', weapon: '攻撃力', armor: '防御力' };
const STAT_KEYS = { use: 'heal', revive: 'heal', weapon: 'atk', armor: 'def' } as const;
/** 強さ(回復量・攻撃力・防御力)を持つ種類か */
const hasStat = (type: RpgItemType): type is StatType => type !== 'material' && type !== 'book';
// 起き上がるときのHPの割合(%)の範囲(api#168 の RpgItemService.REVIVE_RANGE と同じ)
const REVIVE_RANGE = [1, 100] as const;

const ICONS: Record<RpgItemType, string[]> = {
  use: ['🧪', '⚗️', '🍵', '🍎', '🍖', '💊', '🌿', '🍄'],
  revive: ['🕊️', '🌟', '💖', '🔥', '🌸', '🍀', '✨'],
  weapon: ['🗡️', '⚔️', '🔱', '🪓', '🏹', '🔨', '🔪', '⛏️'],
  armor: ['🛡️', '🦺', '👘', '🥻', '🧥', '👕', '💠', '✨'],
  material: ['💎', '🧱', '🦴', '🔮', '🍯', '🗝️', '🔩', '🍃'],
  book: ['📕', '📘', '📗', '📙', '📒', '📜', '📓', '🔮']
};

export const WHERE_LABELS: Record<Where, string> = {
  drop: '敵の落とし物',
  material: '敵の素材',
  object: '置物の中身',
  quest: 'クエスト',
  craft: '合成のレシピ',
  point: 'ポイント交換',
  locked: '最初から持つ'
};
const SOURCE_LABELS: Record<Source, string> = { shop: '店', point: '交換', craft: '合成', other: '他' };

const clamp = (v: number, [min, max]: readonly [number, number]) => Math.min(max, Math.max(min, Math.round(Number(v) || 0)));
const cloneItem = (i: RpgItem): RpgItem => ({ ...i });
const percent = (rate: number) => `${Math.round(rate * 100)}%`;

/** 種類ごとの強さ(回復量・攻撃力・防御力)。素材・魔法書は null */
export function statOf(item: RpgItem): number | null {
  if (!hasStat(item.type)) return null;
  return item[STAT_KEYS[item.type]] ?? 0;
}

/** 一覧・道具屋に出す強さの文字 */
export function statText(item: RpgItem): string {
  // MPを回復する道具(front#383)は、HP・MPの回復量を並べる
  if (item.type === 'use') return [item.heal ? `HP +${item.heal}` : null, item.mp ? `MP +${item.mp}` : null].filter(Boolean).join('・') || 'HP +0';
  if (item.type === 'book') return isSpellId(item.spell) ? `${SPELLS[item.spell].icon} ${spellLabel(item.spell, item.level ?? 1)}を覚える` : '覚える魔法なし';
  if (item.type === 'revive') return `HP${item.heal ?? 0}%で起き上がる`;
  if (item.type === 'weapon') return `攻撃 +${item.atk ?? 0}`;
  if (item.type === 'armor') return `防御 +${item.def ?? 0}`;
  return '素材';
}

/** そのアイテムを使っている場所(敵・マップ・置物のデフォルト・合成のレシピ・ポイント交換) */
export function usagesOf(
  id: string,
  ctx: { enemies: RpgEnemy[]; maps: RpgMap[]; objectDefs: RpgObjectDef[]; crafts: RpgCraft[]; pointShop: RpgPointShopItem[] }
): ItemUsage[] {
  const out: ItemUsage[] = [];
  if (LOCKED_ITEMS[id]) out.push({ where: 'locked', name: LOCKED_ITEMS[id], how: '消せません' });
  for (const e of ctx.enemies) {
    if (e.drop === id) out.push({ where: 'drop', name: e.name, how: `落とす確率 ${percent(e.dropRate)}` });
    if (e.material === id) out.push({ where: 'material', name: e.name, how: `落とす確率 ${percent(e.materialRate ?? 0)}` });
  }
  for (const m of ctx.maps) {
    for (const o of m.objects) {
      const hit = o.items?.find((r) => r.id === id);
      if (hit) out.push({ where: 'object', name: `${m.name}の${STATIC_NAMES[o.type as StaticType] ?? o.type}`, how: `×${hit.count}（${percent(hit.chance)}）` });
    }
    for (const npc of m.npcs) {
      for (const q of npc.quests) {
        if (q.kind === 'collect' && q.target === id) out.push({ where: 'quest', name: `${m.name}・${npc.name}「${q.title}」`, how: `集める ×${q.count}` });
        const reward = q.rewardItems.find((r) => r.itemId === id);
        if (reward) out.push({ where: 'quest', name: `${m.name}・${npc.name}「${q.title}」`, how: `報酬 ×${reward.count}` });
      }
    }
  }
  for (const d of ctx.objectDefs) {
    const hit = d.items.find((r) => r.id === id);
    if (hit) out.push({ where: 'object', name: `${STATIC_NAMES[d.type as StaticType] ?? d.type}（デフォルト）`, how: `×${hit.count}（${percent(hit.chance)}）` });
  }
  for (const c of ctx.crafts) {
    const hit = c.materials.find((m) => m.itemId === id);
    if (hit) out.push({ where: 'craft', name: c.name, how: `素材 ×${hit.count}` });
  }
  const point = ctx.pointShop.find((p) => p.id === id);
  if (point) out.push({ where: 'point', name: 'ポイント交換所', how: `${point.point}pt` });
  return out;
}

/**
 * アイテムの問題(front#343)。名前がない・強さや値段が範囲外は保存できない。
 * 同じ名前がある・手に入れる方法がない・ほかの装備のほうが強くて安い、は注意だけ
 */
export function problemsOf(item: RpgItem, others: { name: string }[], shopGear: RpgItem[], usages: ItemUsage[]): ItemProblem[] {
  const out: ItemProblem[] = [];
  const name = item.name.trim();
  if (!name) out.push({ ng: true, text: '名前を入れてください。' });
  else if (others.some((o) => o.name.trim() === name)) out.push({ ng: false, text: `「${name}」という名前のアイテムがほかにもあります。` });
  const stat = statOf(item);
  if (item.type === 'use') {
    // 回復の道具は、HP・MP(front#383)のどちらか(または両方)を回復する
    const inRange = (v: number | null | undefined) => !v || (v >= ITEM_LIMITS.power[0] && v <= ITEM_LIMITS.power[1]);
    if (!item.heal && !item.mp) out.push({ ng: true, text: 'HPかMPの回復量を入れてください。' });
    else if (!inRange(item.heal) || !inRange(item.mp)) out.push({ ng: true, text: `回復量は ${ITEM_LIMITS.power[0]}〜${ITEM_LIMITS.power[1]} にしてください。` });
  } else if (item.type === 'book') {
    if (!isSpellId(item.spell)) out.push({ ng: true, text: '覚える魔法を選んでください。' });
  } else if (hasStat(item.type) && (stat === null || stat < ITEM_LIMITS.power[0] || stat > ITEM_LIMITS.power[1])) {
    out.push({ ng: true, text: `${STAT_LABELS[item.type]}は ${ITEM_LIMITS.power[0]}〜${ITEM_LIMITS.power[1]} にしてください。` });
  }
  if (item.inShop && !((item.price ?? 0) >= ITEM_LIMITS.price[0] && (item.price ?? 0) <= ITEM_LIMITS.price[1])) {
    out.push({ ng: true, text: `道具屋で売るなら、値段を ${ITEM_LIMITS.price[0]}〜${ITEM_LIMITS.price[1]}G にしてください。` });
  }
  // 売値(front#379)
  if (item.sellPrice != null && !(item.sellPrice >= ITEM_LIMITS.price[0] && item.sellPrice <= ITEM_LIMITS.price[1])) {
    out.push({ ng: true, text: `売値は ${ITEM_LIMITS.price[0]}〜${ITEM_LIMITS.price[1]}G にしてください。` });
  } else if (item.sellPrice && item.inShop && item.price && item.sellPrice >= item.price) {
    out.push({ ng: false, text: `売値（${item.sellPrice}G）が道具屋の値段（${item.price}G）以上なので、買って売るだけでゴールドが増えます。` });
  }
  const obtainable = item.inShop || usages.some((u) => u.where !== 'craft');
  if (!obtainable) {
    out.push({
      ng: false,
      text:
        item.type === 'material'
          ? 'この素材を落とす敵がいないため、まだ手に入りません。「👾 敵」タブで落とす敵を決めてください。'
          : '道具屋で売っておらず、どこでも手に入らないため、まだ手に入りません。'
    });
  }
  if ((item.type === 'weapon' || item.type === 'armor') && item.inShop && stat !== null) {
    const better = shopGear
      .filter((g) => g.id !== item.id && g.type === item.type && (statOf(g) ?? 0) > stat && (g.price ?? 0) < (item.price ?? 0))
      .sort((a, b) => (a.price ?? 0) - (b.price ?? 0))[0];
    if (better) out.push({ ng: false, text: `「${better.name}」（${statText(better)}・${better.price}G）のほうが強くて安いため、買う意味が薄くなります。` });
  }
  return out;
}

/**
 * マップ作成画面の「アイテム」タブ(front#343)。回復の道具・武器・防具・素材を作る・直す・消す。道具屋で売るか・値段・並び順も決める。
 * 合成の装備は一覧に出すだけで、編集は「合成」タブで行う。
 * 保存すると、ゲーム・マップ作成画面のアイテム(ITEMS・SHOP_ITEMS・MATERIAL_IDS)を入れ替え、saved で知らせる
 */
@Component({
  selector: 'app-rpg-item-page',
  standalone: true,
  imports: [FormsModule, RpgItemIconComponent, RpgEquipLookFieldComponent],
  templateUrl: './rpg-item-page.component.html',
  styleUrls: ['./rpg-item-page.component.css']
})
export class RpgItemPageComponent {
  private rpgService = inject(RpgService);

  // 読み込んだアイテム(保存してあるもの)と、使っている場所を探すためのデータ
  readonly items = input.required<RpgItem[]>();
  readonly crafts = input.required<RpgCraft[]>();
  readonly enemies = input.required<RpgEnemy[]>();
  readonly maps = input.required<RpgMap[]>();
  readonly objectDefs = input.required<RpgObjectDef[]>();
  // 保存・削除したあとのアイテム
  readonly saved = output<RpgItem[]>();
  // 保存していない変更があるか(ほかの画面へ移るときの確認に使う)
  readonly dirtyChange = output<boolean>();
  // 合成の装備を選んで「合成タブで編集」を押した
  readonly openCraft = output<void>();

  readonly types = TYPES;
  readonly typeLabels = TYPE_LABELS;
  readonly typeIcons = TYPE_ICONS;
  readonly statLabels = STAT_LABELS;
  readonly whereLabels = WHERE_LABELS;
  readonly sourceLabels = SOURCE_LABELS;
  readonly limits = ITEM_LIMITS;
  readonly statText = statText;
  readonly hasStat = hasStat;
  // 魔法書で覚える魔法(front#383)
  readonly spellIds = SPELL_IDS;
  // 魔法書の LV(front#387)と、その倍率
  readonly spellLevels = Array.from({ length: MAX_SPELL_LEVEL }, (_, i) => ({ level: i + 1, rate: levelRateOf(i + 1) }));
  readonly spells = SPELLS;

  readonly rows = signal<ItemRow[]>([]);
  readonly selectedId = signal<string | null>(null);
  readonly dirtyIds = signal<Set<string>>(new Set());
  readonly filter = signal('');
  readonly saving = signal(false);
  // 選んだけれど、まだアップロードしていない画像(保存するときにアップロードする。front#347)
  readonly pendingImages = new PendingImages();
  readonly message = signal('');
  // アイテムごとの、持っている人の数(読めなければ空)
  readonly owners = signal<Map<string, number>>(new Map());
  // ポイント交換所の品物(ポイント交換の装備を分けるのに使う)
  readonly pointShop = signal<RpgPointShopItem[]>([]);

  // 保存してあるアイテム(ゲームに渡すもの)
  private stored: RpgItem[] = [];
  private newCount = 0;

  readonly isDirty = computed(() => this.dirtyIds().size > 0);
  readonly selected = computed(() => this.rows().find((r) => r.item.id === this.selectedId()) ?? null);
  readonly selectedCraft = computed(() => (this.selected() ? null : (this.crafts().find((c) => c.id === this.selectedId()) ?? null)));

  // 一覧(種類ごと。名前で絞り込む)。武器・防具には合成の装備も読み取りだけで出す
  readonly groups = computed(() => {
    const q = this.filter().trim();
    const match = (name: string) => !q || name.includes(q);
    return TYPES.map((type) => ({
      type,
      rows: this.rows().filter((r) => r.item.type === type && match(r.item.name)),
      crafts: this.crafts().filter((c) => c.type === type && match(c.name))
    }));
  });

  // 道具屋に並ぶアイテム(並ぶ順)
  readonly shopRows = computed(() => this.rows().filter((r) => r.item.inShop && r.item.type !== 'material'));

  // アイテムごとの、使っている場所
  readonly usages = computed(() => {
    const ctx = { enemies: this.enemies(), maps: this.maps(), objectDefs: this.objectDefs(), crafts: this.crafts(), pointShop: this.pointShop() };
    return new Map(this.rows().map((r) => [r.item.id, usagesOf(r.item.id, ctx)]));
  });

  // アイテムごとの問題
  readonly problems = computed(() => {
    const rows = this.rows();
    const usages = this.usages();
    const shopGear = rows.filter((r) => r.item.inShop).map((r) => r.item);
    const crafts = this.crafts();
    return new Map(
      rows.map((r) => [r.item.id, problemsOf(r.item, [...rows.filter((o) => o !== r).map((o) => o.item), ...crafts], shopGear, usages.get(r.item.id) ?? [])])
    );
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => this.pendingImages.clear());
    afterNextRender(() => {
      this.stored = this.items().map(cloneItem);
      this.rows.set(sortRows(this.stored.map((i) => ({ item: cloneItem(i), isNew: false }))));
      this.selectedId.set(this.rows()[0]?.item.id ?? null);
      this.loadOwners();
      this.rpgService.getPointShop().subscribe({ next: (list) => this.pointShop.set(list), error: () => undefined });
    });
  }

  // ===== 表示 =====

  problemsOfRow(id: string): ItemProblem[] {
    return this.problems().get(id) ?? [];
  }

  hasNg(id: string): boolean {
    return this.problemsOfRow(id).some((p) => p.ng);
  }

  usagesOfRow(id: string): ItemUsage[] {
    return this.usages().get(id) ?? [];
  }

  ownersOf(id: string): number {
    return this.owners().get(id) ?? 0;
  }

  pointOf(id: string): number | null {
    return this.pointShop().find((p) => p.id === id)?.point ?? null;
  }

  /** 画像のファイル名から、表示に使うURL(なければ null) */
  imageUrl(image: string | null | undefined): string | null {
    return image ? rpgItemImageUrl(image) : null;
  }

  /** アイテムの画像の表示に使うURL。選んだばかり(保存前)の画像があればそのプレビュー */
  imageOf(item: RpgItem): string | null {
    return this.pendingImages.url(item.id) ?? this.imageUrl(item.image);
  }

  iconsOf(type: RpgItemType): string[] {
    return ICONS[type];
  }

  /** 一覧の2行目(強さ・道具屋の値段・交換ポイント。素材は説明) */
  subText(item: RpgItem): string {
    const point = this.pointOf(item.id);
    const parts = [item.type !== 'material' ? statText(item) : null, item.inShop ? `道具屋 ${item.price ?? 0}G` : null, point !== null ? `交換 ${point}pt` : null];
    return parts.filter(Boolean).join('・') || item.desc || '';
  }

  craftStat(c: RpgCraft): string {
    return `${c.type === 'weapon' ? '攻撃' : '防御'} +${c.power}`;
  }

  /** 消せない理由(なければ null) */
  deleteBlocker(id: string): string | null {
    if (LOCKED_ITEMS[id]) return `${LOCKED_ITEMS[id]}のため消せません。`;
    const used = this.usagesOfRow(id).filter((u) => u.where !== 'locked');
    if (!used.length) return null;
    return `${[...new Set(used.map((u) => WHERE_LABELS[u.where]))].join('・')}で使っているため消せません。先にそちらから外してください。`;
  }

  /** 武器・防具の強さの並び(弱い順)。道具屋・ポイント交換・合成・そのほかの装備をまとめて並べる */
  ladder(type: 'weapon' | 'armor'): Rung[] {
    const items: Rung[] = this.rows()
      .filter((r) => r.item.type === type)
      .map((r) => {
        const point = this.pointOf(r.item.id);
        const source: Source = r.item.inShop ? 'shop' : point !== null ? 'point' : 'other';
        const cost = source === 'shop' ? `${r.item.price ?? 0}G` : source === 'point' ? `${point}pt` : (LOCKED_ITEMS[r.item.id] ?? '—');
        return { id: r.item.id, name: r.item.name || '（名前なし）', icon: r.item.icon, image: this.imageOf(r.item), power: statOf(r.item) ?? 0, source, cost };
      });
    const crafts: Rung[] = this.crafts()
      .filter((c) => c.type === type)
      .map((c) => ({ id: c.id, name: c.name, icon: c.icon, image: this.imageUrl(c.image), power: c.power, source: 'craft', cost: `${c.gold}G＋素材` }));
    return [...items, ...crafts].sort((a, b) => a.power - b.power);
  }

  ladderMax(type: 'weapon' | 'armor'): number {
    return Math.max(1, ...this.ladder(type).map((r) => r.power));
  }

  // ===== 選ぶ・並べ替える =====

  select(id: string): void {
    this.selectedId.set(id);
  }

  /** 道具屋の並びで、となりの売っているアイテムと順番を入れ替える(保存するのは入れ替えた2つだけ) */
  moveInShop(id: string, d: number): void {
    const shop = this.shopRows();
    const i = shop.findIndex((r) => r.item.id === id);
    const a = shop[i];
    const b = shop[i + d];
    if (!a || !b) return;
    const swapped = new Map([
      [a, { ...a, item: { ...a.item, sortOrder: b.item.sortOrder } }],
      [b, { ...b, item: { ...b.item, sortOrder: a.item.sortOrder } }]
    ]);
    this.rows.update((rows) => sortRows(rows.map((r) => swapped.get(r) ?? r)));
    this.markDirty(a.item.id);
    this.markDirty(b.item.id);
  }

  private nextSortOrder(): number {
    return Math.max(0, ...this.rows().map((r) => r.item.sortOrder)) + 1;
  }

  // ===== 編集 =====

  private update(fn: (i: RpgItem) => void): void {
    const sel = this.selected();
    if (!sel) return;
    const item = cloneItem(sel.item);
    fn(item);
    this.rows.update((rows) => rows.map((r) => (r === sel ? { ...r, item } : r)));
    this.markDirty(item.id);
  }

  /** 種類を変える(まだ保存していないアイテムだけ) */
  setType(type: RpgItemType): void {
    if (!this.selected()?.isNew) return;
    this.update((i) => {
      i.type = type;
      i.icon = ICONS[type][0];
      i.heal = type === 'use' || type === 'revive' ? (i.heal ?? 50) : null;
      i.mp = type === 'use' ? (i.mp ?? null) : null;
      i.spell = type === 'book' ? (i.spell ?? 'fire') : null;
      i.level = type === 'book' ? (i.level ?? 1) : null;
      i.atk = type === 'weapon' ? (i.atk ?? 10) : null;
      i.def = type === 'armor' ? (i.def ?? 5) : null;
      if (type === 'material') {
        i.inShop = false;
        i.price = null;
      }
    });
  }

  setName(name: string): void {
    this.update((i) => (i.name = name.slice(0, ITEM_LIMITS.name)));
  }

  setIcon(icon: string): void {
    this.update((i) => (i.icon = icon.trim() || '❔'));
  }

  setStat(v: number): void {
    this.update((i) => {
      if (!hasStat(i.type)) return;
      // 回復の道具は、MPだけを回復するなら HP の回復量を 0 にできる(front#383)
      i[STAT_KEYS[i.type]] = clamp(v, i.type === 'revive' ? REVIVE_RANGE : i.type === 'use' ? [0, ITEM_LIMITS.power[1]] : ITEM_LIMITS.power);
    });
  }

  /** MPの回復量(front#383)。0・空ならMPは回復しない */
  setMp(v: number | string | null): void {
    this.update((i) => {
      if (i.type !== 'use') return;
      const n = v === null || v === '' ? 0 : clamp(Number(v), [0, ITEM_LIMITS.power[1]]);
      i.mp = n || null;
    });
  }

  /** 魔法書の LV(front#387) */
  setLevel(level: number | string): void {
    this.update((i) => {
      if (i.type === 'book') i.level = clamp(Number(level), [1, MAX_SPELL_LEVEL]);
    });
  }

  /** 魔法書で覚える魔法(front#383) */
  setSpell(id: string): void {
    this.update((i) => {
      if (i.type === 'book' && isSpellId(id)) i.spell = id as SpellId;
    });
  }

  /**
   * 画像を選んだら、ブラウザの中だけでプレビューを出す(front#345 / front#347)。
   * アップロードは保存するときに行うので、保存しなければ API には何も残らない。
   * 古い画像は、保存したときにAPIが(ほかで使っていなければ)消す
   */
  pickImage(input: HTMLInputElement): void {
    const file = input.files?.[0];
    input.value = '';
    const sel = this.selected();
    if (!file || !sel) return;
    if (file.size > IMAGE_MAX_BYTES) {
      this.flash('画像は1MBまでにしてください');
      return;
    }
    this.pendingImages.set(sel.item.id, file);
    this.markDirty(sel.item.id);
  }

  /** 画像を外す(選んだばかりの画像も捨てる) */
  clearImage(): void {
    const sel = this.selected();
    if (sel) this.pendingImages.remove(sel.item.id);
    this.update((i) => (i.image = null));
  }

  hasImage(item: RpgItem): boolean {
    return !!item.image || !!this.pendingImages.url(item.id);
  }

  /** 武器・防具の見た目(front#431)。形を「見た目なし」にすると色も消す */
  setLook(v: EquipLookValue): void {
    this.update((x) => Object.assign(x, v));
  }

  setDesc(desc: string): void {
    this.update((i) => (i.desc = desc.slice(0, ITEM_LIMITS.desc)));
  }

  setInShop(on: boolean): void {
    const last = this.nextSortOrder();
    this.update((i) => {
      if (i.type === 'material') return;
      i.inShop = on;
      if (on && !i.price) i.price = 10;
      // 売り始めたアイテムは、道具屋のいちばん下に並べる
      if (on) i.sortOrder = last;
    });
    this.rows.update(sortRows);
  }

  setPrice(v: number): void {
    this.update((i) => (i.price = clamp(v, ITEM_LIMITS.price)));
  }

  /** 売値(front#379)。空にすると決めない(道具屋の値段の半分になる) */
  setSellPrice(v: number | string | null): void {
    this.update((i) => (i.sellPrice = v === null || v === '' ? null : clamp(Number(v), ITEM_LIMITS.price)));
  }

  /** 売値の案内(front#379)。プレイヤーがいくらで売れるか */
  sellHint(item: RpgItem): string {
    if (item.sellPrice) return `プレイヤーは ${item.sellPrice}G で売れます。`;
    const half = sellPriceOf(item);
    return half !== undefined
      ? `空なら ${half}G（道具屋の値段 ${item.price}G の半分）で売れます。`
      : '空のままだと、道具屋の値段がないので売れません。';
  }

  private markDirty(id: string): void {
    this.dirtyIds.update((s) => new Set(s).add(id));
    this.dirtyChange.emit(true);
  }

  // ===== 追加・複製・削除・保存 =====

  add(base?: RpgItem): void {
    const id = `new-${++this.newCount}`;
    const item: RpgItem = base
      ? { ...cloneItem(base), id, name: `${base.name}のコピー`.slice(0, ITEM_LIMITS.name), inShop: false, price: null, updatedAt: null }
      : { id, name: '新しい回復薬', icon: '🧪', type: 'use', heal: 50, atk: null, def: null, desc: '', inShop: false, price: null, sortOrder: 0 };
    item.sortOrder = this.nextSortOrder();
    this.rows.update((rows) => [...rows, { item, isNew: true }]);
    // 複製元に選んだばかりの画像があれば、それも持っていく
    const pending = base && this.pendingImages.file(base.id);
    if (pending) this.pendingImages.set(id, pending);
    this.filter.set('');
    this.markDirty(id);
    this.select(id);
  }

  copy(): void {
    const sel = this.selected();
    if (sel) this.add(sel.item);
  }

  delete(): void {
    const sel = this.selected();
    if (!sel) return;
    if (sel.isNew) {
      this.removeRow(sel.item.id);
      return;
    }
    if (this.deleteBlocker(sel.item.id)) return;
    const n = this.ownersOf(sel.item.id);
    const msg = n
      ? `「${sel.item.name}」を消しますか？\n${n}人が持っています。持っている人の持ち物からもなくなります（装備していたら初期装備に戻ります）。`
      : `「${sel.item.name}」を消しますか？`;
    if (!confirm(msg)) return;
    this.rpgService.deleteItem(sel.item.id).subscribe({
      next: () => {
        this.stored = this.stored.filter((i) => i.id !== sel.item.id);
        this.removeRow(sel.item.id);
        this.publish();
        this.loadOwners();
        this.flash(`「${sel.item.name}」を消しました`);
      },
      error: (err: Error) => this.flash(err.message || '消せませんでした')
    });
  }

  private removeRow(id: string): void {
    this.pendingImages.remove(id);
    const index = this.rows().findIndex((r) => r.item.id === id);
    this.rows.update((rows) => rows.filter((r) => r.item.id !== id));
    const dirty = new Set(this.dirtyIds());
    dirty.delete(id);
    this.dirtyIds.set(dirty);
    this.dirtyChange.emit(this.isDirty());
    this.select(this.rows()[Math.max(0, index - 1)]?.item.id ?? '');
  }

  /** 変えたアイテムをまとめて保存する(保存は1つずつデータのコミットになるので、変えていないアイテムは送らない) */
  save(): void {
    if (!this.isDirty() || this.saving()) return;
    const targets = this.rows().filter((r) => this.dirtyIds().has(r.item.id));
    const bad = targets.filter((r) => this.hasNg(r.item.id));
    if (bad.length) {
      this.flash(`⛔ があるアイテムは保存できません（${bad.map((r) => r.item.name || '名前なし').join('・')}）`);
      this.select(bad[0].item.id);
      return;
    }
    this.saving.set(true);
    concat(...targets.map((r) => this.saveRow(r))).pipe(toArray()).subscribe({
      next: (savedList) => {
        for (const r of targets) this.pendingImages.remove(r.item.id);
        // 新しいアイテムは、APIが決めたIDに置き換える
        const selected = this.selectedId();
        let nextSelected = selected;
        this.rows.update((list) =>
          list.map((r) => {
            const i = targets.indexOf(r);
            if (i < 0) return r;
            if (r.item.id === selected) nextSelected = savedList[i].id;
            return { item: cloneItem(savedList[i]), isNew: false };
          })
        );
        const byId = new Map(savedList.map((i) => [i.id, i]));
        this.stored = [...this.stored.filter((i) => !byId.has(i.id)), ...savedList].sort((a, b) => a.sortOrder - b.sortOrder);
        this.selectedId.set(nextSelected);
        this.dirtyIds.set(new Set());
        this.dirtyChange.emit(false);
        this.saving.set(false);
        this.publish();
        this.flash('アイテムを保存しました');
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.flash(err.message || '保存に失敗しました');
      }
    });
  }

  /** 1つのアイテムを保存する。選んだばかりの画像があれば、先にアップロードしてそのファイル名で保存する(front#347) */
  private saveRow(row: ItemRow): Observable<RpgItem> {
    const file = this.pendingImages.file(row.item.id);
    if (!file) return this.rpgService.saveItem(toInput(row));
    return this.rpgService.uploadItemImage(file).pipe(switchMap((image) => this.rpgService.saveItem({ ...toInput(row), image })));
  }

  // 保存してあるアイテム(新しいアイテム・保存していない変更は含めない)を、ゲームのアイテムにする
  private publish(): void {
    const list = this.stored.map(cloneItem);
    setItems(list);
    this.saved.emit(list);
  }

  private loadOwners(): void {
    this.rpgService.getItemOwners().subscribe({
      next: (list) => this.owners.set(new Map(list.map((o) => [o.itemId, o.count]))),
      error: () => undefined
    });
  }

  private flash(text: string): void {
    this.message.set(text);
    setTimeout(() => this.message() === text && this.message.set(''), 3000);
  }
}

/** 並び順(道具屋に並ぶ順)に並べる */
function sortRows(rows: ItemRow[]): ItemRow[] {
  return [...rows].sort((a, b) => a.item.sortOrder - b.item.sortOrder);
}

export function toInput(row: ItemRow): RpgItemInput {
  const i = row.item;
  // 素材は道具屋で売れない
  const inShop = i.type !== 'material' && i.inShop;
  return {
    id: row.isNew ? null : i.id,
    name: i.name.trim(),
    icon: i.icon,
    type: i.type,
    // 回復の道具の HP・MP の回復量は、0 なら送らない(MPだけ・HPだけを回復する道具。front#383)
    heal: i.type === 'revive' ? (i.heal ?? null) : i.type === 'use' ? i.heal || null : null,
    mp: i.type === 'use' ? i.mp || null : null,
    spell: i.type === 'book' ? (i.spell ?? null) : null,
    level: i.type === 'book' ? (i.level ?? 1) : null,
    atk: i.type === 'weapon' ? (i.atk ?? null) : null,
    def: i.type === 'armor' ? (i.def ?? null) : null,
    desc: i.desc?.trim() || null,
    inShop,
    price: inShop ? (i.price ?? null) : null,
    sellPrice: i.sellPrice ?? null,
    sortOrder: i.sortOrder,
    image: i.image ?? null,
    // 武器・防具の見た目(front#431)。形がなければ送らない
    ...equipLookInput(i.type, i)
  };
}

/** 武器・防具の見た目を保存するときの値(front#431)。武器・防具で形を選んでいるときだけ送り、ほかは null */
export function equipLookInput(type: string, x: { lookShape?: string | null; lookColor?: string | null; lookAccent?: string | null }): EquipLookValue {
  const on = (type === 'weapon' || type === 'armor') && !!x.lookShape;
  return { lookShape: on ? x.lookShape! : null, lookColor: on ? (x.lookColor ?? null) : null, lookAccent: on ? (x.lookAccent ?? null) : null };
}
