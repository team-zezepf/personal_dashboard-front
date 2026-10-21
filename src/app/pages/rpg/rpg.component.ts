import { Component, ElementRef, HostListener, OnDestroy, afterNextRender, computed, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { HeaderComponent } from '../../components/header/header.component';
import { RpgItemIconComponent } from '../../components/rpg-item-icon/rpg-item-icon.component';
import { RpgLookEditorComponent } from '../../components/rpg-look-editor/rpg-look-editor.component';
import { RpgService } from '../../services/rpg.service';
import { AuthService } from '../../services/auth.service';
import { RpgBgm, RpgCraft, RpgDungeon, RpgEnemy, RpgLook, RpgMap, RpgObjectDef, RpgPointShopItem, RpgQuest } from '../../models/rpg.models';
import { DEFAULT_ENEMIES, ENEMIES, setEnemies } from '../../rpg/rpg-enemy';
import { BgmPlayer, areaBgmId, browserStorage } from '../../rpg/rpg-bgm';
import { SePlayer } from '../../rpg/rpg-se';
import { DEFAULT_SHORTCUTS, Shortcuts, loadShortcuts, saveShortcuts, shortcutIndexOf, shortcutItems } from '../../rpg/rpg-shortcuts';
import { environment } from '../../../environments/environment';
import {
  DEFAULT_CRAFTS,
  DEFAULT_ITEMS,
  ITEMS,
  MAX_LUCK,
  POINT_SHOP_ICONS,
  RECIPES,
  setCrafts,
  setItems,
  setObjectDefs,
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
import { GEM_SIZE, GEM_TIP, GemCursor, GemState, HAND_TIP, HandCursor } from '../../rpg/rpg-cursor';

// 保存はデータのリポジトリへの自動コミットになるため、変更があっても30秒に1回までにする
// (画面を離れるとき・ポイント交換のときはすぐ保存する)
const AUTOSAVE_MS = 30_000;
const MAX_LOGS = 8;
const AREA_TITLE_MS = 1800;
// 宝石のカーソルの代わりに、ゲーム用の手を出す押せる部品(front#244 / front#252)。押せないボタンの上は宝石のまま
const CONTROL_SELECTOR = 'button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href]';

interface ShopRow {
  id: string;
  icon: string;
  // 画像のURL(front#345)。なければ絵文字
  image?: string;
  name: string;
  desc: string;
  price: string;
  buttonLabel: string;
  disabled: boolean;
  // 鍛冶屋(front#277)の合成に使う素材と、持っている数・いる数
  materials?: { icon: string; image?: string; name: string; have: number; need: number }[];
}

@Component({
  selector: 'app-rpg-page',
  standalone: true,
  imports: [HeaderComponent, RpgLookEditorComponent, RpgItemIconComponent],
  templateUrl: './rpg.component.html',
  styleUrl: './rpg.component.css'
})
export class RpgPageComponent implements OnDestroy {
  private rpgService = inject(RpgService);
  private authService = inject(AuthService);

  // マップ作成画面の「この場所からテストプレイ」で開いたとき(/rpg?test=<エリアのID>)。
  // そのエリアの中央付近から始め(front#337)、セーブデータは保存しない
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
  // 看板(front#314)は npc が null で、name だけを出す
  readonly talking = signal<{
    npc: Npc | null;
    name: string;
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
  // smith: 鍛冶屋の合成(front#277)
  readonly shopMode = signal<'shop' | 'exchange' | 'smith' | null>(null);
  readonly pointShop = signal<RpgPointShopItem[]>([]);
  readonly exchanging = signal(false);
  readonly shopError = signal('');

  // ===== BGM(front#218) =====
  private readonly bgmPlayer = new BgmPlayer();
  private bgms: RpgBgm[] = [];
  readonly settingsOpen = signal(false);
  readonly bgmVolume = signal(Math.round(this.bgmPlayer.settings.volume * 100));
  readonly bgmMuted = signal(this.bgmPlayer.settings.muted);
  // 効果音(front#278)。音量・消した状態はBGMとは別に覚える
  private readonly sePlayer = new SePlayer();
  readonly seVolume = signal(Math.round(this.sePlayer.settings.volume * 100));
  readonly seMuted = signal(this.sePlayer.settings.muted);
  readonly bgmUnlocked = signal(false);
  // ショートカットキー(front#272)。1〜5のキーに登録した道具と、選べる道具
  readonly shortcuts = signal<Shortcuts>(loadShortcuts(browserStorage()));
  readonly shortcutOptions = shortcutItems().map((id) => ({ id, icon: ITEMS[id].icon, name: ITEMS[id].name }));
  // 今のダンジョンの曲(なければ null)
  readonly areaBgm = signal<RpgBgm | null>(null);

  readonly gemVisible = signal(false);
  readonly gemPosition = signal<[number, number]>([0, 0]);
  // 押せる部品の上にいる(宝石の代わりに手を描く)(front#252)
  private overControl = false;
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
      weapon: { icon: weapon.icon, image: weapon.image, name: weapon.name, plus: `攻撃 +${weapon.atk ?? 0}` },
      armor: { icon: armor.icon, image: armor.image, name: armor.name, plus: `防御 +${armor.def ?? 0}` }
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

  // 左上に出す、登録したキーと道具・持っている数
  readonly shortcutChips = computed(() => {
    this.version();
    const inv = this.game?.player.inv ?? {};
    return this.shortcuts()
      .map((id, i) => ({ key: i + 1, id }))
      .filter((s) => ITEMS[s.id])
      .map((s) => ({ key: s.key, name: ITEMS[s.id].name, count: inv[s.id] ?? 0 }));
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
          image: item.image,
          name: item.name,
          usable: item.type === 'use',
          // 素材(front#277)は数と「素材」の印だけ出す(使う・装備するボタンはない)
          material: item.type === 'material',
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
    if (mode === 'smith') {
      return RECIPES.filter((r) => ITEMS[r.result]).map((r) => {
        const item = ITEMS[r.result];
        const has = game.owned(r.result);
        return {
          id: r.result,
          icon: item.icon,
          image: item.image,
          name: item.name,
          desc: itemStatLabel(item),
          price: `${r.gold} G`,
          buttonLabel: has ? '持っている' : '作る',
          disabled: has || !game.canCraft(r),
          materials: r.materials.map((m) => ({ icon: ITEMS[m.id]?.icon ?? '', image: ITEMS[m.id]?.image, name: ITEMS[m.id]?.name ?? m.id, have: game.player.inv[m.id] ?? 0, need: m.count }))
        };
      });
    }
    if (mode === 'shop') {
      return SHOP_ITEMS.map((id) => {
        const item = ITEMS[id];
        const price = item.price ?? 0;
        const has = item.type !== 'use' && game.owned(id);
        return {
          id,
          icon: item.icon,
          image: item.image,
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
        // 装備はアイテムの画像・絵文字を使う。ゴールドなどアイテムでない品物は交換所のアイコン
        icon: ITEMS[shopItem.id]?.icon ?? POINT_SHOP_ICONS[shopItem.id] ?? '🎁',
        image: ITEMS[shopItem.id]?.image,
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
  private hand: HandCursor | null = null;
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
    this.hand = new HandCursor(this.gemCanvas().nativeElement);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.gameArea().nativeElement);
    window.addEventListener('pagehide', this.onPageHide);
    this.exposeForTest();
    // 効果音の割り当てが読めなくても、音なしで遊べる
    this.rpgService.getSeSounds().subscribe((urls) => this.sePlayer.setSounds(urls));

    // マップ(地形)とセーブデータがそろってからゲームを作る
    // BGMの一覧が読めなくても、曲なしで遊べるようにする
    const bgms$ = this.rpgService.getBgms().pipe(catchError(() => of([] as RpgBgm[])));
    // 敵の種類(front#229)が読めなければ、最初の9種類で遊べるようにする
    const enemies$ = this.rpgService.getEnemies().pipe(catchError(() => of(DEFAULT_ENEMIES as unknown as RpgEnemy[])));
    // アイテム(front#343)が読めなければ、最初のアイテムで遊べるようにする。セーブデータを読む前に入れておく(知らないアイテムは捨てるため)
    const items$ = this.rpgService.getItems().pipe(catchError(() => of(DEFAULT_ITEMS)));
    // 合成の装備(front#288)が読めなければ、最初の8つで遊べるようにする。セーブデータを読む前に入れておく(知らない装備は捨てるため)
    const crafts$ = this.rpgService.getCrafts().pipe(catchError(() => of(DEFAULT_CRAFTS as RpgCraft[])));
    // 置物の種類ごとのデフォルト(front#333)が読めなければ、何も決めていない置物で遊べるようにする
    const objectDefs$ = this.rpgService.getObjectDefs().pipe(catchError(() => of([] as RpgObjectDef[])));
    forkJoin({
      maps: this.rpgService.getMaps(),
      dungeons: this.rpgService.getDungeons(),
      save: this.rpgService.getSave(),
      bgms: bgms$,
      enemies: enemies$,
      items: items$,
      crafts: crafts$,
      objectDefs: objectDefs$
    }).subscribe({
      next: ({ maps, dungeons, save, bgms, enemies, items, crafts, objectDefs }) => {
        this.bgms = bgms;
        setEnemies(enemies);
        setItems(items);
        setCrafts(crafts);
        setObjectDefs(objectDefs);
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
        if (test) game.startTestPlay(test);
        // テストプレイでは保存しない
        this.loaded = !this.testArea;
        this.playAreaBgm(game.area, game.dungeon);
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
      dungeonEntered: (dungeon) => this.showAreaTitle(dungeon),
      // 看板を読む(front#314)。会話と同じ窓に、1行ずつ出す
      read: (title, lines) => {
        this.talking.set({ npc: null, name: title, lines, index: 0 });
        this.syncLock();
      },
      // 同じ曲のエリアどうしでは、曲は最初に戻らず流れ続ける(BgmPlayer は同じ曲なら何もしない)
      areaEntered: (area, dungeon) => this.playAreaBgm(area, dungeon),
      captureScreen: () => this.captureScreen(),
      knockedOut: (on) => this.knockedOut.set(on),
      sound: (slot) => this.sePlayer.play(slot)
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

  // エリアの曲(front#304)があればその曲、なければダンジョンの曲を流す
  private playAreaBgm(area: RpgMap, dungeon: RpgDungeon): void {
    const id = areaBgmId(area, dungeon);
    const bgm = this.bgms.find((b) => b.id === id) ?? null;
    this.areaBgm.set(bgm);
    this.bgmPlayer.play(bgm ? this.rpgService.bgmUrl(bgm) : null);
  }

  // ブラウザは、画面を一度クリックするまで音を出せない。ゲーム画面の最初のクリックで流し始める
  onAreaPointerDown(): void {
    if (this.bgmUnlocked()) return;
    this.bgmPlayer.unlock();
    this.sePlayer.unlock();
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

  toggleSeMute(): void {
    this.seMuted.update((muted) => !muted);
    this.sePlayer.setMuted(this.seMuted());
  }

  changeSeVolume(value: number): void {
    this.seVolume.set(value);
    this.sePlayer.setVolume(value / 100);
  }

  setShortcut(index: number, id: string): void {
    this.shortcuts.update((list) => list.map((old, i) => (i === index ? id : old)));
    saveShortcuts(browserStorage(), this.shortcuts());
  }

  resetShortcuts(): void {
    this.shortcuts.set([...DEFAULT_SHORTCUTS]);
    saveShortcuts(browserStorage(), this.shortcuts());
  }

  // 宝石のカーソルは、ゲーム画面の中(会話・お店の上も含む)ならどこでもマウスに付いていく。
  // ボタン・音量バーなど押せる部品の上では、宝石の代わりにゲーム用の手を描く(front#252)。描いたものの先がクリック位置
  onAreaMouseMove(event: MouseEvent): void {
    const rect = this.gameArea().nativeElement.getBoundingClientRect();
    this.overControl = !!(event.target as Element | null)?.closest?.(CONTROL_SELECTOR);
    const [tx, ty] = this.overControl ? HAND_TIP : GEM_TIP;
    this.gemPosition.set([event.clientX - rect.left - tx, event.clientY - rect.top - ty]);
    this.gemVisible.set(true);
  }

  onAreaMouseLeave(): void {
    this.gemVisible.set(false);
  }

  private drawGem(dt: number): void {
    const game = this.game;
    if (!this.gem || !game || !this.gemVisible()) return;
    if (this.overControl) {
      this.hand?.draw(game.time, this.dpr);
      return;
    }
    // 村人・落ちたアイテム(front#276)は「話す・拾う」、敵・壊れる置物は「攻撃」
    const readable = game.hover?.kind === 'static' && game.hover.type === 'sign';
    const state: GemState = game.hover ? (game.hover.kind === 'npc' || game.hover.kind === 'drop' || readable ? 'talk' : 'attack') : 'normal';
    this.gem.draw(state, dt, game.time, this.dpr);
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    // ショートカットキー(front#272)。設定の選ぶ欄などで数字を打ったときは使わない
    const slot = shortcutIndexOf(event.key);
    const typing = event.target instanceof HTMLElement && ['INPUT', 'SELECT', 'TEXTAREA'].includes(event.target.tagName);
    if (slot >= 0 && !typing && !this.talking() && !this.shopMode()) {
      const id = this.shortcuts()[slot];
      if (id) this.game?.useShortcut(id);
    }
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
    const role = current.npc?.role;
    if (role === 'shop' || role === 'exchange' || role === 'smith') this.openShop(role);
    this.syncLock();
  }

  // ===== クエスト(front#239) =====

  /** 話しかけたNPCと話す内容。クエスト依頼は、今のクエストの依頼・進み具合・報告のどれか(すべて終わればふだんのセリフ) */
  private conversationOf(npc: Npc): NonNullable<ReturnType<typeof this.talking>> {
    const game = this.game;
    const quest = game?.questLog.currentQuest(npc);
    const plain = { npc, name: npc.name, lines: npc.lines.length ? npc.lines : ['……'], index: 0 };
    if (!game || !quest) return plain;
    const log = game.questLog;
    if (!log.stateOf(quest)) {
      return { npc, name: npc.name, lines: quest.offerLines.length ? quest.offerLines : [`「${quest.title}」を引き受けてくれんか？`], index: 0, quest: { quest, mode: 'offer' } };
    }
    if (log.isCleared(quest, game.player.inv)) {
      return { npc, name: npc.name, lines: quest.doneLines.length ? quest.doneLines : ['ありがとう！ これはお礼だ。'], index: 0, quest: { quest, mode: 'report' } };
    }
    const lines = quest.progressLines.length ? [...quest.progressLines] : ['たのんだぞ。'];
    if (quest.kind !== 'visit') lines[lines.length - 1] += `（${log.progressOf(quest, game.player.inv)}/${quest.count}）`;
    return { npc, name: npc.name, lines, index: 0, quest: { quest, mode: 'progress' } };
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

  private openShop(mode: 'shop' | 'exchange' | 'smith'): void {
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
    if (this.shopMode() === 'smith') {
      game.craft(id);
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
      // プレイヤーの近くにアイテムを落とす(拾う動きを見るため。front#276)。落ちたマスの画面上の位置を返す
      dropNearPlayer: (id: string, count = 1): [number, number] | null => {
        const game = this.game;
        if (!game) return null;
        const drop = game.dropItem(id, count, Math.round(game.player.x) + 2, Math.round(game.player.y));
        return drop ? game.screenPositionOf(drop) : null;
      },
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
