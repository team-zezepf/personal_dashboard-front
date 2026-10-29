import { RpgCraft, RpgEnemy, RpgItem, RpgMap } from '../../../models/rpg.models';
import { DEFAULT_CRAFTS, DEFAULT_ITEMS, ITEMS, MATERIAL_IDS, RECIPES, SHOP_ITEMS, isCraftItem, itemsVersion, sellPriceOf, setCrafts, setItems } from '../../../rpg/rpg-data';
import { DEFAULT_ENEMIES } from '../../../rpg/rpg-enemy';
import { ItemUsage, problemsOf, statText, toInput, usagesOf } from './rpg-item-page.component';

const enemies = DEFAULT_ENEMIES as unknown as RpgEnemy[];

const potion = (over: Partial<RpgItem> = {}): RpgItem => ({
  id: 'item1', name: '特製回復薬', icon: '🍵', type: 'use', heal: 80, desc: 'HPを80回復', inShop: true, price: 25, sortOrder: 37, ...over
});
const sword = (over: Partial<RpgItem> = {}): RpgItem => ({
  id: 'item2', name: '雷の剣', icon: '⚡', type: 'weapon', atk: 30, inShop: true, price: 600, sortOrder: 38, ...over
});
const stone = (over: Partial<RpgItem> = {}): RpgItem => ({ id: 'item3', name: '雷の石', icon: '🪨', type: 'material', inShop: false, sortOrder: 39, ...over });

const emptyCtx = { enemies: [] as RpgEnemy[], maps: [] as RpgMap[], objectDefs: [], crafts: [] as RpgCraft[], pointShop: [] };
const dropped: ItemUsage[] = [{ where: 'drop', name: 'スライム', how: '落とす確率 10%' }];

