import { Component, DestroyRef, afterNextRender, computed, inject, input, output, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, concat, switchMap, toArray } from 'rxjs';
import { RpgCraft, RpgCraftInput, RpgEnemy } from '../../../models/rpg.models';
import { RpgService } from '../../../services/rpg.service';
import { ITEMS, MATERIAL_IDS, POINT_SHOP_ICONS, isCraftItem, itemsVersion, rpgItemImageUrl, setCrafts } from '../../../rpg/rpg-data';
import { RpgItemIconComponent } from '../../../components/rpg-item-icon/rpg-item-icon.component';
import { PendingImages } from '../../../components/rpg-item-icon/pending-images';
import { IMAGE_MAX_BYTES } from '../rpg-item-page/rpg-item-page.component';
import { MAX_SPELL_LEVEL, SPELLS, SPELL_IDS, SpellId, isSpellId, levelRateOf, spellLabel } from '../../../rpg/rpg-magic';

type CraftType = RpgCraft['type'];
type Source = 'shop' | 'point' | 'craft' | 'other';

// 一覧に出す装備(保存した装備と、まだ保存していない新しい装備)
interface CraftRow {
  craft: RpgCraft;
  // まだ保存していない新しい装備(ID は仮のもの)
  isNew: boolean;
}

// レシピの問題。ng は保存できない(作れない)、そうでなければ注意だけ
export interface CraftProblem {
  ng: boolean;
  text: string;
}

// 強さの並びの1行
interface Rung {
  id: string;
  name: string;
  icon: string;
  // 画像のURL(front#345)
  image?: string | null;
  power: number;
  source: Source;
  cost: string;
}

// 素材を落とす敵と確率
interface DropSource {
  name: string;
  rate: number;
}

// APIの値の範囲(api#134 の RpgCraftService と合わせる)
export const CRAFT_LIMITS = { name: 20, materials: 4, power: [1, 999], gold: [0, 99_999], count: [1, 99] } as const;

const ICONS = ['🗡️', '⚔️', '🔱', '🪓', '🏹', '🔨', '🔪', '⛏️', '🛡️', '🦺', '👘', '🥻', '🧥', '👕', '💠', '✨', '📕', '📘', '📗', '📙', '📒'];
const SOURCE_LABELS: Record<Source, string> = { shop: '店', point: '交換', craft: '合成', other: '他' };

const typeLabel = (t: CraftType) => (t === 'weapon' ? '攻撃' : t === 'armor' ? '防御' : '魔法の書');

/** 一覧・鍛冶屋に出す強さの文字。魔法の書(front#387)は覚える魔法と LV */
export function craftStatText(c: RpgCraft): string {
  if (c.type === 'book') return isSpellId(c.spell) ? `${SPELLS[c.spell].icon} ${spellLabel(c.spell, c.level ?? 1)}` : '覚える魔法なし';
  return `${typeLabel(c.type)}+${c.power}`;
}

/** 道具屋で買えるアイテムなら、その値段(front#387。魔法の書などを素材にするとき)。買えなければ null */
export function shopPriceOf(id: string): number | null {
  return ITEMS[id]?.price ?? null;
}
const clamp = (v: number, [min, max]: readonly [number, number]) => Math.min(max, Math.max(min, Math.round(Number(v) || 0)));
const cloneCraft = (c: RpgCraft): RpgCraft => ({ ...c, materials: c.materials.map((m) => ({ ...m })) });

/** 素材を落とす敵(「敵」タブで決めた素材と確率) */
export function dropsOf(material: string, enemies: RpgEnemy[]): DropSource[] {
  return enemies.filter((e) => e.material === material && (e.materialRate ?? 0) > 0).map((e) => ({ name: e.name, rate: e.materialRate ?? 0 }));
}

/**
 * レシピの問題(front#288)。作れない・同じ素材が2回・名前がないは保存できない。
 * ほかの装備のほうが強くて安い・同じ強さの装備がある、は注意だけ
 */
