import { RpgMap, RpgSave } from '../models/rpg.models';
import { buildAreaMap, maxHpOf } from './rpg-data';
import { RpgGame, RpgGameEvents } from './rpg-game';

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
    level: 3, exp: 10, hp: 60, gold: 100, weapon: 'copper_sword', armor: 'cloth',
    items: [{ itemId: 'potion', count: 2 }, { itemId: 'copper_sword', count: 1 }, { itemId: 'wood_sword', count: 1 }, { itemId: 'cloth', count: 1 }],
    area: 'forest', x: 4, y: 5,
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
        level: 3, exp: 10, hp: 60, gold: 100, weapon: 'copper_sword', armor: 'cloth',
        items: [{ itemId: 'potion', count: 2 }, { itemId: 'copper_sword', count: 1 }, { itemId: 'wood_sword', count: 1 }, { itemId: 'cloth', count: 1 }],
        area: 'forest', x: 4, y: 5
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

    it('HPが0のまま保存されていたら、全回復した状態で始める', () => {
      game.loadSave(save({ hp: 0 }));
      expect(game.player.hp).toBe(maxHpOf(3));
    });

    it('歩いている途中なら、向かっているマスの位置で保存する', () => {
      game.loadSave(save({ area: 'plain', x: 6, y: 7 }));
      clickTile(7, 7);
      game.update(0.05);

      expect(game.toSaveInput()).toMatchObject({ x: 7, y: 7 });
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

  describe('マップのデータから作る地形', () => {
    it('水・なしの地面と、置物・村人のマスは通れない。火山はまわり1マスも通れない', () => {
      const area = buildAreaMap(map('test', {
        ground: ['wvg' + 'g'.repeat(9), ...Array.from({ length: 11 }, () => 'g'.repeat(12))],
        objects: [{ type: 'tree', x: 3, y: 0, torch: false }, { type: 'volcano', x: 6, y: 6, torch: false }],
        npcs: [{ name: '村人', x: 4, y: 0, hair: '#000000', body: '#000000', role: 'talk', notice: false, lines: [] }]
      }));

      expect([0, 1, 2, 3, 4].map((x) => area.walkable(x, 0))).toEqual([false, false, true, false, false]);
      expect(area.walkable(5, 5)).toBe(false);
      expect(area.walkable(7, 7)).toBe(false);
      expect(area.walkable(8, 8)).toBe(true);
    });

    it('知らない種類の敵は出さない', () => {
      game.loadMap(map('test', { enemies: [{ type: 'slime', x: 2, y: 2 }, { type: 'dragon', x: 3, y: 3 }] }));
      expect(game.enemies.map((e) => e.type)).toEqual(['slime']);
    });
  });
});
