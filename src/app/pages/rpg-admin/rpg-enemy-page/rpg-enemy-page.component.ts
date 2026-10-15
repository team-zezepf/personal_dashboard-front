import { Component, ElementRef, OnDestroy, afterNextRender, afterRenderEffect, computed, inject, input, output, signal, viewChild, viewChildren } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { concat, toArray } from 'rxjs';
import { RpgEnemy, RpgEnemyInput, RpgMap } from '../../../models/rpg.models';
import { RpgService } from '../../../services/rpg.service';
import { ITEMS } from '../../../rpg/rpg-data';
import {
  ENEMY_ATTACKS,
  ENEMY_COLORS,
  ENEMY_DARKS,
  ENEMY_LIMITS,
  ENEMY_SHAPES,
  EnemyAttack,
  EnemyDef,
  EnemyShape,
  HIT_MATERIALS,
  SPELLS,
  attackTiming,
  chargeShake,
  disguiseOf,
  drawAttackEffect,
  drawEnemyBody,
  isRooted,
  jumpHeight,
  movesToTarget,
  setEnemies,
  shapeMaterialOf,
  thumbFitOf
} from '../../../rpg/rpg-enemy';
import { CsvImport, decodeCsv, enemiesToCsv, readEnemyCsv } from '../../../rpg/rpg-enemy-csv';

type NumberKey = 'size' | 'hp' | 'atk' | 'def' | 'interval' | 'speed' | 'exp' | 'gold' | 'sight' | 'respawn' | 'dash' | 'charge' | 'range' | 'radius';

// 一覧に出す敵(保存した敵と、まだ保存していない新しい敵)
interface EnemyRow {
  def: EnemyDef;
  // まだ保存していない新しい敵(ID は仮のもの)
  isNew: boolean;
  // 保存してある並び順(新しい敵にはない)。一覧の位置と違えば、保存するときに並び順も送る(front#299)
  sortOrder?: number;
}

const LIMIT_OF: Record<NumberKey, readonly [number, number]> = {
  size: ENEMY_LIMITS.size, hp: ENEMY_LIMITS.hp, atk: ENEMY_LIMITS.stat, def: ENEMY_LIMITS.stat, interval: ENEMY_LIMITS.interval,
  speed: ENEMY_LIMITS.speed, exp: ENEMY_LIMITS.reward, gold: ENEMY_LIMITS.reward, sight: ENEMY_LIMITS.sight, respawn: ENEMY_LIMITS.respawn,
  dash: ENEMY_LIMITS.dash, charge: ENEMY_LIMITS.charge, range: ENEMY_LIMITS.range, radius: ENEMY_LIMITS.radius
};

/**
 * マップ作成画面の「敵」タブ(front#229)。敵の一覧・プレビュー・見た目と強さの欄。
 * 保存すると、ゲーム・マップ作成画面の敵の種類(ENEMIES)を入れ替え、saved で知らせる
 */
@Component({
  selector: 'app-rpg-enemy-page',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './rpg-enemy-page.component.html',
  styleUrls: ['./rpg-enemy-page.component.css']
})
export class RpgEnemyPageComponent implements OnDestroy {
  private rpgService = inject(RpgService);

  // 読み込んだ敵(保存してある敵)と、置いてある場所を数えるためのマップ
  readonly enemies = input.required<RpgEnemy[]>();
  readonly maps = input.required<RpgMap[]>();
  // 保存・削除したあとの敵の一覧
  readonly saved = output<RpgEnemy[]>();
  // 保存していない変更があるか(ほかの画面へ移るときの確認に使う)
  readonly dirtyChange = output<boolean>();

  readonly shapes = ENEMY_SHAPES;
  readonly isRooted = isRooted;
  readonly hitMaterials = HIT_MATERIALS;
  readonly disguiseOf = disguiseOf;
  readonly attacks = ENEMY_ATTACKS;
  readonly colors = ENEMY_COLORS;
  readonly darks = ENEMY_DARKS;
  readonly limits = ENEMY_LIMITS;
  readonly Math = Math;
  // 落とすアイテム(素材はのぞく)と、落とす素材(front#277)
  readonly items = [['', 'なし'], ...Object.entries(ITEMS).filter(([, item]) => item.type !== 'material').map(([id, item]) => [id, item.name])] as [string, string][];
  readonly materials = [['', 'なし'], ...Object.entries(ITEMS).filter(([, item]) => item.type === 'material').map(([id, item]) => [id, `${item.icon} ${item.name}`])] as [string, string][];

