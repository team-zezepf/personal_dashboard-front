import { Component, ElementRef, HostListener, OnDestroy, afterNextRender, computed, inject, signal, viewChild } from '@angular/core';
import { HeaderComponent } from '../../components/header/header.component';
import { RpgService } from '../../services/rpg.service';
import { AuthService } from '../../services/auth.service';
import { RpgPointShopItem } from '../../models/rpg.models';
import { environment } from '../../../environments/environment';
import { AREAS, AreaDef, ITEMS, POINT_SHOP_ICONS, SHOP_ITEMS, itemStatLabel } from '../../rpg/rpg-data';
import { Npc, RpgGame, RpgGameEvents } from '../../rpg/rpg-game';
import { RpgRenderer } from '../../rpg/rpg-render';
import { GEM_SIZE, GEM_TIP, GemCursor, GemState } from '../../rpg/rpg-cursor';

// 保存はデータのリポジトリへの自動コミットになるため、変更があっても30秒に1回までにする
// (画面を離れるとき・ポイント交換のときはすぐ保存する)
const AUTOSAVE_MS = 30_000;
const MAX_LOGS = 8;
const AREA_TITLE_MS = 1800;

interface ShopRow {
  id: string;
  icon: string;
  name: string;
  desc: string;
  price: string;
  buttonLabel: string;
  disabled: boolean;
}

@Component({
  selector: 'app-rpg-page',
  standalone: true,
  imports: [HeaderComponent],
  templateUrl: './rpg.component.html',
  styleUrl: './rpg.component.css'
})
export class RpgPageComponent implements OnDestroy {
  private rpgService = inject(RpgService);
  private authService = inject(AuthService);

  private readonly gameArea = viewChild.required<ElementRef<HTMLDivElement>>('gameArea');
  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly gemCanvas = viewChild.required<ElementRef<HTMLCanvasElement>>('gemCanvas');

  readonly isLoading = signal(true);
  readonly loadError = signal('');

  // ゲームの状態は RpgGame が持つ(毎フレーム変わるため signal にしない)。
  // 表示に関わる変化があったときだけ version を上げて、サイド欄などを描き直す
  private readonly version = signal(0);
  readonly logs = signal<string[]>([]);
  readonly area = signal<AreaDef>(AREAS.plain);
  readonly fading = signal(false);
  readonly areaTitle = signal<AreaDef | null>(null);
  readonly knockedOut = signal(false);

  // 会話中の村人と、表示しているセリフの番号
  readonly talking = signal<{ npc: Npc; index: number } | null>(null);
  readonly shopMode = signal<'shop' | 'exchange' | null>(null);
  readonly pointShop = signal<RpgPointShopItem[]>([]);
  readonly exchanging = signal(false);
  readonly shopError = signal('');

  readonly gemVisible = signal(false);
  readonly gemPosition = signal<[number, number]>([0, 0]);
  readonly gemSize = GEM_SIZE;

  readonly points = computed(() => this.authService.currentUser()?.points ?? 0);

  readonly stats = computed(() => {
    this.version();
    const game = this.game;
    if (!game) return null;
    const p = game.player;
    const maxHp = game.maxHp();
    const nextExp = game.nextExp();
    const weapon = ITEMS[p.weapon];
    const armor = ITEMS[p.armor];
    return {
      level: p.level,
      hp: Math.max(0, p.hp),
      maxHp,
      hpRate: (Math.max(0, p.hp) / maxHp) * 100,
      exp: p.exp,
      nextExp,
      expRate: (p.exp / nextExp) * 100,
      atk: game.atk(),
      def: game.def(),
      gold: p.gold,
      weapon: { icon: weapon.icon, name: weapon.name, plus: `攻撃 +${weapon.atk ?? 0}` },
      armor: { icon: armor.icon, name: armor.name, plus: `防御 +${armor.def ?? 0}` }
    };
  });

  readonly inventory = computed(() => {
    this.version();
    const game = this.game;
    if (!game) return [];
    return Object.keys(ITEMS)
      .filter((id) => game.owned(id))
      .map((id) => {
        const item = ITEMS[id];
        return {
          id,
          icon: item.icon,
          name: item.name,
          usable: item.type === 'use',
          count: game.player.inv[id],
          equipped: game.player.weapon === id || game.player.armor === id
        };
      });
  });

