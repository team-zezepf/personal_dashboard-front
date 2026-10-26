import { Component, ElementRef, HostListener, OnDestroy, afterNextRender, computed, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { HeaderComponent } from '../../components/header/header.component';
import { RpgItemIconComponent } from '../../components/rpg-item-icon/rpg-item-icon.component';
import { RpgLookEditorComponent } from '../../components/rpg-look-editor/rpg-look-editor.component';
import { RpgService } from '../../services/rpg.service';
import { AuthService } from '../../services/auth.service';
import { RpgBgm, RpgCompanion, RpgCraft, RpgDungeon, RpgEnemy, RpgHallMember, RpgLook, RpgMap, RpgObjectDef, RpgPointShopItem, RpgQuest } from '../../models/rpg.models';
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
  swordColorOf,
  walkSpeedOf
} from '../../rpg/rpg-data';
import { Fighter, MAX_PARTY, Npc, RpgGame, RpgGameEvents } from '../../rpg/rpg-game';
import { SPELLS, SPELL_IDS, isSpellId, maxMpOf, spellOfShortcut, spellRangeOf, spellShortcut } from '../../rpg/rpg-magic';
import { RpgRenderer } from '../../rpg/rpg-render';
import { GEM_SIZE, GEM_TIP, GemCursor, GemState, HAND_TIP, HandCursor } from '../../rpg/rpg-cursor';

