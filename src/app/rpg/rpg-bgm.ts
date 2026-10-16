// RPGのBGM(front#218)。エリアに入るとその曲をくり返し流し、エリアを移るときは前の曲を小さくしてから切り替える。
// ブラウザは画面を一度クリックするまで音を出せないため、unlock() されるまでは流さずに待つ
import { RpgDungeon, RpgMap } from '../models/rpg.models';

/** エリアで流す曲の id。エリアの曲(front#304)があればその曲、なければダンジョンの曲。どちらもなければ null */
export function areaBgmId(area: Pick<RpgMap, 'bgmId'>, dungeon: Pick<RpgDungeon, 'bgmId'>): string | null {
  return area.bgmId ?? dungeon.bgmId ?? null;
}

/** 音を鳴らす部分(テストでは偽物に差し替える。ふだんは HTMLAudioElement) */
export interface BgmAudio {
  src: string;
  volume: number;
  loop: boolean;
  play(): Promise<void> | void;
  pause(): void;
}

export interface BgmSettings {
  // 0〜1
  volume: number;
  muted: boolean;
}

const STORAGE_KEY = 'rpgBgmSettings';
const DEFAULT_SETTINGS: BgmSettings = { volume: 0.6, muted: false };
// 切り替えにかける時間と、音量を変える回数
const FADE_MS = 1000;
const FADE_STEPS = 20;

// この端末のブラウザに覚えた音量・消した状態(読めなければ最初の値)
export function loadBgmSettings(storage: Pick<Storage, 'getItem'> | null): BgmSettings {
  try {
    const saved = JSON.parse(storage?.getItem(STORAGE_KEY) ?? 'null') as Partial<BgmSettings> | null;
    if (!saved) return { ...DEFAULT_SETTINGS };
    const volume = typeof saved.volume === 'number' ? Math.min(1, Math.max(0, saved.volume)) : DEFAULT_SETTINGS.volume;
    return { volume, muted: saved.muted === true };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveBgmSettings(storage: Pick<Storage, 'setItem'> | null, settings: BgmSettings): void {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // 覚えられなくても、今の画面では設定どおりに鳴らす
  }
}

// この端末のブラウザの保存先(使えなければ null)。ショートカット(front#272)の設定でも使う
export function browserStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export class BgmPlayer {
  settings: BgmSettings;
  private unlocked = false;
  // 流したい曲(まだ unlock されていなくても覚えておく)
  private wantedUrl: string | null = null;
  private current: { url: string; audio: BgmAudio } | null = null;
  private fades = new Map<BgmAudio, ReturnType<typeof setInterval>>();

  constructor(
    private createAudio: () => BgmAudio = () => new Audio(),
    private storage: Storage | null = browserStorage()
  ) {
    this.settings = loadBgmSettings(storage);
  }

  get isUnlocked(): boolean {
    return this.unlocked;
  }

  get playingUrl(): string | null {
    return this.current?.url ?? null;
  }

  private get targetVolume(): number {
    return this.settings.muted ? 0 : this.settings.volume;
  }

  /** エリアに入ったときに呼ぶ。url が null なら止める */
  play(url: string | null): void {
    this.wantedUrl = url;
    if (!this.unlocked || this.current?.url === url) return;
    if (this.current) {
      const old = this.current.audio;
      this.fadeTo(old, 0, () => old.pause());
      this.current = null;
    }
    if (!url) return;
    const audio = this.createAudio();
    audio.src = url;
    audio.loop = true;
    audio.volume = 0;
    this.current = { url, audio };
    try {
      void Promise.resolve(audio.play()).catch(() => undefined);
    } catch {
      // 鳴らせなくてもゲームは続ける
    }
    this.fadeTo(audio, this.targetVolume);
  }

  /** 画面をクリックしたとき(ブラウザが音を出せるようになったとき)に呼ぶ */
  unlock(): void {
    if (this.unlocked) return;
    this.unlocked = true;
    this.play(this.wantedUrl);
  }

  setVolume(volume: number): void {
    this.settings = { ...this.settings, volume: Math.min(1, Math.max(0, volume)) };
    this.applySettings();
  }

  setMuted(muted: boolean): void {
    this.settings = { ...this.settings, muted };
    this.applySettings();
  }

  dispose(): void {
    this.fades.forEach((timer) => clearInterval(timer));
    this.fades.clear();
    this.current?.audio.pause();
    this.current = null;
  }

  private applySettings(): void {
    saveBgmSettings(this.storage, this.settings);
    const audio = this.current?.audio;
    if (!audio) return;
    this.stopFade(audio);
    audio.volume = this.targetVolume;
  }

  private fadeTo(audio: BgmAudio, target: number, done?: () => void): void {
    this.stopFade(audio);
    const start = audio.volume;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      audio.volume = Math.min(1, Math.max(0, start + ((target - start) * step) / FADE_STEPS));
      if (step >= FADE_STEPS) {
        this.stopFade(audio);
        done?.();
      }
    }, FADE_MS / FADE_STEPS);
    this.fades.set(audio, timer);
  }

  private stopFade(audio: BgmAudio): void {
    const timer = this.fades.get(audio);
    if (timer) clearInterval(timer);
    this.fades.delete(audio);
  }
}