  readonly rows = signal<EnemyRow[]>([]);
  readonly selectedId = signal<string | null>(null);
  readonly dirtyIds = signal<Set<string>>(new Set());
  readonly saving = signal(false);
  readonly message = signal('');
  readonly dir = signal(1);
  // CSV の取り込みの確認(front#297)。反映するまで画面の敵は変えない
  readonly csvImport = signal<CsvImport | null>(null);
  readonly csvFileName = signal('');
  // ドラッグで並び替え(front#299)。つかんでいる敵と、落とす位置(その敵の前か後ろ)
  readonly dragId = signal<string | null>(null);
  readonly dropAt = signal<{ id: string; after: boolean } | null>(null);

  readonly selected = computed(() => this.rows().find((r) => r.def.id === this.selectedId()) ?? null);
  readonly isDirty = computed(() => this.dirtyIds().size > 0);
  readonly attackSpec = computed(() => ENEMY_ATTACKS.find((a) => a.id === this.selected()?.def.attack) ?? ENEMY_ATTACKS[0]);

  // 敵ごとの、置いてあるエリアと数
  readonly usage = computed(() => {
    const result = new Map<string, [string, number][]>();
    for (const map of this.maps()) {
      const counts = new Map<string, number>();
      for (const e of map.enemies) counts.set(e.type, (counts.get(e.type) ?? 0) + 1);
      for (const [type, n] of counts) result.set(type, [...(result.get(type) ?? []), [map.name, n]]);
    }
    return result;
  });

  private readonly preview = viewChild<ElementRef<HTMLCanvasElement>>('preview');
  private readonly thumbs = viewChildren<ElementRef<HTMLCanvasElement>>('thumb');
  private frame = 0;
  private last = performance.now();
  private time = 0;
  // プレビューの攻撃(始めてからの秒。攻撃していないときは null)と、次の攻撃までの待ち時間
  private actT: number | null = null;
  private idle = 0;
  private newCount = 0;

