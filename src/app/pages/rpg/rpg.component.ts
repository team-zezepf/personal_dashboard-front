import { Component, ElementRef, HostListener, OnDestroy, afterNextRender, computed, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { HeaderComponent } from '../../components/header/header.component';
import { RpgLookEditorComponent } from '../../components/rpg-look-editor/rpg-look-editor.component';
import { RpgService } from '../../services/rpg.service';
import { AuthService } from '../../services/auth.service';
import { RpgBgm, RpgDungeon, RpgEnemy, RpgLook, RpgPointShopItem, RpgQuest } from '../../models/rpg.models';
import { DEFAULT_ENEMIES, ENEMIES, setEnemies } from '../../rpg/rpg-enemy';
import { BgmPlayer } from '../../rpg/rpg-bgm';
import { environment } from '../../../environments/environment';
import {
  ITEMS,
  MAX_LUCK,
  POINT_SHOP_ICONS,
  SHOP_ITEMS,
  STAT_DEFS,
  StatKey,
  Stats,
  ZERO_STATS,
  attackIntervalOf,
  baseAtkOf,
  baseDefOf,
  critRateOf,
  dropRateOf,
  evadeRateOf,
  healRateOf,
  itemStatLabel,
  maxHpOf,
  recLabel,
  swordColorOf,
  walkSpeedOf
} from '../../rpg/rpg-data';
import { Npc, RpgGame, RpgGameEvents } from '../../rpg/rpg-game';
import { RpgRenderer } from '../../rpg/rpg-render';
import { GEM_SIZE, GEM_TIP, GemCursor, GemState } from '../../rpg/rpg-cursor';

// 保存はデータのリポジトリへの自動コミットになるため、変更があっても30秒に1回までにする
// (画面を離れるとき・ポイント交換のときはすぐ保存する)
const AUTOSAVE_MS = 30_000;
const MAX_LOGS = 8;
const AREA_TITLE_MS = 1800;
// 宝石のカーソルを隠し、手の形にする押せる部品(front#244)
const CONTROL_SELECTOR = 'button, input, select, a';

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
  imports: [HeaderComponent, RpgLookEditorComponent],
  templateUrl: './rpg.component.html',
  styleUrl: './rpg.component.css'
})
export class RpgPageComponent implements OnDestroy {
  private rpgService = inject(RpgService);
  private authService = inject(AuthService);

  // マップ作成画面の「この場所からテストプレイ」で開いたとき(/rpg?test=<エリアのID>)。
  // そのエリアの出発地点から始め、セーブデータは保存しない
  readonly testArea = inject(ActivatedRoute).snapshot.queryParamMap.get('test');
  readonly recLabel = recLabel;

  private readonly gameArea = viewChild.required<ElementRef<HTMLDivElement>>('gameArea');
  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly gemCanvas = viewChild.required<ElementRef<HTMLCanvasElement>>('gemCanvas');

  readonly isLoading = signal(true);
  readonly loadError = signal('');

  // ゲームの状態は RpgGame が持つ(毎フレーム変わるため signal にしない)。
  // 表示に関わる変化があったときだけ version を上げて、サイド欄などを描き直す
  private readonly version = signal(0);
  readonly logs = signal<string[]>([]);
  readonly fading = signal(false);
  // ダンジョンに入ったときに画面の中央に大きく出す、ダンジョンの名前と推奨レベル
  readonly areaTitle = signal<RpgDungeon | null>(null);
  readonly knockedOut = signal(false);

  // 会話中のNPCと、話しているセリフ・表示しているセリフの番号。
  // クエスト(front#239)の会話では、依頼(offer)・進み具合(progress)・報告(report)のどれか
  readonly talking = signal<{
    npc: Npc;
    lines: string[];
    index: number;
    quest?: { quest: RpgQuest; mode: 'offer' | 'progress' | 'report' };
  } | null>(null);
  // 依頼の最後のセリフでは「引き受ける/やめておく」を出す
  readonly choosing = computed(() => {
    const t = this.talking();
    return !!t && t.quest?.mode === 'offer' && t.index === t.lines.length - 1;
  });
  // 受けていて、まだ報告していないクエスト(右の欄)
  readonly quests = computed(() => {
    this.version();
    const game = this.game;
    if (!game) return [];
    return game.questLog.activeQuests(game.questEntries()).map((e) => ({
      id: e.quest.id,
      title: e.quest.title,
      giver: e.giver,
      progress: this.questProgressText(e.quest),
      ratio: game.questLog.progressOf(e.quest, game.player.inv) / e.quest.count,
      cleared: game.questLog.isCleared(e.quest, game.player.inv)
    }));
  });
  readonly shopMode = signal<'shop' | 'exchange' | null>(null);
  readonly pointShop = signal<RpgPointShopItem[]>([]);
  readonly exchanging = signal(false);
  readonly shopError = signal('');