export function problemsOf(c: RpgCraft, others: { name: string; power: number; gold: number | null; type: CraftType }[], enemies: RpgEnemy[]): CraftProblem[] {
  const out: CraftProblem[] = [];
  const nameOf = (id: string) => ITEMS[id]?.name ?? id;
  if (!c.name.trim()) out.push({ ng: true, text: '名前を入れてください。' });
  if (!c.materials.length) out.push({ ng: true, text: '素材が1つもありません。' });
  const ids = c.materials.map((m) => m.itemId);
  for (const id of new Set(ids.filter((id, i) => ids.indexOf(id) !== i))) out.push({ ng: true, text: `「${nameOf(id)}」が2回入っています。1つにまとめてください。` });
  for (const id of new Set(ids)) {
    // 道具屋で買えるアイテム(魔法の書など。front#387)・合成でできるものも素材にできる
    if (!dropsOf(id, enemies).length && shopPriceOf(id) === null && !isCraftItem(id)) {
      out.push({ ng: true, text: `「${nameOf(id)}」を落とす敵がいないため、作れません。「敵」タブで落とす敵を決めてください。` });
    }
  }
  if (c.type === 'book') {
    // 魔法の書(front#387)は強さを比べない
    if (!isSpellId(c.spell)) out.push({ ng: true, text: '覚える魔法を選んでください。' });
    return out;
  }
  const same = others.filter((g) => g.type === c.type);
  const better = same.filter((g) => g.gold !== null && g.power > c.power && g.gold < c.gold).sort((a, b) => (a.gold ?? 0) - (b.gold ?? 0))[0];
  if (better) out.push({ ng: false, text: `「${better.name}」（${typeLabel(c.type)}+${better.power}・${better.gold}G）のほうが強くて安いため、作る意味が薄くなります。` });
  if (same.some((g) => g.power === c.power)) out.push({ ng: false, text: `${typeLabel(c.type)}+${c.power} の装備がほかにもあります。` });
  return out;
}

/**
 * マップ作成画面の「合成」タブ(front#288)。鍛冶屋で合成してできる装備とレシピを作る・直す・消す。
 * 保存すると、ゲーム・マップ作成画面の装備(ITEMS)とレシピ(RECIPES)を入れ替え、saved で知らせる
 */
@Component({
  selector: 'app-rpg-craft-page',
  standalone: true,
  imports: [FormsModule, NgTemplateOutlet, RpgItemIconComponent],
  templateUrl: './rpg-craft-page.component.html',
  styleUrls: ['./rpg-craft-page.component.css']
})
export class RpgCraftPageComponent {
  private rpgService = inject(RpgService);

  // 読み込んだ合成の装備(保存してあるもの)と、素材を落とす敵
  readonly crafts = input.required<RpgCraft[]>();
  readonly enemies = input.required<RpgEnemy[]>();
  // 保存・削除したあとの合成の装備
  readonly saved = output<RpgCraft[]>();
  // 保存していない変更があるか(ほかの画面へ移るときの確認に使う)
  readonly dirtyChange = output<boolean>();

  readonly icons = ICONS;
  readonly limits = CRAFT_LIMITS;
  readonly sourceLabels = SOURCE_LABELS;
  readonly typeLabel = typeLabel;
  readonly materialIds = MATERIAL_IDS;
  readonly items = ITEMS;
  readonly statText = craftStatText;
  readonly shopPriceOf = shopPriceOf;
  // 魔法の書(front#387)の覚える魔法と LV
  readonly spellIds = SPELL_IDS;
  readonly spells = SPELLS;
  readonly spellLevels = Array.from({ length: MAX_SPELL_LEVEL }, (_, i) => ({ level: i + 1, rate: levelRateOf(i + 1) }));

  readonly view = signal<'edit' | 'overview'>('edit');
  readonly rows = signal<CraftRow[]>([]);
  readonly selectedId = signal<string | null>(null);
  readonly dirtyIds = signal<Set<string>>(new Set());
  // 並び順を変えたか(変えたら、すべての装備を今の順番で保存する)
  readonly orderChanged = signal(false);
  readonly saving = signal(false);
  // 選んだけれど、まだアップロードしていない画像(保存するときにアップロードする。front#347)
  readonly pendingImages = new PendingImages();
  readonly message = signal('');
  // 装備ごとの、持っている人の数(読めなければ空)
  readonly owners = signal<Map<string, number>>(new Map());

  // 保存してある装備(ゲームに渡すもの)
  private stored: RpgCraft[] = [];
  private newCount = 0;

  readonly selected = computed(() => this.rows().find((r) => r.craft.id === this.selectedId()) ?? null);
  readonly isDirty = computed(() => this.dirtyIds().size > 0 || this.orderChanged());
  readonly weapons = computed(() => this.rows().filter((r) => r.craft.type === 'weapon'));
  readonly armors = computed(() => this.rows().filter((r) => r.craft.type === 'armor'));
  readonly books = computed(() => this.rows().filter((r) => r.craft.type === 'book'));