  constructor() {
    afterNextRender(() => {
      this.rows.set(this.enemies().map((e) => ({ def: toDef(e), isNew: false, sortOrder: e.sortOrder })));
      this.selectedId.set(this.rows()[0]?.def.id ?? null);
      this.loop();
    });
    // 一覧・体の形の見本は、色・大きさを変えたら描き直す
    afterRenderEffect(() => {
      const rows = this.rows();
      const sel = this.selected();
      for (const ref of this.thumbs()) {
        const cv = ref.nativeElement;
        const id = cv.dataset['id'];
        const shape = cv.dataset['shape'] as EnemyShape | undefined;
        const base = shape ? sel?.def : rows.find((r) => r.def.id === id)?.def;
        if (!base) continue;
        drawThumb(cv, shape ? { ...base, shape, size: 1 } : base);
      }
    });
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.frame);
  }

  usageOf(id: string): [string, number][] {
    return this.usage().get(id) ?? [];
  }

  usedCount(id: string): number {
    return this.usageOf(id).reduce((n, [, k]) => n + k, 0);
  }

  usageText(id: string): string {
    return this.usageOf(id).map(([name, n]) => `${name} ${n}体`).join('、');
  }

  select(id: string): void {
    this.selectedId.set(id);
    this.restartAttack();
  }

  turn(): void {
    this.dir.update((d) => -d);
  }

  // ===== 変更 =====

  private change(patch: Partial<EnemyDef>): void {
    const sel = this.selected();
    if (!sel) return;
    this.rows.update((rows) => rows.map((r) => (r === sel ? { ...r, def: { ...r.def, ...patch } } : r)));
    this.markDirty(sel.def.id);
  }

  private markDirty(id: string): void {
    if (!this.dirtyIds().has(id)) {
      this.dirtyIds.set(new Set([...this.dirtyIds(), id]));
      this.dirtyChange.emit(true);
    }
  }

  setName(name: string): void {
    this.change({ name });
  }

  setShape(shape: EnemyShape): void {
    this.change({ shape });
  }

  setColor(key: 'color' | 'dark', color: string): void {
    this.change({ [key]: color });
  }

  setAttack(attack: EnemyAttack): void {
    this.change({ attack });
    this.restartAttack();
  }

  setNumber(key: NumberKey, value: number | string): void {
    const [min, max] = LIMIT_OF[key];
    const n = Number(value);
    if (!Number.isFinite(n)) return;
    const clamped = Math.min(max, Math.max(min, n));
    const intKeys: NumberKey[] = ['hp', 'atk', 'def', 'exp', 'gold', 'respawn', 'dash', 'range', 'radius'];
    this.change({ [key]: intKeys.includes(key) ? Math.round(clamped) : clamped });
    if (key === 'charge' || key === 'dash' || key === 'range' || key === 'radius') this.restartAttack();
  }

  setDrop(drop: string): void {
    this.change({ drop: drop || null });
  }

  // 落とす確率は % で入れる
  setDropRate(percent: number | string): void {
    const n = Number(percent);
    if (Number.isFinite(n)) this.change({ dropRate: Math.min(100, Math.max(0, n)) / 100 });
  }

  setMaterial(material: string): void {
    this.change({ material: material || null });
  }

  setMaterialRate(percent: number | string): void {
    const n = Number(percent);
    if (Number.isFinite(n)) this.change({ materialRate: Math.min(100, Math.max(0, n)) / 100 });
  }

  // 叩いたときの音の素材(front#282)。'' なら体の形から(自動)
  setHitMaterial(material: string): void {
    this.change({ hitMaterial: material || null });
  }

  autoHitMaterialLabel(def: EnemyDef): string {
    const id = shapeMaterialOf(def.shape);
    return HIT_MATERIALS.find(([m]) => m === id)?.[1] ?? '';
  }

  setBoss(boss: boolean): void {
    this.change({ boss });
  }

  setGlow(glow: boolean): void {
    this.change({ glow });
  }

  /** 新しい敵(base を元にした複製、なければ黄色のスライム) */
  add(base?: EnemyDef): void {
    const id = `new-${++this.newCount}`;
    const def: EnemyDef = base
      ? { ...base, id, name: `${base.name}のコピー`.slice(0, 20) }
      : { ...this.rows()[0].def, id, name: '新しい敵', shape: 'slime', color: '#fbbf24', dark: '#b45309', size: 1, boss: false, attack: 'tackle', dash: 1, charge: 0 };
    this.rows.update((rows) => [...rows, { def, isNew: true }]);
    this.markDirty(id);
    this.select(id);
  }

  copy(): void {
    const sel = this.selected();
    if (sel) this.add(sel.def);
  }

  delete(): void {
    const sel = this.selected();
    if (!sel || this.usedCount(sel.def.id) > 0) return;
    if (sel.isNew) {
      this.removeRow(sel.def.id);
      return;
    }
    if (!confirm(`「${sel.def.name}」を消しますか？`)) return;
    this.rpgService.deleteEnemy(sel.def.id).subscribe({
      next: () => {
        this.removeRow(sel.def.id);
        this.publish();
        this.flash(`「${sel.def.name}」を消しました`);
      },
      error: (err: Error) => this.flash(err.message || '消せませんでした')
    });
  }

  private removeRow(id: string): void {
    const index = this.rows().findIndex((r) => r.def.id === id);
    this.rows.update((rows) => rows.filter((r) => r.def.id !== id));
    const dirty = new Set(this.dirtyIds());
    dirty.delete(id);
    this.dirtyIds.set(dirty);
    this.dirtyChange.emit(dirty.size > 0);
    this.select(this.rows()[Math.max(0, index - 1)]?.def.id ?? '');
  }

  // ===== ドラッグで並び替え(front#299) =====

  onDragStart(id: string, event: DragEvent): void {
    this.dragId.set(id);
    event.dataTransfer?.setData('text/plain', id);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  }

  onDragOver(id: string, event: DragEvent): void {
    if (!this.dragId()) return;
    event.preventDefault();
    const el = event.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    const after = event.clientY > rect.top + rect.height / 2;
    const cur = this.dropAt();
    if (cur?.id !== id || cur.after !== after) this.dropAt.set({ id, after });
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    const from = this.dragId();
    const to = this.dropAt();
    if (from && to) this.moveRow(from, to.id, to.after);
    this.onDragEnd();
  }

  onDragEnd(): void {
    this.dragId.set(null);
    this.dropAt.set(null);
  }

  /** 敵 id を、敵 targetId の前(after なら後ろ)へ動かす。位置が変わった敵に「保存していない変更」の印を付ける */
  moveRow(id: string, targetId: string, after: boolean): void {
    if (id === targetId) return;
    const rows = this.rows();
    const moving = rows.find((r) => r.def.id === id);
    const target = rows.find((r) => r.def.id === targetId);
    if (!moving || !target) return;
    const next = moveItem(rows, moving, target, after);
    if (next.every((r, i) => r === rows[i])) return;
    this.rows.set(next);
    for (const id of this.orderChangedIds()) this.markDirty(id);
  }

  // 保存してある並び順と、一覧の位置(1 から)が違う敵
  private orderChangedIds(): string[] {
    return this.rows().filter((r, i) => !r.isNew && r.sortOrder !== i + 1).map((r) => r.def.id);
  }

  /** 変えた敵をまとめて保存する。並び順は一覧の位置(1 から)にそろえて送る */
  save(): void {
    const orderChanged = new Set(this.orderChangedIds());
    const targets = this.rows().filter((r) => this.dirtyIds().has(r.def.id) || orderChanged.has(r.def.id));
    if (!targets.length || this.saving()) return;
    if (targets.some((r) => !r.def.name.trim())) {
      this.flash('名前が空の敵があります');
      return;
    }
    this.saving.set(true);
    const position = (r: EnemyRow) => this.rows().indexOf(r) + 1;
    concat(...targets.map((r) => this.rpgService.saveEnemy(toInput(r, position(r))))).pipe(toArray()).subscribe({
      next: (savedList) => {
        // 新しい敵は、APIが決めたIDに置き換える
        const selected = this.selectedId();
        let nextSelected = selected;
        this.rows.update((rows) =>
          rows.map((r) => {
            const i = targets.indexOf(r);
            if (i < 0) return r;
            if (r.def.id === selected) nextSelected = savedList[i].id;
            return { def: toDef(savedList[i]), isNew: false, sortOrder: savedList[i].sortOrder };
          })
        );
        this.selectedId.set(nextSelected);
        this.dirtyIds.set(new Set());
        this.dirtyChange.emit(false);
        this.saving.set(false);
        this.publish();
        this.flash('敵を保存しました');
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.flash(err.message || '保存に失敗しました');
      }
    });
  }

  // ===== CSV の書き出し・取り込み(front#297) =====

  /** 画面の敵(保存していない変更も含む)を CSV でダウンロードする */
  exportCsv(): void {
    const csv = enemiesToCsv(this.rows());
    const d = new Date();
    const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `rpg-enemies-${stamp}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /** 選んだ CSV を読み、今の敵との違いを確認の画面に出す */
  async importCsv(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || !this.rows().length) return;
    const text = decodeCsv(await file.arrayBuffer());
    this.csvFileName.set(file.name);
    this.csvImport.set(readEnemyCsv(text, this.rows().map((r) => r.def), this.rows()[0].def));
  }

  cancelImport(): void {
    this.csvImport.set(null);
  }

  /** 確認した違いを画面の敵に反映する(保存は「敵を保存する」で行う) */
  applyImport(): void {
    const result = this.csvImport();
    if (!result || result.errors.length) return;
    const changed = new Map(result.changes.map((c) => [c.id, c.def]));
    const added = result.additions.map((a) => ({ def: { ...a.def, id: `new-${++this.newCount}` } as EnemyDef, isNew: true }));
    this.rows.update((rows) => [...rows.map((r) => (changed.has(r.def.id) ? { ...r, def: changed.get(r.def.id)! } : r)), ...added]);
    for (const id of [...changed.keys(), ...added.map((a) => a.def.id)]) this.markDirty(id);
    this.csvImport.set(null);
    this.restartAttack();
    this.flash(`CSV を反映しました（変わる敵 ${changed.size}・増える敵 ${added.length}）。「敵を保存する」で保存してください`);
  }

  // 保存してある敵(新しい敵・保存していない変更は含めない)を、ゲームの敵の種類にする
  private publish(): void {
    const list = this.rows()
      .filter((r) => !r.isNew)
      .map((r, i) => ({ ...r.def, sortOrder: i + 1 }) as RpgEnemy);
    setEnemies(list);
    this.saved.emit(list);
  }

  private flash(text: string): void {
    this.message.set(text);
    setTimeout(() => this.message() === text && this.message.set(''), 3000);
  }

  // ===== プレビュー =====

  private restartAttack(): void {
    this.actT = 0;
  }

  private loop(): void {
    const now = performance.now();
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.time += dt;
    this.drawPreview(dt);
    this.frame = requestAnimationFrame(() => this.loop());
  }

  private drawPreview(dt: number): void {
    const cv = this.preview()?.nativeElement;
    const def = this.selected()?.def;
    const c = cv?.getContext('2d');
    if (!cv || !c) return;
    const dpr = window.devicePixelRatio || 1;
    const w = cv.clientWidth;
    const h = cv.clientHeight;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
    }
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, w, h);
    if (!def) return;

    // 草のマス(5×5)
    const s = Math.min(2.2, w / 340);
    const cx = w / 2;
    const cy = h * 0.6;
    const tiles = ['#8fd16a', '#88cb63', '#95d771'];
    for (let gy = -2; gy <= 2; gy++) {
      for (let gx = -2; gx <= 2; gx++) {
        const x = cx + (gx - gy) * 32 * s;
        const y = cy + (gx + gy) * 16 * s;
        c.beginPath(); c.moveTo(x, y - 16 * s); c.lineTo(x + 32 * s, y); c.lineTo(x, y + 16 * s); c.lineTo(x - 32 * s, y); c.closePath();
        c.fillStyle = tiles[(((gx * 7 + gy * 13) % 3) + 3) % 3];
        c.fill();
      }
    }

    // 選んだ攻撃を、少し間をあけてくり返す
    const { duration, hitAt } = attackTiming(def);
    if (this.actT !== null) {
      this.actT += dt;
      if (this.actT > duration) {
        this.actT = null;
        this.idle = 0;
      }
    } else if ((this.idle += dt) > 1) {
      this.actT = 0;
    }
    const t = this.actT ?? 0;
    const k = this.actT === null ? 1 : t / duration;
    const d = this.dir();

    // 敵は左(右向きのとき)、相手(プレイヤーの人形)は反対側。離れた場所への攻撃は、射程に合わせて離す
    const gap = SPELLS.includes(def.attack) ? Math.max(1, def.size, Math.min(def.range, 3))
      : movesToTarget(def) ? Math.max(1, def.size, Math.min(def.dash, 3)) : Math.max(1, def.size);
    const ex0 = cx - d * 32 * s * gap;
    const px = cx + d * 32 * s * gap;
    let ox = 0;
    let lunge = 0;
    if (this.actT !== null && movesToTarget(def) && t > def.charge) {
      const dist = (px - ex0) - d * 24 * s;
      const go = Math.min(1, (t - def.charge) / Math.max(0.01, hitAt - def.charge));
      const back = t > hitAt ? Math.min(1, (t - hitAt) / Math.max(0.01, duration - hitAt)) : 0;
      ox = dist * go * (1 - back);
    }
    if (this.actT !== null && (def.attack === 'tackle' || def.attack === 'claw' || def.attack === 'bite') && !movesToTarget(def) && t >= hitAt) {
      lunge = Math.max(0, 1 - (t - hitAt) * 5);
    }
    if (this.actT !== null && def.attack === 'bite' && t < duration) ox = Math.sin(k * Math.PI) * 26 * s * d;
    const ex = ex0 + ox + (this.actT !== null ? chargeShake(def, t, this.time) * s : 0) + lunge * 5 * d * s;
    const ey = cy - (this.actT !== null ? jumpHeight(def, t, s) : 0);
    const hitting = this.actT !== null && t >= hitAt && t < hitAt + 0.2 && (def.attack !== 'shockwave' || gap <= def.radius + 0.5);

    // 相手(プレイヤーの人形)。当たったら赤くなる
    c.save(); c.translate(px, cy); c.scale(s * 0.9, s * 0.9);
    c.fillStyle = 'rgba(0,0,0,0.18)'; c.beginPath(); c.ellipse(0, 0, 13, 5, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = hitting ? '#ff9b9b' : '#3b82f6'; c.beginPath(); c.roundRect(-9, -20, 18, 16, 6); c.fill();
    c.fillStyle = '#ffe0bd'; c.beginPath(); c.arc(0, -31, 12, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#6b3f1f'; c.beginPath(); c.arc(0, -32, 13, Math.PI, 0); c.closePath(); c.fill();
    c.restore();

    // 敵
    c.save(); c.translate(ex, ey); c.scale(s, s);
    const top = drawEnemyBody(c, def, { dir: d, time: this.time, aggro: this.actT !== null, lunge });
    c.restore();
    if (this.actT !== null) {
      drawAttackEffect(c, {
        attack: def.attack, k, time: this.time, ex: ex0 + ox, ey: cy, tx: px, ty: cy, dir: d, s,
        radiusPx: (def.radius + 0.5) * 32 * s * 1.4, hitK: hitAt / duration
      });
    }
    if (hitting) {
      c.font = `800 ${Math.round(10 * s)}px "Segoe UI", sans-serif`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.lineWidth = 4;
      c.strokeStyle = 'rgba(17,24,39,0.75)';
      c.strokeText(`-${def.atk}`, px, cy - 60 * s);
      c.fillStyle = '#ff6b6b';
      c.fillText(`-${def.atk}`, px, cy - 60 * s);
    }

    // HPバーと名前(ゲームと同じ形)
    c.save(); c.translate(ex, ey - top * s - 14 * s); c.scale(s * 0.8, s * 0.8);
    c.fillStyle = 'rgba(17,24,39,0.6)'; c.beginPath(); c.roundRect(-18, 0, 36, 6, 3); c.fill();
    c.fillStyle = '#4ade80'; c.beginPath(); c.roundRect(-17, 1, 34, 4, 2); c.fill();
    c.font = 'bold 11px "Yu Gothic", Meiryo, sans-serif';
    const name = def.name || '（名前なし）';
    const tw = c.measureText(name).width + 12;
    c.fillStyle = this.actT !== null || def.boss ? 'rgba(220,38,38,0.85)' : 'rgba(17,24,39,0.6)';
    c.beginPath(); c.roundRect(-tw / 2, -21, tw, 17, 8); c.fill();
    c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(name, 0, -12.5);
    c.restore();
  }
}

/** item を target の前(after なら後ろ)へ動かした新しい並びを返す(front#299) */
export function moveItem<T>(list: T[], item: T, target: T, after: boolean): T[] {
  if (item === target) return list;
  const rest = list.filter((x) => x !== item);
  const at = rest.indexOf(target) + (after ? 1 : 0);
  return [...rest.slice(0, at), item, ...rest.slice(at)];
}

function toDef(e: RpgEnemy): EnemyDef {
  const { sortOrder: _s, updatedAt: _u, ...rest } = e;
  return rest as EnemyDef;
}

function toInput(r: EnemyRow, sortOrder: number): RpgEnemyInput {
  const { id, ...rest } = r.def;
  return { ...rest, id: r.isNew ? null : id, name: rest.name.trim(), sortOrder };
}

// 一覧・体の形の見本(足元を下のほうに置き、大きさに合わせて縮める)
function drawThumb(cv: HTMLCanvasElement, def: EnemyDef): void {
  const c = cv.getContext('2d');
  if (!c) return;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, cv.width, cv.height);
  const sc = (cv.width / 88) * (1.25 / Math.max(1, def.size * 0.85)) * thumbFitOf(def);
  c.translate(cv.width / 2, cv.height * 0.86);
  c.scale(sc, sc);
  // 化ける敵(front#270)は、ばけていない本当の姿を見せる
  drawEnemyBody(c, def, { dir: 1, time: 0, aggro: !!disguiseOf(def) });
}
