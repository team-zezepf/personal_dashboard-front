import { RpgDungeon, RpgMap, RpgQuest, RpgSave } from '../models/rpg.models';
import { THEMES, ZERO_STATS, buildAreaMap, maxHpOf, walkSpeedOf } from './rpg-data';
import { RpgGame, RpgGameEvents } from './rpg-game';
import { DEFAULT_LOOK, lookFromColors } from './rpg-look';
import { DEFAULT_ENEMIES, EnemyDef, setEnemies } from './rpg-enemy';

const LOOK = { ...DEFAULT_LOOK, hair: 'ponytail', eyes: 'glasses', clothes: 'robe', clothesColor: '#8b5cf6', accentColor: '#fbbf24' };

function events(): RpgGameEvents & { messages: string[]; dirtyCount: number; entered: string[]; captured: number } {
  const result = {
    messages: [] as string[],
    dirtyCount: 0,
    entered: [] as string[],
    captured: 0,
    log: (message: string) => result.messages.push(message),
    statsChanged: () => undefined,
    inventoryChanged: () => undefined,
    dirty: () => result.dirtyCount++,
    talk: () => undefined,
    fade: () => undefined,
    dungeonEntered: (dungeon: RpgDungeon) => result.entered.push(dungeon.id),
    captureScreen: () => {
      result.captured++;
      return null;
    },
    knockedOut: () => undefined
  };
  return result;
}

// 一面が草の 12×12 のエリア。何も指定しなければ、エリアと同じIDのダンジョンの位置(0, 0)に置く
function map(id: string, partial: Partial<RpgMap> = {}): RpgMap {
  return {
    id, name: id, dungeonId: id, gridX: 0, gridY: 0, width: 12, height: 12,
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
  map('forest', { startX: 2, startY: 3, sortOrder: 2 }),
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
        quests: []
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
      // 見た目はダンジョンのもの
      expect(game.theme).toBe(THEMES['forest']);
      expect(ev.messages).toContain('精霊の森にやってきた');
    });

    it('行き先が決まっていないポータルでは移らない', () => {
      clickTile(6, 9);
      walk();
      vi.advanceTimersByTime(500);

      expect(game.area.id).toBe('plain');
      expect([game.player.x, game.player.y]).toEqual([6, 9]);
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

    it('隣にエリアがある側の端で止まると、画面をスライドして隣のエリアの反対側の端(1マス内側)に移る', () => {
      clickTile(11, 6);
      for (let i = 0; i < 40 && game.area.id === 'cave1'; i++) game.update(0.05);

      expect(game.area.id).toBe('cave2');
      expect([game.player.x, game.player.y]).toEqual([1, 6]);
      expect(game.slide?.side).toEqual([1, 0]);
      expect(ev.captured).toBe(1);

      walk();
      expect(game.slide).toBeNull();
      expect(game.transitioning).toBe(false);
      // 同じダンジョンの中なので、ダンジョン名は出さない
      expect(ev.entered).toEqual([]);
      expect(ev.messages.filter((m) => m.includes('やってきた'))).toEqual([]);
      expect(game.dungeon.id).toBe('cave');
      expect(game.theme).toBe(THEMES['tower']);
    });

    it('戻る向きにも移れ、広さの違うエリアでは同じ位置に着く', () => {
      clickTile(6, 11);
      walk();
      expect(game.area.id).toBe('cave3');
      expect([game.player.x, game.player.y]).toEqual([6, 1]);

      // 泉(16×16)から入口(12×12)へは、はみ出さない位置に着く
      game.player.x = 14;
      game.player.y = 1;
      clickTile(14, 0);
      walk();
      expect(game.area.id).toBe('cave1');
      expect([game.player.x, game.player.y]).toEqual([11, 10]);
    });

    it('隣にエリアがない側の端では移らない', () => {
      clickTile(0, 6);
      walk();
      expect(game.area.id).toBe('cave1');
      expect([game.player.x, game.player.y]).toEqual([0, 6]);
    });

    it('着くマスが通れなければ、近くの通れるマスに着く', () => {
      game.maps = MAPS.map((m) => (m.id === 'cave2' ? { ...m, ground: m.ground.map((row, y) => (y === 6 ? 'gw' + 'g'.repeat(10) : row)) } : m));
      clickTile(11, 6);
      walk();
      expect(game.area.id).toBe('cave2');
      expect(game.map.walkable(game.player.x, game.player.y)).toBe(true);
      expect(Math.abs(game.player.x - 1) + Math.abs(game.player.y - 6)).toBeLessThanOrEqual(2);
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
