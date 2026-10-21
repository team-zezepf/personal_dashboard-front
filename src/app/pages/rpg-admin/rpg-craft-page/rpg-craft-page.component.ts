import { Component, afterNextRender, computed, inject, input, output, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { concat, toArray } from 'rxjs';
import { RpgCraft, RpgCraftInput, RpgEnemy } from '../../../models/rpg.models';
import { RpgService } from '../../../services/rpg.service';
import { ITEMS, MATERIAL_IDS, POINT_SHOP_ICONS, isCraftItem, itemsVersion, rpgItemImageUrl, setCrafts } from '../../../rpg/rpg-data';
import { RpgItemIconComponent } from '../../../components/rpg-item-icon/rpg-item-icon.component';
import { IMAGE_MAX_BYTES } from '../rpg-item-page/rpg-item-page.component';

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

const ICONS = ['🗡️', '⚔️', '🔱', '🪓', '🏹', '🔨', '🔪', '⛏️', '🛡️', '🦺', '👘', '🥻', '🧥', '👕', '💠', '✨'];
const SOURCE_LABELS: Record<Source, string> = { shop: '店', point: '交換', craft: '合成', other: '他' };

const typeLabel = (t: CraftType) => (t === 'weapon' ? '攻撃' : '防御');
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
    if (!dropsOf(id, enemies).length) out.push({ ng: true, text: `「${nameOf(id)}」を落とす敵がいないため、作れません。「敵」タブで落とす敵を決めてください。` });
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

  readonly view = signal<'edit' | 'overview'>('edit');
  readonly rows = signal<CraftRow[]>([]);
  readonly selectedId = signal<string | null>(null);
  readonly dirtyIds = signal<Set<string>>(new Set());
  // 並び順を変えたか(変えたら、すべての装備を今の順番で保存する)
  readonly orderChanged = signal(false);
  readonly saving = signal(false);
  // 画像をアップロードしている途中(front#345)
  readonly uploading = signal(false);
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
      const kills = best > 0 ? Math.ceil(m.count / best) : null;
      total = kills === null || total === null ? null : total + kills;
      return { ...m, drops, kills };
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
        image: this.imageUrl(r.craft.image),
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

  setType(type: CraftType): void {
    this.update((c) => (c.type = type));
  }

  setName(name: string): void {
    this.update((c) => (c.name = name.slice(0, CRAFT_LIMITS.name)));
  }

  setIcon(icon: string): void {
    this.update((c) => (c.icon = icon.trim() || '❔'));
  }

  /** 画像を選んだら、すぐアップロードして画像のファイル名を入れる(保存ボタンで確定。front#345) */
  pickImage(input: HTMLInputElement): void {
    const file = input.files?.[0];
    input.value = '';
    const sel = this.selected();
    if (!file || !sel) return;
    if (file.size > IMAGE_MAX_BYTES) {
      this.flash('画像は1MBまでにしてください');
      return;
    }
    this.uploading.set(true);
    this.rpgService.uploadItemImage(file).subscribe({
      next: (filename) => {
        this.uploading.set(false);
        this.rows.update((rows) => rows.map((r) => (r.craft.id === sel.craft.id ? { ...r, craft: { ...cloneCraft(r.craft), image: filename } } : r)));
        this.markDirty(sel.craft.id);
      },
      error: (err: Error) => {
        this.uploading.set(false);
        this.flash(err.message || '画像のアップロードに失敗しました');
      }
    });
  }

  clearImage(): void {
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
    concat(...targets.map((r) => this.rpgService.saveCraft(toInput(r, order(r))))).pipe(toArray()).subscribe({
      next: (savedList) => {
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
    power: c.power,
    gold: c.gold,
    materials: c.materials.map((m) => ({ itemId: m.itemId, count: m.count })),
    sortOrder,
    image: c.image ?? null
  };
}
