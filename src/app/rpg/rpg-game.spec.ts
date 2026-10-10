import { RpgSave } from '../models/rpg.models';
import { AREAS, buildAreaMap, maxHpOf } from './rpg-data';
import { RpgGame, RpgGameEvents } from './rpg-game';

function events(): RpgGameEvents & { messages: string[]; dirtyCount: number } {
  const result = {
    messages: [] as string[],
    dirtyCount: 0,
    log: (message: string) => result.messages.push(message),
    statsChanged: () => undefined,
    inventoryChanged: () => undefined,
    dirty: () => result.dirtyCount++,
    talk: () => undefined,
    fade: () => undefined,
    areaEntered: () => undefined,
    knockedOut: () => undefined
  };
  return result;
}

function save(partial: Partial<RpgSave> = {}): RpgSave {
  return {
    level: 3, exp: 10, hp: 60, gold: 100, weapon: 'copper_sword', armor: 'cloth',
    items: [{ itemId: 'potion', count: 2 }, { itemId: 'copper_sword', count: 1 }, { itemId: 'wood_sword', count: 1 }, { itemId: 'cloth', count: 1 }],
    area: 'forest', x: 2, y: 12,
    ...partial
  };
}

describe('RpgGame', () => {
  let ev: ReturnType<typeof events>;
  let game: RpgGame;

  beforeEach(() => {
    ev = events();
    game = new RpgGame(ev);
  });

  afterEach(() => game.dispose());

  describe('セーブデータ', () => {
    it('読み込んだ状態をそのまま保存用の形に戻せる', () => {
      game.loadSave(save());

      expect(game.area.id).toBe('forest');
      expect(game.toSaveInput()).toEqual({
        level: 3, exp: 10, hp: 60, gold: 100, weapon: 'copper_sword', armor: 'cloth',
        items: [{ itemId: 'potion', count: 2 }, { itemId: 'copper_sword', count: 1 }, { itemId: 'wood_sword', count: 1 }, { itemId: 'cloth', count: 1 }],
        area: 'forest', x: 2, y: 12
      });
    });

    it('知らないエリア・アイテムや通れない位置は使わず、始まりの草原の村から始める', () => {
      game.loadSave(save({ area: 'moon', x: 0, y: 0, items: [{ itemId: 'unknown', count: 1 }] }));

      expect(game.area.id).toBe('plain');
      expect([game.player.x, game.player.y]).toEqual(AREAS.plain.start);
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
      game.viewW = 800;
      game.viewH = 600;
      game.update(0);
      // 1つ右のマス(7,7)をクリックする
      const [sx, sy] = game.screenPositionOf({ x: 7, y: 7 });
      game.click(sx, sy);
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

  describe('マップ', () => {
    it('どのエリアも、出発地点・ポータル・ポータルの移動先が通れるマスになっている', () => {
      for (const area of Object.values(AREAS)) {
        const map = buildAreaMap(area);
        expect(map.walkable(...area.start)).toBe(true);
        for (const p of area.portals) {
          expect(map.walkable(p.x, p.y)).toBe(true);
          // 移動先で立つ位置も通れる
          expect(buildAreaMap(AREAS[p.to]).walkable(p.tx, p.ty)).toBe(true);
        }
      }
    });
  });
});
