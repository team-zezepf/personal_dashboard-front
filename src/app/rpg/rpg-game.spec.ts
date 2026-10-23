import { RpgCompanion, RpgCraft, RpgDungeon, RpgMap, RpgQuest, RpgSave } from '../models/rpg.models';
import {
  BREAK_RESPAWN_SEC, DEFAULT_CRAFTS, ENEMIES, G, ITEMS, MATERIAL_IDS, RECIPES, THEMES, ZERO_STATS, attackIntervalOf, barsAlong, besideSavePoint, buildAreaMap, centerSpot, edgeMiddle,
  exitOf, firstSpot, isCraftItem, linkArrival, maxHpOf,
  objectSettingsOf, objectTintOf, pickMimic, setCrafts, setObjectDefs, shelfFace, signExit, signPointing, walkSpeedOf
} from './rpg-data';
import { PLAYER_FX_SEC, RpgGame, RpgGameEvents } from './rpg-game';
import { DEFAULT_LOOK, lookFromColors } from './rpg-look';
import { DEFAULT_ENEMIES, EnemyDef, setEnemies } from './rpg-enemy';

const LOOK = { ...DEFAULT_LOOK, hair: 'ponytail', eyes: 'glasses', clothes: 'robe', clothesColor: '#8b5cf6', accentColor: '#fbbf24' };

function events(): RpgGameEvents & { messages: string[]; dirtyCount: number; entered: string[]; areas: string[]; reads: [string, string[]][]; captured: number; sounds: string[] } {
  const result = {
    messages: [] as string[],
    dirtyCount: 0,
    entered: [] as string[],
    // 入ったエリア(「エリア/ダンジョン」。front#304)
    areas: [] as string[],
    // 読んだ看板(front#314)
    reads: [] as [string, string[]][],
    captured: 0,
    sounds: [] as string[],
    log: (message: string) => result.messages.push(message),
    statsChanged: () => undefined,
    inventoryChanged: () => undefined,
    dirty: () => result.dirtyCount++,
    talk: () => undefined,
    fade: () => undefined,
    dungeonEntered: (dungeon: RpgDungeon) => result.entered.push(dungeon.id),
    areaEntered: (area: RpgMap, dungeon: RpgDungeon) => result.areas.push(`${area.id}/${dungeon.id}`),
    read: (title: string, lines: string[]) => result.reads.push([title, lines]),
    captureScreen: () => {
      result.captured++;
      return null;
    },
    knockedOut: () => undefined,
    sound: (slot: string) => result.sounds.push(slot)
  };
  return result;
}

// 一面が草の 12×12 のエリア。何も指定しなければ、エリアと同じIDのダンジョンの位置(0, 0)に置く
function map(id: string, partial: Partial<RpgMap> = {}): RpgMap {
  return {
    id, name: id, dungeonId: id, gridX: 0, gridY: 0, width: 12, height: 12,
    ground: Array.from({ length: 12 }, () => 'g'.repeat(12)),
    heights: Array.from({ length: 12 }, () => '0'.repeat(12)),
    objects: [], npcs: [], enemies: [], links: [], sortOrder: 1,
    ...partial
  };
}

const MAPS: RpgMap[] = [
  // 始まりの草原の右下の端 ⇄ 精霊の森の左上の端(front#274)
  map('plain', { links: [{ dx: 1, dy: 0, to: 'forest' }] }),
  map('forest', { sortOrder: 2, links: [{ dx: -1, dy: 0, to: 'plain' }] }),
  // 洞くつのダンジョン(front#234): 入口の右下に奥、左下に泉(泉は広い)
  map('cave1', { dungeonId: 'cave', name: '入口', sortOrder: 3 }),
  map('cave2', { dungeonId: 'cave', name: '奥', gridX: 1, sortOrder: 4 }),
  map('cave3', { dungeonId: 'cave', name: '泉', gridY: 1, width: 16, height: 16, ground: Array.from({ length: 16 }, () => 'g'.repeat(16)), sortOrder: 5 })
];

const DUNGEONS: RpgDungeon[] = [
  { id: 'plain', name: '始まりの草原', recommendedLevel: 1, theme: 'plain', sortOrder: 1 },
  { id: 'forest', name: '精霊の森', recommendedLevel: 4, theme: 'forest', sortOrder: 2 },
  { id: 'cave', name: '海辺の洞くつ', recommendedLevel: 6, theme: 'tower', sortOrder: 3 }
];

function save(partial: Partial<RpgSave> = {}): RpgSave {
  return {
    level: 3, exp: 10, hp: 45, gold: 100, weapon: 'copper_sword', armor: 'cloth',
    items: [{ itemId: 'potion', count: 2 }, { itemId: 'copper_sword', count: 1 }, { itemId: 'wood_sword', count: 1 }, { itemId: 'cloth', count: 1 }],
    area: 'forest', x: 4, y: 5,
    // Lv3 なので合計6ポイント(まだ振り分けていない)
    stats: { ...ZERO_STATS }, statPoints: 6,
    look: LOOK,
    quests: [],
    // 一度でも保存したセーブデータ(まだ保存していなければ updatedAt がない)
    updatedAt: '2026-10-20T12:00:00',
    ...partial
  };
}

