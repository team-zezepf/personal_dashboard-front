import { ITEMS } from './rpg-data';

// RPGのショートカットキー(front#272)。1〜5のキーそれぞれに、使う道具を1つ登録する。
// 設定はこの端末のブラウザに覚える(BGMの音量と同じ。ほかの端末には引き継がない)

/** キーの数(1〜5) */
export const SHORTCUT_KEYS = 5;
/** 何も登録していないキーは '' */
export type Shortcuts = string[];
// はじめの設定: 1=回復薬、2=上回復薬、3〜5=なし
export const DEFAULT_SHORTCUTS: Shortcuts = ['potion', 'hipotion', '', '', ''];

const STORAGE_KEY = 'rpgShortcuts';

/** 登録できる道具(使う道具)。道具が増えたら、ここにも自動で増える */
export const shortcutItems = (): string[] => Object.keys(ITEMS).filter((id) => ITEMS[id].type === 'use');

// この端末のブラウザに覚えた設定(読めないところ・知らない道具は、はじめの設定)
export function loadShortcuts(storage: Pick<Storage, 'getItem'> | null): Shortcuts {
  try {
    const saved = JSON.parse(storage?.getItem(STORAGE_KEY) ?? 'null') as unknown;
    if (!Array.isArray(saved)) return [...DEFAULT_SHORTCUTS];
    const usable = shortcutItems();
    return DEFAULT_SHORTCUTS.map((def, i) => {
      const id = saved[i];
      return id === '' || (typeof id === 'string' && usable.includes(id)) ? id : def;
    });
  } catch {
    return [...DEFAULT_SHORTCUTS];
  }
}

export function saveShortcuts(storage: Pick<Storage, 'setItem'> | null, shortcuts: Shortcuts): void {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(shortcuts));
  } catch {
    // 覚えられなくても、今の画面では設定どおりに使える
  }
}

/** 押したキーが何番目のショートカットか(数字キーの上の段・テンキーのどちらも 1〜5)。ショートカットのキーでなければ -1 */
export function shortcutIndexOf(key: string): number {
  const n = Number(key);
  return key.length === 1 && n >= 1 && n <= SHORTCUT_KEYS ? n - 1 : -1;
}
