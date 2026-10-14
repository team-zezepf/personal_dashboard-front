import { BgmAudio, browserStorage } from './rpg-bgm';
import { ENEMY_ATTACKS, HIT_MATERIALS } from './rpg-enemy';

// RPGの効果音(front#278)。叩いたとき・敵の攻撃が当たる瞬間に、場面(slot)ごとに選んだ音を鳴らす。
// BGMと同じく、ブラウザは画面を一度クリックするまで音を出せないため、unlock() されるまでは鳴らさない。
// 音量・消した状態は、この端末のブラウザに覚える(BGMとは別)

export interface SeSlotDef {
  slot: string;
  label: string;
  // 敵の攻撃の場面なら、その攻撃の種類
  attack?: string;
}

/** 鳴らす場面(APIの RpgSeService.SLOTS と同じ)。叩いたときは叩いたものの素材ごと(front#282)、敵の攻撃は種類ごと */
export const SE_SLOTS: SeSlotDef[] = [
  ...HIT_MATERIALS.map(([id, label, icon]) => ({ slot: `hit_${id}`, label: `${icon} ${label}を叩く` })),
  ...ENEMY_ATTACKS.map((a) => ({ slot: `attack_${a.id}`, label: `${a.icon} ${a.label}`, attack: a.id }))
];

export interface SeSettings {
  // 0〜1
  volume: number;
  muted: boolean;
}

const STORAGE_KEY = 'rpgSeSettings';
const DEFAULT_SETTINGS: SeSettings = { volume: 0.8, muted: false };
// 同じ場面の音を続けて鳴らすときの、いちばん短い間(秒)。重なりすぎてうるさくならないように
const MIN_GAP_MS = 60;

export function loadSeSettings(storage: Pick<Storage, 'getItem'> | null): SeSettings {
  try {
    const saved = JSON.parse(storage?.getItem(STORAGE_KEY) ?? 'null') as Partial<SeSettings> | null;
    if (!saved) return { ...DEFAULT_SETTINGS };
    const volume = typeof saved.volume === 'number' ? Math.min(1, Math.max(0, saved.volume)) : DEFAULT_SETTINGS.volume;
    return { volume, muted: saved.muted === true };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export class SePlayer {
  settings: SeSettings;
  private unlocked = false;
  // 場面 → 音のファイルの URL
  private urls = new Map<string, string>();
  private lastPlayed = new Map<string, number>();

  constructor(
    private createAudio: () => BgmAudio = () => new Audio(),
    private storage: Storage | null = browserStorage(),
    private now: () => number = () => Date.now()
  ) {
    this.settings = loadSeSettings(storage);
  }

  /** 場面ごとの音のファイル(APIから読んだ割り当て) */
  setSounds(urls: Map<string, string>): void {
    this.urls = new Map(urls);
  }

  /** 画面をクリックしたとき(ブラウザが音を出せるようになったとき)に呼ぶ */
  unlock(): void {
    this.unlocked = true;
  }

  /** その場面に音が選ばれていれば鳴らす。鳴らしたら true */
  play(slot: string): boolean {
    const url = this.urls.get(slot);
    const volume = this.settings.muted ? 0 : this.settings.volume;
    if (!this.unlocked || !url || volume <= 0) return false;
    const t = this.now();
    if (t - (this.lastPlayed.get(slot) ?? -Infinity) < MIN_GAP_MS) return false;
    this.lastPlayed.set(slot, t);
    // 重ねて鳴らせるよう、鳴らすたびに新しく作る(短い音なのでブラウザがすぐ片付ける)
    const audio = this.createAudio();
    audio.src = url;
    audio.loop = false;
    audio.volume = volume;
    try {
      void Promise.resolve(audio.play()).catch(() => undefined);
    } catch {
      // 鳴らせなくてもゲームは続ける
    }
    return true;
  }

  setVolume(volume: number): void {
    this.settings = { ...this.settings, volume: Math.min(1, Math.max(0, volume)) };
    this.save();
  }

  setMuted(muted: boolean): void {
    this.settings = { ...this.settings, muted };
    this.save();
  }

  private save(): void {
    try {
      this.storage?.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch {
      // 覚えられなくても、今の画面では設定どおりに鳴らす
    }
  }
}
