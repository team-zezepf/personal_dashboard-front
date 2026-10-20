import { RpgChanceEnemy, RpgChanceItem, RpgMapObject, RpgObjectDef, RpgObjectDefInput } from '../models/rpg.models';
import { DEFAULT_TINTS, OBJECT_DEFS, OBJECT_HIT_MATERIAL, StaticType, THEMED_OBJECTS } from './rpg-data';

/**
 * 置物の設定の下書き(front#333)。「置物」タブの種類ごとのデフォルトと、マップに置いた置物のモーダルで編集する。
 * null は「決めていない」(置いた置物では種類のデフォルトのまま、デフォルトでは今の色・今の音のまま)
 */
export interface ObjectDraft {
  color: string | null;
  dark: string | null;
  items: RpgChanceItem[] | null;
  enemies: RpgChanceEnemy[] | null;
  mimics: RpgChanceEnemy[] | null;
  hitMaterial: string | null;
  // ここから置いた置物だけ。クリック時にメッセージを表示する・メッセージ(1行が1ページ)・看板の向き
  showMessage: boolean;
  lines: string;
  signDir: string | null;
}

// 1行の上限(API の RpgObjectRules と合わせる)
export const OBJECT_LIMITS = { rows: 10, count: [1, 99], chance: [0.001, 1] } as const;

const rows = <T extends object>(list: readonly T[] | null | undefined): T[] | null => (list ? list.map((r) => ({ ...r })) : null);

/** 置物の種類のデフォルトの下書き。一覧は「なし」も空の一覧で持つ(null にしない) */
export function draftOfDef(def: RpgObjectDef | undefined): ObjectDraft {
  return {
    color: def?.color ?? null, dark: def?.dark ?? null,
    items: rows(def?.items) ?? [], enemies: rows(def?.enemies) ?? [], mimics: rows(def?.mimics) ?? [],
    hitMaterial: def?.hitMaterial ?? null, showMessage: false, lines: '', signDir: null
  };
}

/** 置いた置物の下書き。決めていない項目は null(種類のデフォルトのまま) */
export function draftOfObject(o: RpgMapObject): ObjectDraft {
  return {
    color: o.color ?? null, dark: o.dark ?? null, items: rows(o.items), enemies: rows(o.enemies), mimics: rows(o.mimics),
    hitMaterial: o.hitMaterial ?? null, showMessage: !!o.showMessage, lines: (o.lines ?? []).join('\n'), signDir: o.signDir ?? null
  };
}

/** 下書きを置いた置物に書き戻す。決めていない項目は持たない */
export function applyDraft(o: RpgMapObject, d: ObjectDraft): void {
  const set = <K extends keyof RpgMapObject>(key: K, value: RpgMapObject[K] | null) => {
    if (value === null || value === undefined) delete o[key];
    else o[key] = value;
  };
  if (o.type === 'sign') {
    set('signDir', d.signDir);
    o.lines = d.lines.split('\n');
    return;
  }
  set('color', d.color);
  set('dark', d.dark);
  set('showMessage', d.showMessage || null);
  set('lines', d.showMessage ? d.lines.split('\n') : null);
  // メッセージを表示する置物は壊せず擬態もしないので、それに関わる設定を持たない
  set('items', d.showMessage ? null : rows(d.items));
  set('enemies', d.showMessage ? null : rows(d.enemies));
  set('mimics', d.showMessage ? null : rows(d.mimics));
  set('hitMaterial', d.showMessage ? null : d.hitMaterial);
}

/** 置物の種類のデフォルトの保存に送るもの */
export function defInputOf(type: string, d: ObjectDraft, expectedUpdatedAt: string | null): RpgObjectDefInput {
  return {
    type, color: d.color, dark: d.dark, items: rows(d.items) ?? [], enemies: rows(d.enemies) ?? [], mimics: rows(d.mimics) ?? [],
    hitMaterial: d.hitMaterial, expectedUpdatedAt
  };
}

/** テーマで色が変わる置物(木・岩・壁)を、置いた置物で色を決めるときに最初に選んでおく色(草原のテーマの色) */
const THEMED_START: Partial<Record<StaticType, { m: string; d: string }>> = {
  tree: { m: '#4caf50', d: '#7d5232' }, rock: { m: '#9aa3ad', d: '#5f6873' }, wall: { m: '#9ca3af', d: '#4b5563' }
};

/**
 * 色を決めていないときに選んで見せる色(今の色)。テーマで色が変わる置物は null(テーマの色)。
 * forOverride なら、テーマで変わる置物も草原の色を返す(置いた置物では「テーマの色」を選べないため)
 */
export function currentTintOf(type: string, forOverride = false): { m: string; d: string } | null {
  if (THEMED_OBJECTS.includes(type as StaticType)) return forOverride ? (THEMED_START[type as StaticType] ?? null) : null;
  return DEFAULT_TINTS[type as StaticType] ?? null;
}

/** 決めていないときの叩いたときの音(今の音) */
export const currentHitMaterialOf = (type: string): string => OBJECT_HIT_MATERIAL[type as StaticType] ?? 'stone';

/** 置いた置物で「デフォルトのまま」を外したときに入れる、種類のデフォルトの値 */
export function baseOf(type: string): ObjectDraft {
  const d = draftOfDef(OBJECT_DEFS[type]);
  const tint = currentTintOf(type, true);
  return { ...d, color: d.color ?? tint?.m ?? null, dark: d.dark ?? tint?.d ?? null, hitMaterial: d.hitMaterial ?? currentHitMaterialOf(type) };
}

/** 下書きの問題(保存・決定できない)。なければ null */
export function draftProblem(d: ObjectDraft): string | null {
  const all = [...(d.items ?? []), ...(d.enemies ?? []), ...(d.mimics ?? [])];
  if ([d.items, d.enemies, d.mimics].some((l) => (l?.length ?? 0) > OBJECT_LIMITS.rows)) return `出てくるアイテム・敵、擬態している敵は${OBJECT_LIMITS.rows}個までにしてください`;
  if (all.some((r) => !r.id)) return 'アイテム・敵を選んでください';
  if ((d.mimics ?? []).reduce((n, m) => n + m.chance, 0) > 1 + 1e-9) return '擬態している敵の確率の合計は100%までにしてください';
  return null;
}
