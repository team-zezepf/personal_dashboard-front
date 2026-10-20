import { Component, computed, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RpgChanceEnemy, RpgChanceItem } from '../../../models/rpg.models';
import { ITEMS, STATIC_NAMES, StaticType, THEMED_OBJECTS, isBreakable } from '../../../rpg/rpg-data';
import { ENEMIES, ENEMY_COLORS, ENEMY_DARKS, HIT_MATERIALS } from '../../../rpg/rpg-enemy';
import { OBJECT_LIMITS, ObjectDraft, baseOf, currentHitMaterialOf, currentTintOf } from '../../../rpg/rpg-object';

type ListKey = 'items' | 'enemies' | 'mimics';
type KeepKey = 'color' | ListKey | 'hitMaterial';

// 「テーマの色」の見本(草原・森・谷・塔の地面の色)
const THEME_SWATCH = 'conic-gradient(#8fd16a 0 25%, #5fae73 0 50%, #c9a46c 0 75%, #4d4869 0)';

/**
 * 置物の設定の欄(front#333)。「置物」タブの種類ごとのデフォルトと、マップに置いた置物のモーダルで使う。
 * placement のときは、項目ごとに「デフォルトのまま」を選べ、「クリック時にメッセージを表示する」も出す。
 * 下書き(draft)をそのまま書きかえ、changed で知らせる
 */
@Component({
  selector: 'app-rpg-object-form',
  imports: [FormsModule],
  templateUrl: './rpg-object-form.component.html',
  styleUrl: './rpg-object-form.component.css'
})
export class RpgObjectFormComponent {
  readonly type = input.required<string>();
  readonly draft = input.required<ObjectDraft>();
  // マップに置いた置物の設定(デフォルトを上書きする)
  readonly placement = input(false);
  readonly changed = output<void>();

  readonly limits = OBJECT_LIMITS;
  readonly sounds = HIT_MATERIALS;
  readonly itemOptions = Object.entries(ITEMS).map(([id, item]) => ({ id, label: `${item.icon} ${item.name}` }));

  readonly name = computed(() => STATIC_NAMES[this.type() as StaticType] ?? this.type());
  readonly breakable = computed(() => isBreakable(this.type()));
  readonly themed = computed(() => THEMED_OBJECTS.includes(this.type() as StaticType));
  // 種類のデフォルト(置いた置物で「デフォルトのまま」のときに見せる値・外したときに入れる値)
  readonly base = computed(() => baseOf(this.type()));

  enemyOptions(): { id: string; name: string }[] {
    return Object.values(ENEMIES).map((e) => ({ id: e.id, name: e.name }));
  }

  // メッセージを表示する置物は壊せず、擬態もしない
  reading(): boolean {
    return this.placement() && this.draft().showMessage;
  }

  info(): string {
    if (this.reading()) return 'クリックするとメッセージを表示する置物（壊せない）';
    return this.breakable() ? '攻撃で壊れる置物' : '壊れない置物';
  }

  // ===== デフォルトのまま(置いた置物) =====

  kept(key: KeepKey): boolean {
    const d = this.draft();
    return key === 'color' ? d.color === null && d.dark === null : d[key] === null;
  }

  setKept(key: KeepKey, keep: boolean): void {
    const d = this.draft();
    const base = this.base();
    if (key === 'color') {
      d.color = keep ? null : base.color;
      d.dark = keep ? null : base.dark;
    } else if (key === 'hitMaterial') {
      d.hitMaterial = keep ? null : base.hitMaterial;
    } else {
      d[key] = keep ? null : (base[key] ?? []).map((r) => ({ ...r })) as never;
    }
    this.changed.emit();
  }

  // ===== 色合い =====

  /** 色の並び。先頭は今の色(テーマで色が変わる置物のデフォルトは「テーマの色」) */
  swatches(which: 'color' | 'dark'): string[] {
    const first = this.firstSwatch(which);
    const list = which === 'color' ? ENEMY_COLORS : ENEMY_DARKS;
    // 並びにない色(データで決めた色)を選んでいれば、2番目に出して選んでいるとわかるようにする
    const picked = which === 'color' ? this.draft().color : this.draft().dark;
    const extra = picked && picked !== first && !list.includes(picked) ? [picked] : [];
    return [first, ...extra, ...list.filter((c) => c !== first)];
  }