// 保存はデータのリポジトリへの自動コミットになるため、変更があっても30秒に1回までにする
// (画面を離れるとき・ポイント交換のときはすぐ保存する)
const AUTOSAVE_MS = 30_000;
const MAX_LOGS = 8;
const AREA_TITLE_MS = 1800;
// 集会場(front#358)で、1ページに出す人数
export const HALL_PAGE_SIZE = 4;
// 仲間のHPなど、毎フレーム変わる表示を描き直す間隔
const PARTY_REFRESH_MS = 250;
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
  // 道具屋で個数を選べる行(front#379)。今選んでいる数と、選べる最大の数
  qty?: { value: number; max: number };
  // 装備中(売れない。front#379)
  equipped?: boolean;
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
  // ダンジョンに入ったときに画面の中央に大きく出す、ダンジョンの名前
  readonly areaTitle = signal<RpgDungeon | null>(null);
  readonly knockedOut = signal(false);
  // 仲間がいるときにたおれて、起こしてもらうのを待っている(front#358)。残りの秒
  readonly waiting = signal(false);
  readonly waitLeft = signal(0);
  readonly waitText = computed(() => `${Math.floor(this.waitLeft() / 60)}:${String(this.waitLeft() % 60).padStart(2, '0')}`);

  // ===== 集会場(front#358) =====
  // menu: 招待するか呼ぶかを選ぶ / invite: メールアドレスを入れる / pick: 仲間を選ぶ
  readonly hallMode = signal<'menu' | 'invite' | 'pick' | null>(null);
  readonly hallMembers = signal<RpgHallMember[]>([]);
  readonly hallPage = signal(0);
  readonly hallMessage = signal<{ text: string; ok: boolean } | null>(null);
  readonly hallBusy = signal(false);
  readonly inviteEmail = signal('');
  readonly hallPages = computed(() => Math.max(1, Math.ceil(this.hallMembers().length / HALL_PAGE_SIZE)));
  readonly hallRows = computed(() => {
    this.version();
    const page = Math.min(this.hallPage(), this.hallPages() - 1);
    const full = (this.game?.companions.length ?? 0) >= MAX_PARTY;
    return this.hallMembers()
      .slice(page * HALL_PAGE_SIZE, (page + 1) * HALL_PAGE_SIZE)
      .map((m) => ({
        ...m,
        // 呼べないときの理由(呼べるなら null)
        blocker: m.inMyParty ? 'パーティにいる' : m.partyOf ? `${m.partyOf}と冒険中` : m.playing ? '自分で冒険中' : full ? 'パーティがいっぱい' : null,
        full
      }));
  });

  // ===== 仲間(front#358) =====
  readonly party = computed(() => {
    this.version();
    const game = this.game;
    if (!game) return [];
    return game.companions.map((c) => {
      const max = game.maxHpOf(c);
      const count = (type: string) => Object.entries(c.inv).filter(([id, n]) => n > 0 && ITEMS[id]?.type === type).reduce((s, [, n]) => s + n, 0);
      const left = Math.max(0, Math.ceil(c.downT));
      return {
        userId: c.userId,
        name: c.name,
        level: c.level,
        hp: Math.max(0, Math.round(c.hp)),
        maxHp: max,
        hpRate: (Math.max(0, c.hp) / max) * 100,
        dead: c.dead,
        left: `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`,
        atk: game.atkOf(c),
        def: game.defOf(c),
        weapon: ITEMS[c.weapon]?.name ?? '',
        armor: ITEMS[c.armor]?.name ?? '',
        potions: count('use'),
        feathers: count('revive'),
        items: Object.entries(c.inv)
          .filter(([id, n]) => n > 0 && (ITEMS[id]?.type === 'use' || ITEMS[id]?.type === 'revive'))
          .map(([id, n]) => ({ id, icon: ITEMS[id].icon, image: ITEMS[id].image, name: ITEMS[id].name, count: n }))
      };
    });
  });
  // 仲間に渡せる、プレイヤーの持ち物の道具(回復薬・いのちの羽。MPだけを回復する道具(front#383)は仲間は使わないので出さない)
  readonly giftItems = computed(() => {
    this.version();
    const game = this.game;
    if (!game) return [];
    return Object.keys(ITEMS)
      .filter((id) => game.owned(id) && ((ITEMS[id].type === 'use' && !!ITEMS[id].heal) || ITEMS[id].type === 'revive'))
      .map((id) => ({ id, icon: ITEMS[id].icon, image: ITEMS[id].image, name: ITEMS[id].name, count: game.player.inv[id] }));
  });
  readonly maxParty = MAX_PARTY;
  readonly hallPageSize = HALL_PAGE_SIZE;

  // 道具を誰に使うか選んでいる(front#358)。選ぶ道具のID
  readonly itemTarget = signal<string | null>(null);
  readonly targetRows = computed(() => {
    this.version();
    const game = this.game;
    const id = this.itemTarget();
    if (!game || !id) return [];
    return game.fighters().map((f, i) => ({
      index: i,
      name: game.nameOf(f),
      state: f.dead ? `たおれている（あと ${Math.max(0, Math.ceil(f.downT))}秒）` : `HP ${Math.max(0, Math.round(f.hp))}/${game.maxHpOf(f)}`,
      dead: f.dead,
      blocker: game.itemBlocker(id, f)
    }));
  });

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
  // 道具屋の「買う／売る」(front#379)
  readonly shopTab = signal<'buy' | 'sell'>('buy');
  // 道具屋で選んでいる個数(「buy:potion」のように、買う・売るとアイテムごと)。選んでいなければ1
  readonly shopQty = signal<Record<string, number>>({});
  // 武器・防具を売る前の確認(front#379)
  readonly sellConfirm = signal<{ id: string; name: string; gold: number; buyPrice?: number } | null>(null);

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
  // ショートカットキー(front#272)。1〜5のキーに登録した道具・魔法(front#383)と、選べる道具・覚えた魔法
  readonly shortcuts = signal<Shortcuts>(loadShortcuts(browserStorage()));
  readonly shortcutOptions = shortcutItems().map((id) => ({ id, icon: ITEMS[id].icon, name: ITEMS[id].name }));
  readonly shortcutSpells = computed(() => {
    this.version();
    const learned = this.game?.player.spells ?? [];
    return learned.map((id) => ({ id: spellShortcut(id), icon: SPELLS[id].icon, name: SPELLS[id].name, mp: SPELLS[id].mp }));
  });

  // ===== 魔法(front#383) =====
  // 左下の「🔮 魔法」で開く、魔法の一覧
  readonly spellsOpen = signal(false);
  readonly spellRows = computed(() => {
    this.version();
    const game = this.game;
    if (!game) return [];
    const p = game.player;
    return SPELL_IDS.map((id) => {
      const s = SPELLS[id];
      const learned = p.spells.includes(id);
      return { id, icon: s.icon, name: s.name, mp: s.mp, kind: s.kind, desc: s.desc, learned, canUse: learned && p.mp >= s.mp && !p.dead };
    });
  });
  // 選んでいる敵・仲間・自分(front#383)。画面の上のまんなかに出す。毎フレーム変わるHPは、変わったときだけ入れ直す
  readonly selection = signal<{ enemy: boolean; name: string; hp: number; maxHp: number; rate: number } | null>(null);
  private selectionKey = '';
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
    const maxMp = game.maxMp();
    const nextExp = game.nextExp();
    const weapon = ITEMS[p.weapon];
    const armor = ITEMS[p.armor];
    return {
      level: p.level,
      hp: Math.max(0, p.hp),
      maxHp,
      hpRate: (Math.max(0, p.hp) / maxHp) * 100,
      // MP(front#383)
      mp: Math.floor(Math.max(0, p.mp)),
      maxMp,
      mpRate: (Math.max(0, p.mp) / maxMp) * 100,
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
        meta('回復量', (s) => `×${healRateOf(s).toFixed(2)}`),
        // 魔力で伸びる最大MP・攻撃魔法の届く距離(front#383)
        meta('最大MP', (s) => `${maxMpOf(s)}`),
        meta('魔法の届く距離', (s) => `${spellRangeOf(s).toFixed(1)}マス`)
      ]
    };
  });

  // 左上に出す、登録したキーと道具・持っている数。魔法(front#383)はMPを出し、覚えていない・MPが足りなければ薄くする
  readonly shortcutChips = computed(() => {
    this.version();
    const p = this.game?.player;
    const inv = p?.inv ?? {};
    return this.shortcuts()
      .map((id, i) => ({ key: i + 1, id, spell: spellOfShortcut(id) }))
      .filter((s) => s.spell || ITEMS[s.id])
      .map((s) => {
        if (s.spell) {
          const def = SPELLS[s.spell];
          const usable = !!p && p.spells.includes(s.spell) && p.mp >= def.mp;
          return { key: s.key, spell: true, name: `${def.icon} ${def.name}`, count: 0, mp: def.mp, empty: !usable };
        }
        const count = inv[s.id] ?? 0;
        return { key: s.key, spell: false, name: ITEMS[s.id].name, count, mp: 0, empty: !count };
      });
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
          // 回復薬・いのちの羽(front#358)・魔法書(front#383)は「使う」。回復薬は選んでいる仲間・自分に使う
          usable: item.type === 'use' || item.type === 'revive' || item.type === 'book',
          // もう覚えている魔法の書(front#383)は使えない(売れる)
          learned: item.type === 'book' && game.knowsBook(id),
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
      const qtys = this.shopQty();
      // 選んでいる個数(1〜max。max が0でも1と出す)
      const pick = (key: string, max: number) => Math.min(Math.max(qtys[key] ?? 1, 1), Math.max(max, 1));
      if (this.shopTab() === 'sell') {
        // 売る(front#379): 持ち物のうち売値があるもの。装備中のものは「装備中」で売れない
        return Object.keys(ITEMS)
          .filter((id) => game.owned(id) && ITEMS[id].sellPrice !== undefined)
          .map((id) => {
            const item = ITEMS[id];
            const price = item.sellPrice ?? 0;
            const equipped = game.isEquipped(id);
            const max = game.sellableCount(id);
            const gear = item.type === 'weapon' || item.type === 'armor';
            const value = pick(`sell:${id}`, max);
            return {
              id,
              icon: item.icon,
              image: item.image,
              name: item.name,
              desc: gear ? itemStatLabel(item) : `${game.player.inv[id] ?? 0}個持っている`,
              price: `${price} G`,
              buttonLabel: equipped ? '装備中' : gear ? '売る' : `売る（${price * value}G）`,
              disabled: max < 1,
              equipped,
              ...(gear || equipped ? {} : { qty: { value, max } })
            };
          });
      }
      return SHOP_ITEMS.map((id) => {
        const item = ITEMS[id];
        const price = item.price ?? 0;
        // 回復薬・いのちの羽(front#358)はいくつでも買える。個数を選んで買う(front#379)
        const consumable = item.type === 'use' || item.type === 'revive';
        const has = !consumable && game.owned(id);
        // 魔法書(front#383)は、覚えている魔法の書は買えない
        const book = item.type === 'book';
        const known = book && game.knowsBook(id);
        const max = game.buyableCount(id);
        const value = pick(`buy:${id}`, max);
        const spell = book && isSpellId(item.spell) ? SPELLS[item.spell] : null;
        return {
          id,
          icon: item.icon,
          image: item.image,
          name: item.name,
          desc: consumable
            ? `${item.desc ?? ''}（${game.player.inv[id] ?? 0}個持っている）`
            : book
              ? `${item.desc ?? ''}${spell ? `（MP${spell.mp}）` : ''}`
              : itemStatLabel(item),
          price: `${price} G`,
          buttonLabel: known ? '覚えている' : has ? '持っている' : consumable ? `買う（${price * value}G）` : '買う',
          disabled: max < 1,
          ...(consumable ? { qty: { value, max } } : {})
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

  // タブを閉じる・再読み込みするとき。保存していない変更があれば「離れる」印を付けて保存し、なければ離れたことだけ知らせる(front#360)
  private readonly onPageHide = () => {
    if (this.loaded && this.dirty && this.game) this.rpgService.saveOnUnload({ ...this.game.toSaveInput(), leaving: true });
    else this.rpgService.leaveOnUnload();
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
      this.refreshParty(game, now);
      this.refreshSelection(game);
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
    // ほかの画面へ移るときは、まだ保存していない分を保存し、集会場の「自分で冒険中」をすぐ外す(front#360)
    this.leave();
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
      sound: (slot) => this.sePlayer.play(slot),
      waiting: (on) => {
        this.waiting.set(on);
        this.version.update((v) => v + 1);
      },
      // パーティから抜けた仲間(front#358)は、APIでも集会場に戻す
      companionsLeft: (cs) => {
        const before = this.game?.toSaveInput();
        cs.forEach((c, i) => this.releaseCompanion(c.userId, i === 0 ? before : undefined));
      }
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
      next: (save) => {
        this.saving = false;
        this.syncParty(save.party ?? []);
      },
      error: () => {
        // 保存できなかった分は、次の機会にもう一度保存する
        this.saving = false;
        this.dirty = true;
      }
    });
  }

  private leave(): void {
    if (this.loaded && this.dirty && !this.saving && this.game) {
      this.dirty = false;
      this.rpgService.save({ ...this.game.toSaveInput(), leaving: true }).subscribe({ error: () => undefined });
      return;
    }
    this.rpgService.leave().subscribe({ error: () => undefined });
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
    if (slot >= 0 && !typing && !this.talking() && !this.shopMode() && !this.hallMode()) {
      const id = this.shortcuts()[slot];
      // 魔法(front#383)は、選んでいる相手に使う
      if (id) this.game?.useShortcut(id, spellOfShortcut(id));
    }
    if (event.key === 'Escape') {
      // 開いているものがなければ、選んでいる相手を外す(front#383)
      const open = !!this.talking() || !!this.shopMode() || this.statusOpen() || !!this.lookDraft() || !!this.hallMode() || !!this.itemTarget() || this.spellsOpen();
      if (!open) this.clearSelection();
      this.talking.set(null);
      this.closeShop();
      this.closeStatus();
      this.closeLook();
      this.closeHall();
      this.closeItemTarget();
      this.closeSpells();
    }
  }

  // ===== 選ぶ・魔法(front#383) =====

  clearSelection(): void {
    this.game?.clearSelection();
  }

  /** 左下の仲間の欄をクリックしたら、その仲間を選ぶ */
  selectMate(userId: string): void {
    const game = this.game;
    const c = game?.companions.find((m) => m.userId === userId);
    if (game && c) game.select(c);
  }

  /** 選んでいる相手の表示を、変わったときだけ入れ直す(毎フレーム呼ぶ) */
  private refreshSelection(game: RpgGame): void {
    const enemy = game.selectedEnemy();
    const fighter = enemy ? null : game.selectedFighter();
    let view: ReturnType<typeof this.selection> = null;
    if (enemy) {
      const max = ENEMIES[enemy.type]?.hp ?? 1;
      view = { enemy: true, name: ENEMIES[enemy.type]?.name ?? '', hp: Math.max(0, Math.round(enemy.hp)), maxHp: max, rate: 0 };
    } else if (fighter) {
      const max = game.maxHpOf(fighter);
      view = { enemy: false, name: game.nameOf(fighter), hp: Math.max(0, Math.round(fighter.hp)), maxHp: max, rate: 0 };
    }
    if (view) view.rate = (view.hp / view.maxHp) * 100;
    const key = view ? `${view.enemy}|${view.name}|${view.hp}|${view.maxHp}` : '';
    if (key === this.selectionKey) return;
    this.selectionKey = key;
    this.selection.set(view);
  }

  openSpells(): void {
    this.spellsOpen.set(true);
    this.syncLock();
  }

  closeSpells(): void {
    this.spellsOpen.set(false);
    this.syncLock();
  }

  /** 一覧から魔法を使う。一覧を閉じてから(ゲームを動かしてから)使う */
  castSpell(id: string): void {
    this.closeSpells();
    this.game?.castSpell(id);
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
    if (role === 'hall') this.openHall();
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
    if (this.game) this.game.locked = !!this.talking() || !!this.shopMode() || this.statusOpen() || !!this.lookDraft() || !!this.hallMode() || !!this.itemTarget() || this.spellsOpen();
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
    this.shopTab.set('buy');
    this.shopQty.set({});
    this.sellConfirm.set(null);
    this.shopMode.set(mode);
    this.syncLock();
  }

  closeShop(): void {
    this.sellConfirm.set(null);
    this.shopMode.set(null);
    this.syncLock();
  }

  setShopTab(tab: 'buy' | 'sell'): void {
    this.shopTab.set(tab);
    this.sellConfirm.set(null);
  }

  /** 道具屋の個数の －／＋(front#379)。1〜選べる最大の数におさめる */
  changeShopQty(id: string, delta: number): void {
    const row = this.shopRows().find((r) => r.id === id);
    if (!row?.qty) return;
    const value = Math.min(Math.max(row.qty.value + delta, 1), Math.max(row.qty.max, 1));
    this.shopQty.update((q) => ({ ...q, [`${this.shopTab()}:${id}`]: value }));
  }

  onShopButton(id: string): void {
    const game = this.game;
    if (!game) return;
    if (this.shopMode() === 'shop') {
      const row = this.shopRows().find((r) => r.id === id);
      const count = row?.qty?.value ?? 1;
      const key = `${this.shopTab()}:${id}`;
      if (this.shopTab() === 'buy') {
        if (game.buy(id, count)) this.shopQty.update((q) => ({ ...q, [key]: 1 }));
        return;
      }
      const item = ITEMS[id];
      // 武器・防具は売ると戻らないので、確認してから売る
      if (item && (item.type === 'weapon' || item.type === 'armor')) {
        if (game.sellableCount(id) > 0 && item.sellPrice !== undefined) this.sellConfirm.set({ id, name: item.name, gold: item.sellPrice, buyPrice: item.price });
        return;
      }
      if (game.sell(id, count)) this.shopQty.update((q) => ({ ...q, [key]: 1 }));
      return;
    }
    if (this.shopMode() === 'smith') {
      game.craft(id);
      return;
    }
    this.exchange(id);
  }

  confirmSell(): void {
    const target = this.sellConfirm();
    this.sellConfirm.set(null);
    if (target) this.game?.sell(target.id, 1);
  }

  cancelSell(): void {
    this.sellConfirm.set(null);
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

  /**
   * 持ち物の道具を使う。回復薬は選んでいる仲間・自分(front#383。なければ自分)に使う。
   * いのちの羽(front#358)は、たおれている仲間を選んでいればその仲間に使い、そうでなければ誰に使うか選ぶ
   */
  useItem(id: string): void {
    const game = this.game;
    if (!game) return;
    if (ITEMS[id]?.type === 'revive') {
      const chosen = game.selectedFighter();
      if (chosen?.dead) {
        game.useItemOn(id, chosen);
        return;
      }
      this.itemTarget.set(id);
      this.syncLock();
      return;
    }
    game.useItem(id);
  }

  useItemOn(index: number): void {
    const game = this.game;
    const id = this.itemTarget();
    const target: Fighter | undefined = game?.fighters()[index];
    if (!game || !id || !target) return;
    if (game.useItemOn(id, target)) this.closeItemTarget();
  }

  closeItemTarget(): void {
    this.itemTarget.set(null);
    this.syncLock();
  }

  readonly itemName = (id: string | null) => (id ? (ITEMS[id]?.name ?? '') : '');
  readonly itemIcon = (id: string | null) => (id ? (ITEMS[id]?.icon ?? '') : '');

  // ===== 仲間(front#358) =====

  giveItem(userId: string, id: string): void {
    this.game?.giveItem(userId, id);
  }

  /** 別れる。仲間は集会場に戻る(それまでの経験値などは、外す前に保存する) */
  dismiss(userId: string): void {
    const game = this.game;
    const c = game?.companions.find((m) => m.userId === userId);
    if (!game || !c) return;
    this.log(`${c.name}と別れた。集会場に戻っていった`);
    this.releaseCompanion(userId, game.toSaveInput());
    game.removeCompanion(userId);
    this.dirty = true;
  }

  /** たおれて待っているのをやめて、町に戻る */
  giveUp(): void {
    this.game?.giveUp();
  }

  /**
   * APIでもパーティから外す(テストプレイでは呼べないので何もしない)。
   * before があれば、外す前の状態(抜ける仲間の経験値なども入っている)を先に保存する
   */
  private releaseCompanion(userId: string, before?: ReturnType<RpgGame['toSaveInput']>): void {
    if (this.testArea || !this.loaded) return;
    const dismiss$ = this.rpgService.dismissCompanion(userId);
    if (!before) {
      dismiss$.subscribe({ error: () => undefined });
      return;
    }
    this.rpgService.save(before).subscribe({
      next: () => dismiss$.subscribe({ error: () => undefined }),
      error: () => dismiss$.subscribe({ error: () => undefined })
    });
  }

  /** 保存したあとのパーティ(APIの結果)に合わせる。本人がRPGを始めたなどで外れた仲間は、ゲームからも外す */
  private syncParty(party: RpgCompanion[]): void {
    const game = this.game;
    if (!game) return;
    for (const c of [...game.companions]) {
      if (party.some((p) => p.userId === c.userId)) continue;
      game.removeCompanion(c.userId);
      this.log(`${c.name}は自分で冒険を始めたので、集会場に戻っていった`);
    }
  }

  // 仲間のHP・たおれている残り時間は毎フレーム変わるので、少しずつ描き直す
  private lastPartyRefresh = 0;
  private refreshParty(game: RpgGame, now: number): void {
    if (!game.companions.length && !this.waiting()) return;
    if (now - this.lastPartyRefresh < PARTY_REFRESH_MS) return;
    this.lastPartyRefresh = now;
    this.waitLeft.set(Math.max(0, Math.ceil(game.player.downT)));
    this.version.update((v) => v + 1);
  }

  // ===== 集会場(front#358) =====

  private openHall(): void {
    this.hallMessage.set(null);
    this.hallMode.set('menu');
    this.syncLock();
  }

  closeHall(): void {
    this.hallMode.set(null);
    this.syncLock();
  }

  showInvite(): void {
    this.hallMessage.set(null);
    this.inviteEmail.set('');
    this.hallMode.set('invite');
  }

  showPick(): void {
    this.hallMessage.set(null);
    this.hallMode.set('pick');
    this.loadHall();
  }

  backToHallMenu(): void {
    this.hallMessage.set(null);
    this.hallMode.set('menu');
  }

  private loadHall(): void {
    this.rpgService.getHall().subscribe({
      next: (members) => {
        this.hallMembers.set(members);
        this.hallPage.update((p) => Math.min(p, this.hallPages() - 1));
      },
      error: () => this.hallMessage.set({ text: '集会場の一覧を読み込めませんでした', ok: false })
    });
  }

  changeHallPage(delta: number): void {
    this.hallPage.update((p) => Math.min(this.hallPages() - 1, Math.max(0, p + delta)));
  }

  sendInvite(): void {
    const email = this.inviteEmail().trim();
    if (!email || this.hallBusy()) return;
    this.hallBusy.set(true);
    this.rpgService.inviteToHall(email).subscribe({
      next: (m) => {
        this.hallBusy.set(false);
        this.inviteEmail.set('');
        this.hallMessage.set({ text: `${m.name}さんに招待メールを送りました。集会場に登録しました！`, ok: true });
      },
      error: (err: Error) => {
        this.hallBusy.set(false);
        this.hallMessage.set({ text: err.message || '招待できませんでした', ok: false });
      }
    });
  }

  callCompanion(userId: string): void {
    const game = this.game;
    if (!game || this.hallBusy()) return;
    // 呼ぶとAPIのパーティが変わるため、テストプレイではできない
    if (this.testArea) {
      this.hallMessage.set({ text: 'テストプレイ中は仲間を呼べません', ok: false });
      return;
    }
    this.hallBusy.set(true);
    this.rpgService.callCompanion(userId).subscribe({
      next: (save) => {
        this.hallBusy.set(false);
        const rc = (save.party ?? []).find((p) => p.userId === userId);
        if (rc) {
          game.addCompanion(rc);
          this.hallMessage.set({ text: `${rc.name}「よろしくお願いします！」　${rc.name}が仲間になった！`, ok: true });
        }
        this.loadHall();
      },
      error: (err: Error) => {
        this.hallBusy.set(false);
        this.hallMessage.set({ text: err.message || '呼べませんでした', ok: false });
        this.loadHall();
      }
    });
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
      // プレイヤーをたおす(仲間がいれば、起こしてもらうのを待つ。front#358)
      knockOut: (): void => (this.game as unknown as { knockOut(): void } | null)?.knockOut(),
      // 連れている仲間の名前とHP(front#358)
      party: (): { name: string; hp: number; dead: boolean }[] => this.game?.companions.map((c) => ({ name: c.name, hp: c.hp, dead: c.dead })) ?? [],
      // その種類の敵のうち、プレイヤーにいちばん近い敵の足元の画面上の位置(クリックして選ぶため。front#383)。いなければ null
      enemyPosition: (type: string): [number, number] | null => {
        const game = this.game;
        if (!game) return null;
        const p = game.player;
        const enemy = game.enemies
          .filter((e) => e.type === type && e.alive)
          .sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
        return enemy ? game.screenPositionOf(enemy) : null;
      },
      // 選んでいる相手(front#383)。画面の上のまんなかに出しているもの
      selection: () => this.selection(),
      // プレイヤーの足元の画面上の位置(front#383)
      playerPosition: (): [number, number] | null => (this.game ? this.game.screenPositionOf(this.game.player) : null),
      // MPと覚えた魔法(front#383)
      magic: (): { mp: number; maxMp: number; spells: string[] } | null =>
        this.game ? { mp: this.game.player.mp, maxMp: this.game.maxMp(), spells: [...this.game.player.spells] } : null,
      // プレイヤーのHPを減らす(回復を見るため。front#383)
      hurtPlayer: (hp: number): void => {
        if (this.game) this.game.player.hp = Math.max(1, hp);
      },
      isIdle: (): boolean => !!this.game && !this.game.player.path.length && !this.game.player.target && !this.game.transitioning,
      // 流しているBGMの音楽ファイルのURL(流していなければ null)
      bgmUrl: (): string | null => this.bgmPlayer.playingUrl
    };
  }
}
