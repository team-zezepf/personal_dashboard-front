import { BgmAudio, BgmPlayer, loadBgmSettings } from './rpg-bgm';

class FakeAudio implements BgmAudio {
  src = '';
  volume = 1;
  loop = false;
  paused = true;
  play(): void {
    this.paused = false;
  }
  pause(): void {
    this.paused = true;
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

describe('BgmPlayer', () => {
  let audios: FakeAudio[];
  let storage: Storage;
  let player: BgmPlayer;

  beforeEach(() => {
    vi.useFakeTimers();
    audios = [];
    storage = memoryStorage();
    player = new BgmPlayer(() => {
      const a = new FakeAudio();
      audios.push(a);
      return a;
    }, storage);
  });

  afterEach(() => {
    player.dispose();
    vi.useRealTimers();
  });

  it('画面をクリックする(unlock)までは流さず、クリックしたら今のエリアの曲を流す', () => {
    player.play('/rpg-bgm/a.mp3');
    expect(audios).toHaveLength(0);

    player.unlock();
    expect(audios).toHaveLength(1);
    expect(audios[0].src).toBe('/rpg-bgm/a.mp3');
    expect(audios[0].loop).toBe(true);
    expect(audios[0].paused).toBe(false);
  });

  it('音量は0から少しずつ上げる', () => {
    player.unlock();
    player.play('/rpg-bgm/a.mp3');
    expect(audios[0].volume).toBe(0);

    vi.advanceTimersByTime(1000);
    expect(audios[0].volume).toBeCloseTo(0.6);
  });

  it('エリアを移ると、前の曲を小さくして止め、次の曲に切り替える。同じ曲なら流し直さない', () => {
    player.unlock();
    player.play('/rpg-bgm/a.mp3');
    vi.advanceTimersByTime(1000);
    player.play('/rpg-bgm/a.mp3');
    expect(audios).toHaveLength(1);

    player.play('/rpg-bgm/b.mp3');
    expect(audios).toHaveLength(2);
    vi.advanceTimersByTime(1000);
    expect(audios[0].volume).toBe(0);
    expect(audios[0].paused).toBe(true);
    expect(audios[1].volume).toBeCloseTo(0.6);
    expect(player.playingUrl).toBe('/rpg-bgm/b.mp3');
  });

  it('曲のないエリアでは止める', () => {
    player.unlock();
    player.play('/rpg-bgm/a.mp3');
    player.play(null);
    vi.advanceTimersByTime(1000);

    expect(audios[0].paused).toBe(true);
    expect(player.playingUrl).toBeNull();
  });

  it('音量・消した状態はすぐ反映し、次に開いたときも同じにする', () => {
    player.unlock();
    player.play('/rpg-bgm/a.mp3');
    player.setVolume(0.3);
    expect(audios[0].volume).toBe(0.3);
    player.setMuted(true);
    expect(audios[0].volume).toBe(0);

    expect(loadBgmSettings(storage)).toEqual({ volume: 0.3, muted: true });
    expect(new BgmPlayer(() => new FakeAudio(), storage).settings).toEqual({ volume: 0.3, muted: true });
  });

  it('覚えた設定が壊れていたら、最初の値にする', () => {
    expect(loadBgmSettings(memoryStorage({ rpgBgmSettings: '{broken' }))).toEqual({ volume: 0.6, muted: false });
    expect(loadBgmSettings(memoryStorage({ rpgBgmSettings: '{"volume":5}' }))).toEqual({ volume: 1, muted: false });
    expect(loadBgmSettings(null)).toEqual({ volume: 0.6, muted: false });
  });
});