  private firstSwatch(which: 'color' | 'dark'): string {
    if (this.placement()) return (which === 'color' ? this.base().color : this.base().dark) ?? '#9aa3ad';
    const tint = currentTintOf(this.type());
    return tint ? (which === 'color' ? tint.m : tint.d) : 'theme';
  }

  swatchStyle(c: string): string {
    return c === 'theme' ? THEME_SWATCH : c;
  }

  /** いま選ばれている色(決めていなければ今の色・テーマの色) */
  selectedColor(which: 'color' | 'dark'): string {
    const d = this.draft();
    const v = which === 'color' ? d.color : d.dark;
    if (v) return v;
    if (this.placement()) return (which === 'color' ? this.base().color : this.base().dark) ?? '';
    return this.firstSwatch(which);
  }

  /** 色を選ぶ。デフォルトでは、今の色(先頭)を選ぶと「決めていない」に戻す */
  pickColor(which: 'color' | 'dark', c: string): void {
    const d = this.draft();
    const value = !this.placement() && c === this.firstSwatch(which) ? null : c === 'theme' ? null : c;
    if (which === 'color') d.color = value;
    else d.dark = value;
    // 置いた置物は、明るい色・暗い色をそろえて上書きする(片方だけ null だと、デフォルトのままに見えてしまうため)
    if (this.placement()) {
      d.color ??= this.base().color;
      d.dark ??= this.base().dark;
    }
    this.changed.emit();
  }

  // ===== 出てくるアイテム・出てくる敵・擬態している敵 =====

  /** その一覧(置いた置物で「デフォルトのまま」なら、デフォルトの一覧を見せる) */
  list(key: ListKey): (RpgChanceItem | RpgChanceEnemy)[] {
    return this.draft()[key] ?? this.base()[key] ?? [];
  }

  addRow(key: ListKey): void {
    const d = this.draft();
    const current = d[key] ?? [];
    if (current.length >= OBJECT_LIMITS.rows) return;
    const row = key === 'items' ? { id: 'potion', count: 1, chance: 1 } : { id: Object.keys(ENEMIES)[0] ?? 'slime', chance: key === 'mimics' ? 0.1 : 1 };
    d[key] = [...current, row] as never;
    this.changed.emit();
  }

  removeRow(key: ListKey, i: number): void {
    const d = this.draft();
    d[key] = (d[key] ?? []).filter((_, n) => n !== i) as never;
    this.changed.emit();
  }

  setRowId(key: ListKey, i: number, id: string): void {
    (this.draft()[key] ?? [])[i].id = id;
    this.changed.emit();
  }

  setCount(i: number, value: number | string): void {
    const row = (this.draft().items ?? [])[i];
    row.count = Math.min(OBJECT_LIMITS.count[1], Math.max(OBJECT_LIMITS.count[0], Math.round(Number(value) || 1)));
    this.changed.emit();
  }

  // 確率は画面では%(0.1きざみ)、データでは0.001〜1
  percent(chance: number): number {
    return Math.round(chance * 1000) / 10;
  }

  setChance(key: ListKey, i: number, value: number | string): void {
    const n = Number(value);
    const row = (this.draft()[key] ?? [])[i];
    row.chance = Number.isFinite(n) ? Math.min(1000, Math.max(1, Math.round(n * 10))) / 1000 : 1;
    this.changed.emit();
  }

  /** 擬態の確率の合計(%) */
  mimicTotal(): number {
    return Math.round(this.list('mimics').reduce((n, m) => n + m.chance, 0) * 1000) / 10;
  }

  /** 擬態しない(ただの置物になる)確率(%) */
  mimicRest(): number {
    return Math.max(0, Math.round((100 - this.mimicTotal()) * 10) / 10);
  }

  countOf(row: RpgChanceItem | RpgChanceEnemy): number {
    return 'count' in row ? row.count : 1;
  }

  // ===== 叩いたときの音 =====

  selectedSound(): string {
    return this.draft().hitMaterial ?? (this.placement() ? this.base().hitMaterial : null) ?? currentHitMaterialOf(this.type());
  }

  pickSound(value: string): void {
    // デフォルトでは、今の音を選ぶと「決めていない」に戻す
    this.draft().hitMaterial = !this.placement() && value === currentHitMaterialOf(this.type()) ? null : value;
    this.changed.emit();
  }

  // ===== メッセージ(置いた置物だけ) =====

  setShowMessage(on: boolean): void {
    this.draft().showMessage = on;
    this.changed.emit();
  }

  setLines(text: string): void {
    this.draft().lines = text;
    this.changed.emit();
  }
}
