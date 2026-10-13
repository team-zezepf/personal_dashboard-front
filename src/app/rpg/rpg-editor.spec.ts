import { RpgMap, RpgMapObject } from '../models/rpg.models';
import { RpgMapEditor, blankMap, blankQuest, toMapInput } from './rpg-editor';
import { lookFromColors } from './rpg-look';
import { DEFAULT_ENEMIES, setEnemies } from './rpg-enemy';
import { PALETTE } from './rpg-editor';

describe('RpgMapEditor', () => {
  let editor: RpgMapEditor;

  beforeEach(() => {
    editor = new RpgMapEditor(blankMap('area5', '海辺の洞くつ', 'sea', 0, 0, 14, 12));
  });

  it('新しいエリアは一面の草で、出発地点がまんなかにある', () => {
    expect(editor.map.ground).toHaveLength(12);
    expect(editor.map.ground.every((row) => row === 'g'.repeat(14))).toBe(true);
    expect([editor.map.startX, editor.map.startY]).toEqual([7, 6]);
  });

  it('地面を塗れる。3×3 の筆はまわりも塗り、水・なしで塗ったマスの置物は消える', () => {
    editor.apply({ kind: 'object', type: 'tree' }, 3, 3, true);
    editor.apply({ kind: 'ground', ground: 'w' }, 4, 4, true, 3);

    expect(editor.map.ground[3].slice(3, 6)).toBe('www');
    expect(editor.map.ground[5].slice(3, 6)).toBe('www');
    expect(editor.map.objects).toEqual([]);
  });

  it('パレットの「地面」にタイル・レンガがあり、塗ったマスには敵を置ける(front#254)', () => {
    const ground = PALETTE.find((t) => t.id === 'ground')!.items;
    expect(ground.map((i) => i.label)).toEqual(['草', '花', '道', '砂・ふち', 'タイル', 'レンガ', '水', '橋', 'なし']);

    editor.apply({ kind: 'ground', ground: 't' }, 2, 2, true);
    editor.apply({ kind: 'ground', ground: 'r' }, 3, 2, true);
    expect(editor.map.ground[2].slice(2, 4)).toBe('tr');
    editor.apply({ kind: 'enemy', type: 'slime' }, 2, 2, true);
    expect(editor.map.enemies.some((e) => e.x === 2 && e.y === 2)).toBe(true);
  });

  it('草むら・シダ・水晶・岩は置くと選んだ状態になり、中身は壊れる置物だけが保存する形に入る(front#264)', () => {
    const objects = PALETTE.find((t) => t.id === 'object')!.items;
    expect(objects.some((i) => i.label === '草むら')).toBe(true);
    // 宝箱・甲冑も壊れる置物(front#266)
    expect(['宝箱', '甲冑'].every((l) => objects.some((i) => i.label === l))).toBe(true);
    // 壁(front#268)は壊れない置物なので、置いても中身を選ぶ状態にはならない
    expect(objects.some((i) => i.label === '壁')).toBe(true);
    expect(editor.apply({ kind: 'object', type: 'wall' }, 8, 8, true)).toBeNull();
    expect(editor.map.objects.at(-1)?.type).toBe('wall');
    editor.removeAt(8, 8);
    expect(editor.apply({ kind: 'object', type: 'armor' }, 8, 8, true)?.kind).toBe('breakable');
    editor.removeAt(8, 8);

    const placed = editor.apply({ kind: 'object', type: 'grass' }, 2, 2, true);
    expect(placed).toEqual({ kind: 'breakable', ref: editor.map.objects.at(-1) });
    expect(editor.entityAt(2, 2)?.kind).toBe('breakable');
    expect(editor.apply({ kind: 'object', type: 'tree' }, 3, 2, true)).toBeNull();

    editor.map.objects[0].contents = { kind: 'item', id: 'potion', count: 2 };
    editor.map.objects[1].contents = { kind: 'enemy', id: 'slime', count: 1 };
    const saved = toMapInput(editor.map).objects;
    expect(saved[0].contents).toEqual({ kind: 'item', id: 'potion', count: 2 });
    expect(saved[1].contents).toBeNull();
  });

  it('高さを変えられる。1回のドラッグでは同じマスを1段ずつしか変えず、0〜3段に収める', () => {
    editor.apply({ kind: 'height', op: 'up' }, 2, 2, true, 3);
    editor.apply({ kind: 'height', op: 'up' }, 2, 2, false, 3);
    expect(editor.map.heights[1].slice(1, 4)).toBe('111');
    expect(editor.map.heights[3].slice(1, 4)).toBe('111');

    for (let i = 0; i < 5; i++) editor.apply({ kind: 'height', op: 'up' }, 2, 2, true);
    expect(editor.heightAt(2, 2)).toBe(3);
    editor.apply({ kind: 'height', op: 'set', value: 0 }, 2, 2, true);
    editor.apply({ kind: 'height', op: 'down' }, 2, 2, true);
    expect(editor.heightAt(2, 2)).toBe(0);
    editor.apply({ kind: 'height', op: 'set', value: 2 }, 5, 5, true);
    expect(toMapInput(editor.map).heights[5][5]).toBe('2');
  });

  it('置物は同じマスのものと置き換わり、敵は空いている通れるマスにだけ置ける', () => {
    editor.apply({ kind: 'object', type: 'tree' }, 1, 1, true);
    editor.apply({ kind: 'object', type: 'rock' }, 1, 1, true);
    editor.apply({ kind: 'enemy', type: 'slime' }, 1, 1, true);
    editor.apply({ kind: 'ground', ground: 'v' }, 2, 2, true);
    editor.apply({ kind: 'enemy', type: 'slime' }, 2, 2, true);
    editor.apply({ kind: 'enemy', type: 'slime' }, 3, 3, true);

    expect(editor.map.objects).toEqual([{ type: 'rock', x: 1, y: 1, roof: null, torch: false }]);
    expect(editor.map.enemies).toEqual([{ type: 'slime', x: 3, y: 3 }]);
  });

  describe('家(front#236)', () => {
    it('家は空いたマスに1×1で置き、置いた家を選んだ状態にする。ふさがったマス・ドラッグの途中には置かない', () => {
      editor.apply({ kind: 'object', type: 'tree' }, 1, 1, true);
      expect(editor.apply({ kind: 'object', type: 'house' }, 1, 1, true)).toBeNull();

      const sel = editor.apply({ kind: 'object', type: 'house' }, 4, 4, true);
      expect(sel?.kind).toBe('house');
      expect(sel?.ref).toEqual({ type: 'house', x: 4, y: 4, roof: '#e0605a', torch: false, shape: '1x1', rotation: 0 });
      expect(editor.apply({ kind: 'object', type: 'house' }, 6, 6, false)).toBeNull();
    });

    it('形・向きを変えると、占めるマスすべてで重なり・はみ出しを確かめる', () => {
      const house = editor.apply({ kind: 'object', type: 'house' }, 4, 4, true)!.ref as RpgMapObject;
      editor.apply({ kind: 'npc' }, 5, 5, true);

      // 2×2 は NPC(5,5) と重なる
      expect(editor.houseProblem(house, 4, 4, '2x2', 0)).toBe('NPC「NPC1」と重なります');
      expect(editor.setHouse(house, '2x2', 0, '#5b8def')).toBe(false);
      expect(house.shape).toBe('1x1');
      // L字(向き0)は (5,5) が欠けるので置ける
      expect(editor.setHouse(house, 'L', 0, '#5b8def')).toBe(true);
      expect(house).toMatchObject({ shape: 'L', rotation: 0, roof: '#5b8def' });
      // 占めるマスのどこでも、家として選べ・ふさがっている
      expect(editor.entityAt(5, 4)).toEqual({ kind: 'house', ref: house });
      expect(editor.occupied(4, 5)).toBe('object');
      expect(editor.occupied(5, 5)).toBe('npc');
      // 右の端・水のマスにかかる
      expect(editor.houseProblem(house, 13, 0, '2x1', 0)).toBe('マップの外にはみ出します');
      editor.apply({ kind: 'ground', ground: 'w' }, 9, 1, true);
      expect(editor.houseProblem(house, 8, 0, '2x2', 0)).toBe('水・「なし」のマスにかかります');
    });

    it('家は、占めるマスのどこを消しても家ごと消え、動かすときも重なるマスには動かせない', () => {
      const house = editor.apply({ kind: 'object', type: 'house' }, 4, 4, true)!.ref as RpgMapObject;
      editor.setHouse(house, '2x2', 0, '#e0605a');
      editor.apply({ kind: 'object', type: 'tree' }, 8, 8, true);

      expect(editor.moveTo({ kind: 'house', ref: house }, 7, 7)).toBe(false);
      expect(editor.moveTo({ kind: 'house', ref: house }, 1, 1)).toBe(true);
      expect([house.x, house.y]).toEqual([1, 1]);

      expect(editor.removeAt(2, 2)).toBe(true);
      expect(editor.map.objects.map((o) => o.type)).toEqual(['tree']);
    });

    it('広さを変えて、はみ出す家は消す', () => {
      const house = editor.apply({ kind: 'object', type: 'house' }, 11, 10, true)!.ref as RpgMapObject;
      editor.setHouse(house, '2x2', 0, '#e0605a');
      editor.resize(14, 12);
      expect(editor.map.objects).toHaveLength(1);
      editor.resize(12, 12);
      expect(editor.map.objects).toHaveLength(0);
    });

    it('保存する形では、形・向きは家だけが持つ', () => {
      editor.apply({ kind: 'object', type: 'tree' }, 1, 1, true);
      editor.apply({ kind: 'object', type: 'house' }, 4, 4, true);
      expect(toMapInput(editor.map).objects).toEqual([
        { type: 'tree', x: 1, y: 1, roof: null, torch: false, shape: null, rotation: null, lowRoof: null, wall: null, noWindow: null, contents: null },
        { type: 'house', x: 4, y: 4, roof: '#e0605a', torch: false, shape: '1x1', rotation: 0, lowRoof: null, wall: null, noWindow: null, contents: null }
      ]);
    });

    it('屋根の高さ(低い)を選べ、保存する形にも入る(front#238)', () => {
      const house = editor.apply({ kind: 'object', type: 'house' }, 4, 4, true)!.ref as RpgMapObject;
      expect(editor.setHouse(house, '2x1', 0, '#5b8def', true)).toBe(true);
      expect(toMapInput(editor.map).objects[0]).toMatchObject({ shape: '2x1', lowRoof: true });
      expect(editor.setHouse(house, '2x1', 0, '#5b8def')).toBe(true);
      expect(house.lowRoof).toBe(false);
    });

    it('壁の色・窓なしを選べ、保存する形にも入る。最初の色・窓ありは持たない(front#250)', () => {
      const house = editor.apply({ kind: 'object', type: 'house' }, 4, 4, true)!.ref as RpgMapObject;
      expect(editor.setHouse(house, '1x1', 0, '#8b5a2b', false, '#c2644a', true)).toBe(true);
      expect(toMapInput(editor.map).objects[0]).toMatchObject({ wall: '#c2644a', noWindow: true });
      expect(editor.setHouse(house, '1x1', 0, '#8b5a2b', false, '#F4E4C9', false)).toBe(true);
      expect(toMapInput(editor.map).objects[0]).toMatchObject({ wall: null, noWindow: null });
    });
  });

  it('村人・ポータルを置くと選んだ状態になり、ポータルのマスは道になる。ドラッグの途中では増えない', () => {
    const npc = editor.apply({ kind: 'npc' }, 2, 2, true);
    expect(npc?.kind).toBe('npc');
    expect(editor.apply({ kind: 'npc' }, 3, 3, false)).toBeNull();

    const portal = editor.apply({ kind: 'portal' }, 5, 5, true);
    expect(portal).toEqual({ kind: 'portal', ref: { x: 5, y: 5, to: null, toX: 0, toY: 0 } });
    expect(editor.map.ground[5][5]).toBe('p');
    expect(editor.map.npcs).toHaveLength(1);
  });

  it('選んだものを動かせるが、ふさがっているマスには動かせない', () => {
    const npc = editor.apply({ kind: 'npc' }, 2, 2, true)!;
    editor.apply({ kind: 'object', type: 'rock' }, 4, 4, true);

    expect(editor.moveTo(npc, 4, 4)).toBe(false);
    expect(editor.moveTo(npc, 3, 2)).toBe(true);
    expect(editor.entityAt(3, 2)?.ref).toBe(npc.ref);
  });

  it('元に戻す・やり直すができる', () => {
    editor.checkpoint();
    editor.apply({ kind: 'object', type: 'tree' }, 1, 1, true);
    editor.checkpoint();
    editor.apply({ kind: 'ground', ground: 'p' }, 2, 2, true);

    expect(editor.undo()).toBe(true);
    expect(editor.map.ground[2][2]).toBe('g');
    expect(editor.undo()).toBe(true);
    expect(editor.map.objects).toEqual([]);
    expect(editor.undo()).toBe(false);
    expect(editor.redo()).toBe(true);
    expect(editor.map.objects).toHaveLength(1);
  });

  it('広さを変えると、広げたところは草になり、はみ出したものは消える', () => {
    editor.apply({ kind: 'object', type: 'tree' }, 13, 11, true);
    editor.apply({ kind: 'height', op: 'set', value: 2 }, 13, 0, true);
    editor.resize(20, 12);
    expect(editor.map.ground[0]).toBe('g'.repeat(20));
    // 高さも広さに合わせ、広げたところは0段
    expect(editor.map.heights[0]).toBe('0'.repeat(13) + '2' + '0'.repeat(6));
    expect(editor.map.heights).toHaveLength(12);
    expect(editor.map.objects).toHaveLength(1);

    editor.resize(12, 12);
    expect(editor.map.width).toBe(12);
    expect(editor.map.objects).toEqual([]);
    // 範囲の外の値は、12〜50に収める
    editor.resize(100, 5);
    expect([editor.map.width, editor.map.height]).toEqual([50, 12]);
  });

  describe('保存する前の確認', () => {
    const plain = (): RpgMap => ({ ...blankMap('plain', '始まりの草原', 'plain', 0, 0, 12, 12), portals: [] });

    it('問題がなければすべて ✔', () => {
      const maps = [plain(), editor.map];
      maps[0].portals.push({ x: 1, y: 1, to: 'area5', toX: 2, toY: 2 });

      expect(editor.checks(maps).every((c) => c.ok)).toBe(true);
    });

    it('行き先のないポータル・通れない着く位置・セリフのない村人・どこからも来られないことを知らせる', () => {
      const dest = plain();
      dest.ground[3] = 'www' + 'g'.repeat(9);
      editor.map.portals.push({ x: 1, y: 1, to: null, toX: 0, toY: 0 }, { x: 2, y: 1, to: 'plain', toX: 1, toY: 3 });
      editor.map.npcs.push({ name: '村人', x: 3, y: 3, hair: '#000000', body: '#000000', role: 'talk', notice: false, lines: [' '], look: lookFromColors('#000000', '#000000'), quests: [] });

      const failed = editor.checks([dest, editor.map]).filter((c) => !c.ok).map((c) => c.text);
      expect(failed).toEqual([
        '行き先が決まっていないポータルが 1 個あります',
        '着く位置が通れないマスのポータルが 1 個あります',
        '名前かセリフが空のNPCが 1 人います',
        'まだどのエリアからも来られません（隣にエリアを作るか、ほかのダンジョンにこのエリアへのポータルを置いてください）'
      ]);
    });

    it('同じダンジョンの隣のエリアから来られ、隣へつながる端に通れるマスがなければ知らせる(front#234)', () => {
      const next = blankMap('area6', '奥の広場', 'sea', 1, 0, 12, 12);
      const ok = editor.checks([editor.map, next]);
      expect(ok.every((c) => c.ok)).toBe(true);
      expect(ok.map((c) => c.text)).toContain('右下の「奥の広場」へ出られる');

      // 右下の端(x = 13)をすべて水にする
      editor.map.ground = editor.map.ground.map((row) => row.slice(0, 13) + 'w');
      const failed = editor.checks([editor.map, next]).filter((c) => !c.ok).map((c) => c.text);
      expect(failed).toEqual(['右下の端に通れるマスがなく、「奥の広場」へ出られません']);
    });
  });

  it('置いた村人は、髪の色・服の色と同じ色の見た目を持つ', () => {
    editor.apply({ kind: 'npc' }, 2, 2, true);
    editor.apply({ kind: 'npc' }, 3, 2, true);

    const [a, b] = editor.map.npcs;
    expect(a.look).toMatchObject({ hairColor: a.hair, clothesColor: a.body });
    // 2人目は別の色にする
    expect([b.hair, b.body]).not.toEqual([a.hair, a.body]);
    expect(toMapInput(editor.map).npcs[0].look).toEqual(a.look);
  });

  describe('クエスト(front#239)', () => {
    it('保存する形では、クエストはクエスト依頼のNPCだけが持つ', () => {
      editor.apply({ kind: 'npc' }, 2, 2, true);
      editor.apply({ kind: 'npc' }, 3, 2, true);
      const [giver, other] = editor.map.npcs;
      giver.role = 'quest';
      giver.quests = [blankQuest()];
      other.quests = [blankQuest()];

      const input = toMapInput(editor.map);
      expect(input.npcs[0].quests).toHaveLength(1);
      expect(input.npcs[0].quests[0]).toMatchObject({ id: null, kind: 'defeat', count: 3 });
      expect(input.npcs[1].quests).toEqual([]);
    });

    it('クエストのないクエスト依頼・会う相手のいないクエストを知らせる', () => {
      editor.apply({ kind: 'npc' }, 2, 2, true);
      const giver = editor.map.npcs[0];
      giver.role = 'quest';
      expect(editor.checks([editor.map]).filter((c) => !c.ok).map((c) => c.text)).toContain('クエストを1つも持っていないクエスト依頼のNPCが 1 人います');

      giver.quests = [{ ...blankQuest(), kind: 'visit', target: 'だれか', targetArea: 'area5', count: 1 }];
      expect(editor.checks([editor.map]).filter((c) => !c.ok).map((c) => c.text)).toContain('会う相手のNPCが見つからないクエストが 1 個あります');
      giver.quests[0].target = giver.name;
      expect(editor.checks([editor.map]).some((c) => c.text.includes('会う相手'))).toBe(false);
    });
  });

  it('パレットの「敵」には、そのときの敵の種類が並ぶ(front#229)', () => {
    const tab = () => PALETTE.find((t) => t.id === 'enemy')!;
    expect(tab().items.map((i) => i.id)).toEqual(DEFAULT_ENEMIES.map((e) => e.id));

    setEnemies([...DEFAULT_ENEMIES, { ...DEFAULT_ENEMIES[0], id: 'enemy1', name: 'かみなりスライム' }]);
    expect(tab().items.at(-1)).toMatchObject({ id: 'enemy1', label: 'かみなりスライム' });
    setEnemies(DEFAULT_ENEMIES);
  });

  it('保存する形では、空のセリフを除く', () => {
    editor.apply({ kind: 'npc' }, 2, 2, true);
    editor.map.npcs[0].lines = ['こんにちは', '', '  '];

    const input = toMapInput(editor.map);
    expect(input.id).toBe('area5');
    expect([input.dungeonId, input.gridX, input.gridY]).toEqual(['sea', 0, 0]);
    expect(input.npcs[0].lines).toEqual(['こんにちは']);
    expect(toMapInput(editor.map, null).id).toBeNull();
  });
});
