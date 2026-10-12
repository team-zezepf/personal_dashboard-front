import { RpgMap, RpgSave } from '../models/rpg.models';
import { ZERO_STATS, buildAreaMap, maxHpOf, walkSpeedOf } from './rpg-data';
import { RpgGame, RpgGameEvents } from './rpg-game';
import { DEFAULT_LOOK, lookFromColors } from './rpg-look';

const LOOK = { ...DEFAULT_LOOK, hair: 'ponytail', eyes: 'glasses', clothes: 'robe', clothesColor: '#8b5cf6', accentColor: '#fbbf24' };

function events(): RpgGameEvents & { messages: string[]; dirtyCount: number; entered: string[] } {
  const result = {
    messages: [] as string[],
    dirtyCount: 0,
    entered: [] as string[],
    log: (message: string) => result.messages.push(message),
    statsChanged: () => undefined,
    inventoryChanged: () => undefined,
    dirty: () => result.dirtyCount++,
    talk: () => undefined,
    fade: () => undefined,
    areaEntered: (area: RpgMap) => result.entered.push(area.id),
    knockedOut: () => undefined
  };
  return result;
}

// 一面が草の 12×12 のエリア
function map(id: string, partial: Partial<RpgMap> = {}): RpgMap {
  return {
    id, name: id, recommendedLevel: 1, theme: 'plain', width: 12, height: 12,
    ground: Array.from({ length: 12 }, () => 'g'.repeat(12)),
    heights: Array.from({ length: 12 }, () => '0'.repeat(12)),
    objects: [], npcs: [], enemies: [], portals: [], startX: 6, startY: 7, sortOrder: 1,
    ...partial
  };
}

const MAPS: RpgMap[] = [
  map('plain', {
    portals: [
      { x: 8, y: 7, to: 'forest', toX: 2, toY: 3 },
      { x: 6, y: 9, to: null, toX: 0, toY: 0 }
    ]
  }),
  map('forest', { theme: 'forest', startX: 2, startY: 3, sortOrder: 2 })
];

function save(partial: Partial<RpgSave> = {}): RpgSave {
  return {
    level: 3, exp: 10, hp: 45, gold: 100, weapon: 'copper_sword', armor: 'cloth',
    items: [{ itemId: 'potion', count: 2 }, { itemId: 'copper_sword', count: 1 }, { itemId: 'wood_sword', count: 1 }, { itemId: 'cloth', count: 1 }],
    area: 'forest', x: 4, y: 5,
    // Lv3 なので合計6ポイント(まだ振り分けていない)
    stats: { ...ZERO_STATS }, statPoints: 6,
    look: LOOK,
    ...partial
  };
}

describe('RpgGame', () => {
  let ev: ReturnType<typeof events>;
  let game: RpgGame;

  beforeEach(() => {
    ev = events();
    game = new RpgGame(ev, MAPS);
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
        look: LOOK
      });
    });

    it('知らないエリア・アイテムや通れない位置は使わず、始まりの草原の出発地点から始める', () => {
      game.loadSave(save({ area: 'moon', x: 30, y: 30, items: [{ itemId: 'unknown', count: 1 }] }));

      expect(game.area.id).toBe('plain');
      expect([game.player.x, game.player.y]).toEqual([6, 7]);
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

    it('ポータルの上で止まると、行き先のエリアの着く位置に移る', () => {
      clickTile(8, 7);
      walk();
      vi.advanceTimersByTime(500);

      expect(game.area.id).toBe('forest');
      expect([game.player.x, game.player.y]).toEqual([2, 3]);
      expect(ev.entered).toEqual(['forest']);
    });

    it('行き先が決まっていないポータルでは移らない', () => {
      clickTile(6, 9);
      walk();
      vi.advanceTimersByTime(500);

      expect(game.area.id).toBe('plain');
      expect([game.player.x, game.player.y]).toEqual([6, 9]);
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

  describe('マップのデータから作る地形', () => {
    it('水・なしの地面と、置物・村人のマスは通れない。火山はまわり1マスも通れない', () => {
      const area = buildAreaMap(map('test', {
        ground: ['wvg' + 'g'.repeat(9), ...Array.from({ length: 11 }, () => 'g'.repeat(12))],
        objects: [{ type: 'tree', x: 3, y: 0, torch: false }, { type: 'volcano', x: 6, y: 6, torch: false }],
        npcs: [{ name: '村人', x: 4, y: 0, hair: '#000000', body: '#000000', role: 'talk', notice: false, lines: [], look: lookFromColors('#000000', '#000000') }]
      }));

      expect([0, 1, 2, 3, 4].map((x) => area.walkable(x, 0))).toEqual([false, false, true, false, false]);
      expect(area.walkable(5, 5)).toBe(false);
      expect(area.walkable(7, 7)).toBe(false);
      expect(area.walkable(8, 8)).toBe(true);
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
