import { BgmAudio } from './rpg-bgm';
import { SE_GROUP_LABELS, SE_SLOTS, SePlayer, loadSeSettings, windowSound } from './rpg-se';

class FakeAudio implements BgmAudio {
  src = '';
  volume = 1;
  loop = true;
  played = 0;
  play(): void {
    this.played++;
  }
  pause(): void {
    // 何もしない
  }
}

function memoryStorage(initial: Record<string, string> = {}): Storage {
  const data = { ...initial };
  return {
    getItem: (k: string) => data[k] ?? null,
    setItem: (k: string, v: string) => (data[k] = v),
    removeItem: (k: string) => delete data[k],
    clear: () => Object.keys(data).forEach((k) => delete data[k]),
    key: () => null,
    length: 0
  } as Storage;
}

describe('SePlayer(front#278)', () => {
  let audios: FakeAudio[];
  let storage: Storage;
  let now: number;
  let player: SePlayer;

  beforeEach(() => {
    audios = [];
    storage = memoryStorage();
    now = 1000;
    player = new SePlayer(
      () => {
        const a = new FakeAudio();
        audios.push(a);
        return a;
      },
      storage,
      () => now
    );
    player.setSounds(new Map([['hit_flesh', '/rpg-se/slash.wav'], ['attack_fire', '/rpg-se/fire.ogg']]));
  });

  it('場面は、叩いたものの素材5つ(front#282)と、敵の攻撃11種類(魔法陣 front#327)と、レベルアップ・回復(front#335)・アイテムを拾う・ウィンドウを開く・閉じる(front#419)', () => {
    expect(SE_SLOTS.map((s) => s.slot)).toEqual([
      'hit_flesh', 'hit_soft', 'hit_stone', 'hit_wood', 'hit_grass', 'attack_tackle', 'attack_claw', 'attack_bite', 'attack_jump', 'attack_fire',
      'attack_water', 'attack_wind', 'attack_thunder', 'attack_dark', 'attack_shockwave', 'attack_circle', 'level_up', 'heal',
      'item_pick', 'ui_open', 'ui_close'
    ]);
    expect(SE_SLOTS.filter((s) => s.group === 'player').map((s) => s.label)).toEqual(['⭐ レベルアップ', '💚 回復する', '🎒 アイテムを拾う']);
    expect(SE_SLOTS.filter((s) => s.group === 'ui').map((s) => s.label)).toEqual(['📂 ウィンドウを開く', '📁 ウィンドウを閉じる']);
    expect(SE_GROUP_LABELS.ui).toBe('操作');
    expect(SE_SLOTS[0].label).toBe('🐾 生き物を叩く');
    expect(SE_SLOTS[9].label).toContain('炎');
  });

  it('開いているウィンドウが変わったときの操作音(front#419)。開けば「開く」、閉じれば「閉じる」、別のウィンドウへ移れば「開く」', () => {
    expect(windowSound([], [])).toBeNull();
    expect(windowSound([], ['settings'])).toBe('ui_open');
    expect(windowSound(['settings'], [])).toBe('ui_close');
    expect(windowSound(['status'], ['status'])).toBeNull();
    // ステータスの上に「捨てる」を開く・閉じる
    expect(windowSound(['status'], ['status', 'discard'])).toBe('ui_open');
    expect(windowSound(['status', 'discard'], ['status'])).toBe('ui_close');
    // 別のウィンドウへ移る
    expect(windowSound(['status'], ['look'])).toBe('ui_open');
  });

  it('鳴らした場面を、新しい順に覚える(20個まで)', () => {
    player.unlock();
    player.play('hit_flesh');
    player.play('attack_fire');
    player.play('heal');
    expect(player.history).toEqual(['attack_fire', 'hit_flesh']);
  });

  it('画面をクリックするまでは鳴らさない。クリックしたあとは、選んだ音を1回だけ鳴らす', () => {
    expect(player.play('hit_flesh')).toBe(false);
    expect(audios).toHaveLength(0);

    player.unlock();
    expect(player.play('hit_flesh')).toBe(true);
    expect(audios[0]).toMatchObject({ src: '/rpg-se/slash.wav', loop: false, volume: 0.8, played: 1 });
  });

  it('音を選んでいない場面では鳴らさない', () => {
    player.unlock();
    expect(player.play('hit_stone')).toBe(false);
    expect(player.play('attack_bite')).toBe(false);
    expect(audios).toHaveLength(0);
  });

  it('同じ場面の音は、ほんの少しの間をあけてから鳴らす(重なりすぎないように)。ほかの場面とは重ねて鳴らせる', () => {
    player.unlock();
    expect(player.play('hit_flesh')).toBe(true);
    now += 10;
    expect(player.play('hit_flesh')).toBe(false);
    expect(player.play('attack_fire')).toBe(true);
    now += 100;
    expect(player.play('hit_flesh')).toBe(true);
    expect(audios).toHaveLength(3);
  });

  it('音量・消した状態はBGMとは別に、このブラウザに覚える。消しているときは鳴らさない', () => {
    player.unlock();
    player.setVolume(0.3);
    player.play('hit_flesh');
    expect(audios[0].volume).toBe(0.3);

    player.setMuted(true);
    now += 100;
    expect(player.play('hit_flesh')).toBe(false);
    expect(loadSeSettings(storage)).toEqual({ volume: 0.3, muted: true });
    expect(storage.getItem('rpgBgmSettings')).toBeNull();
  });

  it('覚えた設定が読めなければ、はじめの設定(音量80%・鳴らす)', () => {
    expect(loadSeSettings(memoryStorage({ rpgSeSettings: '{' }))).toEqual({ volume: 0.8, muted: false });
    expect(loadSeSettings(memoryStorage({ rpgSeSettings: '{"volume": 5}' }))).toEqual({ volume: 1, muted: false });
    expect(loadSeSettings(null)).toEqual({ volume: 0.8, muted: false });
  });
});