  readonly shopRows = computed<ShopRow[]>(() => {
    this.version();
    const game = this.game;
    const mode = this.shopMode();
    if (!game || !mode) return [];
    if (mode === 'shop') {
      return SHOP_ITEMS.map((id) => {
        const item = ITEMS[id];
        const price = item.price ?? 0;
        const has = item.type !== 'use' && game.owned(id);
        return {
          id,
          icon: item.icon,
          name: item.name,
          desc: item.type === 'use' ? `${item.desc}（${game.player.inv[id] ?? 0}個持っている）` : itemStatLabel(item),
          price: `${price} G`,
          buttonLabel: has ? '持っている' : '買う',
          disabled: has || game.player.gold < price
        };
      });
    }
    return this.pointShop().map((shopItem) => {
      const has = !!ITEMS[shopItem.id] && game.owned(shopItem.id);
      return {
        id: shopItem.id,
        icon: POINT_SHOP_ICONS[shopItem.id] ?? '🎁',
        name: shopItem.name,
        desc: shopItem.description,
        price: `${shopItem.point} pt`,
        buttonLabel: has ? '持っている' : '交換する',
        disabled: has || this.points() < shopItem.point || this.exchanging()
      };
    });
  });

  private game: RpgGame | null = null;
  private renderer: RpgRenderer | null = null;
  private gem: GemCursor | null = null;
  private frameId = 0;
  private lastFrame = 0;
  private dpr = 1;
  private resizeObserver: ResizeObserver | null = null;
  private autosaveTimer: ReturnType<typeof setInterval> | null = null;
  private areaTitleTimer: ReturnType<typeof setTimeout> | null = null;
  // セーブデータを読み込めるまでは保存しない(読み込みに失敗したとき、最初の状態で上書きしないように)
  private loaded = false;
  private dirty = false;
  private saving = false;

  private readonly onPageHide = () => {
    if (this.loaded && this.dirty && this.game) this.rpgService.saveOnUnload(this.game.toSaveInput());
  };

  constructor() {
    afterNextRender(() => this.start());
  }

  // ===== 開始・終了 =====

  private start(): void {
    const ctx = this.canvas().nativeElement.getContext('2d');
    if (!ctx) {
      this.loadError.set('この画面はお使いのブラウザでは表示できません');
      this.isLoading.set(false);
      return;
    }
    const game = new RpgGame(this.createEvents());
    this.game = game;
    this.renderer = new RpgRenderer(ctx);
    this.gem = new GemCursor(this.gemCanvas().nativeElement);
    this.resize();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.gameArea().nativeElement);
    window.addEventListener('pagehide', this.onPageHide);
    this.exposeForTest();

    this.rpgService.getSave().subscribe({
      next: (save) => {
        game.loadSave(save);
        this.area.set(game.area);
        this.loaded = true;
        this.isLoading.set(false);
        this.log(game.area.id === 'plain' ? `${game.area.name}にやってきた。村長に話しかけてみよう` : `${game.area.name}にやってきた`);
        this.showAreaTitle(game.area);
      },
      error: () => {
        this.loadError.set('セーブデータの読み込みに失敗しました。時間をおいて開き直してください');
        this.isLoading.set(false);
      }
    });
    this.rpgService.getPointShop().subscribe({ next: (items) => this.pointShop.set(items), error: () => undefined });
    this.autosaveTimer = setInterval(() => this.saveIfDirty(), AUTOSAVE_MS);