  // 素材に選べるアイテム(front#387)。素材のあとに、回復の道具・復活の道具・魔法の書(道具屋で買えるものなど)を並べる
  readonly materialOptions = computed(() => {
    itemsVersion();
    const others = Object.keys(ITEMS).filter((id) => ['use', 'revive', 'book'].includes(ITEMS[id].type) && !MATERIAL_IDS.includes(id));
    return [...MATERIAL_IDS, ...others];
  });

  // お店・ポイント交換などの装備(「アイテム」タブで作る。強さの比較に使う)。アイテムを保存したら作り直す(front#343)
  private readonly otherGear = computed(() => {
    this.rows();
    itemsVersion();
    return Object.entries(ITEMS)
      .filter(([id, item]) => !isCraftItem(id) && (item.type === 'weapon' || item.type === 'armor'))
      .map(([id, item]) => ({
        id,
        name: item.name,
        icon: item.icon,
        image: item.image ?? null,
        type: item.type as CraftType,
        power: (item.type === 'weapon' ? item.atk : item.def) ?? 0,
        gold: item.price ?? null
      }));
  });

  // 装備ごとのレシピの問題
  readonly problems = computed(() => {
    const rows = this.rows();
    const enemies = this.enemies();
    const gear = this.otherGear();
    const result = new Map<string, CraftProblem[]>();
    for (const r of rows) {
      const others = [...gear, ...rows.filter((o) => o !== r).map((o) => ({ name: o.craft.name, power: o.craft.power, gold: o.craft.gold, type: o.craft.type }))];
      result.set(r.craft.id, problemsOf(r.craft, others, enemies));
    }
    return result;
  });

  // 選んでいる装備の素材の入手先と、集めるのに倒す数の目安(いちばん落としやすい敵で数える)
  readonly sources = computed(() => {
    const sel = this.selected();
    if (!sel) return { rows: [], total: null as number | null };
    let total: number | null = 0;
    const rows = sel.craft.materials.map((m) => {
      const drops = dropsOf(m.itemId, this.enemies());
      const best = Math.max(0, ...drops.map((d) => d.rate));
      // 道具屋で買える素材(front#387)は、倒す数に数えない
      const shop = drops.length ? null : shopPriceOf(m.itemId);
      const kills = best > 0 ? Math.ceil(m.count / best) : shop !== null ? 0 : null;
      total = kills === null || total === null ? null : total + kills;
      return { ...m, drops, kills, shop };
    });
    return { rows, total };
  });

  // 素材×レシピの表(使われていない素材は後ろ)
  readonly matrix = computed(() => {
    itemsVersion();
    const rows = this.rows();
    const enemies = this.enemies();
    return MATERIAL_IDS.map((id) => {
      const counts = rows.map((r) => r.craft.materials.find((m) => m.itemId === id)?.count ?? 0);
      return { id, counts, sum: counts.reduce((a, b) => a + b, 0), drops: dropsOf(id, enemies) };
    }).sort((a, b) => Number(b.sum > 0) - Number(a.sum > 0));
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => this.pendingImages.clear());
    afterNextRender(() => {
      this.stored = this.crafts().map(cloneCraft);
      this.rows.set(this.stored.map((c) => ({ craft: cloneCraft(c), isNew: false })));
      this.selectedId.set(this.rows()[0]?.craft.id ?? null);
      this.loadOwners();
    });
  }

  // ===== 表示 =====

  problemsOfRow(id: string): CraftProblem[] {
    return this.problems().get(id) ?? [];
  }

  hasNg(id: string): boolean {
    return this.problemsOfRow(id).some((p) => p.ng);
  }

  materialCount(c: RpgCraft): number {
    return c.materials.reduce((n, m) => n + m.count, 0);
  }

  itemName(id: string): string {
    return ITEMS[id]?.name ?? id;
  }

  itemIcon(id: string): string {
    return ITEMS[id]?.icon ?? '❔';
  }

  // 素材などアイテムの画像のURL(front#345)
  itemImage(id: string): string | null {
    return ITEMS[id]?.image ?? null;
  }

  // 合成の装備の画像のファイル名から、表示に使うURL
  imageUrl(image: string | null | undefined): string | null {
    return image ? rpgItemImageUrl(image) : null;
  }