describe('アイテムタブ(front#343)', () => {
  describe('ゲームのアイテムの入れ替え(setItems)', () => {
    afterEach(() => {
      setItems(DEFAULT_ITEMS);
      setCrafts(DEFAULT_CRAFTS);
    });

    it('最初のアイテムでは、道具屋の14（いのちの羽 front#358・魔法の水と魔法書3つ front#383 を含む）・素材23種類・合成の装備8つがそろう', () => {
      expect(SHOP_ITEMS).toEqual([
        'potion', 'hipotion', 'copper_sword', 'iron_sword', 'steel_sword', 'mithril_sword', 'leather', 'chain_mail', 'magic_armor', 'life_feather',
        'magic_water', 'book_fire', 'book_blizzard', 'book_heal'
      ]);
      expect(ITEMS['magic_water']).toMatchObject({ type: 'use', heal: 0, mp: 30 });
      expect(ITEMS['book_thunder']).toMatchObject({ type: 'book', spell: 'thunder', sellPrice: 300 });
      expect(MATERIAL_IDS).toHaveLength(23);
      expect(RECIPES).toHaveLength(8);
      expect(ITEMS['potion']).toEqual({ name: '回復薬', icon: '🧪', type: 'use', heal: 35, price: 10, sellPrice: 5, desc: 'HPを35回復' });
      // 売らない装備は値段を持たない(道具屋で買えない)
      expect(ITEMS['wood_sword'].price).toBeUndefined();
    });

    it('新しいアイテムを足すと、道具屋・素材の一覧に入り、合成の装備は残る', () => {
      const before = itemsVersion();
      setItems([...DEFAULT_ITEMS, potion({ sortOrder: 0 }), stone()]);

      expect(itemsVersion()).toBe(before + 1);
      expect(SHOP_ITEMS[0]).toBe('item1');
      expect(ITEMS['item1']).toEqual({ name: '特製回復薬', icon: '🍵', type: 'use', heal: 80, price: 25, sellPrice: 12, desc: 'HPを80回復' });
      expect(MATERIAL_IDS).toContain('item3');
      expect(isCraftItem('fang_sword')).toBe(true);
      expect(RECIPES).toHaveLength(8);
    });

    it('売るのをやめたアイテムは道具屋から外れ、消したアイテムはなくなる', () => {
      setItems(DEFAULT_ITEMS.filter((i) => i.id !== 'iron_sword').map((i) => (i.id === 'hipotion' ? { ...i, inShop: false, price: null } : i)));

      expect(SHOP_ITEMS).not.toContain('hipotion');
      expect(ITEMS['hipotion'].price).toBeUndefined();
      expect(ITEMS['iron_sword']).toBeUndefined();
    });

    it('画像(front#345)があれば、アイテム・合成の装備とも画像のURLを持つ。なければ持たない', () => {
      setItems([...DEFAULT_ITEMS, potion({ image: 'abc.png' })]);
      setCrafts(DEFAULT_CRAFTS.map((c) => (c.id === 'fang_sword' ? { ...c, image: 'fang.webp' } : c)));

      expect(ITEMS['item1'].image).toMatch(/\/rpg-item-images\/abc\.png$/);
      expect(ITEMS['fang_sword'].image).toMatch(/\/rpg-item-images\/fang\.webp$/);
      expect('image' in ITEMS['potion']).toBe(false);
      expect('image' in ITEMS['jelly_robe']).toBe(false);
    });

    it('種類に関係ない値は持たない', () => {
      setItems([...DEFAULT_ITEMS, sword({ heal: 10, def: 5 })]);
      expect(ITEMS['item2']).toEqual({ name: '雷の剣', icon: '⚡', type: 'weapon', atk: 30, price: 600, sellPrice: 300 });
    });
  });

  describe('使われている場所', () => {
    it('敵の落とし物・素材・置物の中身・クエスト・置物のデフォルト・合成のレシピ・ポイント交換を探す', () => {
      const map = {
        name: '草原',
        objects: [{ type: 'pot', items: [{ id: 'honey', count: 2, chance: 0.5 }] }],
        npcs: [{ name: '村長', quests: [{ title: 'はちみつ集め', kind: 'collect', target: 'honey', count: 5, rewardItems: [{ itemId: 'honey', count: 1 }] }] }]
      } as unknown as RpgMap;
      const ctx = {
        enemies,
        maps: [map],
        objectDefs: [{ type: 'barrel', items: [{ id: 'honey', count: 1, chance: 0.1 }], enemies: [], mimics: [] }],
        crafts: [{ ...DEFAULT_CRAFTS[0], name: 'はちみつの服', materials: [{ itemId: 'honey', count: 3 }] }],
        pointShop: [{ id: 'honey', name: 'はちみつ', point: 5, description: '' }]
      };

      expect(usagesOf('honey', ctx).map((u) => [u.where, u.name, u.how])).toEqual([
        ['material', 'ミツバチン', '落とす確率 50%'],
        ['object', '草原のつぼ', '×2（50%）'],
        ['quest', '草原・村長「はちみつ集め」', '集める ×5'],
        ['quest', '草原・村長「はちみつ集め」', '報酬 ×1'],
        ['object', 'たる（デフォルト）', '×1（10%）'],
        ['craft', 'はちみつの服', '素材 ×3'],
        ['point', 'ポイント交換所', '5pt']
      ]);
    });

    it('初期装備・初めの持ち物は「最初から持つ」として出す', () => {
      expect(usagesOf('wood_sword', emptyCtx)).toEqual([{ where: 'locked', name: '初期装備', how: '消せません' }]);
      expect(usagesOf('potion', emptyCtx)[0].name).toBe('初めの持ち物');
      expect(usagesOf('item1', emptyCtx)).toEqual([]);
    });
  });

  describe('チェック', () => {
    it('問題がなければ空', () => {
      expect(problemsOf(potion(), [], [], [])).toEqual([]);
      expect(problemsOf(stone(), [], [], dropped)).toEqual([]);
    });

    it('名前がない・強さが範囲外・売るのに値段がないは、保存できない(ng)', () => {
      const ng = (i: RpgItem) => problemsOf(i, [], [], dropped).filter((p) => p.ng).map((p) => p.text);

      expect(ng(potion({ name: ' ' }))).toEqual(['名前を入れてください。']);
      // 回復の道具は HP・MP(front#383)のどちらかを回復する
      expect(ng(potion({ heal: 0 }))).toEqual(['HPかMPの回復量を入れてください。']);
      expect(ng(potion({ heal: 0, mp: 30 }))).toEqual([]);
      expect(ng(potion({ heal: 1000 }))).toEqual(['回復量は 1〜999 にしてください。']);
      expect(ng(potion({ type: 'book', heal: null, spell: null }))).toEqual(['覚える魔法を選んでください。']);
      expect(ng(potion({ type: 'book', heal: null, spell: 'fire' }))).toEqual([]);
      expect(ng(sword({ atk: 1000 }))).toEqual(['攻撃力は 1〜999 にしてください。']);
      expect(ng(sword({ type: 'armor', def: null }))).toEqual(['防御力は 1〜999 にしてください。']);
      expect(ng(potion({ price: 0 }))).toEqual(['道具屋で売るなら、値段を 1〜99999G にしてください。']);
      // 売らないなら値段はいらない
      expect(ng(potion({ inShop: false, price: null }))).toEqual([]);
    });

    it('同じ名前・手に入れる方法がない・もっと強くて安い装備があるときは、注意だけ(保存できる)', () => {
      const warn = (i: RpgItem, others: { name: string }[], shop: RpgItem[], usages: ItemUsage[]) =>
        problemsOf(i, others, shop, usages).map((p) => `${p.ng ? 'ng' : 'warn'}: ${p.text}`);

      expect(warn(potion(), [{ name: '特製回復薬' }], [], [])).toEqual(['warn: 「特製回復薬」という名前のアイテムがほかにもあります。']);
      expect(warn(stone(), [], [], [])).toEqual(['warn: この素材を落とす敵がいないため、まだ手に入りません。「👾 敵」タブで落とす敵を決めてください。']);
      // 合成のレシピで使うだけでは、手に入らない
      expect(warn(stone(), [], [], [{ where: 'craft', name: '雷の服', how: '素材 ×1' }])).toHaveLength(1);
      expect(warn(sword({ inShop: false, price: null }), [], [], [])).toEqual(['warn: 道具屋で売っておらず、どこでも手に入らないため、まだ手に入りません。']);
      const steel = sword({ id: 'steel_sword', name: '鋼の剣', atk: 32, price: 420 });
      expect(warn(sword(), [], [steel, sword()], [])).toEqual(['warn: 「鋼の剣」（攻撃 +32・420G）のほうが強くて安いため、買う意味が薄くなります。']);
    });
  });

  describe('保存するときの形', () => {
    it('新しいアイテムは id を null にし、種類に関係ない値・売らないときの値段は送らない', () => {
      expect(toInput({ item: potion({ id: 'new-1', atk: 3, desc: '  ', spell: 'fire' }), isNew: true })).toEqual({
        id: null, name: '特製回復薬', icon: '🍵', type: 'use', heal: 80, mp: null, spell: null, level: null, atk: null, def: null, desc: null, inShop: true, price: 25, sellPrice: null, sortOrder: 37, image: null,
        lookShape: null, lookColor: null, lookAccent: null
      });
      // MPだけを回復する道具は、HPの回復量を送らない。魔法書は覚える魔法だけを送る(front#383)
      expect(toInput({ item: potion({ heal: 0, mp: 30 }), isNew: false })).toMatchObject({ heal: null, mp: 30, spell: null });
      expect(toInput({ item: potion({ type: 'book', heal: 80, mp: 5, spell: 'heal' }), isNew: false })).toMatchObject({ heal: null, mp: null, spell: 'heal', level: 1 });
      expect(toInput({ item: potion({ type: 'book', spell: 'heal', level: 3 }), isNew: false }).level).toBe(3);
      // 画像(front#345)はファイル名のまま送る
      expect(toInput({ item: potion({ image: 'a.png' }), isNew: false }).image).toBe('a.png');
      expect(toInput({ item: sword({ inShop: false }), isNew: false })).toMatchObject({ id: 'item2', atk: 30, inShop: false, price: null });
      // 素材は売れない
      expect(toInput({ item: stone({ inShop: true, price: 10 }), isNew: false })).toMatchObject({ inShop: false, price: null });
    });

    it('front#431 武器・防具は見た目(形・色)を送り、形がなければ色も送らない。武器・防具でなければ送らない', () => {
      const look = { lookShape: 'moonstaff', lookColor: '#e2e8f0', lookAccent: '#fde047' };
      expect(toInput({ item: sword(look), isNew: false })).toMatchObject(look);
      expect(toInput({ item: sword({ lookShape: null, lookColor: '#ffffff', lookAccent: '#000000' }), isNew: false })).toMatchObject({ lookShape: null, lookColor: null, lookAccent: null });
      expect(toInput({ item: potion({ ...look, lookShape: 'sword' }), isNew: false })).toMatchObject({ lookShape: null, lookColor: null, lookAccent: null });
    });

    it('売値(front#379)は、素材にも道具屋で売らないアイテムにも付けて送れる', () => {
      expect(toInput({ item: stone({ sellPrice: 7 }), isNew: false }).sellPrice).toBe(7);
      expect(toInput({ item: sword({ inShop: false, price: null, sellPrice: 50 }), isNew: false }).sellPrice).toBe(50);
    });
  });

  describe('魔法の道具の表示(front#383)', () => {
    it('回復の道具はHP・MPの回復量、魔法書は覚える魔法を出す', () => {
      expect(statText(potion({ heal: 80 }))).toBe('HP +80');
      expect(statText(potion({ heal: 0, mp: 30 }))).toBe('MP +30');
      expect(statText(potion({ heal: 20, mp: 20 }))).toBe('HP +20・MP +20');
      expect(statText(potion({ type: 'book', spell: 'thunder' }))).toBe('⚡ サンダー LV1を覚える');
      // 魔法書の LV(front#387)
      expect(statText(potion({ type: 'book', spell: 'heal', level: 2 }))).toBe('💚 ヒール LV2を覚える');
    });
  });

  describe('売値(front#379)', () => {
    const texts = (i: RpgItem) => problemsOf(i, [], [], dropped).map((p) => `${p.ng ? 'ng' : 'warn'}: ${p.text}`);

    it('売値が範囲外なら保存できず、道具屋の値段以上なら注意する', () => {
      expect(texts(stone({ sellPrice: 0 }))).toEqual(['ng: 売値は 1〜99999G にしてください。']);
      expect(texts(stone({ sellPrice: 100_000 }))).toEqual(['ng: 売値は 1〜99999G にしてください。']);
      expect(texts(potion({ sellPrice: 25 }))).toEqual(['warn: 売値（25G）が道具屋の値段（25G）以上なので、買って売るだけでゴールドが増えます。']);
      expect(texts(potion({ sellPrice: 12 }))).toEqual([]);
    });

    it('売値が空なら道具屋の値段の半分、値段もなければ売れない', () => {
      expect(sellPriceOf(potion())).toBe(12);
      expect(sellPriceOf(potion({ sellPrice: 20 }))).toBe(20);
      expect(sellPriceOf(stone())).toBeUndefined();
      expect(sellPriceOf(stone({ sellPrice: 4 }))).toBe(4);
      // 道具屋で売らないなら、値段が残っていても半分にはしない
      expect(sellPriceOf(sword({ inShop: false }))).toBeUndefined();
    });
  });
});
