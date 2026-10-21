import { Component, afterNextRender, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { concat, toArray } from 'rxjs';
import { RpgCraft, RpgEnemy, RpgItem, RpgItemInput, RpgItemType, RpgMap, RpgObjectDef, RpgPointShopItem } from '../../../models/rpg.models';
import { RpgService } from '../../../services/rpg.service';
import { STATIC_NAMES, StaticType, setItems } from '../../../rpg/rpg-data';

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
  power: number;
  source: Source;
  cost: string;
}

// APIの値の範囲(api#163 の RpgItemService と合わせる)
export const ITEM_LIMITS = { name: 20, desc: 40, power: [1, 999], price: [1, 99_999] } as const;

// 消せないアイテム(api#163 の RpgItemService.LOCKED と同じ)
export const LOCKED_ITEMS: Record<string, string> = { wood_sword: '初期装備', cloth: '初期装備', potion: '初めの持ち物' };

export const TYPE_LABELS: Record<RpgItemType, string> = { use: '回復の道具', weapon: '武器', armor: '防具', material: '素材' };
const TYPE_ICONS: Record<RpgItemType, string> = { use: '🧪', weapon: '🗡️', armor: '🛡️', material: '💎' };
const TYPES = Object.keys(TYPE_LABELS) as RpgItemType[];
const STAT_LABELS: Record<Exclude<RpgItemType, 'material'>, string> = { use: '回復量', weapon: '攻撃力', armor: '防御力' };
const STAT_KEYS = { use: 'heal', weapon: 'atk', armor: 'def' } as const;

const ICONS: Record<RpgItemType, string[]> = {
  use: ['🧪', '⚗️', '🍵', '🍎', '🍖', '💊', '🌿', '🍄'],
  weapon: ['🗡️', '⚔️', '🔱', '🪓', '🏹', '🔨', '🔪', '🪄'],
  armor: ['🛡️', '🦺', '👘', '🥻', '🧥', '👕', '💠', '✨'],
  material: ['💎', '🪨', '🦴', '🪶', '🍯', '🗝️', '🔩', '🌿']
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

/** 種類ごとの強さ(回復量・攻撃力・防御力)。素材は null */
export function statOf(item: RpgItem): number | null {
  if (item.type === 'material') return null;
  return item[STAT_KEYS[item.type]] ?? 0;
}

/** 一覧・道具屋に出す強さの文字 */
export function statText(item: RpgItem): string {
  if (item.type === 'use') return `HP +${item.heal ?? 0}`;
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
  if (item.type !== 'material' && (stat === null || stat < ITEM_LIMITS.power[0] || stat > ITEM_LIMITS.power[1])) {
    out.push({ ng: true, text: `${STAT_LABELS[item.type]}は ${ITEM_LIMITS.power[0]}〜${ITEM_LIMITS.power[1]} にしてください。` });
  }
  if (item.inShop && !((item.price ?? 0) >= ITEM_LIMITS.price[0] && (item.price ?? 0) <= ITEM_LIMITS.price[1])) {
    out.push({ ng: true, text: `道具屋で売るなら、値段を ${ITEM_LIMITS.price[0]}〜${ITEM_LIMITS.price[1]}G にしてください。` });
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
  imports: [FormsModule],
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

  readonly rows = signal<ItemRow[]>([]);
  readonly selectedId = signal<string | null>(null);
  readonly dirtyIds = signal<Set<string>>(new Set());
  readonly filter = signal('');
  readonly saving = signal(false);
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
        return { id: r.item.id, name: r.item.name || '（名前なし）', icon: r.item.icon, power: statOf(r.item) ?? 0, source, cost };
      });
    const crafts: Rung[] = this.crafts()
      .filter((c) => c.type === type)
      .map((c) => ({ id: c.id, name: c.name, icon: c.icon, power: c.power, source: 'craft', cost: `${c.gold}G＋素材` }));
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
      i.heal = type === 'use' ? (i.heal ?? 50) : null;
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
      if (i.type === 'material') return;
      i[STAT_KEYS[i.type]] = clamp(v, ITEM_LIMITS.power);
    });
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
    concat(...targets.map((r) => this.rpgService.saveItem(toInput(r)))).pipe(toArray()).subscribe({
      next: (savedList) => {
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
    heal: i.type === 'use' ? (i.heal ?? null) : null,
    atk: i.type === 'weapon' ? (i.atk ?? null) : null,
    def: i.type === 'armor' ? (i.def ?? null) : null,
    desc: i.desc?.trim() || null,
    inShop,
    price: inShop ? (i.price ?? null) : null,
    sortOrder: i.sortOrder
  };
}