  dropsText(id: string): string {
    return dropsOf(id, this.enemies()).map((d) => `${d.name}（${Math.round(d.rate * 100)}%）`).join('・');
  }

  hasDrops(id: string): boolean {
    return dropsOf(id, this.enemies()).length > 0;
  }

  ownersOf(id: string): number {
    return this.owners().get(id) ?? 0;
  }

  /** 武器・防具の強さの並び(弱い順)。お店・ポイント交換・合成の装備をまとめて並べる */
  ladder(type: CraftType): Rung[] {
    const gear: Rung[] = this.otherGear()
      .filter((g) => g.type === type)
      .map((g) => {
        // 道具屋で売っていない装備は、ポイント交換の品物か、それ以外(初期装備など)
        const source: Source = g.gold !== null ? 'shop' : g.id in POINT_SHOP_ICONS ? 'point' : 'other';
        return { id: g.id, name: g.name, icon: g.icon, image: g.image, power: g.power, source, cost: source === 'shop' ? `${g.gold}G` : source === 'point' ? 'ポイント交換' : '—' };
      });
    const crafts: Rung[] = this.rows()
      .filter((r) => r.craft.type === type)
      .map((r) => ({
        id: r.craft.id,
        name: r.craft.name || '（名前なし）',
        icon: r.craft.icon,
        image: this.imageOf(r.craft),
        power: r.craft.power,
        source: 'craft',
        cost: `${r.craft.gold}G＋素材${this.materialCount(r.craft)}個`
      }));
    return [...gear, ...crafts].sort((a, b) => a.power - b.power);
  }

  ladderMax(type: CraftType): number {
    return Math.max(1, ...this.ladder(type).map((r) => r.power));
  }

  // ===== 選ぶ・並べ替える =====

  select(id: string): void {
    this.selectedId.set(id);
  }

  /** 表の見出しから、その装備の編集に移る */
  openEdit(id: string): void {
    this.select(id);
    this.view.set('edit');
  }

  move(id: string, d: number, event: Event): void {
    event.stopPropagation();
    const rows = [...this.rows()];
    const i = rows.findIndex((r) => r.craft.id === id);
    // 同じ種類(武器・防具)の中で、となりの装備と入れ替える
    const type = rows[i]?.craft.type;
    let j = i + d;
    while (j >= 0 && j < rows.length && rows[j].craft.type !== type) j += d;
    if (i < 0 || j < 0 || j >= rows.length) return;
    [rows[i], rows[j]] = [rows[j], rows[i]];
    this.rows.set(rows);
    this.orderChanged.set(true);
    this.dirtyChange.emit(true);
  }

  // ===== 編集 =====

  private update(fn: (c: RpgCraft) => void): void {
    const sel = this.selected();
    if (!sel) return;
    const craft = cloneCraft(sel.craft);
    fn(craft);
    this.rows.update((rows) => rows.map((r) => (r === sel ? { ...r, craft } : r)));
    this.markDirty(craft.id);
  }

  /**
   * 種類を変える。魔法の書(front#387)と装備のあいだは、まだ保存していない合成だけ変えられる(持ち方が違うため)。
   * 魔法の書にすると覚える魔法・LV を決め、装備に戻すと攻撃力・防御力を決め直す
   */
  setType(type: CraftType): void {
    const sel = this.selected();
    if (!sel || (!sel.isNew && (sel.craft.type === 'book') !== (type === 'book'))) return;
    this.update((c) => {
      const wasBook = c.type === 'book';
      c.type = type;
      if (type === 'book' && !wasBook) Object.assign(c, { power: 0, spell: 'fire', level: 1, icon: '📕' });
      if (type !== 'book' && wasBook) Object.assign(c, { power: 10, spell: null, level: null, icon: type === 'weapon' ? '🗡️' : '🛡️' });
    });
  }

  /** 種類を変えられるか(魔法の書と装備のあいだは、まだ保存していない合成だけ) */
  canSetType(row: CraftRow, type: CraftType): boolean {
    return row.isNew || (row.craft.type === 'book') === (type === 'book');
  }

  /** 魔法の書の、覚える魔法(front#387) */
  setSpell(id: string): void {
    this.update((c) => {
      if (c.type === 'book' && isSpellId(id)) c.spell = id as SpellId;
    });
  }

  /** 魔法の書の LV(front#387) */
  setLevel(level: number | string): void {
    this.update((c) => {
      if (c.type === 'book') c.level = clamp(Number(level), [1, MAX_SPELL_LEVEL]);
    });
  }