describe('RpgGame', () => {
  let ev: ReturnType<typeof events>;
  let game: RpgGame;

  beforeEach(() => {
    ev = events();
    game = new RpgGame(ev, MAPS, DUNGEONS);
    game.viewW = 800;
    game.viewH = 600;
  });

  afterEach(() => {
    game.dispose();
    vi.useRealTimers();
  });

  // 画面上のマスをクリックする
  function clickTile(x: number, y: number): void {
    game.update(0);
    const [sx, sy] = game.screenPositionOf({ x, y });
    game.click(sx, sy);
  }

  describe('セーブデータ', () => {
    it('読み込んだ状態をそのまま保存用の形に戻せる', () => {
      game.loadSave(save());

      expect(game.area.id).toBe('forest');
      expect(game.toSaveInput()).toEqual({
        level: 3, exp: 10, hp: 45, gold: 100, weapon: 'copper_sword', armor: 'cloth',
        items: [{ itemId: 'potion', count: 2 }, { itemId: 'copper_sword', count: 1 }, { itemId: 'wood_sword', count: 1 }, { itemId: 'cloth', count: 1 }],
        area: 'forest', x: 4, y: 5,
        stats: { ...ZERO_STATS }, statPoints: 6,
        look: LOOK,
        quests: [],
        respawn: null,
        companions: []
      });
    });

    it('知らないエリア・アイテムは使わず、始まりの草原(セーブポイントがなければ中央付近)から始める(front#337)', () => {
      game.loadSave(save({ area: 'moon', x: 30, y: 30, items: [{ itemId: 'unknown', count: 1 }] }));

      expect(game.area.id).toBe('plain');
      expect([game.player.x, game.player.y]).toEqual([5, 5]);
      expect(game.player.inv['unknown']).toBeUndefined();
      // 装備中のものは持ち物から消えない
      expect(game.player.inv['copper_sword']).toBe(1);
    });

    it('見た目を変えると、保存が必要になり、保存用の形にも入る', () => {
      game.loadSave(save());
      const look = { ...LOOK, hair: 'spiky', mouth: 'cat' };
      game.setLook(look);

      expect(ev.dirtyCount).toBe(1);
      expect(game.toSaveInput().look).toEqual(look);
      // 渡した見た目をあとで書き換えても、ゲームの見た目は変わらない
      look.hair = 'bald';
      expect(game.player.look.hair).toBe('spiky');
    });

    it('HPが0のまま保存されていたら、全回復した状態で始める', () => {
      game.loadSave(save({ hp: 0 }));
      expect(game.player.hp).toBe(maxHpOf(ZERO_STATS));
    });

    it('歩いている途中なら、向かっているマスの位置で保存する', () => {
      game.loadSave(save({ area: 'plain', x: 6, y: 7 }));
      clickTile(7, 7);
      game.update(0.05);

      expect(game.toSaveInput()).toMatchObject({ x: 7, y: 7 });
    });
  });

  describe('ステータスの振り分け', () => {
    beforeEach(() => game.loadSave(save({ area: 'plain', x: 6, y: 7, hp: 30 })));

    it('振り分けると能力が上がり、最大HPが増えた分は今のHPにも足す。振り分けた分のポイントは減る', () => {
      expect(game.allocate({ hp: 2, atk: 1 })).toBe(true);

      expect(game.player.stats).toEqual({ ...ZERO_STATS, hp: 2, atk: 1 });
      expect(game.player.statPoints).toBe(3);
      expect(game.maxHp()).toBe(50 + 24);
      expect(game.player.hp).toBe(30 + 24);
      expect(ev.dirtyCount).toBeGreaterThan(0);
    });

    it('持っているより多いポイントや、マイナスは振り分けられない', () => {
      expect(game.allocate({ hp: 7 })).toBe(false);
      expect(game.allocate({ hp: 2, atk: -1 })).toBe(false);
      expect(game.allocate({})).toBe(false);
      expect(game.player.statPoints).toBe(6);
    });

    it('運は99まで', () => {
      // Lv50 は合計147ポイント(運に98、残り49)
      game.loadSave(save({ level: 50, statPoints: 49, stats: { ...ZERO_STATS, luk: 98 }, hp: 50 }));
      expect(game.allocate({ luk: 2 })).toBe(false);
      expect(game.allocate({ luk: 1 })).toBe(true);
    });

    it('ポイントの合計がレベルと合わないセーブデータは、全部を振り分けていないポイントにする', () => {
      game.loadSave(save({ stats: { ...ZERO_STATS, atk: 10 }, statPoints: 6 }));
      expect(game.player.stats).toEqual(ZERO_STATS);
      expect(game.player.statPoints).toBe(6);
    });

    it('Lv1(速さ0)の歩く速さは3.0マス/秒で、速さを上げると速くなる', () => {
      expect(walkSpeedOf(game.player.stats)).toBe(3);
      game.allocate({ spd: 3 });
      expect(walkSpeedOf(game.player.stats)).toBeGreaterThan(3);
    });

    it('攻撃の間隔は速さ0で1.10秒、速さ99で0.325秒になり、それより振っても変わらない(front#286)', () => {
      expect(attackIntervalOf(ZERO_STATS)).toBeCloseTo(1.1, 5);
      expect(attackIntervalOf({ ...ZERO_STATS, spd: 99 })).toBeCloseTo(0.325, 5);
      expect(attackIntervalOf({ ...ZERO_STATS, spd: 150 })).toBeCloseTo(0.325, 5);
    });
  });

  describe('持ち物・お店', () => {
    beforeEach(() => game.loadSave(save({ area: 'plain', x: 6, y: 7 })));

    it('ゴールドで装備を買える。同じ装備は2つ買えない', () => {
      expect(game.buy('iron_sword')).toBe(false); // 140G で足りない
      expect(game.buy('leather')).toBe(true);
      expect(game.player.gold).toBe(40);
      expect(game.player.inv['leather']).toBe(1);
      expect(game.buy('leather')).toBe(false);
      expect(ev.dirtyCount).toBeGreaterThan(0);
    });

    it('回復薬はいくつでも買える', () => {
      game.buy('potion');
      game.buy('potion');
      expect(game.player.inv['potion']).toBe(4);
      expect(game.player.gold).toBe(80);
    });

    it('回復薬を使うとHPが回復し、満タンなら使わない', () => {
      game.player.hp = game.maxHp();
      game.useItem('potion');
      expect(ev.messages.at(-1)).toBe('HPは満タンだ');
      expect(game.player.inv['potion']).toBe(2);

      game.player.hp = 10;
      game.useItem('potion');
      expect(game.player.hp).toBe(45);
      expect(game.player.inv['potion']).toBe(1);
    });

    it('回復薬を使うと、回復のエフェクトを出し、回復の効果音を鳴らす知らせを出す。回復量の多い上回復薬は粒を増やす(front#335)', () => {
      game.player.hp = 10;
      game.useItem('potion');
      expect(game.playerFx.map((f) => [f.kind, !!f.big])).toEqual([['heal', false]]);
      expect(ev.sounds).toEqual(['heal']);
      // 満タンで使えなかったときは出さない
      game.update(PLAYER_FX_SEC.heal + 0.1);
      expect(game.playerFx).toEqual([]);
      game.player.hp = game.maxHp();
      game.useItem('potion');
      expect(game.playerFx).toEqual([]);
      expect(ev.sounds).toEqual(['heal']);
      game.player.hp = 10;
      game.player.inv['hipotion'] = 1;
      game.useItem('hipotion');
      expect(game.playerFx.map((f) => [f.kind, !!f.big])).toEqual([['heal', true]]);
    });

    it('レベルが上がると、レベルアップのエフェクトを出し、効果音を鳴らす知らせを出す。一度に2つ上がっても1回だけ(front#335)', () => {
      game.maps = [map('plain', { enemies: [{ type: 'slime', x: 8, y: 8 }, { type: 'slime', x: 9, y: 9 }] }), ...MAPS.slice(1)];
      game.loadSave(save({ area: 'plain', x: 6, y: 7 }));
      const kill = (e: unknown) => (game as unknown as { killEnemy(e: unknown): void }).killEnemy(e);
      // 経験値が足りなければ出さない
      kill(game.enemies[0]);
      expect(game.playerFx).toEqual([]);
      expect(ev.sounds).not.toContain('level_up');
      // 2つ上がる分の経験値
      const before = game.player.level;
      game.player.exp = game.nextExp() * 3;
      kill(game.enemies[1]);
      expect(game.player.level).toBeGreaterThanOrEqual(before + 2);
      expect(game.playerFx.map((f) => f.kind)).toEqual(['level']);
      expect(ev.sounds.filter((s) => s === 'level_up')).toEqual(['level_up']);
      expect(game.floats.some((f) => f.text === 'LEVEL UP!')).toBe(false);
      game.update(PLAYER_FX_SEC.level + 0.1);
      expect(game.playerFx).toEqual([]);
    });

    it('ショートカットキーの道具を使う。持っていなければログで知らせ、使う道具でなければ何もしない(front#272)', () => {
      game.player.hp = 10;
      game.useShortcut('hipotion');
      expect(ev.messages.at(-1)).toBe('上回復薬を持っていない');
      expect(game.player.hp).toBe(10);

      game.useShortcut('potion');
      expect(game.player.hp).toBe(45);
      expect(game.player.inv['potion']).toBe(1);

      const count = ev.messages.length;
      game.useShortcut('copper_sword');
      game.useShortcut('unknown');
      expect(ev.messages.length).toBe(count);
    });

    it('装備を付け替えると攻撃力が変わる', () => {
      const before = game.atk();
      game.equip('wood_sword');
      expect(game.player.weapon).toBe('wood_sword');
      expect(game.atk()).toBe(before - 4);
    });

    it('ポイント交換の結果のゴールドと持ち物を反映する', () => {
      game.applyExchange(save({ gold: 200, items: [{ itemId: 'star_sword', count: 1 }, { itemId: 'copper_sword', count: 1 }] }));
      expect(game.player.gold).toBe(200);
      expect(game.owned('star_sword')).toBe(true);
    });
  });

  describe('エリア移動', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      game.loadSave(save({ area: 'plain', x: 6, y: 7 }));
    });

    function walk(): void {
      for (let i = 0; i < 40; i++) game.update(0.05);
    }

    it('ほかのダンジョンへつながる端で止まると、暗くなって、行き先のこちらへ戻る端の、着地できるマスの真ん中(1マス内側)に移る(front#274 / front#339)', () => {
      clickTile(11, 7);
      walk();
      // 暗くなっている間は、まだ移らない(すべらない)
      expect(game.area.id).toBe('plain');
      expect(game.slide).toBeNull();
      vi.advanceTimersByTime(500);

      expect(game.area.id).toBe('forest');
      // 左上の端の12マスがどれも着地できるので、真ん中の2つ(y=5・6)のうち上側。出てきた位置(y=7)には寄せない
      expect([game.player.x, game.player.y]).toEqual([1, 5]);
      expect(ev.entered).toEqual(['forest']);
      // エリアに入ったことも知らせる(エリアごとの曲に切り替えるため。front#304)
      expect(ev.areas).toEqual(['forest/forest']);
      // 見た目はダンジョンのもの
      expect(game.theme).toBe(THEMES['forest']);
      expect(ev.messages).toContain('精霊の森にやってきた');
    });

    it('行き先にこちらへ戻るつながりがなければ、進んできた向きの反対側の端(左上の端)の真ん中に着く(front#337)', () => {
      game.dispose();
      game = new RpgGame(ev, MAPS.map((m) => (m.id === 'forest' ? { ...m, links: [] } : m)), DUNGEONS);
      game.viewW = 800;
      game.viewH = 600;
      game.loadSave(save({ area: 'plain', x: 6, y: 7 }));
      clickTile(11, 7);
      walk();
      vi.advanceTimersByTime(500);

      expect(game.area.id).toBe('forest');
      // 左上の端の12マスがどれも着地できるので、真ん中の2つ(y=5・6)のうち上側
      expect([game.player.x, game.player.y]).toEqual([1, 5]);
    });

    it('つながりのない端では移らない', () => {
      clickTile(6, 11);
      walk();
      vi.advanceTimersByTime(500);

      expect(game.area.id).toBe('plain');
      expect([game.player.x, game.player.y]).toEqual([6, 11]);
    });

    it('同じダンジョンの隣のエリアがある端は、つながりがあっても隣のエリアへ。行き先のないつながりは使わない(front#274)', () => {
      const cave1 = { ...MAPS.find((m) => m.id === 'cave1')!, links: [{ dx: 1, dy: 0, to: 'plain' }, { dx: -1, dy: 0, to: 'moon' }, { dx: 0, dy: -1, to: 'cave2' }] };
      const maps = MAPS.map((m) => (m.id === 'cave1' ? cave1 : m));
      expect(exitOf(maps, cave1, [1, 0])).toMatchObject({ to: { id: 'cave2' }, link: false });
      expect(exitOf(maps, cave1, [-1, 0])).toBeNull();
      // 同じダンジョンのエリアへのつながりは使わない
      expect(exitOf(maps, cave1, [0, -1])).toBeNull();
      expect(exitOf(MAPS, MAPS[0], [1, 0])).toMatchObject({ to: { id: 'forest' }, link: true });
    });

    it('戻る端の着地できるマス(端も通れるマス)の真ん中に着く(front#339)', () => {
      const plain = MAPS[0];
      // 森の左上の端は、y=2・4・9 だけ通れる
      const forest = { ...MAPS[1], objects: Array.from({ length: 12 }, (_, y) => y).filter((y) => y !== 2 && y !== 4 && y !== 9).map((y) => ({ type: 'tree', x: 0, y, torch: false })) };
      expect(linkArrival([plain, forest], plain, [1, 0], forest, buildAreaMap(forest))).toEqual([1, 4]);
    });

    it('戻る端に道の出口(端が道のマス)があっても、道に寄せず、着地できるマスの真ん中に着く(front#339)', () => {
      const plain = MAPS[0];
      // 森の左上の端はどこも通れ、道は y=9 だけ
      const forest = { ...MAPS[1], ground: MAPS[1].ground.map((row, y) => (y === 9 ? 'pp' + row.slice(2) : row)) };
      expect(linkArrival([plain, forest], plain, [1, 0], forest, buildAreaMap(forest))).toEqual([1, 5]);
    });

    it('看板は、いちばん近いほかのダンジョンへの端を指す。なければ何も指さない(front#274)', () => {
      const plain = { ...MAPS[0], links: [{ dx: 1, dy: 0, to: 'forest' }, { dx: 0, dy: 1, to: 'cave1' }] };
      const maps = [plain, ...MAPS.slice(1)];
      expect(signExit(maps, plain, 9, 2)).toMatchObject({ side: [1, 0], to: { id: 'forest' } });
      expect(signExit(maps, plain, 2, 10)).toMatchObject({ side: [0, 1], to: { id: 'cave1' } });
      expect(signExit(MAPS, MAPS[2], 5, 5)).toBeNull();
    });
  });

  describe('ダンジョンの中のエリア移動(front#234)', () => {
    beforeEach(() => {
      game.loadSave(save({ area: 'cave1', x: 6, y: 6 }));
    });

    // スライドが終わるまで進める
    function walk(): void {
      for (let i = 0; i < 60; i++) game.update(0.05);
    }

    it('隣にエリアがある側の端で止まると、画面をスライドして隣のエリアの反対側の端の、着地できるマスの真ん中(1マス内側)に移る(front#339)', () => {
      clickTile(11, 6);
      for (let i = 0; i < 40 && game.area.id === 'cave1'; i++) game.update(0.05);

      expect(game.area.id).toBe('cave2');
      expect([game.player.x, game.player.y]).toEqual([1, 5]);
      expect(game.slide?.side).toEqual([1, 0]);
      expect(ev.captured).toBe(1);

      walk();
      expect(game.slide).toBeNull();
      expect(game.transitioning).toBe(false);
      // 同じダンジョンの中なので、ダンジョン名は出さない。エリアに入ったことは知らせる(front#304)
      expect(ev.entered).toEqual([]);
      expect(ev.areas).toEqual(['cave2/cave']);
      expect(ev.messages.filter((m) => m.includes('やってきた'))).toEqual([]);
      expect(game.dungeon.id).toBe('cave');
      expect(game.theme).toBe(THEMES['tower']);
    });

    it('戻る向きにも移れ、広さの違うエリアでも、着く端の真ん中に着く(front#339)', () => {
      clickTile(6, 11);
      walk();
      expect(game.area.id).toBe('cave3');
      expect([game.player.x, game.player.y]).toEqual([7, 1]);

      // 泉(16×16)の右上の端の16マスの真ん中(x=7)。泉から入口(12×12)へは、入口の左下の端の12マスの真ん中(x=5)
      game.player.x = 14;
      game.player.y = 1;
      clickTile(14, 0);
      walk();
      expect(game.area.id).toBe('cave1');
      expect([game.player.x, game.player.y]).toEqual([5, 10]);
    });

    it('隣にエリアがない側の端では移らない', () => {
      clickTile(0, 6);
      walk();
      expect(game.area.id).toBe('cave1');
      expect([game.player.x, game.player.y]).toEqual([0, 6]);
    });

    it('出てきた位置に関係なく、着く端の着地できるマスの真ん中に着き、端から離れたマスには着かない(front#339)', () => {
      // 奥の左上の端のうち y=6 は1マス内側が水なので着地できない(残り11マスの真ん中は y=5)
      game.maps = MAPS.map((m) => (m.id === 'cave2' ? { ...m, ground: m.ground.map((row, y) => (y === 6 ? 'gw' + 'g'.repeat(10) : row)) } : m));
      clickTile(11, 6);
      walk();
      expect(game.area.id).toBe('cave2');
      expect([game.player.x, game.player.y]).toEqual([1, 5]);

      // 入口の端のほかの位置(y=2)から出ても同じマスに着く
      walk();
      game.loadMap(game.maps.find((m) => m.id === 'cave1')!);
      Object.assign(game.player, { x: 10, y: 2, path: [], target: null });
      clickTile(11, 2);
      walk();
      expect(game.area.id).toBe('cave2');
      expect([game.player.x, game.player.y]).toEqual([1, 5]);
    });

    it('ダンジョンが見つからないエリアは、エリアの名前で最初の見た目のダンジョンとして扱う', () => {
      game.dungeons = [];
      game.loadMap(MAPS[0]);
      expect(game.dungeon).toMatchObject({ id: 'plain', name: 'plain', theme: 'plain' });
    });
  });

  describe('クエスト(front#239)', () => {
    const slimeQuest: RpgQuest = {
      id: 'q1', title: 'スライム退治', kind: 'defeat', target: 'slime', targetArea: null, count: 2,
      offerLines: ['たのむ'], progressLines: ['まだか'], doneLines: ['ありがとう'], rewardGold: 50, rewardItems: [{ itemId: 'hipotion', count: 1 }]
    };
    const giftQuest: RpgQuest = { ...slimeQuest, id: 'q2', title: '回復薬あつめ', kind: 'collect', target: 'potion', count: 2, rewardItems: [] };

    beforeEach(() => {
      const chief = {
        name: '村長', x: 3, y: 3, hair: '#000000', body: '#000000', role: 'quest' as const, notice: false, lines: ['ふだん'],
        look: lookFromColors('#000000', '#000000'), quests: [slimeQuest, giftQuest]
      };
      game.maps = [map('plain', { npcs: [chief], enemies: [{ type: 'slime', x: 8, y: 8 }, { type: 'slime', x: 9, y: 9 }, { type: 'slime', x: 10, y: 9 }] }), ...MAPS.slice(1)];
      game.loadSave(save({ area: 'plain', x: 6, y: 7, gold: 10, quests: [] }));
    });

    // 敵をたおす(戦う動きは「戦闘」で見ているので、ここでは直接たおす)
    const defeat = () => {
      const enemy = game.enemies.find((e) => e.alive && e.type === 'slime')!;
      (game as unknown as { killEnemy(e: unknown): void }).killEnemy(enemy);
    };

    it('引き受けてから敵をたおすと数え、目標に届くと「?」が出て、報告すると報酬をもらえる', () => {
      const chief = game.npcs[0];
      expect(game.questMark(chief)).toBe('!');
      defeat();
      expect(game.questLog.progressOf(slimeQuest, game.player.inv)).toBe(0);

      game.acceptQuest(slimeQuest);
      expect(ev.messages).toContain('クエスト「スライム退治」を引き受けた');
      defeat();
      expect(game.questMark(chief)).toBeNull();
      defeat();
      expect(ev.messages).toContain('クエスト「スライム退治」の目標を達成した。村長に報告しよう');
      expect(game.questMark(chief)).toBe('?');

      expect(game.reportQuest(slimeQuest)).toBe(true);
      expect(game.player.gold).toBeGreaterThanOrEqual(60);
      expect(game.player.inv['hipotion']).toBe(1);
      expect(ev.messages).toContain('クエスト「スライム退治」を達成した！ 50G・上回復薬×1 を手に入れた');
      // 次のクエストが受けられる
      expect(game.questMark(chief)).toBe('!');
      expect(game.toSaveInput().quests).toEqual([{ id: 'q1', state: 'completed', count: 2 }]);
    });

    it('アイテムを集めるクエストは、報告するときにアイテムを渡し、足りなければ報告できない', () => {
      game.questLog.load([{ id: 'q1', state: 'completed', count: 2 }]);
      game.acceptQuest(giftQuest);
      game.player.inv['potion'] = 1;
      expect(game.reportQuest(giftQuest)).toBe(false);
      game.player.inv['potion'] = 3;
      expect(game.questMark(game.npcs[0])).toBe('?');
      expect(game.reportQuest(giftQuest)).toBe(true);
      expect(game.player.inv['potion']).toBe(1);
    });
  });

  describe('段差(front#225)', () => {
    // x >= 8 が2段の台地のエリア。まわりとの境目は崖で、(7, 3) だけ1段の段になっている
    const heights = Array.from({ length: 12 }, (_, y) => '0000000' + (y === 3 ? '1' : '0') + '2222');

    beforeEach(() => {
      game.loadMap(map('hill', { heights }));
      game.player.x = 6;
      game.player.y = 7;
    });

    it('1段の差は登り降りでき、2段以上の差(崖)は通れない', () => {
      expect(game.map.canStep(6, 3, 7, 3)).toBe(true);
      expect(game.map.canStep(7, 3, 8, 3)).toBe(true);
      expect(game.map.canStep(7, 7, 8, 7)).toBe(false);
    });

    it('崖の上の台地へは、1段ずつの段を回って登る', () => {
      clickTile(10, 7);
      // 段(7, 3)を通り、どの1歩も高さの差は1段まで
      const path = [[6, 7], ...game.player.path];
      expect(path).toContainEqual([7, 3]);
      for (let i = 1; i < path.length; i++) {
        expect(Math.abs(game.map.heightAt(path[i][0], path[i][1]) - game.map.heightAt(path[i - 1][0], path[i - 1][1]))).toBeLessThanOrEqual(1);
      }

      for (let i = 0; i < 120; i++) game.update(0.05);
      expect([game.player.x, game.player.y]).toEqual([10, 7]);
      // 登り終えたら、台地の高さに立っている
      expect(game.player.z).toBeCloseTo(2);
    });

    it('高いマスをクリックすると、その上の面に当たる', () => {
      game.update(0);
      const [sx, sy] = game.screenPositionOf({ x: 10, y: 7 });
      expect(game.screenToTile(sx, sy)).toEqual([10, 7]);
    });
  });

  describe('素材と鍛冶屋の合成(front#277)', () => {
    afterEach(() => setEnemies(DEFAULT_ENEMIES));

    it('素材は23種類で、最初からいる敵はみな素材を落とす。レシピの装備・素材はすべてある', () => {
      expect(MATERIAL_IDS).toHaveLength(23);
      // ヒカリスライム(front#284)は素材の代わりに上回復薬を落とす
      expect(DEFAULT_ENEMIES.filter((e) => e.id !== 'hikarislime').every((e) => e.material && ITEMS[e.material]?.type === 'material' && (e.materialRate ?? 0) > 0)).toBe(true);
      expect(RECIPES).toHaveLength(8);
      for (const r of RECIPES) {
        expect(['weapon', 'armor']).toContain(ITEMS[r.result]?.type);
        // 合成でしか手に入らない(道具屋で売らない)
        expect(ITEMS[r.result].price).toBeUndefined();
        expect(r.materials.every((m) => ITEMS[m.id]?.type === 'material' && m.count > 0)).toBe(true);
      }
    });

    it('敵を倒すと、アイテムとは別に素材もフィールドに落ちる', () => {
      setEnemies([...DEFAULT_ENEMIES, { ...DEFAULT_ENEMIES[0], id: 'test', drop: 'potion', dropRate: 1, material: 'slime_jelly', materialRate: 1, sight: 0 }]);
      game.loadMap(map('field', { enemies: [{ type: 'test', x: 8, y: 5 }] }));
      (game as unknown as { killEnemy(e: unknown): void }).killEnemy(game.enemies[0]);
      expect(game.drops.map((d) => d.id).sort()).toEqual(['potion', 'slime_jelly']);
    });

    it('素材は使えず、装備もできない', () => {
      game.loadSave(save({ hp: 10, items: [...save().items, { itemId: 'slime_jelly', count: 3 }] }));
      game.useItem('slime_jelly');
      game.equip('slime_jelly');
      expect(game.player.inv['slime_jelly']).toBe(3);
      expect(game.player.hp).toBe(10);
      expect(game.player.armor).toBe('cloth');
    });

    it('素材とゴールドが足りていれば装備を作れ、素材とゴールドが減る。足りない・持っているときは作れない', () => {
      game.loadSave(save({ gold: 30, items: [...save().items, { itemId: 'slime_jelly', count: 6 }] }));
      const robe = RECIPES.find((r) => r.result === 'jelly_robe')!;
      const sword = RECIPES.find((r) => r.result === 'fang_sword')!;
      expect(game.canCraft(robe)).toBe(true);
      expect(game.canCraft(sword)).toBe(false);
      expect(game.craft('fang_sword')).toBe(false);

      expect(game.craft('jelly_robe')).toBe(true);
      expect([game.player.gold, game.player.inv['slime_jelly'], game.player.inv['jelly_robe']]).toEqual([10, 1, 1]);
      expect(ev.messages.at(-1)).toBe('ゼリーの服を作った！（-20G）');
      // 作った装備は1つまで。装備できる
      expect(game.canCraft(robe)).toBe(false);
      game.equip('jelly_robe');
      expect(game.player.armor).toBe('jelly_robe');
      // レシピにないもの
      expect(game.craft('potion')).toBe(false);
    });
  });

  describe('合成の装備の入れ替え(front#288)', () => {
    afterEach(() => setCrafts(DEFAULT_CRAFTS));

    const thunder: RpgCraft = {
      id: 'craft1', name: '雷の剣', icon: '⚡', type: 'weapon', power: 30, gold: 600,
      materials: [{ itemId: 'golem_stone', count: 3 }], sortOrder: 1
    };

    it('APIから読んだ装備とレシピに入れ替わり、前の合成の装備は消える', () => {
      setCrafts([{ ...DEFAULT_CRAFTS[0], sortOrder: 2 }, thunder]);

      expect(RECIPES.map((r) => r.result)).toEqual(['craft1', 'jelly_robe']);
      expect(ITEMS['craft1']).toMatchObject({ name: '雷の剣', icon: '⚡', type: 'weapon', atk: 30, desc: '鍛冶屋で合成' });
      expect(ITEMS['jelly_robe']).toMatchObject({ type: 'armor', def: 4 });
      expect(ITEMS['fang_sword']).toBeUndefined();
      expect(isCraftItem('craft1')).toBe(true);
      expect(isCraftItem('iron_sword')).toBe(false);
      // お店・ポイント交換の装備、素材は残る
      expect(ITEMS['iron_sword']?.atk).toBe(12);
      expect(ITEMS['golem_stone']?.type).toBe('material');
    });

    it('もとからあるアイテムと同じIDの装備は使わない', () => {
      setCrafts([{ ...thunder, id: 'potion' }]);
      expect(ITEMS['potion'].type).toBe('use');
      expect(RECIPES).toEqual([]);
    });

    it('消えた合成の装備は、セーブデータを読むときに持ち物から外し、装備は初期装備に戻す', () => {
      setCrafts([thunder]);
      game.loadSave(save({ weapon: 'fang_sword', items: [...save().items, { itemId: 'fang_sword', count: 1 }, { itemId: 'craft1', count: 1 }] }));
      expect(game.player.weapon).toBe('wood_sword');
      expect(game.player.inv['fang_sword']).toBeUndefined();
      expect(game.player.inv['craft1']).toBe(1);
    });
  });

  describe('看板(front#314)', () => {
    const sign = (x: number, y: number, lines?: string[]) => ({ type: 'sign', x, y, roof: null, torch: false, lines });
    function run(seconds: number): void {
      for (let t = 0; t < seconds; t += 0.05) game.update(0.05);
    }

    beforeEach(() => {
      game.loadMap(map('field', { objects: [sign(8, 5, ['この先 霧の沼。', '足元に注意！']), sign(3, 9)] }));
      Object.assign(game.player, { x: 5, y: 5, path: [], target: null });
      game.update(0);
    });

    it('文章のある看板をクリックすると、そばまで歩いて読み、叩かない', () => {
      clickTile(8, 5);
      run(3);
      expect(ev.reads).toEqual([['看板', ['この先 霧の沼。', '足元に注意！']]]);
      expect(Math.max(Math.abs(game.player.x - 8), Math.abs(game.player.y - 5))).toBeLessThanOrEqual(1.5);
      expect(game.map.statics.find((o) => o.x === 8 && o.y === 5)?.hits ?? 0).toBe(0);
    });

    it('文章がなく、指す端もない看板は、クリックしても何も起きない', () => {
      const [sx, sy] = game.screenPositionOf({ x: 3, y: 9 });
      expect(game.pickEntity(sx, sy - 20)).toBeNull();
      clickTile(3, 9);
      run(3);
      expect(ev.reads).toEqual([]);
    });

    it('文章がなく、ほかのダンジョンへの端を指す看板は、行き先の案内を出す', () => {
      // 始まりの草原は、右下の端が精霊の森(推奨 Lv4)につながる
      game.loadMap(map('plain', { links: [{ dx: 1, dy: 0, to: 'forest' }], objects: [sign(9, 5)] }));
      const o = game.map.statics.find((s) => s.type === 'sign')!;
      expect(game.signLines(o)).toEqual(['この先 精霊の森（推奨 Lv4〜）']);
    });
  });

  describe('立つ場所・セーブポイント(front#337)', () => {
    const point = (x: number, y: number) => ({ type: 'save_point', x, y, roof: null, torch: false });
    // 始まりの草原の(3, 4)と、森の(8, 8)にセーブポイントがある
    const maps = MAPS.map((m) =>
      m.id === 'plain' ? { ...m, objects: [point(3, 4)] } : m.id === 'forest' ? { ...m, objects: [point(8, 8)] } : m
    );
    function run(seconds: number): void {
      for (let t = 0; t < seconds; t += 0.05) game.update(0.05);
    }

    beforeEach(() => {
      game.dispose();
      game = new RpgGame(ev, maps, DUNGEONS);
      game.viewW = 800;
      game.viewH = 600;
    });

    it('まだ一度も保存していなければ、始まりの草原のセーブポイントのとなり((x, y+1))から始める', () => {
      game.loadSave(save({ area: 'plain', x: 6, y: 7, updatedAt: null }));
      expect(game.area.id).toBe('plain');
      expect([game.player.x, game.player.y]).toEqual([3, 5]);
    });

    it('セーブポイントのとなりがふさがっていれば、右・左・奥の順にとなりを探す', () => {
      const area = buildAreaMap({ ...maps[0], objects: [point(3, 4), { type: 'tree', x: 3, y: 5, torch: false }] });
      expect(besideSavePoint(area, { x: 3, y: 4 })).toEqual([4, 4]);
      expect(firstSpot(area)).toEqual([4, 4]);
    });

    it('一度保存していれば、保存した位置から始める。通れなければ近くの通れるマス', () => {
      game.loadSave(save({ area: 'forest', x: 4, y: 5 }));
      expect([game.area.id, game.player.x, game.player.y]).toEqual(['forest', 4, 5]);
      // セーブポイントのマスは通れないので、近くのマスに立つ
      game.loadSave(save({ area: 'forest', x: 8, y: 8 }));
      expect(game.area.id).toBe('forest');
      expect(game.map.walkable(game.player.x, game.player.y)).toBe(true);
      expect(Math.max(Math.abs(game.player.x - 8), Math.abs(game.player.y - 8))).toBe(1);
    });

    it('セーブポイントを調べると、立っていたマスを復活地点として覚え、保存用の形にも入る。同じセーブポイントを調べ直しても覚え直さない', () => {
      game.loadSave(save({ area: 'forest', x: 4, y: 5 }));
      clickTile(8, 8);
      run(4);
      expect(ev.reads).toEqual([['セーブポイント', ['ここを ふっかつ地点にした。たおれたら、ここに戻ってくる。']]]);
      const respawn = game.respawn!;
      expect(respawn).toEqual({ area: 'forest', x: Math.round(game.player.x), y: Math.round(game.player.y) });
      expect(Math.max(Math.abs(respawn.x - 8), Math.abs(respawn.y - 8))).toBe(1);
      expect(ev.messages).toContain('ふっかつ地点を forest にした');
      expect(game.toSaveInput().respawn).toEqual(respawn);
      // セーブポイントは叩いても壊れない
      expect(game.map.statics.find((o) => o.type === 'save_point')?.hits ?? 0).toBe(0);

      const logs = ev.messages.length;
      clickTile(8, 8);
      run(2);
      expect(ev.reads[1]).toEqual(['セーブポイント', ['ここが ふっかつ地点だ。']]);
      expect(game.respawn).toEqual(respawn);
      expect(ev.messages.length).toBe(logs);
    });

    it('たおれると、覚えた復活地点に戻る。まだ覚えていなければ始まりの草原のセーブポイントのとなり', () => {
      vi.useFakeTimers();
      const knockOut = () => {
        game.player.hp = 1;
        (game as unknown as { knockOut(): void }).knockOut();
        vi.advanceTimersByTime(3000);
      };
      game.loadSave(save({ area: 'cave1', x: 4, y: 5 }));
      knockOut();
      expect([game.area.id, game.player.x, game.player.y]).toEqual(['plain', 3, 5]);
      expect(ev.messages).toContain('村にもどってきた。HPが全回復した');

      game.loadSave(save({ area: 'cave1', x: 4, y: 5, respawn: { area: 'forest', x: 8, y: 9 } }));
      knockOut();
      expect([game.area.id, game.player.x, game.player.y]).toEqual(['forest', 8, 9]);
      expect(game.player.hp).toBe(game.maxHp());
      expect(ev.messages).toContain('ふっかつ地点にもどってきた。HPが全回復した');
    });

    it('覚えた復活地点が通れなくなっていたら(エリアを作り直したときなど)、始まりの草原のセーブポイントのとなりに戻る', () => {
      game.loadSave(save({ area: 'cave1', x: 4, y: 5, respawn: { area: 'forest', x: 8, y: 8 } }));
      expect(game.respawnSpot()).toMatchObject({ area: { id: 'plain' }, x: 3, y: 5 });
      game.loadSave(save({ respawn: { area: 'moon', x: 1, y: 1 } }));
      expect(game.respawnSpot()).toMatchObject({ area: { id: 'plain' }, x: 3, y: 5 });
    });

    it('テストプレイでは、そのエリアの中央付近から始める', () => {
      const lake = map('lake', { ground: Array.from({ length: 12 }, (_, y) => (y >= 4 && y <= 7 ? 'gggwwwwwwggg' : 'g'.repeat(12))) });
      game.startTestPlay(lake);
      expect(game.area.id).toBe('lake');
      // 中央(5.5, 5.5)のまわりは水なので、いちばん近い通れるマス
      expect([game.player.x, game.player.y]).toEqual([5, 3]);
    });

    it('着く端の着地できるマスの真ん中。偶数個なら左・上側、なければエリアの中央付近', () => {
      // 左上の端(x=0)は、y=2・3・4・9 だけ着地できる
      const blocked = map('edge', { objects: [0, 1, 5, 6, 7, 8, 10, 11].map((y) => ({ type: 'tree', x: 0, y, torch: false })) });
      expect(edgeMiddle(buildAreaMap(blocked), [-1, 0])).toEqual([1, 3]);
      // 右上の端(y=0)は、x=4〜6 の3つ
      const top = map('top', { ground: Array.from({ length: 12 }, (_, y) => (y === 0 ? 'wwwwgggwwwww' : 'g'.repeat(12))) });
      expect(edgeMiddle(buildAreaMap(top), [0, -1])).toEqual([5, 1]);
      // 端がすべて水なら中央付近
      const sea = map('sea', { ground: Array.from({ length: 12 }, (_, y) => (y === 11 ? 'w'.repeat(12) : 'g'.repeat(12))) });
      expect(edgeMiddle(buildAreaMap(sea), [0, 1])).toEqual(centerSpot(buildAreaMap(sea)));
    });
  });

  describe('フィールドに落ちたアイテム(front#276)', () => {
    function run(seconds: number): void {
      for (let t = 0; t < seconds; t += 0.05) game.update(0.05);
    }

    beforeEach(() => {
      // かならずアイテムを落とし、襲ってこない敵
      setEnemies([...DEFAULT_ENEMIES, { ...DEFAULT_ENEMIES[0], id: 'test', drop: 'hipotion', dropRate: 1, material: null, sight: 0 }]);
      game.loadMap(map('field', { enemies: [{ type: 'test', x: 8, y: 5 }] }));
      Object.assign(game.player, { x: 5, y: 5, path: [], target: null });
      game.update(0);
    });

    afterEach(() => setEnemies(DEFAULT_ENEMIES));

    it('敵を倒すと、落としたアイテムはすぐ持ち物に入らず、倒した場所に落ちる', () => {
      const enemy = game.enemies[0];
      (game as unknown as { killEnemy(e: unknown): void }).killEnemy(enemy);
      expect(game.player.inv['hipotion'] ?? 0).toBe(0);
      expect(game.drops.map((d) => [d.id, d.count, d.x, d.y])).toEqual([['hipotion', 1, 8, 5]]);
      expect(ev.messages.some((m) => m.includes('手に入れた'))).toBe(false);
    });

    it('クリックすると、そこまで歩いて拾い、ログに出る。上を歩いただけでは拾わない', () => {
      // 敵はランダムに歩き、アイテムの近くに来るとクリックで敵が選ばれてしまうので、この確認では置かない(front#308)
      game.enemies = [];
      const drop = game.dropItem('potion', 2, 7, 5)!;
      const before = game.player.inv['potion'] ?? 0;
      // 落ちたマスを通り過ぎるだけでは拾わない
      clickTile(9, 5);
      run(3);
      expect(game.drops).toEqual([drop]);

      const [sx, sy] = game.screenPositionOf(drop);
      expect(game.pickEntity(sx, sy - 10)).toBe(drop);
      game.click(sx, sy - 10);
      run(3);
      expect(game.drops).toEqual([]);
      expect(game.player.inv['potion']).toBe(before + 2);
      expect(ev.messages.at(-1)).toBe('回復薬×2を拾った');
    });

    it('近くのマスがふさがっていれば、空いているマスに落とし、ほかのアイテムとも重ならない', () => {
      game.dropItem('potion', 1, 6, 5);
      game.dropItem('potion', 1, 6, 5);
      expect(game.drops.map((d) => [d.x, d.y])).toEqual([[6, 5], [7, 5]]);
      // 知らないアイテム・0個は落とさない
      expect(game.dropItem('unknown', 1, 6, 5)).toBeNull();
      expect(game.dropItem('potion', 0, 6, 5)).toBeNull();
    });

    it('60秒で消え、エリアに入り直しても消える', () => {
      const drop = game.dropItem('potion', 1, 7, 5)!;
      run(59.5);
      expect(game.drops).toEqual([drop]);
      run(1);
      expect(game.drops).toEqual([]);

      game.dropItem('potion', 1, 7, 5);
      game.loadMap(map('field'));
      expect(game.drops).toEqual([]);
    });
  });

  describe('敵の攻撃(front#229)', () => {
    // すぐ襲ってくる、攻撃の間隔の短い敵(HPが高く、こちらからは倒れない)
    const test = (patch: Partial<EnemyDef>): EnemyDef => ({
      ...DEFAULT_ENEMIES[0], id: 'test', name: 'テスト', hp: 9999, atk: 20, sight: 8, interval: 0.5, speed: 1, ...patch
    });

    function setup(def: EnemyDef, enemyAt: [number, number], playerAt: [number, number]): void {
      setEnemies([...DEFAULT_ENEMIES, def]);
      game.loadMap(map('field', { enemies: [{ type: 'test', x: enemyAt[0], y: enemyAt[1] }] }));
      game.player.x = playerAt[0];
      game.player.y = playerAt[1];
    }

    function run(seconds: number, each?: () => void): void {
      for (let t = 0; t < seconds; t += 0.05) {
        game.update(0.05);
        each?.();
      }
    }

    afterEach(() => setEnemies(DEFAULT_ENEMIES));

    it('ひとくいそう(根を張る形)は、襲ってきても追いかけず、体当たり・ジャンプでも動かない(front#255)', () => {
      setup(test({ shape: 'plant', attack: 'jump', dash: 3, speed: 3 }), [2, 7], [6, 7]);
      run(3);
      expect([game.enemies[0].x, game.enemies[0].y]).toEqual([2, 7]);

      // となりに来たら攻撃してくる
      const hp = game.player.hp;
      game.player.x = 3;
      run(2);
      expect([game.enemies[0].x, game.enemies[0].y]).toEqual([2, 7]);
      expect(game.player.hp).toBeLessThan(hp);
    });

    it('ミミック・リビングアーマー(化ける形)は、近づかれるまで歩き回らず、近づくと追ってくる(front#270)', () => {
      for (const shape of ['mimic', 'livingarmor'] as const) {
        setup(test({ shape, sight: 2, speed: 3 }), [2, 7], [9, 7]);
        run(8);
        expect([game.enemies[0].x, game.enemies[0].y, game.enemies[0].aggro]).toEqual([2, 7, false]);

        game.player.x = 4;
        run(1.5);
        expect(game.enemies[0].aggro).toBe(true);
        expect(game.enemies[0].x).toBeGreaterThan(2);
      }
    });

    it('敵の攻撃が当たる瞬間に、攻撃の種類の効果音を鳴らす知らせを出す(よけても出す)(front#278)', () => {
      setup(test({ attack: 'fire', range: 5 }), [2, 7], [6, 7]);
      run(1.6);
      expect(ev.sounds.filter((s) => s.startsWith('attack_'))).toContain('attack_fire');
      expect(ev.sounds.every((s) => s === 'attack_fire')).toBe(true);
    });

    it('炎は離れたところから攻撃し、攻撃を始めたマスにいると当たる', () => {
      setup(test({ attack: 'fire', range: 5 }), [2, 7], [6, 7]);
      const hp = game.player.hp;
      run(1.6);

      const enemy = game.enemies[0];
      // 近づかずに攻撃する
      expect([Math.round(enemy.x), Math.round(enemy.y)]).toEqual([2, 7]);
      expect(game.player.hp).toBeLessThan(hp);
    });

    it('会話・お店などを開いている(locked)間は、敵が止まって攻撃してこない。閉じると攻撃してくる(front#243)', () => {
      setup(test({ attack: 'tackle', dash: 1, charge: 0 }), [4, 7], [5, 7]);
      const hp = game.player.hp;
      game.locked = true;
      run(2.0);

      expect(game.enemies[0].act).toBeNull();
      expect([game.enemies[0].x, game.enemies[0].y]).toEqual([4, 7]);
      expect(game.player.hp).toBe(hp);

      game.locked = false;
      run(1.5);
      expect(game.player.hp).toBeLessThan(hp);
    });

    it('炎は、予告のあいだに別のマスへ動けば当たらない', () => {
      setup(test({ attack: 'fire', range: 5, interval: 5 }), [2, 7], [6, 7]);
      const hp = game.player.hp;
      // 攻撃が始まったら、当たる前に1マス横へ動く(攻撃は 0.8 秒後に始まり、1 秒で終わる)
      run(2.0, () => {
        if (game.enemies[0].act && game.player.y === 7) game.player.y = 8;
      });

      expect(game.enemies[0].act).toBeNull();
      expect(game.player.hp).toBe(hp);
    });

    it('魔法陣(範囲1)は、攻撃を始めたマスのまわり1マスにいても当たり、2マス離れれば当たらない(front#327)', () => {
      for (const [moveTo, hits] of [[8, true], [9, false]] as const) {
        setup(test({ attack: 'circle', range: 5, radius: 1, interval: 5 }), [2, 7], [6, 7]);
        const hp = game.player.hp;
        // 攻撃が始まったら、当たる前に横へ動く
        run(2.0, () => {
          if (game.enemies[0].act && game.player.y === 7) game.player.y = moveTo;
        });
        expect(game.player.hp < hp).toBe(hits);
      }
    });

    it('守る敵(guard)が生きている間、ボスへのダメージは1体につき1/4ずつ減る。全部倒すと元に戻る(front#330)', () => {
      const random = vi.spyOn(Math, 'random').mockReturnValue(0.5);
      try {
        const boss = test({ id: 'boss', boss: true, hp: 99999, def: 0, sight: 0, interval: 99 });
        const guard = test({ id: 'guard', shape: 'wardcrystal', guard: true, sight: 0 });
        setEnemies([...DEFAULT_ENEMIES, boss, guard]);
        game.loadMap(map('throne', { enemies: [{ type: 'boss', x: 6, y: 5 }, { type: 'guard', x: 1, y: 1 }, { type: 'guard', x: 10, y: 1 }, { type: 'guard', x: 1, y: 10 }] }));
        game.player.x = 6;
        game.player.y = 6;
        const target = game.enemies.find((e) => e.type === 'boss')!;
        const guards = game.enemies.filter((e) => e.type === 'guard');
        // 倒した扱いにする(すぐには復活しない)
        const down = (e: (typeof guards)[number]) => Object.assign(e, { alive: false, respawn: 999 });
        const hitOnce = (): number => {
          const before = target.hp;
          game.player.atkCd = 0;
          game.player.target = target;
          game.update(0.05);
          return before - target.hp;
        };
        expect(game.bossGuards()).toBe(3);
        const with3 = hitOnce();
        down(guards[0]);
        down(guards[1]);
        expect(game.bossGuards()).toBe(1);
        const with1 = hitOnce();
        down(guards[2]);
        expect(game.bossGuards()).toBe(0);
        const full = hitOnce();
        expect(full).toBeGreaterThanOrEqual(8);
        expect([with3, with1]).toEqual([Math.round(full * 0.25), Math.round(full * 0.75)]);
      } finally {
        random.mockRestore();
      }
    });

    it('闇の水晶(攻撃しない形)は、となりで叩かれても動かず、攻撃してこない(front#329)', () => {
      setup(test({ shape: 'wardcrystal', attack: 'tackle', sight: 8, interval: 0.5, speed: 3 }), [5, 7], [6, 7]);
      const hp = game.player.hp;
      game.enemies[0].aggro = true;
      run(3);
      expect([game.enemies[0].x, game.enemies[0].y, game.enemies[0].act]).toEqual([5, 7, null]);
      expect(game.player.hp).toBe(hp);
    });

    it('体当たり(距離3)は、ためてから相手の手前まで突っ込んで当たる', () => {
      setup(test({ attack: 'tackle', dash: 3, charge: 0.3 }), [2, 7], [5, 7]);
      const hp = game.player.hp;
      run(1.5);

      expect(game.enemies[0].x).toBeGreaterThan(3.9);
      expect(game.player.hp).toBeLessThan(hp);
    });

    it('体当たりは、崖の手前で止まる', () => {
      const heights = Array.from({ length: 12 }, () => '0000' + '2' + '0000000');
      setEnemies([...DEFAULT_ENEMIES, test({ attack: 'tackle', dash: 3, sight: 0 })]);
      game.loadMap(map('cliff', { heights, enemies: [{ type: 'test', x: 2, y: 7 }] }));
      game.player.x = 5;
      game.player.y = 7;
      const enemy = game.enemies[0];
      enemy.aggro = true;
      enemy.atkCd = 0;
      run(1.2);

      // x = 4 の崖(2段)には上がれない
      expect(Math.round(enemy.x)).toBeLessThanOrEqual(3);
    });

    it('衝撃波は、範囲の中にいれば当たり、外なら当たらない', () => {
      setup(test({ attack: 'shockwave', radius: 1 }), [4, 7], [5, 7]);
      let hp = game.player.hp;
      run(1.6);
      expect(game.player.hp).toBeLessThan(hp);

      // 攻撃が始まったら、当たる前に範囲(1マス)の外へ出る
      setup(test({ attack: 'shockwave', radius: 1, interval: 5 }), [4, 7], [5, 7]);
      hp = game.player.hp;
      run(1.6, () => {
        if (game.enemies[0].act && game.player.x === 5) game.player.x = 8;
      });
      expect(game.player.hp).toBe(hp);
    });

    it('今の敵(距離1・ためる時間0の体当たり)は、となりに来たら攻撃する', () => {
      setup(test({ attack: 'tackle', dash: 1, charge: 0 }), [4, 7], [5, 7]);
      const hp = game.player.hp;
      run(1.2);
      expect(game.player.hp).toBeLessThan(hp);
      expect(game.enemies[0].x).toBe(4);
    });
  });

  describe('壊れる置物(front#264)', () => {
    function run(seconds: number): void {
      for (let t = 0; t < seconds; t += 0.05) game.update(0.05);
    }

    // プレイヤーを (5, 5) に置き、右下(6, 5)と左下(5, 6)に置物を置く
    function setup(objects: RpgMap['objects']): void {
      game.loadMap(map('field', { objects }));
      Object.assign(game.player, { x: 5, y: 5, path: [], target: null });
      game.update(0);
    }

    const staticAt = (x: number, y: number) => game.map.statics.find((o) => o.x === x && o.y === y)!;

    it('壊れる置物・敵を叩くと、叩いたものの素材の効果音を鳴らす知らせを出す(front#278・front#282)', () => {
      // 置物: 岩は岩、たるは木、草むらは草
      for (const [type, slot] of [['rock', 'hit_stone'], ['barrel', 'hit_wood'], ['grass', 'hit_grass']]) {
        ev.sounds.length = 0;
        setup([{ type, x: 6, y: 5, torch: false }]);
        game.player.atkCd = 0;
        game.player.target = staticAt(6, 5);
        game.update(0.05);
        expect(ev.sounds).toEqual([slot]);
      }
      // 敵: ゴーレムは岩、スライムは柔らかいもの、キノコンは生き物。「敵」タブで選んでいればそちら
      setEnemies([...DEFAULT_ENEMIES, { ...DEFAULT_ENEMIES[0], id: 'rockslime', hitMaterial: 'stone' }]);
      for (const [type, slot] of [['golem', 'hit_stone'], ['slime', 'hit_soft'], ['kinokon', 'hit_flesh'], ['rockslime', 'hit_stone']]) {
        ev.sounds.length = 0;
        game.loadMap(map('field', { enemies: [{ type, x: 6, y: 5 }] }));
        Object.assign(game.player, { x: 5, y: 5, path: [], target: game.enemies[0], atkCd: 0 });
        game.update(0.05);
        expect(ev.sounds).toEqual([slot]);
      }
      setEnemies(DEFAULT_ENEMIES);
    });

    it('草むら・シダ・水晶・岩だけを狙え、決まった回数叩くと壊れて、そのマスを通れる', () => {
      setup([{ type: 'rock', x: 6, y: 5, torch: false }, { type: 'tree', x: 5, y: 6, torch: false }]);
      const [tx, ty] = game.screenPositionOf({ x: 5, y: 6 });
      expect(game.pickEntity(tx, ty - 10)).toBeNull();
      const [rx, ry] = game.screenPositionOf({ x: 6, y: 5 });
      const rock = staticAt(6, 5);
      expect(game.pickEntity(rx, ry - 10)).toBe(rock);

      game.player.target = rock;
      game.update(0.05);
      // 岩は3回で壊れる。1回目ではまだ壊れない
      expect(rock.hits).toBe(1);
      expect(rock.broken).toBeFalsy();
      expect(game.map.walkable(6, 5)).toBe(false);
      run(5);
      expect(rock.broken).toBe(true);
      expect(game.map.walkable(6, 5)).toBe(true);
    });

    it('宝箱は1回、甲冑は3回叩くと壊れ、背の高い甲冑は頭のあたりをクリックしても狙える(front#266)', () => {
      setup([{ type: 'chest', x: 6, y: 5, torch: false }, { type: 'armor', x: 5, y: 6, torch: false }]);
      const chest = staticAt(6, 5);
      const armor = staticAt(5, 6);
      const [ax, ay] = game.screenPositionOf({ x: 5, y: 6 });
      expect(game.pickEntity(ax, ay - 45 * game.zoom)).toBe(armor);

      game.player.target = chest;
      game.update(0.05);
      expect(chest.broken).toBe(true);

      // 宝箱を叩いた直後なので、次の攻撃までの待ち時間をなくしてから甲冑を狙う
      game.player.atkCd = 0;
      game.player.target = armor;
      game.update(0.05);
      expect([armor.hits, armor.broken]).toEqual([1, undefined]);
      run(5);
      expect(armor.broken).toBe(true);
    });

    it('たる・つぼ・骨の山は1回で壊れ、本棚・燭台・墓石は通れず、狙えず、壊れない(front#270)', () => {
      setup([
        { type: 'barrel', x: 6, y: 5, torch: false, enemies: [{ id: 'skeleton', chance: 1 }] },
        { type: 'bookshelf', x: 5, y: 6, torch: false }, { type: 'candle', x: 4, y: 5, torch: false }, { type: 'grave', x: 5, y: 4, torch: false }
      ]);
      for (const [x, y] of [[5, 6], [4, 5], [5, 4]]) {
        expect(game.map.walkable(x, y)).toBe(false);
        const [sx, sy] = game.screenPositionOf({ x, y });
        expect(game.pickEntity(sx, sy - 10)).toBeNull();
      }
      const barrel = staticAt(6, 5);
      game.player.target = barrel;
      game.update(0.05);
      expect(barrel.broken).toBe(true);
      expect(ev.messages.at(-1)).toBe('たるの中からガイコツ兵が現れた！');

      for (const type of ['pot', 'bones']) {
        setup([{ type, x: 6, y: 5, torch: false }]);
        game.player.atkCd = 0;
        game.player.target = staticAt(6, 5);
        game.update(0.05);
        expect(staticAt(6, 5).broken).toBe(true);
      }
    });

    it('木のおけは1回で壊れ、鉄格子・鎖の杭は通れず、狙えず、壊れない(front#321)', () => {
      setup([
        { type: 'bucket', x: 6, y: 5, torch: false, enemies: [{ id: 'rat', chance: 1 }] },
        { type: 'bars', x: 5, y: 6, torch: false }, { type: 'shackle', x: 4, y: 5, torch: false }
      ]);
      for (const [x, y] of [[5, 6], [4, 5]]) {
        expect(game.map.walkable(x, y)).toBe(false);
        const [sx, sy] = game.screenPositionOf({ x, y });
        expect(game.pickEntity(sx, sy - 10)).toBeNull();
      }
      const bucket = staticAt(6, 5);
      game.player.target = bucket;
      game.update(0.05);
      expect(bucket.broken).toBe(true);
      expect(ev.messages.at(-1)).toBe('木のおけの中からドブネズミが現れた！');
    });

    it('鉄格子は、左右(x)のとなりに壁か鉄格子があれば x の向き、なければ y の向きに並ぶ(front#321)', () => {
      const objects: RpgMap['objects'] = [
        { type: 'wall', x: 2, y: 4, torch: false }, { type: 'bars', x: 3, y: 4, torch: false }, { type: 'bars', x: 4, y: 4, torch: false },
        { type: 'bars', x: 8, y: 2, torch: false }, { type: 'bars', x: 8, y: 3, torch: false }, { type: 'bars', x: 10, y: 10, torch: false }
      ];
      const area = buildAreaMap(map('cell', { objects }));
      // 壁のとなり・鉄格子のとなりは x、縦に続けた鉄格子・ひとつだけの鉄格子は y
      expect([[3, 4], [4, 4], [8, 2], [8, 3], [10, 10]].map(([x, y]) => barsAlong(area, { x, y }))).toEqual(['x', 'x', 'y', 'y', 'y']);
    });

    it('本棚は、壁ぎわ・「なし」の端に置くと部屋の内側を向く(front#270)', () => {
      const ground = Array.from({ length: 12 }, (_, y) => (y === 0 ? 'v'.repeat(12) : 'g'.repeat(12)));
      const area = buildAreaMap(map('room', { ground, objects: [{ type: 'wall', x: 3, y: 5, torch: false }] }));
      // 左上(x - 1)が端・壁なら右下、右上(y - 1)だけが「なし」なら左下、どちらでもなければ右下
      expect(shelfFace(area, { x: 0, y: 5 })).toBe('x');
      expect(shelfFace(area, { x: 4, y: 5 })).toBe('x');
      expect(shelfFace(area, { x: 6, y: 1 })).toBe('y');
      expect(shelfFace(area, { x: 3, y: 6 })).toBe('y');
      expect(shelfFace(area, { x: 6, y: 6 })).toBe('x');
    });

    it('壁は通れず、狙えず、壊れない(front#268)', () => {
      setup([{ type: 'wall', x: 6, y: 5, torch: false }]);
      expect(game.map.walkable(6, 5)).toBe(false);
      const [wx, wy] = game.screenPositionOf({ x: 6, y: 5 });
      expect(game.pickEntity(wx, wy - 10)).toBeNull();
    });

    it('中身のアイテムは置物のマスの隣に落ち(front#276)、置物は10秒後に元に戻る(エリアに入り直しても戻る)', () => {
      setup([{ type: 'grass', x: 6, y: 5, torch: false, items: [{ id: 'potion', count: 2, chance: 1 }] }]);
      const before = game.player.inv['potion'] ?? 0;
      const grass = staticAt(6, 5);
      game.player.target = grass;
      game.update(0.05);

      expect(grass.broken).toBe(true);
      // まだ持ち物には入らない。置物のマス(6, 5)には落ちない
      expect(game.player.inv['potion'] ?? 0).toBe(before);
      expect(game.drops.map((d) => [d.id, d.count, d.x, d.y])).toEqual([['potion', 2, 7, 5]]);
      run(BREAK_RESPAWN_SEC - 1);
      expect(grass.broken).toBe(true);
      run(1.5);
      expect(grass.broken).toBe(false);
      expect(game.map.walkable(6, 5)).toBe(false);
    });

    it('中身の敵はそのマスに現れて襲ってくる。倒すまで置物は戻らず、倒しても敵は出直さない', () => {
      setup([{ type: 'fern', x: 6, y: 5, torch: false, enemies: [{ id: 'slime', chance: 1 }] }]);
      const fern = staticAt(6, 5);
      game.player.target = fern;
      game.update(0.05);

      const slime = game.enemies.find((e) => e.fromObject === fern)!;
      expect([slime.type, slime.x, slime.y, slime.aggro]).toEqual(['slime', 6, 5, true]);
      expect(game.player.target).toBe(slime);
      expect(ev.messages.at(-1)).toBe('シダの中からスライムが現れた！');

      // 敵が生きている間は戻らない(プレイヤーが倒さないよう狙いを外し、敵が動かないよう会話中の扱いにして時間を進める)
      game.player.target = null;
      game.locked = true;
      run(BREAK_RESPAWN_SEC + 2);
      expect(fern.broken).toBe(true);

      (game as unknown as { killEnemy(e: typeof slime): void }).killEnemy(slime);
      run(BREAK_RESPAWN_SEC + 2);
      expect(fern.broken).toBe(false);
      expect(game.enemies.some((e) => e.fromObject === fern)).toBe(false);
    });

    it('中の敵は出る確率で出る。出なければ中身なしと同じで、時間がたつと元に戻る(front#284)', () => {
      const random = vi.spyOn(Math, 'random');
      try {
        const enemies = [{ id: 'hikarislime', chance: 0.001 }];
        // 確率より大きい → 出ない
        random.mockReturnValue(0.5);
        setup([{ type: 'grass', x: 6, y: 5, torch: false, enemies }]);
        const grass = staticAt(6, 5);
        game.player.target = grass;
        game.update(0.05);
        expect(grass.broken).toBe(true);
        expect(game.enemies.some((e) => e.fromObject === grass)).toBe(false);
        expect(grass.respawnIn).toBeGreaterThan(BREAK_RESPAWN_SEC - 1);
        // 確率より小さい → 出る
        random.mockReturnValue(0.0005);
        setup([{ type: 'grass', x: 6, y: 5, torch: false, enemies }]);
        const grass2 = staticAt(6, 5);
        game.player.atkCd = 0;
        game.player.target = grass2;
        game.update(0.05);
        expect(game.enemies.find((e) => e.fromObject === grass2)?.type).toBe('hikarislime');
      } finally {
        random.mockRestore();
      }
    });
  });

  describe('置物の設定(front#333)', () => {
    function run(seconds: number): void {
      for (let t = 0; t < seconds; t += 0.05) game.update(0.05);
    }

    function setup(objects: RpgMap['objects'], at: [number, number] = [5, 5]): void {
      game.loadMap(map('field', { objects }));
      Object.assign(game.player, { x: at[0], y: at[1], path: [], target: null });
      game.update(0);
    }

    const staticAt = (x: number, y: number) => game.map.statics.find((o) => o.x === x && o.y === y)!;
    const kill = (e: unknown) => (game as unknown as { killEnemy(e: unknown): void }).killEnemy(e);

    afterEach(() => {
      setObjectDefs([]);
      vi.restoreAllMocks();
    });

    it('設定は 置いた置物 → 種類のデフォルト → 今の動き の順に決まる', () => {
      setObjectDefs([{ type: 'barrel', color: '#112233', dark: null, items: [{ id: 'potion', count: 1, chance: 1 }], enemies: [], mimics: [], hitMaterial: 'metal', updatedAt: '' }]);
      expect(objectSettingsOf({ type: 'barrel' })).toMatchObject({ color: '#112233', items: [{ id: 'potion', count: 1, chance: 1 }], hitMaterial: 'metal' });
      expect(objectSettingsOf({ type: 'barrel', items: [], hitMaterial: 'wood' })).toMatchObject({ items: [], hitMaterial: 'wood' });
      // デフォルトがなければ今の音
      expect(objectSettingsOf({ type: 'grass' }).hitMaterial).toBe('grass');
      // 色は片方だけ決めても、もう片方は今の色で補う
      expect(objectTintOf({ type: 'barrel' })?.m).toBe('#112233');
      expect(objectTintOf({ type: 'barrel' })?.d).toBeTruthy();
      expect(objectTintOf({ type: 'pot' })).toBeNull();
      // 壊れない置物は、アイテム・敵を持たない
      expect(objectSettingsOf({ type: 'tree', items: [{ id: 'potion', count: 1, chance: 1 }] }).items).toEqual([]);
    });

    it('メッセージを表示する置物は、壊れず・擬態せず、クリックすると読む', () => {
      setup([{ type: 'barrel', x: 8, y: 5, torch: false, showMessage: true, lines: ['古いたるだ。', ' '], items: [{ id: 'potion', count: 1, chance: 1 }], mimics: [{ id: 'slime', chance: 1 }] }]);
      expect(objectSettingsOf(staticAt(8, 5))).toMatchObject({ items: [], enemies: [], mimics: [], lines: ['古いたるだ。'] });
      expect(game.enemies.some((e) => e.disguise)).toBe(false);
      clickTile(8, 5);
      run(3);
      expect(ev.reads).toEqual([['たる', ['古いたるだ。']]]);
      expect(staticAt(8, 5).hits ?? 0).toBe(0);
      expect(staticAt(8, 5).broken).toBeFalsy();
    });

    it('出てくるアイテム・敵は1行ずつそれぞれの確率で出る。両方出ることもあり、出た敵を全部倒すまで戻らない', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.3);
      setup([{
        type: 'barrel', x: 6, y: 5, torch: false,
        items: [{ id: 'potion', count: 2, chance: 0.5 }, { id: 'ether', count: 1, chance: 0.2 }],
        enemies: [{ id: 'slime', chance: 1 }, { id: 'rat', chance: 0.5 }, { id: 'skeleton', chance: 0.1 }]
      }]);
      const barrel = staticAt(6, 5);
      game.player.target = barrel;
      game.update(0.05);
      vi.restoreAllMocks();

      expect(barrel.broken).toBe(true);
      expect(game.drops.map((d) => d.id)).toEqual(['potion']);
      const out = game.enemies.filter((e) => e.fromObject === barrel);
      expect(out.map((e) => e.type)).toEqual(['slime', 'rat']);
      // 同じマスに重ならない
      expect(new Set(out.map((e) => `${e.x},${e.y}`)).size).toBe(2);

      game.player.target = null;
      game.locked = true;
      kill(out[0]);
      run(BREAK_RESPAWN_SEC + 2);
      expect(barrel.broken).toBe(true);
      kill(out[1]);
      run(BREAK_RESPAWN_SEC + 2);
      expect(barrel.broken).toBe(false);
    });

    it('擬態している敵を確率で決める。合計に届かなければただの置物', () => {
      const list = [{ id: 'slime', chance: 0.2 }, { id: 'rat', chance: 0.3 }];
      expect([0, 0.19, 0.2, 0.49, 0.5, 0.99].map((r) => pickMimic(list, r))).toEqual(['slime', 'slime', 'rat', 'rat', '', '']);
      expect(pickMimic([], 0)).toBe('');
    });

    it('擬態している敵は置物のふりをし、近づくと正体を現す。倒すと出直す時間のあとに選び直し、外れたら置物に戻る', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0);
      setup([{ type: 'pot', x: 10, y: 10, torch: false, mimics: [{ id: 'skeleton', chance: 0.5 }] }], [1, 1]);
      const mimic = game.enemies.find((e) => e.disguise)!;
      expect(mimic.type).toBe('skeleton');
      expect(staticAt(10, 10).mimicked).toBe(true);
      // 遠いうちは置物のまま(通れず、動かない)
      run(1);
      expect([mimic.x, mimic.y, mimic.aggro]).toEqual([10, 10, false]);
      expect(game.map.walkable(10, 10)).toBe(false);
      // 視界(ガイコツ兵は3マス)に入ると正体を現す
      Object.assign(game.player, { x: 7, y: 10, path: [] });
      run(0.5);
      expect(mimic.aggro).toBe(true);
      vi.restoreAllMocks();

      // 倒したあと、出直すときに選び直す。外れたらただの置物に戻る
      vi.spyOn(Math, 'random').mockReturnValue(0.99);
      Object.assign(game.player, { x: 1, y: 1, path: [], target: null });
      kill(mimic);
      run(ENEMIES['skeleton'].respawn + 2);
      expect(game.enemies.includes(mimic)).toBe(false);
      expect(staticAt(10, 10).mimicked).toBeFalsy();
      expect(game.map.walkable(10, 10)).toBe(false);
    });

    it('視界のない敵が擬態していても、隣まで来たら正体を現す', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0);
      setup([{ type: 'pot', x: 10, y: 10, torch: false, mimics: [{ id: 'slime', chance: 1 }] }], [7, 10]);
      const mimic = game.enemies.find((e) => e.disguise)!;
      run(0.5);
      expect(mimic.aggro).toBe(false);
      Object.assign(game.player, { x: 9, y: 10, path: [] });
      run(0.5);
      expect(mimic.aggro).toBe(true);
    });

    it('看板の向きを決めると、その向きの端の行き先を案内し、自動のときだけ帯を付ける', () => {
      const area = map('plain', { links: [{ dx: 1, dy: 0, to: 'forest' }] });
      expect(signPointing(MAPS, area, { x: 2, y: 2 })).toMatchObject({ side: [1, 0], auto: true });
      expect(signPointing(MAPS, area, { x: 2, y: 2, signDir: 'nw' })).toEqual({ side: [-1, 0], exit: null, auto: false });
      expect(signPointing(MAPS, area, { x: 2, y: 2, signDir: 'se' })).toMatchObject({ side: [1, 0], auto: false });
      game.loadMap(map('plain', { links: [{ dx: 1, dy: 0, to: 'forest' }], objects: [{ type: 'sign', x: 2, y: 2, torch: false, signDir: 'nw' }] }));
      expect(game.signLines(game.map.statics.find((s) => s.type === 'sign')!)).toBeNull();
    });
  });

  describe('仲間(front#358)', () => {
    // すぐ襲ってくる、攻撃の間隔の短い敵(HPが高く、こちらからは倒れない)。運のステータスは0なので、攻撃はよけない
    const test = (patch: Partial<EnemyDef>): EnemyDef => ({
      ...DEFAULT_ENEMIES[0], id: 'test', name: 'テスト', hp: 9999, atk: 20, sight: 8, interval: 0.5, speed: 1, ...patch
    });

    const mate = (userId: string, partial: Partial<RpgCompanion> = {}): RpgCompanion => ({
      userId, name: `仲間${userId}`, level: 2, exp: 0, hp: 50, weapon: 'wood_sword', armor: 'cloth',
      items: [], stats: { ...ZERO_STATS, atk: 3 }, statPoints: 0, look: LOOK, ...partial
    });

    let waits: boolean[];
    let left: [string[], string][];

    beforeEach(() => {
      waits = [];
      left = [];
      ev.waiting = (on) => waits.push(on);
      ev.companionsLeft = (cs, reason) => left.push([cs.map((c) => c.userId), reason]);
    });

    afterEach(() => setEnemies(DEFAULT_ENEMIES));

    function run(seconds: number, each?: () => void): void {
      for (let t = 0; t < seconds; t += 0.05) {
        game.update(0.05);
        each?.();
      }
    }

    // 敵のいないエリアで、プレイヤーを (6, 6) に立たせ、仲間を加える
    function withParty(...mates: RpgCompanion[]): void {
      game.loadSave(save({ area: 'plain', x: 6, y: 6 }));
      for (const m of mates) game.addCompanion(m);
    }

    function setEnemy(def: EnemyDef, at: [number, number]): void {
      setEnemies([...DEFAULT_ENEMIES, def]);
      game.loadMap(map('field', { enemies: [{ type: def.id, x: at[0], y: at[1] }] }));
    }

    const kill = (e: unknown) => (game as unknown as { killEnemy(e: unknown): void }).killEnemy(e);

    it('セーブデータの仲間を読み込み、仲間のデータも保存用の形に入る。たおれたまま保存された仲間はHPが全回復', () => {
      game.loadSave(save({ party: [mate('3', { hp: 30, items: [{ itemId: 'potion', count: 2 }] }), mate('4', { hp: 0 })] }));

      expect(game.companions.map((c) => [c.userId, c.hp])).toEqual([['3', 30], ['4', maxHpOf({ ...ZERO_STATS, atk: 3 })]]);
      expect(game.toSaveInput().companions).toEqual([
        { userId: '3', level: 2, exp: 0, hp: 30, weapon: 'wood_sword', armor: 'cloth', items: [{ itemId: 'potion', count: 2 }], stats: { ...ZERO_STATS, atk: 3 }, statPoints: 0 },
        { userId: '4', level: 2, exp: 0, hp: 50, weapon: 'wood_sword', armor: 'cloth', items: [], stats: { ...ZERO_STATS, atk: 3 }, statPoints: 0 }
      ]);
    });

    it('呼んだ仲間はHPが全回復した状態で、プレイヤーのまわりの別々の通れるマスに立つ。3人まで', () => {
      withParty(mate('3', { hp: 1 }), mate('4'), mate('5'), mate('6'));

      expect(game.companions.map((c) => c.userId)).toEqual(['3', '4', '5']);
      expect(game.companions[0].hp).toBe(50);
      const spots = game.companions.map((c) => `${c.x},${c.y}`);
      expect(new Set([...spots, '6,6']).size).toBe(4);
      for (const c of game.companions) expect(Math.max(Math.abs(c.x - 6), Math.abs(c.y - 6))).toBe(1);
    });

    it('エリアを移ると、仲間もついてきてプレイヤーのまわりに立つ', () => {
      game.loadSave(save({ area: 'cave1', x: 11, y: 6 }));
      game.addCompanion(mate('3'));
      game.addCompanion(mate('4'));
      game.goNeighbor([1, 0]);

      expect(game.area.id).toBe('cave2');
      for (const c of game.companions) expect(Math.max(Math.abs(c.x - game.player.x), Math.abs(c.y - game.player.y))).toBeLessThanOrEqual(1);
    });

    it('仲間はプレイヤーについて歩く', () => {
      withParty(mate('3'));
      game.player.x = 10;
      game.player.y = 10;
      run(4);

      const c = game.companions[0];
      expect(Math.max(Math.abs(c.x - 10), Math.abs(c.y - 10))).toBeLessThanOrEqual(2);
    });

    it('経験値はパーティの人数(たおれている仲間も数える)で割り、切り上げて全員に入る。ゴールドは割らない', () => {
      withParty(mate('3'), mate('4', { hp: 0 }));
      game.companions[1].dead = true;
      setEnemy(test({ exp: 40, gold: 7, sight: 0 }), [9, 9]);
      const [exp, gold] = [game.player.exp, game.player.gold];

      kill(game.enemies[0]);

      expect(game.player.exp - exp).toBe(14);
      expect(game.player.gold - gold).toBe(7);
      expect(game.companions.map((c) => c.exp)).toEqual([14, 14]);
      expect(ev.messages.some((m) => m.includes('経験値40を3人で分けて+14'))).toBe(true);
    });

    it('仲間のレベルが上がると、もらった3ポイントをランダムに振り分け、HPが全回復する', () => {
      withParty(mate('3', { hp: 10 }));
      setEnemy(test({ exp: 200, sight: 0 }), [9, 9]);

      kill(game.enemies[0]);

      const c = game.companions[0];
      expect(c.level).toBeGreaterThan(2);
      const total = Object.values(c.stats).reduce((n, v) => n + v, 0);
      expect(total + c.statPoints).toBe((c.level - 1) * 3);
      expect(c.hp).toBe(game.maxHpOf(c));
      expect(ev.messages.some((m) => m.startsWith(`仲間3がレベル${c.level}になった！`))).toBe(true);
    });

    it('敵は、いちばん近い人を狙う。プレイヤーから遠い仲間が先に狙われる', () => {
      withParty(mate('3'));
      setEnemy(test({ attack: 'tackle', dash: 1, charge: 0, speed: 0.01 }), [2, 2]);
      // プレイヤーは敵から6マス。仲間は敵のすぐそばで、敵を叩き、敵も近い仲間を狙う
      game.player.x = 8;
      game.player.y = 8;
      const c = game.companions[0];
      Object.assign(c, { x: 3, y: 2, path: [] });
      const [php, chp] = [game.player.hp, c.hp];
      run(1.5);

      expect(game.enemies[0].foe).toBe(c);
      expect(c.hp).toBeLessThan(chp);
      // プレイヤーは攻撃されない(戦っていないので、少し回復することはある)
      expect(game.player.hp).toBeGreaterThanOrEqual(php);
    });

    it('範囲の攻撃(魔法陣)は、範囲の中にいる全員に当たる', () => {
      withParty(mate('3'));
      setEnemy(test({ attack: 'circle', range: 6, radius: 1, interval: 5, sight: 8, speed: 0.01 }), [2, 7]);
      game.player.x = 6;
      game.player.y = 7;
      const c = game.companions[0];
      Object.assign(c, { x: 6, y: 8, path: [] });
      // 仲間がその場から動かないように、近づいて叩く前に確かめる
      const [php, chp] = [game.player.hp, c.hp];
      run(1.6, () => Object.assign(c, { x: 6, y: 8, path: [] }));

      expect(game.player.hp).toBeLessThan(php);
      expect(c.hp).toBeLessThan(chp);
    });

    it('仲間はHPが3割を切った人に、自分の持ち物の回復薬を使う', () => {
      withParty(mate('3', { items: [{ itemId: 'potion', count: 2 }] }));
      game.player.hp = 5;
      run(0.1);

      expect(game.player.hp).toBeGreaterThan(5);
      expect(game.companions[0].inv['potion']).toBe(1);
      expect(ev.messages.some((m) => m.startsWith('仲間3が回復薬を使った'))).toBe(true);
    });

    it('仲間がたおれて1分のうちに起こしてもらえなければ、パーティから抜けて集会場に戻る', () => {
      withParty(mate('3'), mate('4'));
      const c = game.companions[0];
      c.hp = 1;
      setEnemy(test({ attack: 'tackle', dash: 1, charge: 0, speed: 0.01 }), [2, 2]);
      Object.assign(c, { x: 3, y: 2, path: [] });
      game.player.x = 8;
      game.player.y = 8;
      run(1.5);
      expect(c.dead).toBe(true);
      expect(c.downT).toBeGreaterThan(55);
      // たおれている仲間は狙わない
      run(1);
      expect(game.enemies[0].foe).not.toBe(c);

      game.enemies[0].alive = false;
      game.enemies[0].respawn = 999;
      run(61);
      expect(game.companions.map((m) => m.userId)).toEqual(['4']);
      expect(left).toEqual([[['3'], 'timeout']]);
    });

    it('会話・お店などを開いている間は、たおれている時間が進まない', () => {
      withParty(mate('3'));
      Object.assign(game.companions[0], { dead: true, hp: 0, downT: 60 });
      game.locked = true;
      run(5);
      expect(game.companions[0].downT).toBe(60);
    });

    it('いのちの羽を持っている仲間は、たおれた仲間のそばへ行って起こす(HP5割)', () => {
      withParty(mate('3', { items: [{ itemId: 'life_feather', count: 1 }] }), mate('4'));
      const down = game.companions[1];
      Object.assign(down, { dead: true, hp: 0, downT: 60, x: 9, y: 9 });
      run(4);

      expect(down.dead).toBe(false);
      expect(down.hp).toBe(Math.round(game.maxHpOf(down) * 0.5));
      expect(game.companions[0].inv['life_feather']).toBe(0);
    });

    it('仲間がいるときにプレイヤーがたおれたら待ち、仲間がいのちの羽で起こしてくれる', () => {
      withParty(mate('3', { items: [{ itemId: 'life_feather', count: 1 }] }));
      (game as unknown as { knockOut(): void }).knockOut();
      expect(game.player.dead).toBe(true);
      expect(waits).toEqual([true]);

      run(4);
      expect(game.player.dead).toBe(false);
      expect(game.player.hp).toBe(Math.round(game.maxHp() * 0.5));
      expect(waits).toEqual([true, false]);
      expect(game.area.id).toBe('plain');
    });

    it('待つのをやめて町に戻ると、ゴールドを1割落として復活地点に戻り、仲間は集会場に戻る', () => {
      vi.useFakeTimers();
      withParty(mate('3'), mate('4'));
      const gold = game.player.gold;
      (game as unknown as { knockOut(): void }).knockOut();
      game.giveUp();

      expect(game.companions).toEqual([]);
      expect(left).toEqual([[['3', '4'], 'town']]);
      expect(game.player.gold).toBe(gold - Math.floor(gold * 0.1));
      vi.advanceTimersByTime(5000);
      expect(game.player.dead).toBe(false);
      expect(game.player.hp).toBe(game.maxHp());
    });

    it('1分待っても起こしてもらえなければ、町に戻る', () => {
      vi.useFakeTimers();
      withParty(mate('3'));
      (game as unknown as { knockOut(): void }).knockOut();
      run(61);
      expect(left).toEqual([[['3'], 'town']]);
      expect(waits).toEqual([true, false]);
    });

    it('仲間がいない・全員たおれたときは、待たずに町に戻る', () => {
      vi.useFakeTimers();
      withParty(mate('3'));
      Object.assign(game.companions[0], { dead: true, hp: 0, downT: 30 });
      (game as unknown as { knockOut(): void }).knockOut();
      expect(waits).toEqual([false]);
      expect(left).toEqual([[['3'], 'town']]);
    });

    it('持ち物の道具を仲間に使える。回復薬はたおれていない人に、いのちの羽はたおれている人にだけ', () => {
      withParty(mate('3'));
      game.player.inv['life_feather'] = 1;
      const c = game.companions[0];
      c.hp = 10;

      expect(game.useItemOn('life_feather', c)).toBe(false);
      expect(game.useItemOn('potion', c)).toBe(true);
      expect(c.hp).toBeGreaterThan(10);

      Object.assign(c, { dead: true, hp: 0, downT: 40 });
      expect(game.useItemOn('potion', c)).toBe(false);
      expect(game.useItemOn('life_feather', c)).toBe(true);
      expect(c.dead).toBe(false);
      expect(game.player.inv['life_feather']).toBe(0);
    });

    it('持ち物の回復薬・いのちの羽を仲間に渡せる(装備・素材は渡せない)', () => {
      withParty(mate('3'));
      game.player.inv['life_feather'] = 2;

      expect(game.giveItem('3', 'life_feather')).toBe(true);
      expect(game.giveItem('3', 'copper_sword')).toBe(false);
      expect([game.player.inv['life_feather'], game.companions[0].inv['life_feather']]).toEqual([1, 1]);
    });

    it('いのちの羽はいくつでも買える', () => {
      game.player.gold = 1000;
      expect(game.buy('life_feather')).toBe(true);
      expect(game.buy('life_feather')).toBe(true);
      expect(game.player.inv['life_feather']).toBe(2);
    });
  });

  describe('マップのデータから作る地形', () => {
    it('水・なしの地面と、置物・村人のマスは通れない。火山はまわり1マスも通れない', () => {
      const area = buildAreaMap(map('test', {
        ground: ['wvg' + 'g'.repeat(9), ...Array.from({ length: 11 }, () => 'g'.repeat(12))],
        objects: [{ type: 'tree', x: 3, y: 0, torch: false }, { type: 'volcano', x: 6, y: 6, torch: false }],
        npcs: [{ name: '村人', x: 4, y: 0, hair: '#000000', body: '#000000', role: 'talk', notice: false, lines: [], look: lookFromColors('#000000', '#000000'), quests: [] }]
      }));

      expect([0, 1, 2, 3, 4].map((x) => area.walkable(x, 0))).toEqual([false, false, true, false, false]);
      expect(area.walkable(5, 5)).toBe(false);
      expect(area.walkable(7, 7)).toBe(false);
      expect(area.walkable(8, 8)).toBe(true);
    });

    it('タイル・レンガの地面は歩け、どのテーマにも石・レンガの色がある(front#254)', () => {
      const area = buildAreaMap(map('test', { ground: ['trg' + 'g'.repeat(9), ...Array.from({ length: 11 }, () => 'g'.repeat(12))] }));

      expect([0, 1].map((x) => area.walkable(x, 0))).toEqual([true, true]);
      expect(area.ground[0].slice(0, 2)).toEqual([G.TILE, G.BRICK]);
      for (const theme of Object.values(THEMES)) {
        expect(theme.tile.stone).toHaveLength(3);
        expect(theme.brick.brick).toHaveLength(3);
      }
    });

    it('高さのないマップは、すべて0段として読む', () => {
      const area = buildAreaMap({ ...map('test'), heights: undefined as unknown as string[] });
      expect(area.hasHeights).toBe(false);
      expect(area.heightAt(3, 3)).toBe(0);
    });

    it('知らない種類の敵は出さない', () => {
      game.loadMap(map('test', { enemies: [{ type: 'slime', x: 2, y: 2 }, { type: 'dragon', x: 3, y: 3 }] }));
      expect(game.enemies.map((e) => e.type)).toEqual(['slime']);
    });
  });
});