    this.lastFrame = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - this.lastFrame) / 1000);
      this.lastFrame = now;
      if (this.loaded) game.update(dt);
      this.renderer!.draw(game, this.dpr);
      this.drawGem(dt);
      this.frameId = requestAnimationFrame(loop);
    };
    this.frameId = requestAnimationFrame(loop);
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.frameId);
    this.resizeObserver?.disconnect();
    if (this.autosaveTimer) clearInterval(this.autosaveTimer);
    if (this.areaTitleTimer) clearTimeout(this.areaTitleTimer);
    window.removeEventListener('pagehide', this.onPageHide);
    // ほかの画面へ移るときは、まだ保存していない分を保存する
    this.saveIfDirty();
    this.game?.dispose();
    if (!environment.production) delete (window as unknown as Record<string, unknown>)['rpgTest'];
  }

  private createEvents(): RpgGameEvents {
    return {
      log: (message) => this.log(message),
      statsChanged: () => this.version.update((v) => v + 1),
      inventoryChanged: () => this.version.update((v) => v + 1),
      dirty: () => (this.dirty = true),
      talk: (npc) => {
        this.talking.set({ npc, index: 0 });
        this.syncLock();
      },
      fade: (on) => this.fading.set(on),
      areaEntered: (area) => {
        this.area.set(area);
        this.showAreaTitle(area);
      },
      knockedOut: (on) => this.knockedOut.set(on)
    };
  }

  private resize(): void {
    const game = this.game;
    if (!game) return;
    const el = this.gameArea().nativeElement;
    const canvas = this.canvas().nativeElement;
    this.dpr = window.devicePixelRatio || 1;
    game.viewW = el.clientWidth;
    game.viewH = el.clientHeight;
    canvas.width = Math.round(el.clientWidth * this.dpr);
    canvas.height = Math.round(el.clientHeight * this.dpr);
  }

  // ===== 保存 =====

  private saveIfDirty(): void {
    if (!this.loaded || !this.dirty || this.saving || !this.game) return;
    this.dirty = false;
    this.saving = true;
    this.rpgService.save(this.game.toSaveInput()).subscribe({
      next: () => (this.saving = false),
      error: () => {
        // 保存できなかった分は、次の機会にもう一度保存する
        this.saving = false;
        this.dirty = true;
      }
    });
  }

  // ===== マウス・キーボード =====

  onMouseMove(event: MouseEvent): void {
    const game = this.game;
    if (!game) return;
    game.mouseMove(event.offsetX, event.offsetY);
  }

  onMouseLeave(): void {
    this.game?.mouseLeave();
  }

  onClick(event: MouseEvent): void {
    this.game?.click(event.offsetX, event.offsetY);
  }

  // 宝石のカーソルは、ゲーム画面の中(会話・お店の上も含む)ならどこでもマウスに付いていく
  onAreaMouseMove(event: MouseEvent): void {
    const rect = this.gameArea().nativeElement.getBoundingClientRect();
    this.gemPosition.set([event.clientX - rect.left - GEM_TIP[0], event.clientY - rect.top - GEM_TIP[1]]);
    this.gemVisible.set(true);
  }

  onAreaMouseLeave(): void {
    this.gemVisible.set(false);
  }

  private drawGem(dt: number): void {
    const game = this.game;
    if (!this.gem || !game || !this.gemVisible()) return;
    const state: GemState = game.hover ? (game.hover.kind === 'npc' ? 'talk' : 'attack') : 'normal';
    this.gem.draw(state, dt, game.time, this.dpr);
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (event.key === '1' && !this.talking() && !this.shopMode()) this.game?.quickPotion();
    if (event.key === 'Escape') {
      this.talking.set(null);
      this.closeShop();
    }
  }

  // ===== 会話 =====

  nextLine(): void {
    const current = this.talking();
    if (!current) return;
    if (current.index + 1 < current.npc.lines.length) {
      this.talking.set({ npc: current.npc, index: current.index + 1 });
      return;
    }
    this.talking.set(null);
    if (current.npc.after) this.openShop(current.npc.after);
    this.syncLock();
  }

  // 会話・お店を開いている間は、ゲーム画面をクリックしても動かない
  private syncLock(): void {
    if (this.game) this.game.locked = !!this.talking() || !!this.shopMode();
  }

  // ===== お店・ポイント交換所 =====

  private openShop(mode: 'shop' | 'exchange'): void {
    this.shopError.set('');
    this.shopMode.set(mode);
    this.syncLock();
  }

  closeShop(): void {
    this.shopMode.set(null);
    this.syncLock();
  }

  onShopButton(id: string): void {
    const game = this.game;
    if (!game) return;
    if (this.shopMode() === 'shop') {
      game.buy(id);
      return;
    }
    this.exchange(id);
  }

  private exchange(itemId: string): void {
    const game = this.game;
    const item = this.pointShop().find((i) => i.id === itemId);
    if (!game || !item || this.exchanging()) return;
    this.exchanging.set(true);
    this.shopError.set('');
    this.rpgService.exchangePoints(itemId, game.toSaveInput()).subscribe({
      next: (result) => {
        game.applyExchange(result.save);
        // 交換と一緒に今の状態も保存された
        this.dirty = false;
        this.exchanging.set(false);
        this.log(`ポイント交換所で${item.name}と交換した（-${item.point}pt）`);
      },
      error: (err: Error) => {
        this.exchanging.set(false);
        this.shopError.set(err.message || '交換できませんでした');
      }
    });
  }

  // ===== 持ち物 =====

  useItem(id: string): void {
    this.game?.useItem(id);
  }

  equip(id: string): void {
    this.game?.equip(id);
  }

  // ===== 表示 =====

  private log(message: string): void {
    this.logs.update((logs) => [message, ...logs].slice(0, MAX_LOGS));
  }

  private showAreaTitle(area: AreaDef): void {
    this.areaTitle.set(area);
    if (this.areaTitleTimer) clearTimeout(this.areaTitleTimer);
    this.areaTitleTimer = setTimeout(() => this.areaTitle.set(null), AREA_TITLE_MS);
  }

  // E2Eテストで、キャンバスの中の村人をクリックする位置を求められるようにする(本番のビルドでは出さない)
  private exposeForTest(): void {
    if (environment.production) return;
    (window as unknown as Record<string, unknown>)['rpgTest'] = {
      npcPosition: (name: string): [number, number] | null => {
        const npc = this.game?.npcs.find((n) => n.name === name);
        return npc && this.game ? this.game.screenPositionOf(npc) : null;
      },
      isIdle: (): boolean => !!this.game && !this.game.player.path.length && !this.game.player.target && !this.game.transitioning
    };
  }
}