  setName(name: string): void {
    this.update((c) => (c.name = name.slice(0, CRAFT_LIMITS.name)));
  }

  setIcon(icon: string): void {
    this.update((c) => (c.icon = icon.trim() || '❔'));
  }

  /** 装備の画像の表示に使うURL。選んだばかり(保存前)の画像があればそのプレビュー(front#347) */
  imageOf(craft: RpgCraft): string | null {
    return this.pendingImages.url(craft.id) ?? this.imageUrl(craft.image);
  }

  hasImage(craft: RpgCraft): boolean {
    return !!craft.image || !!this.pendingImages.url(craft.id);
  }

  /**
   * 画像を選んだら、ブラウザの中だけでプレビューを出す(front#345 / front#347)。
   * アップロードは保存するときに行うので、保存しなければ API には何も残らない
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
    this.pendingImages.set(sel.craft.id, file);
    this.markDirty(sel.craft.id);
  }

  /** 画像を外す(選んだばかりの画像も捨てる) */
  clearImage(): void {
    const sel = this.selected();
    if (sel) this.pendingImages.remove(sel.craft.id);
    this.update((c) => (c.image = null));
  }

  setPower(v: number): void {
    this.update((c) => (c.power = clamp(v, CRAFT_LIMITS.power)));
  }

  setGold(v: number): void {
    this.update((c) => (c.gold = clamp(v, CRAFT_LIMITS.gold)));
  }

  setMaterial(index: number, itemId: string): void {
    this.update((c) => (c.materials[index].itemId = itemId));
  }

  setCount(index: number, v: number): void {
    this.update((c) => (c.materials[index].count = clamp(v, CRAFT_LIMITS.count)));
  }

  removeMaterial(index: number): void {
    this.update((c) => c.materials.splice(index, 1));
  }

  /** まだ使っていない、落とす敵がいる素材を1つ足す */
  addMaterial(): void {
    this.update((c) => {
      if (c.materials.length >= CRAFT_LIMITS.materials) return;
      const used = new Set(c.materials.map((m) => m.itemId));
      const free = MATERIAL_IDS.find((id) => !used.has(id) && this.hasDrops(id)) ?? MATERIAL_IDS.find((id) => !used.has(id));
      if (free) c.materials.push({ itemId: free, count: 1 });
    });
  }

  private markDirty(id: string): void {
    this.dirtyIds.update((s) => new Set(s).add(id));
    this.dirtyChange.emit(true);
  }

  // ===== 追加・複製・削除・保存 =====

  add(base?: RpgCraft): void {
    const id = `new-${++this.newCount}`;
    const craft: RpgCraft = base
      ? { ...cloneCraft(base), id, name: `${base.name}のコピー`.slice(0, CRAFT_LIMITS.name) }
      : { id, name: '新しい剣', icon: '🗡️', type: 'weapon', power: 10, gold: 100, materials: [{ itemId: MATERIAL_IDS[0], count: 3 }], sortOrder: 0 };
    const rows = [...this.rows()];
    // 複製は元の装備のすぐ下、新しい装備はいちばん下に足す
    const at = base ? rows.findIndex((r) => r.craft.id === base.id) + 1 : rows.length;
    rows.splice(at, 0, { craft, isNew: true });
    this.rows.set(rows);
    // 複製元に選んだばかりの画像があれば、それも持っていく
    const pending = base && this.pendingImages.file(base.id);
    if (pending) this.pendingImages.set(id, pending);
    if (base) this.orderChanged.set(true);
    this.markDirty(id);
    this.select(id);
  }

  copy(): void {
    const sel = this.selected();
    if (sel) this.add(sel.craft);
  }

  delete(): void {
    const sel = this.selected();
    if (!sel) return;
    if (sel.isNew) {
      this.removeRow(sel.craft.id);
      return;
    }
    const n = this.ownersOf(sel.craft.id);
    const msg = n
      ? `「${sel.craft.name}」を消しますか？\n${n}人が持っています。持っている人の持ち物からもなくなります（装備していたら初期装備に戻ります）。`
      : `「${sel.craft.name}」を消しますか？`;
    if (!confirm(msg)) return;
    this.rpgService.deleteCraft(sel.craft.id).subscribe({
      next: () => {
        this.stored = this.stored.filter((c) => c.id !== sel.craft.id);
        this.removeRow(sel.craft.id);
        this.publish();
        this.loadOwners();
        this.flash(`「${sel.craft.name}」を消しました`);
      },
      error: (err: Error) => this.flash(err.message || '消せませんでした')
    });
  }