  // ===== BGM(front#218) =====
  private readonly bgmPlayer = new BgmPlayer();
  private bgms: RpgBgm[] = [];
  readonly settingsOpen = signal(false);
  readonly bgmVolume = signal(Math.round(this.bgmPlayer.settings.volume * 100));
  readonly bgmMuted = signal(this.bgmPlayer.settings.muted);
  readonly bgmUnlocked = signal(false);
  // 今のダンジョンの曲(なければ null)
  readonly areaBgm = signal<RpgBgm | null>(null);

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
      statPoints: p.statPoints,
      weapon: { icon: weapon.icon, name: weapon.name, plus: `攻撃 +${weapon.atk ?? 0}` },
      armor: { icon: armor.icon, name: armor.name, plus: `防御 +${armor.def ?? 0}` }
    };
  });

  // ===== 見た目(front#224)。サイド欄の「見た目を変える」で開くモーダルで選び、「決める」で保存する =====
  // 選んでいる途中の見た目(null なら閉じている)
  readonly lookDraft = signal<RpgLook | null>(null);
  readonly lookSwordColor = signal('#c08a52');

  // ===== ステータス(front#223)。左下のパネルの「ステータス」で開くモーダルで、見る・振り分ける =====
  readonly statusOpen = signal(false);
  // モーダルで＋を押した数(「決める」まではゲームに反映しない)
  readonly draft = signal<Stats>({ ...ZERO_STATS });

  readonly statusView = computed(() => {
    this.version();
    const game = this.game;
    if (!game) return null;
    const p = game.player;
    const draft = this.draft();
    const after: Stats = { ...p.stats };
    for (const def of STAT_DEFS) after[def.key] += draft[def.key];
    const used = STAT_DEFS.reduce((n, def) => n + draft[def.key], 0);
    const left = p.statPoints - used;
    const weaponAtk = ITEMS[p.weapon]?.atk ?? 0;
    const armorDef = ITEMS[p.armor]?.def ?? 0;
    const value = (s: Stats, key: StatKey): number =>
      key === 'hp' ? maxHpOf(s) : key === 'atk' ? baseAtkOf(s) + weaponAtk : key === 'def' ? baseDefOf(s) + armorDef : s[key];
    const unit = (key: StatKey) => (key === 'luk' ? `/${MAX_LUCK}` : key === 'mag' || key === 'spd' ? 'pt' : '');
    // 歩く速さ・攻撃の間隔などは、おまけの情報として小さく出す(振り分け中は、変わる前 → 後)
    const meta = (label: string, f: (s: Stats) => string) => ({ label, before: f(p.stats), after: f(after) });
    return {
      level: p.level,
      allocating: p.statPoints > 0,
      left,
      used,
      rows: STAT_DEFS.map((def) => ({
        ...def,
        value: value(after, def.key),
        changed: draft[def.key] > 0,
        unit: unit(def.key),
        added: draft[def.key],
        canAdd: left > 0 && (def.max === undefined || after[def.key] < def.max)
      })),
      meta: [
        meta('歩く速さ', (s) => `${walkSpeedOf(s).toFixed(1)}マス/秒`),
        meta('攻撃の間隔', (s) => `${attackIntervalOf(s).toFixed(2)}秒`),
        meta('会心', (s) => `${Math.round(critRateOf(s) * 100)}%`),
        meta('回避', (s) => `${Math.round(evadeRateOf(s) * 100)}%`),
        meta('アイテム', (s) => `×${dropRateOf(s).toFixed(2)}`),
        meta('回復量', (s) => `×${healRateOf(s).toFixed(2)}`)
      ]
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
    this.renderer = new RpgRenderer(ctx);
    this.gem = new GemCursor(this.gemCanvas().nativeElement);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.gameArea().nativeElement);
    window.addEventListener('pagehide', this.onPageHide);
    this.exposeForTest();

    // マップ(地形)とセーブデータがそろってからゲームを作る
    // BGMの一覧が読めなくても、曲なしで遊べるようにする
    const bgms$ = this.rpgService.getBgms().pipe(catchError(() => of([] as RpgBgm[])));
    // 敵の種類(front#229)が読めなければ、最初の9種類で遊べるようにする
    const enemies$ = this.rpgService.getEnemies().pipe(catchError(() => of(DEFAULT_ENEMIES as unknown as RpgEnemy[])));
    forkJoin({
      maps: this.rpgService.getMaps(),
      dungeons: this.rpgService.getDungeons(),
      save: this.rpgService.getSave(),
      bgms: bgms$,
      enemies: enemies$
    }).subscribe({
      next: ({ maps, dungeons, save, bgms, enemies }) => {
        this.bgms = bgms;
        setEnemies(enemies);
        if (maps.length === 0) {
          this.loadError.set('エリアがまだ1つもありません');
          this.isLoading.set(false);
          return;
        }
        const game = new RpgGame(this.createEvents(), maps, dungeons);
        this.game = game;
        this.resize();
        game.loadSave(save);
        const test = this.testArea ? game.mapById(this.testArea) : undefined;
        if (test) {
          game.loadMap(test);
          game.player.x = test.startX;
          game.player.y = test.startY;
        }
        // テストプレイでは保存しない
        this.loaded = !this.testArea;
        this.playDungeonBgm(game.dungeon);
        this.isLoading.set(false);
        this.log(game.area.id === 'plain' ? `${game.dungeon.name}にやってきた。村長に話しかけてみよう` : `${game.dungeon.name}にやってきた`);
        this.showAreaTitle(game.dungeon);
        this.startLoop(game);
      },
      error: () => {
        this.loadError.set('セーブデータの読み込みに失敗しました。時間をおいて開き直してください');
        this.isLoading.set(false);
      }
    });
    this.rpgService.getPointShop().subscribe({ next: (items) => this.pointShop.set(items), error: () => undefined });
    this.autosaveTimer = setInterval(() => this.saveIfDirty(), AUTOSAVE_MS);
  }

  private startLoop(game: RpgGame): void {
    this.lastFrame = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - this.lastFrame) / 1000);
      this.lastFrame = now;
      game.update(dt);
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
    this.bgmPlayer.dispose();
    if (!environment.production) delete (window as unknown as Record<string, unknown>)['rpgTest'];
  }

  private createEvents(): RpgGameEvents {
    return {
      log: (message) => this.log(message),
      statsChanged: () => this.version.update((v) => v + 1),
      inventoryChanged: () => this.version.update((v) => v + 1),
      dirty: () => (this.dirty = true),
      talk: (npc) => {
        this.talking.set(this.conversationOf(npc));
        this.syncLock();
      },
      fade: (on) => this.fading.set(on),
      dungeonEntered: (dungeon) => {
        this.showAreaTitle(dungeon);
        this.playDungeonBgm(dungeon);
      },
      captureScreen: () => this.captureScreen(),
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
    // ゲーム画面をクリックしたら、開いている設定は閉じる
    if (this.settingsOpen()) {
      this.settingsOpen.set(false);
      return;
    }
    this.game?.click(event.offsetX, event.offsetY);
  }

  // ===== BGM =====

  private playDungeonBgm(dungeon: RpgDungeon): void {
    const bgm = this.bgms.find((b) => b.id === dungeon.bgmId) ?? null;
    this.areaBgm.set(bgm);
    this.bgmPlayer.play(bgm ? this.rpgService.bgmUrl(bgm) : null);
  }

  // ブラウザは、画面を一度クリックするまで音を出せない。ゲーム画面の最初のクリックで流し始める
  onAreaPointerDown(): void {
    if (this.bgmUnlocked()) return;
    this.bgmPlayer.unlock();
    this.bgmUnlocked.set(true);
  }

  toggleSettings(): void {
    this.settingsOpen.update((open) => !open);
  }

  toggleMute(): void {
    this.bgmMuted.update((muted) => !muted);
    this.bgmPlayer.setMuted(this.bgmMuted());
  }

  changeVolume(value: number): void {
    this.bgmVolume.set(value);
    this.bgmPlayer.setVolume(value / 100);
  }

  // 宝石のカーソルは、ゲーム画面の中(会話・お店の上も含む)ならどこでもマウスに付いていく。
  // ただしボタン・音量バーなど押せる部品の上では隠し、手の形のカーソルにする(front#244)
  onAreaMouseMove(event: MouseEvent): void {
    const rect = this.gameArea().nativeElement.getBoundingClientRect();
    this.gemPosition.set([event.clientX - rect.left - GEM_TIP[0], event.clientY - rect.top - GEM_TIP[1]]);
    this.gemVisible.set(!(event.target as Element | null)?.closest?.(CONTROL_SELECTOR));
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
      this.closeStatus();
      this.closeLook();
    }
  }

  // ===== 会話 =====

  nextLine(): void {
    const current = this.talking();
    if (!current) return;
    if (current.index + 1 < current.lines.length) {
      this.talking.set({ ...current, index: current.index + 1 });
      return;
    }
    // 依頼の最後のセリフでは、「引き受ける/やめておく」を選ぶまで閉じない
    if (current.quest?.mode === 'offer') return;
    this.talking.set(null);
    if (current.quest?.mode === 'report') this.game?.reportQuest(current.quest.quest);
    if (current.npc.role === 'shop' || current.npc.role === 'exchange') this.openShop(current.npc.role);
    this.syncLock();
  }

  // ===== クエスト(front#239) =====

  /** 話しかけたNPCと話す内容。クエスト依頼は、今のクエストの依頼・進み具合・報告のどれか(すべて終わればふだんのセリフ) */
  private conversationOf(npc: Npc): NonNullable<ReturnType<typeof this.talking>> {
    const game = this.game;
    const quest = game?.questLog.currentQuest(npc);
    const plain = { npc, lines: npc.lines.length ? npc.lines : ['……'], index: 0 };
    if (!game || !quest) return plain;
    const log = game.questLog;
    if (!log.stateOf(quest)) {
      return { npc, lines: quest.offerLines.length ? quest.offerLines : [`「${quest.title}」を引き受けてくれんか？`], index: 0, quest: { quest, mode: 'offer' } };
    }
    if (log.isCleared(quest, game.player.inv)) {
      return { npc, lines: quest.doneLines.length ? quest.doneLines : ['ありがとう！ これはお礼だ。'], index: 0, quest: { quest, mode: 'report' } };
    }
    const lines = quest.progressLines.length ? [...quest.progressLines] : ['たのんだぞ。'];
    if (quest.kind !== 'visit') lines[lines.length - 1] += `（${log.progressOf(quest, game.player.inv)}/${quest.count}）`;
    return { npc, lines, index: 0, quest: { quest, mode: 'progress' } };
  }

  acceptQuest(): void {
    const quest = this.talking()?.quest?.quest;
    if (quest) this.game?.acceptQuest(quest);
    this.talking.set(null);
    this.syncLock();
  }

  declineQuest(): void {
    this.talking.set(null);
    this.syncLock();
  }

  // クエストの目標と進み具合(例: スライムをたおす(2/3))
  private questProgressText(quest: RpgQuest): string {
    const game = this.game;
    const n = game ? game.questLog.progressOf(quest, game.player.inv) : 0;
    switch (quest.kind) {
      case 'defeat': return `${ENEMIES[quest.target]?.name ?? quest.target}をたおす（${n}/${quest.count}）`;
      case 'collect': return `${ITEMS[quest.target]?.name ?? quest.target}を集める（${n}/${quest.count}）`;
      default: return `${quest.target}に会う（${n}/1）`;
    }
  }

  // 会話・お店を開いている間は、ゲーム画面をクリックしても動かない
  private syncLock(): void {
    if (this.game) this.game.locked = !!this.talking() || !!this.shopMode() || this.statusOpen() || !!this.lookDraft();
  }

  // ===== 見た目 =====

  openLook(): void {
    if (!this.game) return;
    this.lookDraft.set({ ...this.game.player.look });
    this.lookSwordColor.set(swordColorOf(this.game.player.weapon));
    this.syncLock();
  }

  closeLook(): void {
    this.lookDraft.set(null);
    this.syncLock();
  }

  // 見た目はすぐに保存する(30秒ごとの保存を待たない)
  confirmLook(): void {
    const look = this.lookDraft();
    if (!this.game || !look) return;
    this.game.setLook(look);
    this.log('見た目を変えた');
    this.closeLook();
    this.saveIfDirty();
  }

  // ===== ステータス =====

  openStatus(): void {
    this.draft.set({ ...ZERO_STATS });
    this.statusOpen.set(true);
    this.syncLock();
  }

  closeStatus(): void {
    this.statusOpen.set(false);
    this.syncLock();
  }

  addStat(key: StatKey): void {
    if (this.statusView()?.rows.find((r) => r.key === key)?.canAdd) this.draft.update((d) => ({ ...d, [key]: d[key] + 1 }));
  }

  subStat(key: StatKey): void {
    this.draft.update((d) => ({ ...d, [key]: Math.max(0, d[key] - 1) }));
  }

  resetDraft(): void {
    this.draft.set({ ...ZERO_STATS });
  }

  // 振り直しはできないので、決めたら振り分けた分はもう戻せない
  confirmAllocate(): void {
    if (this.game?.allocate(this.draft())) this.draft.set({ ...ZERO_STATS });
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
    // 交換はポイントを減らしてセーブデータも保存するため、テストプレイではできない
    if (this.testArea) {
      this.shopError.set('テストプレイ中はポイント交換できません');
      return;
    }
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

  private showAreaTitle(dungeon: RpgDungeon): void {
    this.areaTitle.set(dungeon);
    if (this.areaTitleTimer) clearTimeout(this.areaTitleTimer);
    this.areaTitleTimer = setTimeout(() => this.areaTitle.set(null), AREA_TITLE_MS);
  }

  // 隣のエリアへスライドする直前の画面を写し取る(front#234)
  private captureScreen(): CanvasImageSource | null {
    const canvas = this.canvas().nativeElement;
    if (!canvas.width || !canvas.height) return null;
    const copy = document.createElement('canvas');
    copy.width = canvas.width;
    copy.height = canvas.height;
    copy.getContext('2d')?.drawImage(canvas, 0, 0);
    return copy;
  }

  // E2Eテストで、キャンバスの中の村人をクリックする位置を求められるようにする(本番のビルドでは出さない)
  private exposeForTest(): void {
    if (environment.production) return;
    (window as unknown as Record<string, unknown>)['rpgTest'] = {
      npcPosition: (name: string): [number, number] | null => {
        const npc = this.game?.npcs.find((n) => n.name === name);
        return npc && this.game ? this.game.screenPositionOf(npc) : null;
      },
      // マスの上の面の中心の画面上の位置(高いマスは、その高さの分だけ上)
      tilePosition: (x: number, y: number): [number, number] | null => (this.game ? this.game.screenPositionOf({ x, y }) : null),
      // プレイヤーが立っているマスと高さ
      playerTile: (): [number, number, number] | null =>
        this.game ? [Math.round(this.game.player.x), Math.round(this.game.player.y), this.game.player.z] : null,
      // いるエリアのID(front#234)
      areaId: (): string | null => this.game?.area.id ?? null,
      // NPCの頭の印(「!」「?」。front#239)
      questMark: (name: string): string | null => {
        const npc = this.game?.npcs.find((n) => n.name === name);
        return npc && this.game ? this.game.questMark(npc) : null;
      },
      // その種類の敵を1体たおしたことにする(クエストの進み具合を見るため。戦う動きは E2E-08 などで見ている)
      defeat: (type: string): boolean => {
        const game = this.game;
        const enemy = game?.enemies.find((e) => e.type === type && e.alive);
        if (!game || !enemy) return false;
        (game as unknown as { killEnemy(e: typeof enemy): void }).killEnemy(enemy);
        return true;
      },
      isIdle: (): boolean => !!this.game && !this.game.player.path.length && !this.game.player.target && !this.game.transitioning,
      // 流しているBGMの音楽ファイルのURL(流していなければ null)
      bgmUrl: (): string | null => this.bgmPlayer.playingUrl
    };
  }
}