  private removeRow(id: string): void {
    this.pendingImages.remove(id);
    const index = this.rows().findIndex((r) => r.craft.id === id);
    this.rows.update((rows) => rows.filter((r) => r.craft.id !== id));
    const dirty = new Set(this.dirtyIds());
    dirty.delete(id);
    this.dirtyIds.set(dirty);
    this.dirtyChange.emit(this.isDirty());
    this.select(this.rows()[Math.max(0, index - 1)]?.craft.id ?? '');
  }

  /** 変えた装備をまとめて保存する。並び順を変えたら、すべてを今の順番で保存する */
  save(): void {
    if (!this.isDirty() || this.saving()) return;
    const rows = this.rows();
    const targets = this.orderChanged() ? rows : rows.filter((r) => this.dirtyIds().has(r.craft.id));
    const bad = targets.filter((r) => this.hasNg(r.craft.id));
    if (bad.length) {
      this.flash(`⛔ がある装備は保存できません（${bad.map((r) => r.craft.name || '名前なし').join('・')}）`);
      return;
    }
    this.saving.set(true);
    // 並び順を変えていなければ、今の順番のまま(新しい装備は最後)にする
    const order = (r: CraftRow) => (this.orderChanged() ? rows.indexOf(r) + 1 : null);
    concat(...targets.map((r) => this.saveRow(r, order(r)))).pipe(toArray()).subscribe({
      next: (savedList) => {
        for (const r of targets) this.pendingImages.remove(r.craft.id);
        // 新しい装備は、APIが決めたIDに置き換える
        const selected = this.selectedId();
        let nextSelected = selected;
        this.rows.update((list) =>
          list.map((r) => {
            const i = targets.indexOf(r);
            if (i < 0) return r;
            if (r.craft.id === selected) nextSelected = savedList[i].id;
            return { craft: cloneCraft(savedList[i]), isNew: false };
          })
        );
        const byId = new Map(savedList.map((c) => [c.id, c]));
        this.stored = [...this.stored.filter((c) => !byId.has(c.id)), ...savedList].sort((a, b) => a.sortOrder - b.sortOrder);
        this.selectedId.set(nextSelected);
        this.dirtyIds.set(new Set());
        this.orderChanged.set(false);
        this.dirtyChange.emit(false);
        this.saving.set(false);
        this.publish();
        this.flash('合成の装備を保存しました');
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.flash(err.message || '保存に失敗しました');
      }
    });
  }

  // 保存してある装備(新しい装備・保存していない変更は含めない)を、ゲームの装備とレシピにする
  /** 1つの装備を保存する。選んだばかりの画像があれば、先にアップロードしてそのファイル名で保存する(front#347) */
  private saveRow(row: CraftRow, sortOrder: number | null): Observable<RpgCraft> {
    const file = this.pendingImages.file(row.craft.id);
    if (!file) return this.rpgService.saveCraft(toInput(row, sortOrder));
    return this.rpgService.uploadItemImage(file).pipe(switchMap((image) => this.rpgService.saveCraft({ ...toInput(row, sortOrder), image })));
  }

  private publish(): void {
    const list = this.stored.map(cloneCraft);
    setCrafts(list);
    this.saved.emit(list);
  }

  private loadOwners(): void {
    this.rpgService.getCraftOwners().subscribe({
      next: (list) => this.owners.set(new Map(list.map((o) => [o.itemId, o.count]))),
      error: () => undefined
    });
  }

  private flash(text: string): void {
    this.message.set(text);
    setTimeout(() => this.message() === text && this.message.set(''), 3000);
  }
}

function toInput(row: CraftRow, sortOrder: number | null): RpgCraftInput {
  const c = row.craft;
  return {
    id: row.isNew ? null : c.id,
    name: c.name.trim(),
    icon: c.icon,
    type: c.type,
    // 魔法の書(front#387)は攻撃力・防御力を持たず、覚える魔法と LV を送る
    power: c.type === 'book' ? 0 : c.power,
    spell: c.type === 'book' ? (c.spell ?? null) : null,
    level: c.type === 'book' ? (c.level ?? 1) : null,
    gold: c.gold,
    materials: c.materials.map((m) => ({ itemId: m.itemId, count: m.count })),
    sortOrder,
    image: c.image ?? null
  };
}
