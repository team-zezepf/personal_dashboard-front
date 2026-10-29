import { RpgEnemy } from '../models/rpg.models';
import { drawArmor, drawChest, mix, shade } from './rpg-props';

/**
 * RPGの敵(front#229)。種類ごとのデータ(マップ作成画面の「敵」タブで作る)と、体の絵・攻撃の動きの描き方を持つ。
 * ゲーム画面と「敵」タブのプレビューで同じ絵になるよう、描く関数はここにまとめる。
 * 形・攻撃の名前はAPI(RpgEnemyService)と合わせる。
 */

export type EnemyShape = 'slime' | 'mushroom' | 'wisp' | 'raptor' | 'golem' | 'ghost' | 'knight' | 'lord' | 'bat' | 'skeleton' | 'plant' | 'dragon' | 'mimic' | 'livingarmor' | 'rabbit' | 'bee' | 'cerberus' | 'rat'
  | 'grimoire' | 'shade' | 'wardcrystal' | 'gargoyle'
  // 海の敵(front#421)
  | 'crab' | 'jellyfish' | 'fishman' | 'kraken';
export type EnemyAttack = 'tackle' | 'claw' | 'bite' | 'jump' | 'fire' | 'water' | 'wind' | 'thunder' | 'dark' | 'shockwave' | 'circle'
  // 炎LV2・水LV2・風LV2・雷LV1(front#435)
  | 'blaze' | 'splash' | 'gale' | 'spark';

export type EnemyDef = Omit<RpgEnemy, 'sortOrder' | 'updatedAt'> & { shape: EnemyShape; attack: EnemyAttack };

export const ENEMY_SHAPES: [EnemyShape, string][] = [
  ['slime', 'スライム'], ['mushroom', 'キノコ'], ['wisp', '精霊'], ['raptor', 'ラプトル'],
  ['golem', 'ゴーレム'], ['ghost', 'ゴースト'], ['knight', '騎士'], ['lord', '魔導士'],
  ['bat', 'コウモリ'], ['skeleton', 'ガイコツ'], ['plant', 'ひとくいそう'], ['dragon', 'ドラゴン'],
  ['mimic', 'ミミック'], ['livingarmor', 'リビングアーマー'], ['rabbit', 'うさぎ'], ['bee', 'はち'], ['cerberus', 'ケルベロス'], ['rat', 'ネズミ'],
  // 闇の魔導士の取り巻きとガーゴイル(front#329)
  ['grimoire', '魔導書'], ['shade', '影'], ['wardcrystal', '結晶'], ['gargoyle', 'ガーゴイル'],
  // 海の敵(front#421)
  ['crab', 'カニ'], ['jellyfish', 'クラゲ'], ['fishman', '魚人'], ['kraken', 'イカ']
];

export interface AttackSpec {
  id: EnemyAttack;
  label: string;
  icon: string;
  // look: 動きだけが変わる(となりのマスを攻撃する) / rule: ゲームのきまりも変わる
  kind: 'look' | 'rule';
  desc: string;
  // 属性と LV(front#435)。離れたところに出す属性の攻撃だけ
  element?: AttackElement;
  level?: 1 | 2;
}

export type AttackElement = 'fire' | 'water' | 'wind' | 'thunder' | 'dark';

export const ENEMY_ATTACKS: AttackSpec[] = [
  { id: 'tackle', label: '体当たり', icon: '💥', kind: 'rule', desc: '体をふるわせて力をためてから、まっすぐ突っ込む。ためている間に横へ動けば当たらない（距離1・ためる時間0なら、となりの相手に少し前に出てぶつかる）。' },
  { id: 'claw', label: 'ひっかき', icon: '🐾', kind: 'look', desc: 'となりのマスにいる相手を、爪でひっかく。白い爪あとが走る。' },
  { id: 'bite', label: 'かみつき', icon: '🦷', kind: 'look', desc: 'となりのマスにいる相手に、大きく飛びかかってかみつく。' },
  { id: 'jump', label: 'ジャンプ', icon: '⤴️', kind: 'rule', desc: '体をふるわせて力をためてから、跳び上がって相手の上に落ちる。着地で土ぼこりが立つ。ためている間に動けばよけられる。' },
  { id: 'shockwave', label: '衝撃波', icon: '🌀', kind: 'rule', desc: '足元の地面が一瞬赤く光り、輪がすばやく広がる。範囲の中にいると、輪が届いたときに当たる。' },
  // 属性 × LV(front#435)。LV1 は相手のいたマスに出る(離れればよけられる)。LV2 は魔法陣が出てすぐ、範囲(まわり何マス)に当たる
  { id: 'fire', label: '炎 LV1', icon: '🔥', kind: 'rule', element: 'fire', level: 1, desc: '相手の足元の地面が赤く光り、下から火柱が噴き上がる。光ったマスから離れればよけられる。' },
  { id: 'blaze', label: '炎 LV2', icon: '🔥', kind: 'rule', element: 'fire', level: 2, desc: '相手の足元に赤い魔法陣を浮かべ、すぐに大きな火柱が噴き上がる。範囲の中にいると当たる。' },
  { id: 'water', label: '水 LV1', icon: '💧', kind: 'rule', element: 'water', level: 1, desc: '相手の足元に水の輪が出て、少しあとに水柱が吹き上がる。輪が出たマスから離れればよけられる。' },
  { id: 'splash', label: '水 LV2', icon: '💧', kind: 'rule', element: 'water', level: 2, desc: '相手の足元に青い魔法陣を浮かべ、すぐに中心から水が激しく噴き出して飛び散る。範囲の中にいると当たる。' },
  { id: 'wind', label: '風 LV1', icon: '🌪️', kind: 'rule', element: 'wind', level: 1, desc: '相手のいたマスに竜巻が起こり、その場で回って消える（動かない）。できはじめたら離れればよけられる。' },
  { id: 'gale', label: '風 LV2', icon: '🌪️', kind: 'rule', element: 'wind', level: 2, desc: '相手の足元に緑の魔法陣を浮かべ、すぐに大きな竜巻と風の刃が起こる。範囲の中にいると当たる。' },
  { id: 'spark', label: '雷 LV1', icon: '⚡', kind: 'rule', element: 'thunder', level: 1, desc: '相手の足元が黄色くちらつき、少しあとに足元から雷がピリピリっと流れる。ちらついたマスから離れればよけられる。' },
  { id: 'thunder', label: '雷 LV2', icon: '⚡', kind: 'rule', element: 'thunder', level: 2, desc: '相手の足元に黄色い魔法陣を浮かべ、すぐに空から太い稲妻が落ちる。範囲の中にいると当たる。' },
  { id: 'dark', label: '闇 LV1', icon: '🌑', kind: 'rule', element: 'dark', level: 1, desc: '相手の足元に黒い影が広がり、少しあとに闇の柱が立ちのぼる。影が出たマスから離れればよけられる。' },
  // 闇の魔導士の専用の攻撃だった魔法陣(front#327)
  { id: 'circle', label: '闇 LV2', icon: '🔯', kind: 'rule', element: 'dark', level: 2, desc: '杖を掲げ、相手の足元に紫の魔法陣を浮かべる。すぐに魔法陣から太い闇の柱が立ちのぼる。範囲の中にいると当たる。' }
];

/** 敵の編集画面で選ぶ属性(front#435)。[LV1 の攻撃, LV2 の攻撃] */
export const ATTACK_ELEMENTS: { id: AttackElement; label: string; levels: [EnemyAttack, EnemyAttack] }[] = [
  { id: 'fire', label: '炎', levels: ['fire', 'blaze'] },
  { id: 'water', label: '水', levels: ['water', 'splash'] },
  { id: 'wind', label: '風', levels: ['wind', 'gale'] },
  { id: 'thunder', label: '雷', levels: ['spark', 'thunder'] },
  { id: 'dark', label: '闇', levels: ['dark', 'circle'] }
];

// LV2 の攻撃(front#435)。相手の足元に魔法陣を出し(出さないこともできる)、足元のまわり(範囲)にも当たる
export const LV2_ATTACKS: EnemyAttack[] = ['blaze', 'splash', 'gale', 'thunder', 'circle'];
export const isLv2Attack = (attack: EnemyAttack) => LV2_ATTACKS.includes(attack);

// 離れたところ(相手の足元)に出す攻撃
export const SPELLS: EnemyAttack[] = ['fire', 'water', 'wind', 'spark', 'dark', ...LV2_ATTACKS];

export const ENEMY_COLORS = [
  '#7ddc6f', '#6fb6ff', '#e85d75', '#7ef9ff', '#7fb069', '#a3acb6', '#f5f3ff', '#475569', '#6d28d9', '#fbbf24', '#f97316', '#ec4899', '#1f2937', '#8b5a2b',
  '#ef4444', '#fde047', '#ffffff', '#1e3a8a', '#14b8a6', '#a3e635', '#d6b98c'
];
export const ENEMY_DARKS = [
  '#3fa24a', '#2c74d6', '#b83a52', '#22b8c9', '#4f7a3d', '#6b7480', '#a78bfa', '#1f2937', '#2e1065', '#b45309', '#9a3412', '#9d174d', '#0b0f19', '#5b3a1f',
  '#991b1b', '#a16207', '#94a3b8', '#172554', '#0f766e', '#4d7c0f', '#8b6f47'
];

// 値の範囲(APIと合わせる)
export const ENEMY_LIMITS = {
  size: [0.8, 1.6], hp: [1, 99999], stat: [0, 9999], interval: [0.5, 5], speed: [0.5, 5], reward: [0, 99999],
  sight: [0, 8], respawn: [3, 600], dash: [1, 5], charge: [0, 2], range: [1, 5], radius: [1, 2]
} as const;

const base = { boss: false, attack: 'tackle' as EnemyAttack, dash: 1, charge: 0, range: 3, radius: 1, material: null as string | null, materialRate: 0, hitMaterial: null as string | null, glow: false, guard: false, magicCircle: true };

// まだ「敵」タブで保存していないときの25種類(APIの default_enemies.json と同じ)
export const DEFAULT_ENEMIES: EnemyDef[] = [
  { ...base, id: 'slime', name: 'スライム', shape: 'slime', color: '#7ddc6f', dark: '#3fa24a', size: 1, hp: 22, atk: 8, def: 1, interval: 1.4, speed: 1.3, exp: 6, gold: 4, drop: 'potion', dropRate: 0.25, material: 'slime_jelly', materialRate: 0.5, sight: 0, respawn: 10 },
  { ...base, id: 'blue', name: 'ブルースライム', shape: 'slime', color: '#6fb6ff', dark: '#2c74d6', size: 1.2, hp: 50, atk: 14, def: 5, interval: 1.3, speed: 1.6, exp: 16, gold: 10, drop: 'potion', dropRate: 0.35, material: 'slime_jelly', materialRate: 0.6, sight: 2.5, respawn: 10 },
  { ...base, id: 'kinokon', name: 'キノコン', shape: 'mushroom', color: '#e85d75', dark: '#b83a52', size: 1, hp: 75, atk: 20, def: 8, interval: 1.5, speed: 1.2, exp: 26, gold: 15, drop: 'potion', dropRate: 0.35, material: 'mushroom_spore', materialRate: 0.5, sight: 0, respawn: 10 },
  { ...base, id: 'spirit', name: 'もりのせいれい', shape: 'wisp', color: '#7ef9ff', dark: '#22b8c9', size: 1, hp: 60, atk: 26, def: 6, interval: 1.2, speed: 2.2, exp: 32, gold: 18, drop: 'hipotion', dropRate: 0.2, material: 'spirit_light', materialRate: 0.4, sight: 3, respawn: 10 },
  { ...base, id: 'raptor', name: 'ラプトル', shape: 'raptor', color: '#7fb069', dark: '#4f7a3d', size: 1, hp: 130, atk: 34, def: 12, interval: 1.2, speed: 2.4, exp: 60, gold: 32, drop: 'hipotion', dropRate: 0.3, material: 'raptor_fang', materialRate: 0.5, sight: 3.5, respawn: 10 },
  { ...base, id: 'golem', name: 'いわゴーレム', shape: 'golem', color: '#a3acb6', dark: '#6b7480', size: 1, hp: 240, atk: 42, def: 20, interval: 1.8, speed: 1.1, exp: 110, gold: 65, drop: 'hipotion', dropRate: 0.6, material: 'golem_stone', materialRate: 0.6, sight: 3, respawn: 10 },
  { ...base, id: 'ghost', name: 'ゴースト', shape: 'ghost', color: '#f5f3ff', dark: '#a78bfa', size: 1, hp: 170, atk: 48, def: 16, interval: 1.4, speed: 1.8, exp: 120, gold: 55, drop: 'hipotion', dropRate: 0.4, material: 'ghost_cloth', materialRate: 0.5, sight: 3, respawn: 10 },
  { ...base, id: 'knight', name: 'ダークナイト', shape: 'knight', color: '#475569', dark: '#334155', size: 1.15, hp: 320, atk: 62, def: 30, interval: 1.6, speed: 1.4, exp: 220, gold: 110, drop: 'hipotion', dropRate: 0.5, material: 'black_iron', materialRate: 0.5, sight: 3, respawn: 10 },
  { ...base, id: 'darklord', name: '闇の魔導士', shape: 'lord', color: '#6d28d9', dark: '#1e1b4b', size: 1.45, hp: 900, atk: 85, def: 40, interval: 2, speed: 1.2, exp: 1000, gold: 500, drop: 'hipotion', dropRate: 1, material: 'dark_gem', materialRate: 1, sight: 4, respawn: 60, boss: true },
  // 後から足した形の敵(front#255)
  { ...base, id: 'nightbat', name: 'ナイトバット', shape: 'bat', color: '#6d28d9', dark: '#2e1065', size: 0.9, hp: 45, atk: 18, def: 3, interval: 1.1, speed: 2.6, exp: 14, gold: 8, drop: 'potion', dropRate: 0.3, material: 'bat_wing', materialRate: 0.5, sight: 3.5, respawn: 10, attack: 'bite' },
  { ...base, id: 'skeleton', name: 'ガイコツ兵', shape: 'skeleton', color: '#f5f3ff', dark: '#172554', size: 1, hp: 150, atk: 40, def: 14, interval: 1.4, speed: 1.5, exp: 80, gold: 40, drop: 'hipotion', dropRate: 0.4, material: 'old_bone', materialRate: 0.6, sight: 3, respawn: 10, attack: 'claw' },
  { ...base, id: 'maneater', name: 'ひとくいそう', shape: 'plant', color: '#ec4899', dark: '#4d7c0f', size: 1.1, hp: 110, atk: 30, def: 10, interval: 1.6, speed: 0.5, exp: 40, gold: 22, drop: 'hipotion', dropRate: 0.3, material: 'poison_petal', materialRate: 0.5, sight: 0, respawn: 10, attack: 'bite' },
  { ...base, id: 'reddragon', name: 'レッドドラゴン', shape: 'dragon', color: '#ef4444', dark: '#991b1b', size: 1.4, hp: 650, atk: 58, def: 26, interval: 2.2, speed: 1.3, exp: 450, gold: 220, drop: 'hipotion', dropRate: 1, material: 'dragon_scale', materialRate: 1, sight: 4, respawn: 60, boss: true, attack: 'fire' },
  // 化ける敵(front#270)。最初の色は、本物の宝箱・甲冑と同じ
  { ...base, id: 'mimic', name: 'ミミック', shape: 'mimic', color: '#a8682f', dark: '#4c0519', size: 1, hp: 200, atk: 46, def: 18, interval: 1.3, speed: 2, exp: 90, gold: 120, drop: 'hipotion', dropRate: 0.5, material: 'mimic_tongue', materialRate: 0.5, sight: 1.5, respawn: 10, attack: 'bite' },
  { ...base, id: 'livingarmor', name: 'リビングアーマー', shape: 'livingarmor', color: '#94a3b8', dark: '#dc2626', size: 1, hp: 300, atk: 58, def: 32, interval: 1.6, speed: 1.3, exp: 180, gold: 90, drop: 'hipotion', dropRate: 0.4, material: 'magic_scrap', materialRate: 0.5, sight: 2, respawn: 10 },
  // 草原の敵(front#284)。ヒカリスライムはスライムから、まれに入れかわって出る
  { ...base, id: 'hornrabbit', name: 'つのウサギ', shape: 'rabbit', color: '#f3e8d8', dark: '#f9a8d4', size: 1, hp: 35, atk: 12, def: 3, interval: 1.4, speed: 2, exp: 10, gold: 6, drop: 'potion', dropRate: 0.15, material: 'rabbit_horn', materialRate: 0.5, sight: 3, respawn: 10, attack: 'jump', dash: 2, charge: 0.4 },
  { ...base, id: 'mitsubachin', name: 'ミツバチン', shape: 'bee', color: '#fde047', dark: '#1f2937', size: 0.9, hp: 25, atk: 10, def: 1, interval: 1.1, speed: 2.8, exp: 8, gold: 5, drop: 'potion', dropRate: 0.1, material: 'honey', materialRate: 0.5, sight: 3.5, respawn: 10, attack: 'tackle', dash: 2, charge: 0.3 },
  { ...base, id: 'hikarislime', name: 'ヒカリスライム', shape: 'slime', color: '#fde047', dark: '#ca8a04', size: 1.05, hp: 50, atk: 14, def: 5, interval: 1.3, speed: 1.6, exp: 16, gold: 200, drop: 'hipotion', dropRate: 1, sight: 2.5, respawn: 10, glow: true },
  // 牢獄の敵(front#321)。看守はダークナイト、囚われの亡霊はゴーストの色違い
  { ...base, id: 'rat', name: 'ドブネズミ', shape: 'rat', color: '#8b7d72', dark: '#4a3f38', size: 0.85, hp: 70, atk: 30, def: 6, interval: 1, speed: 2.6, exp: 30, gold: 12, drop: 'potion', dropRate: 0.3, material: 'rat_tail', materialRate: 0.5, sight: 3, respawn: 10, attack: 'bite' },
  { ...base, id: 'jailer', name: '看守', shape: 'knight', color: '#7a5a3c', dark: '#3b2a1e', size: 1.15, hp: 360, atk: 64, def: 30, interval: 1.6, speed: 1.4, exp: 240, gold: 130, drop: 'hipotion', dropRate: 0.5, material: 'rusty_key', materialRate: 0.4, sight: 3.5, respawn: 10 },
  { ...base, id: 'captiveghost', name: '囚われの亡霊', shape: 'ghost', color: '#dbeafe', dark: '#64748b', size: 1, hp: 190, atk: 50, def: 16, interval: 1.4, speed: 1.8, exp: 130, gold: 50, drop: 'hipotion', dropRate: 0.4, material: 'iron_chain', materialRate: 0.5, sight: 2.5, respawn: 10 },
  // 闇の魔導士の取り巻き(浮かぶ魔導書・影の分身・闇の水晶)と、ガーゴイル(front#329)
  { ...base, id: 'grimoire', name: '浮かぶ魔導書', shape: 'grimoire', color: '#a855f7', dark: '#2e1065', size: 1, hp: 220, atk: 70, def: 20, interval: 1.8, speed: 1.6, exp: 150, gold: 60, drop: 'hipotion', dropRate: 0.4, material: 'cursed_page', materialRate: 0.5, sight: 3.5, respawn: 10, attack: 'dark' },
  { ...base, id: 'shadow', name: '影の分身', shape: 'shade', color: '#3b3355', dark: '#05030a', size: 1.2, hp: 300, atk: 80, def: 25, interval: 2, speed: 1.4, exp: 200, gold: 80, drop: 'hipotion', dropRate: 0.4, material: 'shadow_shard', materialRate: 0.5, sight: 3, respawn: 10, attack: 'dark' },
  { ...base, id: 'wardcrystal', name: '闇の水晶', shape: 'wardcrystal', color: '#a855f7', dark: '#1e1b4b', size: 1, hp: 400, atk: 0, def: 40, interval: 2, speed: 0.5, exp: 120, gold: 40, drop: 'hipotion', dropRate: 0.4, material: 'dark_crystal', materialRate: 0.5, sight: 0, respawn: 60, guard: true },
  { ...base, id: 'gargoyle', name: 'ガーゴイル', shape: 'gargoyle', color: '#6b6878', dark: '#3a3846', size: 1, hp: 380, atk: 72, def: 34, interval: 1.7, speed: 1.6, exp: 230, gold: 100, drop: 'hipotion', dropRate: 0.4, material: 'gargoyle_wing', materialRate: 0.5, sight: 2, respawn: 10, attack: 'jump', dash: 2, charge: 0.4 }
];

/**
 * 敵の種類(IDごと)。最初は9種類で、ゲーム・マップ作成画面がAPIから読んだ敵で setEnemies する。
 * 中身を入れ替えるだけで、この表を使っている所(ゲーム・描画・パレット)はそのまま新しい敵を使える
 */
const SHAPE_IDS = ENEMY_SHAPES.map(([id]) => id);
const ATTACK_IDS = ENEMY_ATTACKS.map((a) => a.id);

export const ENEMIES: Record<string, EnemyDef> = {};

export function setEnemies(list: (RpgEnemy | EnemyDef)[]): void {
  for (const key of Object.keys(ENEMIES)) delete ENEMIES[key];
  for (const e of list) {
    // 知らない形・攻撃(新しいAPIと古い画面の組み合わせなど)は、スライム・体当たりとして扱う
    const shape = (SHAPE_IDS as string[]).includes(e.shape) ? (e.shape as EnemyShape) : 'slime';
    const attack = (ATTACK_IDS as string[]).includes(e.attack) ? (e.attack as EnemyAttack) : 'tackle';
    const { sortOrder: _s, updatedAt: _u, ...rest } = e as RpgEnemy;
    // 魔法陣を出す(front#435)は、前のAPIのデータにはないので出す
    ENEMIES[e.id] = { ...rest, shape, attack, magicCircle: rest.magicCircle ?? true };
  }
}

setEnemies(DEFAULT_ENEMIES);

// 形ごとの、クリックで選べる高さ・足元の印の大きさ(大きさ 1 のとき)
const HIT_HEIGHT: Record<EnemyShape, number> = {
  slime: 28, mushroom: 36, wisp: 46, raptor: 40, golem: 62, ghost: 50, knight: 56, lord: 92, bat: 46, skeleton: 48, plant: 50, dragon: 68,
  mimic: 30, livingarmor: 56, rabbit: 44, bee: 46, cerberus: 62, rat: 26,
  grimoire: 60, shade: 72, wardcrystal: 62, gargoyle: 72,
  crab: 32, jellyfish: 50, fishman: 52, kraken: 84
};
const RING: Record<EnemyShape, number> = {
  slime: 1, mushroom: 1, wisp: 1, raptor: 1.2, golem: 1.5, ghost: 1, knight: 1, lord: 1.2, bat: 0.9, skeleton: 1, plant: 1.1, dragon: 1.6,
  mimic: 1.1, livingarmor: 1, rabbit: 1, bee: 0.8, cerberus: 1.5, rat: 0.9,
  grimoire: 0.9, shade: 1, wardcrystal: 1, gargoyle: 1.3,
  crab: 1.3, jellyfish: 0.9, fishman: 1, kraken: 1.8
};

export const hitHeightOf = (def: EnemyDef) => HIT_HEIGHT[def.shape] * def.size;
export const ringSizeOf = (def: EnemyDef) => RING[def.shape] * def.size;
// 横に長い形を「敵」タブの見本の枠に収めるための縮め方
export const thumbFitOf = (def: EnemyDef) => (def.shape === 'dragon' ? 0.72 : def.shape === 'kraken' ? 0.8 : 1);

/**
 * 一覧の見本(敵タブの一覧・体の形、マップ作成のパレット。front#310)。足元を下のほうに置き、大きさに合わせて縮める。
 * 化ける敵(front#270)は、ばけていない本当の姿を見せる
 */
export function drawEnemyThumb(cv: HTMLCanvasElement, def: EnemyDef): void {
  const c = cv.getContext('2d');
  if (!c) return;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, cv.width, cv.height);
  const sc = (cv.width / 88) * (1.25 / Math.max(1, def.size * 0.85)) * thumbFitOf(def);
  c.translate(cv.width / 2, cv.height * 0.86);
  c.scale(sc, sc);
  drawEnemyBody(c, def, { dir: 1, time: 0, aggro: !!disguiseOf(def) });
}
// ===== 叩いたときの音の素材(front#282) =====
// 効果音の場面 hit_{素材} を選ぶのに使う。敵は体の形で決まり、「敵」タブの「叩いたときの音」で変えられる

export type HitMaterial = 'flesh' | 'soft' | 'stone' | 'wood' | 'grass';
export const HIT_MATERIALS: [HitMaterial, string, string][] = [
  ['flesh', '生き物', '🐾'], ['soft', '柔らかいもの', '💧'], ['stone', '岩', '⛰️'], ['wood', '木', '🌳'], ['grass', '草', '🌿']
];
const HIT_MATERIAL_IDS = HIT_MATERIALS.map(([id]) => id);
// 体の形ごとの素材(金属の騎士・リビングアーマーは岩)
const SHAPE_MATERIAL: Record<EnemyShape, HitMaterial> = {
  slime: 'soft', mushroom: 'flesh', wisp: 'flesh', raptor: 'flesh', golem: 'stone', ghost: 'flesh', knight: 'stone', lord: 'flesh',
  bat: 'flesh', skeleton: 'stone', plant: 'flesh', dragon: 'flesh', mimic: 'wood', livingarmor: 'stone', rabbit: 'flesh', bee: 'flesh', cerberus: 'flesh', rat: 'flesh',
  grimoire: 'soft', shade: 'soft', wardcrystal: 'stone', gargoyle: 'stone',
  crab: 'stone', jellyfish: 'soft', fishman: 'flesh', kraken: 'soft'
};
export const shapeMaterialOf = (shape: EnemyShape): HitMaterial => SHAPE_MATERIAL[shape];
/** 叩いたときの音の素材。「敵」タブで選んでいればそれ、なければ体の形から */
export const hitMaterialOf = (def: Pick<EnemyDef, 'shape' | 'hitMaterial'>): HitMaterial =>
  def.hitMaterial && (HIT_MATERIAL_IDS as string[]).includes(def.hitMaterial) ? (def.hitMaterial as HitMaterial) : SHAPE_MATERIAL[def.shape];

// 根を張っていて、その場から動かない形(front#255)。歩く速さの設定は使わない
export const isRooted = (def: Pick<EnemyDef, 'shape'>) => def.shape === 'plant' || def.shape === 'wardcrystal';
/** 守る敵(front#330)が n 体生きているときの、ボスに与えるダメージの割合。1体につき1/4ずつ減る(3体で1/4、4体以上で0) */
export const guardRateOf = (n: number) => Math.max(0, 1 - 0.25 * n);
// 攻撃してこない形(闇の水晶 front#329)。叩かれても、その場で浮いているだけ
export const isPassive = (def: Pick<EnemyDef, 'shape'>) => def.shape === 'wardcrystal';
// 置物にばける形(front#270)と、ばけている間(近づかれるまで)の名前。ばけている間は歩き回らず、置物と同じ絵になる
const DISGUISES: Partial<Record<EnemyShape, string>> = { mimic: '宝箱', livingarmor: '甲冑', gargoyle: '石像' };
export const disguiseOf = (def: Pick<EnemyDef, 'shape'>): string | null => DISGUISES[def.shape] ?? null;

// ===== 攻撃の長さ(秒)と当たる時(攻撃を始めてからの秒) =====

// 属性の攻撃の速さ(front#435)。前の 0.65倍の速さ(約1.5倍の長さ)にする。動き(ちらつき・回転)も同じだけゆっくりにする
export const SPELL_FX_SPEED = 0.65;
const slow = (sec: number) => sec / SPELL_FX_SPEED;
// LV2 の攻撃(front#435)の、魔法陣が出てから攻撃が伸びきるまで(当たる時)の秒。魔法陣が出たらすぐ攻撃が出る
const LV2_CAST = slow(0.15);
const LV2_RISE = slow(0.1);
const lv2Timing = (after: number) => ({ duration: LV2_CAST + LV2_RISE + slow(after), hitAt: LV2_CAST + LV2_RISE });

/** 体当たり・ジャンプで、相手まで動くか(距離1なら、その場で少し前に出るだけ) */
export const movesToTarget = (def: EnemyDef) => (def.attack === 'tackle' || def.attack === 'jump') && def.dash > 1;

export function attackTiming(def: EnemyDef): { duration: number; hitAt: number } {
  const c = def.charge;
  switch (def.attack) {
    case 'tackle': return def.dash > 1 ? { duration: c + 0.5, hitAt: c + 0.25 } : { duration: c + 0.35, hitAt: c };
    case 'jump': return { duration: c + 0.75, hitAt: c + 0.42 };
    case 'claw': return { duration: 0.55, hitAt: 0.22 };
    case 'bite': return { duration: 0.6, hitAt: 0.27 };
    case 'shockwave': return { duration: 0.75, hitAt: 0.38 };
    // LV1(front#435 で約1.5倍の長さにした)
    case 'fire': return { duration: slow(1.0), hitAt: slow(0.45) };
    case 'water': return { duration: slow(0.9), hitAt: slow(0.45) };
    case 'wind': return { duration: slow(1.0), hitAt: slow(0.4) };
    case 'spark': return { duration: slow(0.9), hitAt: slow(0.45) };
    case 'dark': return { duration: slow(1.0), hitAt: slow(0.45) };
    // LV2: 魔法陣が出る → すぐ当たる → 消えていく(front#435)
    case 'blaze': return lv2Timing(0.6);
    case 'splash': return lv2Timing(0.7);
    case 'gale': return lv2Timing(0.65);
    case 'thunder': return lv2Timing(0.4);
    case 'circle': return lv2Timing(0.4);
  }
}

/** 詠唱の強さ(0〜1。front#327)。攻撃を始めてから強まり、当たったあと弱まる。離れたところへの攻撃(SPELLS)だけ */
export function castOf(def: EnemyDef, t: number): number {
  if (!SPELLS.includes(def.attack)) return 0;
  const { hitAt } = attackTiming(def);
  return t < hitAt ? Math.min(1, t / 0.15) : Math.max(0, 1 - (t - hitAt) / 0.25);
}

/** 攻撃を始められる距離(マス)。この距離まで近づいたら、止まって攻撃する */
export function attackReach(def: EnemyDef, melee: number): number {
  if (SPELLS.includes(def.attack)) return Math.max(melee, def.range + 0.35);
  if (def.attack === 'shockwave') return Math.max(melee, def.radius + 0.35);
  if (movesToTarget(def)) return Math.max(melee, def.dash + 0.35);
  return melee;
}

// ===== 体の絵 =====

export interface EnemyPose {
  dir: number;
  time: number;
  moving?: boolean;
  // ダメージを受けたとき、白く光る
  flash?: boolean;
  // 襲ってきているとき、怒った顔にする
  aggro?: boolean;
  // 攻撃したときの前に出る量(0〜1)
  lunge?: number;
  // 揺れ方をずらす
  seed?: number;
  // 詠唱の強さ(0〜1)。離れたところへの攻撃(SPELLS)をしている間。魔導士(front#327)は杖を掲げて宝珠を光らせる
  cast?: number;
}

function shadow(c: CanvasRenderingContext2D, rx: number, ry: number, a = 0.18): void {
  c.fillStyle = `rgba(0,0,0,${a})`;
  c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); c.fill();
}

function poly(c: CanvasRenderingContext2D, pts: [number, number][], fill: string): void {
  c.beginPath();
  pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.closePath();
  c.fillStyle = fill;
  c.fill();
}

function eyes(c: CanvasRenderingContext2D, x: number, y: number, gap: number, rx: number, ry: number, color = '#1f2937'): void {
  c.fillStyle = color;
  c.beginPath(); c.ellipse(x - gap, y, rx, ry, 0, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.ellipse(x + gap, y, rx, ry, 0, 0, Math.PI * 2); c.fill();
}

function angryBrows(c: CanvasRenderingContext2D, x: number, ey: number, s: number): void {
  c.strokeStyle = '#1f2937';
  c.lineWidth = 1.6;
  c.beginPath();
  c.moveTo(x - 8 * s, ey - 6 * s); c.lineTo(x - 3 * s, ey - 4 * s);
  c.moveTo(x + 8 * s, ey - 6 * s); c.lineTo(x + 3 * s, ey - 4 * s);
  c.stroke();
}

/** 敵の体を、足元を (0, 0) として描く(大きさはこの中で掛ける)。戻り値は頭の上の高さ(HPバー・名前を出す位置) */
export function drawEnemyBody(c: CanvasRenderingContext2D, def: EnemyDef, pose: EnemyPose): number {
  c.save();
  c.scale(def.size, def.size);
  if (def.glow) drawGlow(c, HIT_HEIGHT[def.shape], pose.time, false);
  let top: number;
  switch (def.shape) {
    case 'slime': top = drawSlime(c, def, pose); break;
    case 'mushroom': top = drawMushroom(c, def, pose); break;
    case 'wisp': top = drawWisp(c, def, pose); break;
    case 'raptor': top = drawRaptor(c, def, pose); break;
    case 'golem': top = drawGolem(c, def, pose); break;
    case 'ghost': top = drawGhost(c, def, pose); break;
    case 'knight': top = drawChibi(c, def, pose); break;
    case 'lord': top = drawLord(c, def, pose); break;
    case 'bat': top = drawBat(c, def, pose); break;
    case 'skeleton': top = drawSkeleton(c, def, pose); break;
    case 'plant': top = drawPlant(c, def, pose); break;
    case 'dragon': top = drawDragon(c, def, pose); break;
    case 'mimic': top = drawMimic(c, def, pose); break;
    case 'livingarmor': top = drawLivingArmor(c, def, pose); break;
    case 'rabbit': top = drawRabbit(c, def, pose); break;
    case 'bee': top = drawBee(c, def, pose); break;
    case 'cerberus': top = drawCerberus(c, def, pose); break;
    case 'rat': top = drawRat(c, def, pose); break;
    case 'grimoire': top = drawGrimoire(c, def, pose); break;
    // 影の分身(front#329): 魔導士の地味な姿を、半透明にする(いつも目が光る)
    case 'shade':
      c.save();
      c.globalAlpha *= 0.6;
      top = drawLord(c, def, { ...pose, aggro: true }, true);
      c.restore();
      break;
    case 'wardcrystal': top = drawWardCrystal(c, def, pose); break;
    case 'gargoyle': top = drawGargoyle(c, def, pose); break;
    case 'crab': top = drawCrab(c, def, pose); break;
    case 'jellyfish': top = drawJellyfish(c, def, pose); break;
    case 'fishman': top = drawFishman(c, def, pose); break;
    case 'kraken': top = drawKraken(c, def, pose); break;
  }
  if (def.glow) drawGlow(c, HIT_HEIGHT[def.shape], pose.time, true);
  c.restore();
  return top * def.size;
}

function drawSlime(c: CanvasRenderingContext2D, def: EnemyDef, p: EnemyPose): number {
  const t = p.time;
  const sq = Math.sin(t * 5 + (p.seed ?? 0)) * 0.07 + (p.moving ? Math.sin(t * 12) * 0.06 : 0);
  shadow(c, 14, 5);
  const rx = 15 * (1 + sq);
  const hgt = 20 * (1 - sq);
  const grd = c.createRadialGradient(-4, -hgt * 0.7, 2, 0, -hgt / 2, rx * 1.3);
  grd.addColorStop(0, '#ffffff');
  grd.addColorStop(0.25, def.color);
  grd.addColorStop(1, def.dark);
  c.fillStyle = p.flash ? '#ffffff' : grd;
  c.beginPath();
  c.moveTo(-rx, 0);
  c.bezierCurveTo(-rx, -hgt / 0.75, rx, -hgt / 0.75, rx, 0);
  c.closePath();
  c.fill();
  c.strokeStyle = 'rgba(0,0,0,0.2)';
  c.lineWidth = 1;
  c.stroke();
  const ey = -hgt * 0.5;
  const f = p.dir * 2.5;
  eyes(c, f, ey, 5, 2, 3);
  if (p.aggro) angryBrows(c, f, ey, 1);
  return hgt + 4;
}

function drawMushroom(c: CanvasRenderingContext2D, def: EnemyDef, p: EnemyPose): number {
  const hop = p.moving ? -Math.abs(Math.sin(p.time * 9)) * 5 : 0;
  const f = p.dir * 2;
  shadow(c, 13, 5);
  c.fillStyle = p.flash ? '#fff' : '#fff3e0';
  c.beginPath(); c.roundRect(-8, hop - 18, 16, 17, 6); c.fill();
  c.strokeStyle = 'rgba(0,0,0,0.15)';
  c.lineWidth = 1;
  c.stroke();
  eyes(c, f, hop - 10, 3.5, 1.6, 2.4);
  c.fillStyle = p.flash ? '#fff' : def.color;
  c.beginPath();
  c.moveTo(-18, hop - 15);
  c.bezierCurveTo(-18, hop - 40, 18, hop - 40, 18, hop - 15);
  c.closePath();
  c.fill();
  c.strokeStyle = def.dark;
  c.stroke();
  c.fillStyle = '#fff';
  for (const [dx, dy, r] of [[-8, -24, 3.2], [6, -28, 3.6], [1, -19, 2.2], [11, -19, 2]]) {
    c.beginPath(); c.arc(dx, hop + dy, r, 0, Math.PI * 2); c.fill();
  }
  if (p.aggro) angryBrows(c, f, hop - 10, 0.8);
  return 36 - hop;
}

function drawWisp(c: CanvasRenderingContext2D, def: EnemyDef, p: EnemyPose): number {
  const t = p.time;
  const fl = Math.sin(t * 3 + (p.seed ?? 0)) * 4;
  const cy = -28 + fl;
  shadow(c, 9, 3.5);
  for (let i = 1; i <= 3; i++) {
    c.globalAlpha = 0.35 - i * 0.08;
    c.fillStyle = def.color;
    c.beginPath();
    c.arc(-p.dir * i * 7, cy + i * 3 + Math.sin(t * 6 + i) * 2, 6 - i, 0, Math.PI * 2);
    c.fill();
  }
  c.globalAlpha = 1;
  const g = c.createRadialGradient(0, cy, 2, 0, cy, 22);
  g.addColorStop(0, 'rgba(255,255,255,0.9)');
  g.addColorStop(0.35, p.flash ? '#fff' : def.color);
  g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g;
  c.beginPath(); c.arc(0, cy, 22, 0, Math.PI * 2); c.fill();
  eyes(c, p.dir * 2, cy - 1, 3.5, 1.6, 2.4, shade(def.dark, 0.4));
  if (p.aggro) angryBrows(c, p.dir * 2, cy - 1, 0.7);
  return 46 - fl;
}

function drawRaptor(c: CanvasRenderingContext2D, def: EnemyDef, p: EnemyPose): number {
  const d = p.dir;
  const y = p.moving ? -Math.abs(Math.sin(p.time * 12)) * 3 : 0;
  const step = p.moving ? Math.sin(p.time * 14) * 4 : 0;
  shadow(c, 20, 6);
  const col = p.flash ? '#fff' : def.color;
  const dk = p.flash ? '#fff' : def.dark;
  c.strokeStyle = dk;
  c.lineWidth = 3.5;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(-3, y - 12); c.lineTo(-5 + step, -1);
  c.moveTo(4, y - 12); c.lineTo(5 - step, -1);
  c.stroke();
  poly(c, [[-d * 8, y - 22], [-d * 32, y - 26], [-d * 8, y - 13]], dk);
  c.fillStyle = col;
  c.beginPath(); c.ellipse(0, y - 18, 15, 9, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#efe7c0';
  c.beginPath(); c.ellipse(d * 3, y - 14, 9, 4.5, 0, 0, Math.PI * 2); c.fill();
  c.strokeStyle = dk;
  c.lineWidth = 2;
  for (let i = -1; i <= 1; i++) {
    c.beginPath(); c.moveTo(i * 5, y - 26); c.lineTo(i * 5 - d * 2, y - 21); c.stroke();
  }
  c.fillStyle = col;
  c.beginPath(); c.ellipse(d * 12, y - 26, 5, 8, d * 0.4, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.ellipse(d * 18, y - 33, 10, 6, 0, 0, Math.PI * 2); c.fill();
  poly(c, [[d * 18, y - 30], [d * 28, y - 30], [d * 18, y - 27]], '#fff');
  c.fillStyle = '#fff';
  c.beginPath(); c.arc(d * 19, y - 36, 2.6, 0, Math.PI * 2); c.fill();
  c.fillStyle = p.aggro ? '#dc2626' : '#1f2937';
  c.beginPath(); c.arc(d * 20, y - 36, 1.4, 0, Math.PI * 2); c.fill();
  return 42;
}

// ゴーレム(front#348): 体=明るい色、手足=暗い色。角ばった岩を積み上げた体に、光る目と胸のコア。
// 右向き(斜め前向き)で描き、左を向くときは左右を反転する。顔とコアは向いている側に寄り、反対側に頭・胴の側面が見える。
// 斜め前を向いているので、向いている側の腕が奥(胴の後ろ)、側面が見えている側の腕が手前(胴の前)になる。
// 歩くときは腕を前後に振り、攻撃のときは奥の腕を胴の後ろから向いている方へ突き出す
function drawGolem(c: CanvasRenderingContext2D, def: EnemyDef, p: EnemyPose): number {
  const t = p.time + (p.seed ?? 0);
  const lunge = p.lunge ?? 0;
  const walk = p.moving ? Math.sin(p.time * 6) : 0;
  const bob = -Math.abs(walk) * 2;
  const flash = !!p.flash;
  const col = flash ? '#ffffff' : def.color;
  const dk = flash ? '#ffffff' : def.dark;
  const lit = flash ? '#ffffff' : mix(def.color, '#ffffff', 0.35);
  const deep = flash ? '#ffffff' : shade(def.dark, 0.7);
  const glow = flash ? '#ffffff' : p.aggro ? '#ff5a1f' : '#ffd54a';
  const pulse = 0.75 + Math.sin(t * (p.aggro ? 8 : 3)) * 0.25;
  shadow(c, 26, 9, 0.22);
  c.save();
  c.scale(p.dir < 0 ? -1 : 1, 1);

  const outline = (pts: [number, number][]) => {
    c.beginPath();
    pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.closePath();
  };
  // 岩のかたまり: 前面を塗り、上面に光を当て、ふちを暗い色でなぞる
  const rock = (pts: [number, number][], top: [number, number][], fill: string, light: string) => {
    poly(c, pts, fill);
    poly(c, top, light);
    c.strokeStyle = deep;
    c.lineWidth = 1.2;
    c.lineJoin = 'round';
    outline(pts);
    c.stroke();
  };
  // 見えている側面を暗くする
  const side = (pts: [number, number][]) => {
    if (flash) return;
    c.save();
    c.globalAlpha *= 0.5;
    poly(c, pts, deep);
    c.restore();
  };

  // 足(腕と反対側の足を交互に上げる)
  for (const sd of [-1, 1]) {
    const lift = Math.max(0, -walk * sd) * 3;
    const x = sd * 10 + 1;
    rock([[x - 7, -lift], [x + 7, -lift], [x + 8, -12 - lift], [x - 8, -13 - lift]],
      [[x - 8, -13 - lift], [x + 8, -12 - lift], [x + 7, -9 - lift], [x - 7, -10 - lift]], dk, col);
  }

  // 攻撃のときは、上半身を少し前へ傾ける
  c.save();
  c.translate(lunge * 3, bob - 12);
  c.rotate(lunge * 0.12);
  c.translate(0, 12);

  // 腕。肩から垂らす。角度は負にするほど前(向いている側)へ振る
  const arm = (x: number, angle: number, front: boolean) => {
    c.save();
    c.translate(x, -38);
    c.rotate(angle);
    rock([[-6, -2], [6, -3], [7, 12], [-6, 13]], [[-6, -2], [6, -3], [6, 1], [-6, 2]], front ? dk : deep, front ? col : dk);
    // こぶし
    rock([[-8, 12], [8, 11], [9, 24], [3, 27], [-6, 26], [-9, 20]], [[-8, 12], [8, 11], [8, 15], [-8, 16]], front ? col : dk, front ? lit : col);
    c.strokeStyle = deep;
    c.lineWidth = 1;
    c.beginPath(); c.moveTo(-2, 16); c.lineTo(-2, 23); c.moveTo(3, 15.5); c.lineTo(3, 23); c.stroke();
    c.restore();
  };
  // 奥の腕(向いている側)は、胴の後ろに描く。攻撃のときは、向いている方へまっすぐ突き出す
  arm(18, -walk * 0.25 - lunge * 1.45, false);

  // 胴(上が明るく、下が暗い岩)
  const body: [number, number][] = [[-19, -10], [-22, -30], [-15, -45], [14, -46], [22, -31], [18, -10], [6, -7], [-8, -7]];
  if (flash) {
    c.fillStyle = '#ffffff';
  } else {
    const g = c.createLinearGradient(0, -46, 0, -7);
    g.addColorStop(0, lit);
    g.addColorStop(0.45, col);
    g.addColorStop(1, dk);
    c.fillStyle = g;
  }
  outline(body);
  c.fill();
  side([[-19, -10], [-22, -30], [-15, -45], [-9, -44], [-13, -30], [-11, -9], [-8, -7]]);
  outline(body);
  c.strokeStyle = deep;
  c.lineWidth = 1.4;
  c.lineJoin = 'round';
  c.stroke();
  // 肩の段差
  poly(c, [[-9, -44], [14, -46], [17, -40], [-12, -39]], lit);

  if (!flash) {
    // ひび
    c.strokeStyle = shade(def.dark, 0.8);
    c.lineWidth = 1;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(-6, -38); c.lineTo(-3, -32); c.lineTo(-6, -25);
    c.moveTo(15, -21); c.lineTo(11, -16); c.lineTo(13, -11);
    c.moveTo(2, -13); c.lineTo(5, -9);
    c.stroke();
    // 肩の苔
    c.fillStyle = 'rgba(101, 163, 13, 0.75)';
    c.beginPath(); c.ellipse(-11, -44, 5, 2.2, -0.1, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(15, -42, 3.5, 1.8, 0.2, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(132, 204, 22, 0.8)';
    c.beginPath(); c.ellipse(-9, -45, 2.5, 1.2, 0, 0, Math.PI * 2); c.fill();
  }

  // 胸のコア(ひし形のルーン。ゆっくり脈打ち、怒ると速くなる)
  const cx = 5;
  const cy = -27;
  c.save();
  c.shadowColor = glow;
  c.shadowBlur = flash ? 0 : 10 * pulse;
  poly(c, [[cx, cy - 6], [cx + 5, cy], [cx, cy + 6], [cx - 4, cy]], deep);
  c.globalAlpha *= flash ? 1 : 0.6 + pulse * 0.4;
  poly(c, [[cx, cy - 4], [cx + 3, cy], [cx, cy + 4], [cx - 2.5, cy]], glow);
  c.restore();

  // 頭(肩の間に少し埋まっている)。顔は向いている側に寄り、反対側に側面が見える
  rock([[-9, -44], [-11, -56], [-6, -61], [8, -61], [13, -55], [12, -44]],
    [[-11, -56], [-6, -61], [8, -61], [13, -55], [8, -56.5], [-5, -57]], col, lit);
  side([[-9, -44], [-11, -56], [-5, -57], [-3, -45]]);
  // 張り出したまゆの岩
  poly(c, [[-3, -54], [13, -54], [11, -50.5], [-2, -50.5]], dk);
  // 目(光る細いすき間。奥の目は細く見える。怒るとつり上がり、赤く強く光る)
  c.save();
  c.shadowColor = glow;
  c.shadowBlur = flash ? 0 : p.aggro ? 9 : 5;
  const tilt = p.aggro ? 1.5 : 0;
  // [目の中心, 半分の幅, 鼻側の向き]。鼻側の上を下げて、つり目にする
  const eyeList: [number, number, number][] = [[1.5, 2, 1], [8, 3, -1]];
  for (const [ex, w, inner] of eyeList) {
    poly(c, [[ex - inner * w, -50 - tilt * 0.3], [ex + inner * w, -50 + tilt], [ex + inner * (w - 0.5), -47.3], [ex - inner * (w - 0.5), -47.3]], glow);
  }
  c.restore();
  // 口のすき間
  c.strokeStyle = deep;
  c.lineWidth = 1.2;
  c.beginPath(); c.moveTo(1, -45.5); c.lineTo(10, -45.5); c.stroke();

  // 手前の腕(側面が見えている側)は、胴の前に描く。攻撃のときは少し後ろへ引く
  arm(-19, walk * 0.25 + lunge * 0.2, true);
  if (lunge > 0.2 && !flash) {
    // 殴った勢いの線(奥の腕のこぶしの先)
    c.strokeStyle = `rgba(255,255,255,${lunge * 0.8})`;
    c.lineWidth = 2;
    c.lineCap = 'round';
    c.beginPath();
    for (const dy of [-8, 0, 8]) { c.moveTo(49, -34 + dy); c.lineTo(55 + lunge * 6, -34 + dy); }
    c.stroke();
  }
  c.restore();
  c.restore();
  return 63;
}

function drawGhost(c: CanvasRenderingContext2D, def: EnemyDef, p: EnemyPose): number {
  const t = p.time;
  const fl = Math.sin(t * 2.5 + (p.seed ?? 0)) * 4;
  const y = -8 + fl;
  shadow(c, 12, 4, 0.12);
  c.globalAlpha = 0.88;
  const g = c.createLinearGradient(0, y - 40, 0, y);
  g.addColorStop(0, p.flash ? '#fff' : def.color);
  g.addColorStop(1, def.dark);
  c.fillStyle = g;
  c.beginPath();
  c.arc(0, y - 26, 14, Math.PI, 0);
  c.lineTo(14, y - 4);
  for (let i = 0; i < 4; i++) {
    const x0 = 14 - i * 7;
    const w = Math.sin(t * 6 + i) * 2;
    c.quadraticCurveTo(x0 - 3.5, y + 4 + w, x0 - 7, y - 4);
  }
  c.closePath();
  c.fill();
  c.globalAlpha = 1;
  eyes(c, p.dir * 2, y - 26, 5, 2.4, 3.6, '#1e1b4b');
  c.beginPath(); c.ellipse(p.dir * 2, y - 17, 2.5, 3, 0, 0, Math.PI * 2); c.fill();
  if (p.aggro) angryBrows(c, p.dir * 2, y - 26, 1);
  return 48 - fl;
}

// 騎士(二頭身)。体=明るい色、髪=暗い色。目はいつも光る。剣・羽飾り(魔導士は front#327 で drawLord に分けた)
function drawChibi(c: CanvasRenderingContext2D, def: EnemyDef, p: EnemyPose): number {
  const t = p.time;
  const d = p.dir;
  const bob = p.moving ? -Math.abs(Math.sin(t * 10)) * 3 : Math.sin(t * 2 + (p.seed ?? 0)) * 0.8;
  const y0 = bob;
  const f = d * 2.5;
  shadow(c, 13, 5);
  const step = p.moving ? Math.sin(t * 14) * 2.5 : 0;
  c.fillStyle = '#5b4636';
  c.beginPath(); c.ellipse(-4, -2 - Math.max(0, step), 3.5, 2.5, 0, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.ellipse(4, -2 - Math.max(0, -step), 3.5, 2.5, 0, 0, Math.PI * 2); c.fill();
  c.lineCap = 'round';
  const hx = d * 10;
  const hy = y0 - 12;
  c.strokeStyle = '#94a3b8';
  c.lineWidth = 3.5;
  c.beginPath(); c.moveTo(hx, hy); c.lineTo(hx + d * 9, hy - 16); c.stroke();
  c.strokeStyle = '#6b4a2b';
  c.lineWidth = 3;
  c.beginPath(); c.moveTo(hx - 3, hy + 1); c.lineTo(hx + 4 * d, hy - 1); c.stroke();
  c.fillStyle = p.flash ? '#ff9b9b' : def.color;
  c.beginPath(); c.roundRect(-9, y0 - 20, 18, 16, 6); c.fill();
  c.strokeStyle = 'rgba(0,0,0,0.15)';
  c.lineWidth = 1;
  c.stroke();
  c.fillStyle = '#1f2937';
  c.beginPath(); c.arc(0, y0 - 31, 12, 0, Math.PI * 2); c.fill(); c.stroke();
  c.fillStyle = def.dark;
  c.beginPath();
  c.arc(0, y0 - 32, 13, Math.PI, 0);
  c.lineTo(13, y0 - 29);
  c.quadraticCurveTo(f * 2, y0 - 36, -13, y0 - 29);
  c.closePath();
  c.fill();
  c.fillStyle = '#dc2626';
  c.beginPath(); c.ellipse(-d * 2, y0 - 48, 3.5, 8, -d * 0.3, 0, Math.PI * 2); c.fill();
  c.save();
  const eye = '#f87171';
  c.shadowColor = eye;
  c.shadowBlur = 8;
  eyes(c, f, y0 - 27, 4, 1.8, 2.6, eye);
  c.restore();
  if (p.lunge && p.lunge > 0) {
    c.strokeStyle = `rgba(255,255,255,${p.lunge})`;
    c.lineWidth = 3;
    c.beginPath(); c.arc(d * 14, y0 - 16, 15, -1.2, 1.2); c.stroke();
  }
  return 54;
}

// 闇の魔導士(front#327)。宙に浮くローブ姿。明るい色=マントの裏地・ローブの模様・宝珠・オーラ、暗い色=ローブ・マント・フード。
// 角・冠・肩当ての縁(金)は色を変えない。まわりを闇の玉が3つ回る。襲ってくると目・オーラ・宝珠が強く光り、詠唱(cast)中は杖を掲げる。
// plain: 影の分身(front#329)の地味な姿。冠・角・杖・闇の玉・とげの肩当てを外し、金の部分は紫にして、両腕の袖を下げる
function drawLord(c: CanvasRenderingContext2D, def: EnemyDef, p: EnemyPose, plain = false): number {
  const t = p.time + (p.seed ?? 0);
  const d = p.dir;
  const cast = p.cast ?? 0;
  const power = p.aggro ? 1 : 0.55;
  const hz = 9 + Math.sin(t * 2) * 3;
  const gold = plain ? '#6d28d9' : '#d4a72c';
  const white = (color: string) => (p.flash ? '#ffffff' : color);
  const rgba = (hex: string, a: number) => {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
  };
  // 足元の闇のオーラ
  const ag = c.createRadialGradient(0, 0, 3, 0, 0, 34);
  ag.addColorStop(0, rgba(def.color, 0.55 * power + 0.25 * cast));
  ag.addColorStop(0.5, 'rgba(20,8,40,0.45)');
  ag.addColorStop(1, 'rgba(20,8,40,0)');
  c.fillStyle = ag;
  c.beginPath(); c.ellipse(0, 0, 34, 14, 0, 0, Math.PI * 2); c.fill();
  shadow(c, 14, 5, 0.25);
  // まわりを回る闇の玉。うしろ半分は体より先に描く
  const orbs = [0, 1, 2].map((i) => {
    const a = t * 1.6 + (i * Math.PI * 2) / 3;
    return { x: Math.cos(a) * 26, y: -40 - hz + Math.sin(a) * 9 + Math.sin(t * 3 + i) * 3, front: Math.sin(a) > 0 };
  });
  const orb = (o: { x: number; y: number }) => {
    const g = c.createRadialGradient(o.x - 1, o.y - 1, 0.5, o.x, o.y, 6);
    g.addColorStop(0, rgba(def.color, 0.95));
    g.addColorStop(0.45, 'rgba(30,10,60,0.95)');
    g.addColorStop(1, 'rgba(30,10,60,0)');
    c.fillStyle = g;
    c.beginPath(); c.arc(o.x, o.y, 6, 0, Math.PI * 2); c.fill();
  };
  if (!plain) orbs.filter((o) => !o.front).forEach(orb);

  c.save();
  c.translate(0, -hz);
  // マント(うしろ)。すそが波打つ。裏地は明るい色
  const capeEdge = (w: number, y: number): [number, number][] =>
    Array.from({ length: 7 }, (_, i) => [-w + (i / 6) * w * 2, y + (i % 2 ? 4 : 0) + Math.sin(t * 3 + i * 1.3) * 2.5] as [number, number]);
  poly(c, [[-13, -46], [13, -46], ...capeEdge(23, 0).reverse().map(([x, y]) => [x + 1.5, y + 1] as [number, number])], white(mix(def.color, def.dark, 0.35)));
  poly(c, [[-12, -46], [12, -46], ...capeEdge(21, -2).reverse()], white(mix(def.dark, '#000000', 0.25)));
  // ローブ。すそは裂けていて、ゆらめく
  const hem = Array.from({ length: 9 }, (_, i) => [-15 + (i / 8) * 30, -4 + (i % 2 ? -5 : 0) + Math.sin(t * 4 + i) * 1.5] as [number, number]);
  const rg = c.createLinearGradient(0, -48, 0, -4);
  rg.addColorStop(0, mix(def.dark, def.color, 0.25));
  rg.addColorStop(1, mix(def.dark, '#000000', 0.15));
  c.fillStyle = p.flash ? '#ffffff' : rg;
  c.beginPath();
  c.moveTo(-10, -46); c.lineTo(10, -46);
  for (const [x, y] of hem.slice().reverse()) c.lineTo(x, y);
  c.closePath(); c.fill();
  // 前の合わせ目の模様(明るい色の線と、ひし形のルーン)
  c.strokeStyle = rgba(def.color, 0.9);
  c.lineWidth = 1.6;
  c.beginPath(); c.moveTo(d * 1.5, -44); c.lineTo(d * 2.5, -8); c.stroke();
  c.save();
  c.shadowColor = def.color;
  c.shadowBlur = 6 * power;
  for (const y of [-34, -24, -14]) poly(c, [[d * 2, y - 3], [d * 2 + 2.2, y], [d * 2, y + 3], [d * 2 - 2.2, y]], rgba(def.color, 0.95));
  c.restore();
  // 帯(金)
  c.fillStyle = gold;
  c.fillRect(-10.5, -31, 21, 3);
  c.fillStyle = plain ? '#4c1d95' : '#8a6514';
  c.fillRect(-10.5, -28.5, 21, 0.8);
  // 杖。詠唱中は高く掲げる。先は三日月の形で、闇の宝珠が脈打つ
  const raise = cast * 10;
  const [sx0, sy0, sx1, sy1] = [d * 15, -6 - raise, d * 17, -80 - raise];
  c.lineCap = 'round';
  if (plain) {
    // 影の分身: 両腕の袖をだらりと下げる(杖は持たない)
    for (const sd of [-1, 1]) poly(c, [[sd * 7, -44], [sd * 13, -24], [sd * 10, -20], [sd * 6, -30]], white(mix(def.dark, def.color, 0.15)));
  } else {
  c.strokeStyle = '#1c1022';
  c.lineWidth = 3.4;
  c.beginPath(); c.moveTo(sx0, sy0); c.lineTo(sx1, sy1); c.stroke();
  c.strokeStyle = '#4b2a5a';
  c.lineWidth = 1.2;
  c.beginPath(); c.moveTo(sx0 - 0.8, sy0); c.lineTo(sx1 - 0.8, sy1); c.stroke();
  c.strokeStyle = gold;
  c.lineWidth = 2.6;
  c.beginPath(); c.arc(sx1, sy1 - 7, 8, Math.PI * 0.15, Math.PI * 0.85, true); c.stroke();
  const or = 4.5 + cast * 2;
  c.save();
  c.shadowColor = def.color;
  c.shadowBlur = 10 + 10 * power + 18 * cast;
  const og = c.createRadialGradient(sx1 - 1, sy1 - 9, 0.5, sx1, sy1 - 8, or);
  og.addColorStop(0, '#ffffff');
  og.addColorStop(0.35, def.color);
  og.addColorStop(1, '#2e1065');
  c.fillStyle = og;
  c.beginPath(); c.arc(sx1, sy1 - 8, or + (0.5 + Math.sin(t * 5) * 0.5) * 0.6, 0, Math.PI * 2); c.fill();
  c.restore();
  // 詠唱中は、宝珠から光の粒が立ちのぼる
  for (let i = 0; cast > 0 && i < 8; i++) {
    const life = (t * 1.5 + i / 8) % 1;
    c.fillStyle = rgba(def.color, cast * (1 - life));
    c.beginPath(); c.arc(sx1 + Math.sin(i * 2.1 + t * 3) * 8 * life, sy1 - 10 - life * 26, 1.8 * (1 - life) + 0.6, 0, Math.PI * 2); c.fill();
  }
  // 袖(杖を持つ手の側)と手
  poly(c, [[d * 6, -44], [d * 17, sy0 - 34 + raise * 0.4], [d * 18, sy0 - 22 + raise * 0.3], [d * 9, -30]], white(mix(def.dark, def.color, 0.15)));
  c.fillStyle = '#e5d6ff';
  c.beginPath(); c.arc(d * 16.5, -35 - raise * 0.6, 2.4, 0, Math.PI * 2); c.fill();
  }
  // 肩当て(とげ・金の縁)
  for (const sd of plain ? [] : [-1, 1]) {
    const bx = sd * 11;
    poly(c, [[bx - 6, -44], [bx + sd * 2, -52], [bx + sd * 6, -49], [bx + sd * 10, -55], [bx + sd * 9, -45], [bx + sd * 12, -46], [bx + sd * 7, -40], [bx - 5, -40]], white('#1a1324'));
    c.strokeStyle = gold;
    c.lineWidth = 1;
    c.beginPath(); c.moveTo(bx - 5, -40); c.lineTo(bx + sd * 7, -40); c.stroke();
  }
  // フード。奥は影で、赤く光る目だけが見える
  c.fillStyle = white(mix(def.dark, '#000000', 0.1));
  c.beginPath(); c.moveTo(-11, -44); c.quadraticCurveTo(-13, -62, 0, -66); c.quadraticCurveTo(13, -62, 11, -44); c.closePath(); c.fill();
  c.fillStyle = '#05020a';
  c.beginPath(); c.ellipse(d * 1.5, -52, 7, 7.5, 0, 0, Math.PI * 2); c.fill();
  c.save();
  c.shadowColor = '#ff2a4f';
  c.shadowBlur = 6 + 8 * power;
  const eye = p.aggro ? '#ff4766' : '#e11d48';
  for (const sd of [-1, 1]) poly(c, [[d * 1.5 + sd * 1.2, -53], [d * 1.5 + sd * 5, -54.5 - (p.aggro ? 1 : 0)], [d * 1.5 + sd * 4.2, -51.8]], eye);
  c.restore();
  // 角
  for (const sd of plain ? [] : [-1, 1]) {
    const hg = c.createLinearGradient(sd * 6, -60, sd * 15, -80);
    hg.addColorStop(0, '#d6d3d1');
    hg.addColorStop(1, '#3f3a36');
    c.fillStyle = p.flash ? '#ffffff' : hg;
    c.beginPath(); c.moveTo(sd * 5, -60); c.quadraticCurveTo(sd * 14, -64, sd * 15, -80); c.quadraticCurveTo(sd * 10, -68, sd * 8.5, -58); c.closePath(); c.fill();
  }
  // 冠(金の輪と、明るい色の宝石)
  if (!plain) {
    poly(c, [[-9, -60], [-6, -64], [-3, -61], [0, -67], [3, -61], [6, -64], [9, -60], [8, -58], [-8, -58]], gold);
    c.save();
    c.shadowColor = def.color;
    c.shadowBlur = 8;
    c.fillStyle = mix(def.color, '#ffffff', 0.25);
    c.beginPath(); c.arc(0, -61.5, 1.8, 0, Math.PI * 2); c.fill();
    c.restore();
  }
  c.restore();
  if (!plain) orbs.filter((o) => o.front).forEach(orb);
  return (plain ? 66 : 86) + hz;
}

// コウモリ(front#255): 宙に浮いて羽ばたく。体=明るい色、羽=暗い色。襲ってくると羽ばたきが速くなる
function drawBat(c: CanvasRenderingContext2D, def: EnemyDef, p: EnemyPose): number {
  const t = p.time;
  const fl = Math.sin(t * 4 + (p.seed ?? 0)) * 3;
  const cy = -30 + fl;
  const flap = Math.sin(t * (p.moving || p.aggro ? 22 : 14));
  shadow(c, 10, 3.5, 0.14);
  const body = p.flash ? '#fff' : def.color;
  c.fillStyle = p.flash ? '#fff' : def.dark;
  for (const s of [-1, 1]) {
    c.beginPath();
    c.moveTo(s * 5, cy - 3);
    c.lineTo(s * 26, cy - 10 - flap * 9);
    c.quadraticCurveTo(s * 22, cy + 2 - flap * 3, s * 18, cy + 2 - flap * 2);
    c.quadraticCurveTo(s * 15, cy - 1, s * 12, cy + 4 - flap);
    c.quadraticCurveTo(s * 9, cy + 1, s * 5, cy + 4);
    c.closePath();
    c.fill();
  }
  c.fillStyle = body;
  c.beginPath(); c.ellipse(0, cy, 9, 10, 0, 0, Math.PI * 2); c.fill();
  poly(c, [[-7, cy - 6], [-4, cy - 16], [-2, cy - 8]], body);
  poly(c, [[7, cy - 6], [4, cy - 16], [2, cy - 8]], body);
  const f = p.dir * 2;
  eyes(c, f, cy - 2, 3.5, 1.8, 2.2, p.aggro ? '#dc2626' : '#fde047');
  poly(c, [[f - 3, cy + 4], [f - 1.5, cy + 7], [f, cy + 4]], '#fff');
  poly(c, [[f + 3, cy + 4], [f + 1.5, cy + 7], [f, cy + 4]], '#fff');
  if (p.aggro) angryBrows(c, f, cy - 2, 0.7);
  return 46 - fl;
}

// ガイコツ(front#255): 骨の剣を持った二頭身。骨=明るい色、ぼろ布・目の光=暗い色。歩くとカタカタ揺れる
function drawSkeleton(c: CanvasRenderingContext2D, def: EnemyDef, p: EnemyPose): number {
  const t = p.time;
  const d = p.dir;
  const rattle = p.moving ? Math.sin(t * 30) * 0.8 : 0;
  const y0 = p.moving ? -Math.abs(Math.sin(t * 10)) * 3 : Math.sin(t * 2 + (p.seed ?? 0)) * 0.8;
  const bone = p.flash ? '#fff' : def.color;
  const step = p.moving ? Math.sin(t * 14) * 3 : 0;
  shadow(c, 12, 4.5);
  c.strokeStyle = bone;
  c.lineCap = 'round';
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(-3, y0 - 8); c.lineTo(-4 + step, -1);
  c.moveTo(3, y0 - 8); c.lineTo(4 - step, -1);
  c.stroke();
  // 骨盤・背骨・あばら
  c.fillStyle = bone;
  c.beginPath(); c.roundRect(-6, y0 - 11, 12, 4, 2); c.fill();
  c.lineWidth = 2.5;
  c.beginPath(); c.moveTo(0, y0 - 10); c.lineTo(0, y0 - 24); c.stroke();
  c.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    const yy = y0 - 14 - i * 3.5;
    const w = 7 - i * 0.5;
    c.beginPath(); c.moveTo(-w, yy + 1); c.quadraticCurveTo(0, yy - 2, w, yy + 1); c.stroke();
  }
  // ぼろ布のマント
  c.globalAlpha = 0.85;
  poly(c, [[-8, y0 - 25], [8, y0 - 25], [10, y0 - 14], [6, y0 - 17], [3, y0 - 13], [0, y0 - 17], [-3, y0 - 13], [-6, y0 - 17], [-10, y0 - 14]], p.flash ? '#fff' : def.dark);
  c.globalAlpha = 1;
  // 腕と骨の剣。攻撃したときは剣を振る
  c.strokeStyle = bone;
  c.lineWidth = 2.5;
  c.beginPath(); c.moveTo(-d * 7, y0 - 22); c.lineTo(-d * 10, y0 - 12); c.stroke();
  c.save();
  c.translate(d * 7, y0 - 22);
  c.rotate(-d * (p.lunge ?? 0) * 1.2);
  c.beginPath(); c.moveTo(0, 0); c.lineTo(d * 4, 9); c.stroke();
  c.strokeStyle = '#cbd5e1';
  c.lineWidth = 3;
  c.beginPath(); c.moveTo(d * 4, 9); c.lineTo(d * 12, -8); c.stroke();
  c.strokeStyle = '#78716c';
  c.lineWidth = 2.5;
  c.beginPath(); c.moveTo(d, 8); c.lineTo(d * 7, 10); c.stroke();
  c.restore();
  // 頭の骨
  const hy = y0 - 35 + rattle;
  c.fillStyle = bone;
  c.beginPath(); c.arc(0, hy, 11, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.roundRect(-6 + d * 1.5, hy + 5, 12, 7, 3); c.fill();
  c.strokeStyle = 'rgba(0,0,0,0.18)';
  c.lineWidth = 1;
  c.beginPath(); c.arc(0, hy, 11, 0, Math.PI * 2); c.stroke();
  const f = d * 2.5;
  eyes(c, f, hy + 1, 4.2, 3, 3.4);
  c.save();
  const glow = p.aggro ? '#ef4444' : mix(def.dark, '#ffffff', 0.35);
  c.shadowColor = glow;
  c.shadowBlur = 8;
  eyes(c, f, hy + 1, 4.2, 1.2, 1.4, glow);
  c.restore();
  c.strokeStyle = 'rgba(0,0,0,0.4)';
  for (let i = -1; i <= 1; i++) {
    c.beginPath(); c.moveTo(f + i * 3, hy + 8); c.lineTo(f + i * 3, hy + 12); c.stroke();
  }
  return 48;
}

// ひとくいそう(front#255): 地面に根を張った植物で、その場から動かない。頭=明るい色、葉・茎=暗い色。口をパクパクさせる
function drawPlant(c: CanvasRenderingContext2D, def: EnemyDef, p: EnemyPose): number {
  const t = p.time;
  const d = p.dir;
  const lunge = p.lunge ?? 0;
  const sway = Math.sin(t * 2 + (p.seed ?? 0)) * 3 + d * lunge * 10;
  const open = lunge
    ? 0.9 * lunge + 0.1
    : p.aggro ? 0.45 + Math.abs(Math.sin(t * 9)) * 0.45 : 0.2 + Math.abs(Math.sin(t * 2.5)) * 0.25;
  const leaf = p.flash ? '#fff' : def.dark;
  shadow(c, 16, 5);
  c.fillStyle = leaf;
  for (const s of [-1, 1]) {
    c.beginPath();
    c.moveTo(0, -2);
    c.quadraticCurveTo(s * 14, -14, s * 20, -4);
    c.quadraticCurveTo(s * 12, 0, 0, -2);
    c.fill();
  }
  c.strokeStyle = leaf;
  c.lineWidth = 4;
  c.lineCap = 'round';
  const hx = sway + d * 3;
  const hy = -30;
  c.beginPath(); c.moveTo(0, -2); c.quadraticCurveTo(-d * 6, -16, hx, hy); c.stroke();
  // 頭(上あご・下あご)。向きに合わせて左右を反転する
  const a = open * 0.8;
  c.save();
  c.translate(hx, hy);
  c.scale(d, 1);
  for (const [s, rot] of [[-1, -a], [1, a * 0.6]]) {
    c.save();
    c.rotate(rot);
    c.fillStyle = p.flash ? '#fff' : def.color;
    c.beginPath(); c.moveTo(-6, 0); c.quadraticCurveTo(4, s * 16, 18, s); c.lineTo(-6, 0); c.fill();
    for (let i = 0; i < 4; i++) poly(c, [[-2 + i * 5, s * 0.5], [0.5 + i * 5, -s * 3.5], [3 + i * 5, s * 0.5]], '#fff');
    if (s < 0) {
      c.fillStyle = 'rgba(255,255,255,0.75)';
      for (const [dx, dy, r] of [[2, -8, 2.2], [9, -6, 1.6], [-2, -4, 1.4]]) {
        c.beginPath(); c.arc(dx, dy, r, 0, Math.PI * 2); c.fill();
      }
    }
    c.restore();
  }
  if (open > 0.25) {
    c.globalAlpha = Math.min(1, open);
    poly(c, [[-4, 0], [15, -open * 10], [15, open * 5]], '#7f1d1d');
    c.globalAlpha = 1;
  }
  c.rotate(-a);
  c.fillStyle = '#fff';
  c.beginPath(); c.arc(2, -11, 3.6, 0, Math.PI * 2); c.fill();
  c.fillStyle = p.aggro ? '#dc2626' : '#1f2937';
  c.beginPath(); c.arc(3, -11, 1.8, 0, Math.PI * 2); c.fill();
  if (p.aggro) {
    c.strokeStyle = '#1f2937';
    c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(-2, -16); c.lineTo(5, -14); c.stroke();
  }
  c.restore();
  return 50;
}

// ミミック(front#270): 宝箱にばけた敵。箱=明るい色、口の中=暗い色。
// 近づかれる前(aggro でない)は本物の宝箱と同じ絵で、ときどき少しだけカタッと揺れる。
// 近づかれると横向きになり、ふたをパクパクさせて跳ねながら追ってくる(口の中に光る目・舌・歯)
function drawMimic(c: CanvasRenderingContext2D, def: EnemyDef, p: EnemyPose): number {
  const t = p.time;
  if (!p.aggro) {
    const twitch = (t + (p.seed ?? 0)) % 4 < 0.15 ? Math.sin(t * 80) * 1.2 : 0;
    drawChest(c, twitch, 0, 0, p.flash ? '#ffffff' : def.color);
    return 28;
  }
  c.save();
  // 右を向いた形で描き、左を向くときは左右を反転する
  c.scale(p.dir, 1);
  const y = p.moving ? -Math.abs(Math.sin(t * 10)) * 6 : 0;
  shadow(c, 14, 5.5);
  const lunge = p.lunge ?? 0;
  const open = lunge ? 0.4 + lunge * 0.6 : 0.3 + Math.abs(Math.sin(t * 8)) * 0.45;
  const col = p.flash ? '#fff' : def.color;
  // ふたは後ろの端(hx, hy)を軸に開く
  const hx = -15;
  const hy = y - 15;
  const lidEnd: [number, number] = [hx + 30 * Math.cos(open), hy - 30 * Math.sin(open)];
  // 口の中・舌・光る目
  poly(c, [[hx, hy], [15, hy], lidEnd], p.flash ? '#fff' : def.dark);
  c.fillStyle = '#e11d48';
  c.beginPath();
  c.moveTo(-4, hy);
  c.quadraticCurveTo(12, hy - 4 - open * 6, 18 + open * 6, hy + 2 + Math.sin(t * 6) * 2);
  c.quadraticCurveTo(14, hy + 4, 4, hy);
  c.fill();
  if (open > 0.2) {
    const ex = (hx + 15 + lidEnd[0]) / 3;
    const ey = (hy * 2 + lidEnd[1]) / 3;
    c.save();
    c.shadowColor = '#fde047';
    c.shadowBlur = 8;
    c.fillStyle = '#fde047';
    c.beginPath(); c.ellipse(ex - 3.5, ey, 2.6, 2, 0, 0, Math.PI * 2); c.ellipse(ex + 3.5, ey - 1, 2.6, 2, 0, 0, Math.PI * 2); c.fill();
    c.restore();
    c.fillStyle = '#1f2937';
    c.beginPath(); c.ellipse(ex - 3, ey, 0.9, 1.6, 0, 0, Math.PI * 2); c.ellipse(ex + 4, ey - 1, 0.9, 1.6, 0, 0, Math.PI * 2); c.fill();
  }
  for (let i = 0; i < 5; i++) poly(c, [[-8 + i * 5, hy], [-5.5 + i * 5, hy - 3.5], [-3 + i * 5, hy]], '#fff');
  // 箱
  c.fillStyle = col;
  c.beginPath(); c.roundRect(-15, y - 15, 30, 15, 2); c.fill();
  c.strokeStyle = 'rgba(60,30,10,0.35)';
  c.lineWidth = 1;
  c.beginPath(); c.moveTo(-15, y - 7.5); c.lineTo(15, y - 7.5); c.stroke();
  c.fillStyle = '#f2c14e';
  c.fillRect(-12, y - 15, 2.5, 15);
  c.fillRect(9.5, y - 15, 2.5, 15);
  // ふた(内側の歯と、ふたにくっついて上がった錠前)
  c.save();
  c.translate(hx, hy);
  c.rotate(-open);
  c.fillStyle = col;
  c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(0, -12, 30, -12, 30, 0); c.closePath(); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.18)';
  c.beginPath(); c.ellipse(11, -6.5, 7, 2, 0, 0, Math.PI * 2); c.fill();
  c.strokeStyle = '#f2c14e';
  c.lineWidth = 2.5;
  for (const x of [5, 25]) {
    c.beginPath(); c.moveTo(x, 0); c.lineTo(x, -8.4); c.stroke();
  }
  for (let i = 0; i < 5; i++) poly(c, [[7 + i * 5, 0], [9.5 + i * 5, 3.5], [12 + i * 5, 0]], '#fff');
  c.fillStyle = '#f2c14e';
  c.beginPath(); c.roundRect(12, -2, 6, 6, 1.5); c.fill();
  c.restore();
  c.restore();
  return 32 - y;
}

// リビングアーマー(front#270): 中身のない鎧。鎧=明るい色、羽飾り・マント=暗い色。
// 近づかれる前(aggro でない)は甲冑の置物と同じ絵(台座の上で槍を持って立つ)。
// 近づかれると台座を降り、兜のすき間が赤く光り、剣と盾を構えて歩いてくる。首のすき間から紫のもやが漏れる
function drawLivingArmor(c: CanvasRenderingContext2D, def: EnemyDef, p: EnemyPose): number {
  const t = p.time;
  const d = p.dir;
  if (!p.aggro) {
    drawArmor(c, 0, 0, 0, t, p.flash ? '#ffffff' : def.color, p.flash ? '#ffffff' : def.dark);
    return 56;
  }
  const y0 = p.moving ? -Math.abs(Math.sin(t * 9)) * 2.5 : 0;
  const step = p.moving ? Math.sin(t * 12) * 3 : 0;
  const plate = p.flash ? '#fff' : def.color;
  const hi = p.flash ? '#fff' : shade(def.color, 1.25);
  const lo = p.flash ? '#fff' : shade(def.color, 0.72);
  const deep = p.flash ? '#fff' : shade(def.color, 0.55);
  const plume = p.flash ? '#fff' : def.dark;
  const cape = p.flash ? '#fff' : shade(def.dark, 0.7);
  shadow(c, 14, 5, 0.22);
  // マント(後ろ)
  poly(c, [[-d * 2, y0 - 38], [-d * 12, y0 - 34], [-d * 15, y0 - 8 + Math.sin(t * 3) * 1.5], [-d * 3, y0 - 12]], cape);
  // 足
  c.fillStyle = lo;
  c.beginPath(); c.roundRect(-7, y0 - 16 - Math.max(0, step), 6, 16 + Math.max(0, step) - y0, 2); c.fill();
  c.fillStyle = plate;
  c.beginPath(); c.roundRect(1, y0 - 16 - Math.max(0, -step), 6, 16 + Math.max(0, -step) - y0, 2); c.fill();
  // 後ろの手の盾
  c.fillStyle = deep;
  c.beginPath(); c.ellipse(-d * 12, y0 - 26, 8, 11, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = cape;
  c.beginPath(); c.ellipse(-d * 12, y0 - 26, 5.5, 8, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#f2c14e';
  c.beginPath(); c.arc(-d * 12, y0 - 26, 2, 0, Math.PI * 2); c.fill();
  // 腰・胴・肩
  poly(c, [[-9, y0 - 20], [10, y0 - 20], [8, y0 - 13], [-8, y0 - 13]], lo);
  c.fillStyle = plate;
  c.beginPath(); c.roundRect(-10, y0 - 38, 20, 19, 6); c.fill();
  c.fillStyle = hi;
  c.beginPath(); c.roundRect(-4 + d * 3, y0 - 37, 10, 16, 5); c.fill();
  c.fillStyle = lo;
  c.beginPath(); c.ellipse(-d * 10, y0 - 35, 5.5, 4.5, -d * 0.3, 0, Math.PI * 2); c.fill();
  c.fillStyle = hi;
  c.beginPath(); c.ellipse(d * 11, y0 - 35, 5.5, 4.5, d * 0.3, 0, Math.PI * 2); c.fill();
  // 前の手の剣。攻撃のとき振り下ろす
  c.save();
  c.translate(d * 12, y0 - 24);
  c.rotate(d * (0.9 - (p.lunge ?? 0) * 1.8));
  c.strokeStyle = '#e2e8f0';
  c.lineWidth = 3.2;
  c.beginPath(); c.moveTo(0, -3); c.lineTo(0, -26); c.stroke();
  c.strokeStyle = '#f2c14e';
  c.lineWidth = 2.4;
  c.beginPath(); c.moveTo(-5, -3); c.lineTo(5, -3); c.stroke();
  c.strokeStyle = '#5b3a1f';
  c.beginPath(); c.moveTo(0, -2); c.lineTo(0, 4); c.stroke();
  c.restore();
  c.fillStyle = plate;
  c.beginPath(); c.roundRect(d * 10 - 2.5, y0 - 33, 5, 12, 2); c.fill();
  c.fillStyle = deep;
  c.beginPath(); c.arc(d * 12, y0 - 21, 3, 0, Math.PI * 2); c.fill();
  // 首のすき間のもや
  c.fillStyle = `rgba(167,139,250,${0.45 + Math.sin(t * 4) * 0.15})`;
  c.beginPath(); c.ellipse(0, y0 - 39 - Math.abs(Math.sin(t * 2)) * 2, 6, 2.5, 0, 0, Math.PI * 2); c.fill();
  // 兜(すき間の目が赤く光る)
  c.fillStyle = plate;
  c.beginPath(); c.arc(0, y0 - 47, 9.5, 0, Math.PI * 2); c.fill();
  c.fillStyle = hi;
  c.beginPath(); c.arc(d * 2, y0 - 48, 7.5, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#0f172a';
  c.fillRect(d * 3 - 4.5, y0 - 49, 9, 2.4);
  c.fillRect(d * 3 - 0.75, y0 - 49, 1.5, 6);
  c.save();
  c.shadowColor = '#ef4444';
  c.shadowBlur = 8;
  c.fillStyle = '#f87171';
  c.fillRect(d * 3 - 3.5, y0 - 48.6, 2.5, 1.6);
  c.fillRect(d * 3 + 1, y0 - 48.6, 2.5, 1.6);
  c.restore();
  // 羽飾り
  c.fillStyle = plume;
  c.beginPath();
  c.moveTo(0, y0 - 56);
  c.quadraticCurveTo(-d * 7, y0 - 67 + Math.sin(t * 2) * 1.5, -d * 14, y0 - 56);
  c.quadraticCurveTo(-d * 7, y0 - 60, 0, y0 - 54);
  c.fill();
  if (p.lunge && p.lunge > 0) {
    c.strokeStyle = `rgba(255,255,255,${p.lunge})`;
    c.lineWidth = 3;
    c.beginPath(); c.arc(d * 14, y0 - 22, 17, -1.3, 1.1); c.stroke();
  }
  return 60;
}

// つのウサギ(front#284): 体=明るい色、耳の内側=暗い色。歩くとぴょんぴょん跳ね、額に金色のつの
function drawRabbit(c: CanvasRenderingContext2D, def: EnemyDef, p: EnemyPose): number {
  const t = p.time;
  const d = p.dir;
  const hop = p.moving ? Math.abs(Math.sin(t * 9)) * 9 : Math.abs(Math.sin(t * 2)) * 1.2;
  const crouch = p.lunge ? -p.lunge * 3 : 0;
  shadow(c, 13 - hop * 0.4, 5);
  c.save();
  c.translate(0, -hop);
  const body = p.flash ? '#fff' : def.color;
  c.fillStyle = '#fff';
  c.beginPath(); c.arc(-d * 13, -10 + crouch, 4.5, 0, Math.PI * 2); c.fill();
  c.fillStyle = body;
  c.beginPath(); c.ellipse(0, -11 + crouch, 14, 11, 0, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.ellipse(d * 7, -1, 6, 3, 0, 0, Math.PI * 2); c.ellipse(-d * 6, -1, 6, 3, 0, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.ellipse(d * 9, -22 + crouch, 10, 9, 0, 0, Math.PI * 2); c.fill();
  // 耳(動くとゆれる)
  const ear = Math.sin(t * (p.moving ? 9 : 2)) * 0.15;
  for (const [ox, a] of [[-3, -0.25 + ear], [3, 0.05 + ear]]) {
    c.save();
    c.translate(d * (9 + ox), -29 + crouch);
    c.rotate(-d * a);
    c.fillStyle = body;
    c.beginPath(); c.ellipse(0, -9, 3.6, 10, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = p.flash ? '#fff' : def.dark;
    c.beginPath(); c.ellipse(0, -9, 1.7, 7, 0, 0, Math.PI * 2); c.fill();
    c.restore();
  }
  // つの(額から前へ、らせんの筋)
  c.save();
  c.translate(d * 15, -27 + crouch);
  c.rotate(d * 0.5);
  poly(c, [[-2.4, 0], [2.4, 0], [0, -11]], '#fde68a');
  c.strokeStyle = '#d97706';
  c.lineWidth = 0.9;
  for (let i = 1; i < 4; i++) {
    c.beginPath(); c.moveTo(-2.4 + i * 0.5, -i * 2.6); c.lineTo(2.4 - i * 0.5, -i * 2.6 + 1); c.stroke();
  }
  c.restore();
  c.fillStyle = p.aggro ? '#dc2626' : '#1f2937';
  c.beginPath(); c.ellipse(d * 12, -23 + crouch, 2, 2.6, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#f9a8d4';
  c.beginPath(); c.arc(d * 18.5, -20 + crouch, 1.5, 0, Math.PI * 2); c.fill();
  c.restore();
  return 44 + hop;
}

// ドブネズミ(front#321): 体・頭=明るい色、耳・背中の影=暗い色。丸い背中・とがった鼻・大きな耳・長いしっぽ。
// 歩くと体が上下して、しっぽがゆれる。かみつくときは前に飛び出す
function drawRat(c: CanvasRenderingContext2D, def: EnemyDef, p: EnemyPose): number {
  const t = p.time + (p.seed ?? 0);
  const d = p.dir;
  const bob = p.moving ? Math.abs(Math.sin(t * 12)) * 1.6 : Math.abs(Math.sin(t * 2)) * 0.5;
  const lunge = (p.lunge ?? 0) * 7;
  const body = p.flash ? '#fff' : def.color;
  const dark = p.flash ? '#fff' : def.dark;
  shadow(c, 15, 5);
  c.save();
  c.translate(d * lunge, 0);
  // しっぽ(体のうしろから、波打ちながら伸びる)
  c.strokeStyle = p.flash ? '#fff' : '#d6a5a0';
  c.lineWidth = 2;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(-d * 11, -5);
  for (let i = 1; i <= 10; i++) c.lineTo(-d * (11 + i * 1.8), -5 + Math.sin(t * (p.moving ? 10 : 4) + i * 0.7) * 2.6 + i * 0.6);
  c.stroke();
  // 足
  c.fillStyle = '#e8b4b0';
  for (const [x, ph] of [[-6, 0], [6, Math.PI]]) {
    c.beginPath(); c.ellipse(d * x + (p.moving ? Math.sin(t * 12 + ph) * 1.6 : 0), 0, 2.6, 1.4, 0, 0, Math.PI * 2); c.fill();
  }
  // 体
  const g = c.createRadialGradient(-d * 2, -13 - bob, 2, 0, -8 - bob, 16);
  g.addColorStop(0, body);
  g.addColorStop(1, dark);
  c.fillStyle = g;
  c.beginPath(); c.ellipse(-d * 1, -8 - bob, 13, 8.5, 0, 0, Math.PI * 2); c.fill();
  // 頭(とがった鼻先へ)
  c.fillStyle = body;
  c.beginPath();
  c.moveTo(d * 5, -14 - bob);
  c.quadraticCurveTo(d * 17, -10 - bob, d * 20, -5 - bob);
  c.quadraticCurveTo(d * 12, -1 - bob, d * 4, -3 - bob);
  c.closePath();
  c.fill();
  // 耳
  for (const x of [5, 9]) {
    c.fillStyle = dark;
    c.beginPath(); c.ellipse(d * x, -15 - bob, 4, 4.5, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = p.flash ? '#fff' : '#e8a3a0';
    c.beginPath(); c.ellipse(d * (x + 0.3), -14.6 - bob, 2.3, 2.8, 0, 0, Math.PI * 2); c.fill();
  }
  // 鼻・目(襲ってくるときは赤く光る)・ひげ
  c.fillStyle = '#f2a0a8';
  c.beginPath(); c.arc(d * 20, -5 - bob, 1.6, 0, Math.PI * 2); c.fill();
  c.fillStyle = p.aggro ? '#ef4444' : '#1f2937';
  c.beginPath(); c.arc(d * 12.5, -9 - bob, 1.6, 0, Math.PI * 2); c.fill();
  c.strokeStyle = 'rgba(255,255,255,0.6)';
  c.lineWidth = 0.7;
  for (const k of [-1.5, 0.5, 2.5]) {
    c.beginPath(); c.moveTo(d * 18, -5 - bob); c.lineTo(d * 25, -5 - bob + k * 1.5); c.stroke();
  }
  c.restore();
  return 22 + bob;
}

// 浮かぶ魔導書(front#329): 表紙=暗い色(明るい色を少し混ぜる)、紋章・粒=明るい色。宙に浮いて開いた厚い本。
// ページがパラパラめくれ、開いたページの紋章が光る(襲ってくると強く光る)
function drawGrimoire(c: CanvasRenderingContext2D, def: EnemyDef, p: EnemyPose): number {
  const t = p.time + (p.seed ?? 0);
  const fl = 30 + Math.sin(t * 2.2) * 4;
  const white = (color: string) => (p.flash ? '#ffffff' : color);
  shadow(c, 12, 4);
  c.save();
  c.translate(0, -fl);
  c.rotate(Math.sin(t * 1.3) * 0.06 + (p.lunge ?? 0) * 0.15 * p.dir);
  // 表紙の厚みと、開いた表紙(左右の板。少し V の字)
  poly(c, [[0, 2], [-22, -4], [-22, 0], [0, 6]], white(mix(def.dark, '#000000', 0.2)));
  poly(c, [[0, 2], [22, -4], [22, 0], [0, 6]], white(mix(def.dark, '#000000', 0.35)));
  poly(c, [[0, 2], [-22, -4], [-22, -22], [0, -16]], white(mix(def.dark, def.color, 0.3)));
  poly(c, [[0, 2], [22, -4], [22, -22], [0, -16]], white(mix(def.dark, def.color, 0.2)));
  c.fillStyle = '#d4a72c';
  for (const [x, y] of [[-21, -5], [-21, -21], [21, -5], [21, -21]]) c.fillRect(x - 1.5, y - 1.5, 3, 3);
  // ページの束の厚み(手前と外側の小口の、紙の縞)と背表紙の溝
  for (const sd of [-1, 1]) {
    poly(c, [[0, -1], [sd * 19, -6], [sd * 19, -2], [0, 3]], white(sd < 0 ? '#d8c7a6' : '#cdbb98'));
    poly(c, [[sd * 19, -6], [sd * 19, -21], [sd * 20.5, -20], [sd * 20.5, -5]], white('#c9b793'));
    c.strokeStyle = 'rgba(120,95,60,0.45)';
    c.lineWidth = 0.6;
    for (let i = 1; i < 4; i++) { c.beginPath(); c.moveTo(0, i - 1); c.lineTo(sd * 19, -6 + i); c.stroke(); }
  }
  c.fillStyle = white(mix(def.dark, '#000000', 0.3));
  c.fillRect(-1.2, -16, 2.4, 20);
  // ページ(束の厚みのぶん持ち上げる)と文字の線
  c.translate(0, -4);
  poly(c, [[0, 0], [-19, -5], [-19, -20], [0, -15]], white('#e9dcc3'));
  poly(c, [[0, 0], [19, -5], [19, -20], [0, -15]], white('#f3e8d2'));
  c.strokeStyle = 'rgba(80,60,40,0.35)';
  c.lineWidth = 0.8;
  for (let i = 0; i < 4; i++) {
    c.beginPath(); c.moveTo(-16, -8 - i * 3 + 0.5); c.lineTo(-3, -5 - i * 3); c.stroke();
    c.beginPath(); c.moveTo(3, -5 - i * 3); c.lineTo(16, -8 - i * 3 + 0.5); c.stroke();
  }
  // めくれるページ: 右から左へ、横幅を cos で縮めて裏返す
  const ph = (t * 2.4) % 1;
  const w = Math.cos(ph * Math.PI) * 19;
  const lift = Math.sin(ph * Math.PI) * 6;
  poly(c, [[0, 0], [w, -5 - lift], [w, -20 - lift], [0, -15]], white(w > 0 ? '#fbf3e2' : '#e2d3b6'));
  // 紋章(左のページに光る円)
  c.save();
  c.shadowColor = def.color;
  c.shadowBlur = 10 + (p.aggro ? 8 : 0);
  c.strokeStyle = def.color;
  c.lineWidth = 1.2;
  c.beginPath(); c.ellipse(-10, -12.5, 5, 3.5, -0.25, 0, Math.PI * 2); c.stroke();
  poly(c, [[-10, -16], [-7.5, -11], [-12.5, -11]], def.color);
  c.restore();
  c.restore();
  // 闇の粒
  c.save();
  const base = c.globalAlpha;
  c.fillStyle = def.color;
  for (let i = 0; i < 6; i++) {
    const life = (t * 0.9 + i / 6) % 1;
    c.globalAlpha = base * 0.6 * (1 - life);
    c.beginPath(); c.arc(Math.sin(i * 2.3 + t) * 16, -fl - 10 - life * 22, 1.6, 0, Math.PI * 2); c.fill();
  }
  c.restore();
  return fl + 30;
}

// 闇の水晶(front#329): 明るい色=結晶の明るい面・芯・魔法陣、暗い色=結晶の暗い面。宙に浮いて回る八面体。
// 芯が脈打ち、かけらが回る。足元に小さな魔法陣。動かず、攻撃もしない(isPassive)
function drawWardCrystal(c: CanvasRenderingContext2D, def: EnemyDef, p: EnemyPose): number {
  const t = p.time + (p.seed ?? 0);
  const fl = 34 + Math.sin(t * 1.8) * 3;
  const white = (color: string) => (p.flash ? '#ffffff' : color);
  c.save();
  c.scale(1, 0.5);
  c.globalAlpha *= 0.5;
  c.strokeStyle = def.color;
  c.lineWidth = 1.5;
  c.beginPath(); c.arc(0, 0, 20, 0, Math.PI * 2); c.stroke();
  c.rotate(t);
  c.globalAlpha *= 1.2;
  c.fillStyle = def.color;
  for (let i = 0; i < 6; i++) { c.rotate(Math.PI / 3); c.fillRect(16, -1, 5, 2); }
  c.restore();
  shadow(c, 10, 4, 0.2);
  c.save();
  c.translate(0, -fl);
  // 回る(4つの面を、奥から順に描く。正面を向いた面ほど明るい)
  const spin = t * 1.5;
  const faces = [0, 1, 2, 3].map((i) => {
    const a = spin + (i * Math.PI) / 2;
    return { x0: Math.cos(a) * 12, x1: Math.cos(a + Math.PI / 2) * 12, z: Math.sin(a + Math.PI / 4) };
  });
  for (const f of faces.slice().sort((a, b) => a.z - b.z)) {
    if (f.z < -0.2) continue;
    const k = 0.35 + 0.5 * Math.max(0, f.z);
    poly(c, [[0, -24], [f.x0, 0], [f.x1, 0]], white(mix(def.dark, def.color, k)));
    poly(c, [[0, 24], [f.x0, 0], [f.x1, 0]], white(mix(def.dark, def.color, k * 0.7)));
  }
  // 芯
  const pulse = 0.5 + Math.sin(t * 4) * 0.5;
  c.save();
  c.shadowColor = def.color;
  c.shadowBlur = 14 + 10 * pulse;
  const g = c.createRadialGradient(0, 0, 0, 0, 0, 7);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.4, def.color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g;
  c.beginPath(); c.arc(0, 0, 6 + pulse * 1.5, 0, Math.PI * 2); c.fill();
  c.restore();
  // 回るかけら
  for (let i = 0; i < 3; i++) {
    const a = t * 2 + (i * Math.PI * 2) / 3;
    const [x, y] = [Math.cos(a) * 19, Math.sin(a) * 6];
    poly(c, [[x, y - 4], [x + 2, y], [x, y + 4], [x - 2, y]], white(mix(def.dark, def.color, 0.7)));
  }
  c.restore();
  return fl + 26;
}

// ガーゴイル(front#329): 明るい色=体、暗い色=翼・爪・角。ふだんは台座の上でうずくまる灰色の石像(化ける)。
// 近づくと翼を広げ、目が赤く光り、少し浮いて腕を前に構える
function drawGargoyle(c: CanvasRenderingContext2D, def: EnemyDef, p: EnemyPose): number {
  const t = p.time + (p.seed ?? 0);
  const awake = !!p.aggro;
  const stone = p.flash ? '#ffffff' : awake ? def.color : '#8b8b93';
  const stoneDark = p.flash ? '#ffffff' : awake ? def.dark : '#5c5c66';
  const hover = awake ? 6 + Math.sin(t * 6) * 3 : 0;
  shadow(c, 16, 6, 0.22);
  if (!awake) {
    // 台座
    poly(c, [[-16, 0], [0, 8], [16, 0], [0, -8]], '#6b6b75');
    poly(c, [[-16, 0], [0, 8], [0, 2], [-16, -6]], '#55555e');
    poly(c, [[16, 0], [0, 8], [0, 2], [16, -6]], '#4a4a52');
    poly(c, [[-16, -6], [0, 2], [16, -6], [0, -14]], '#7a7a85');
  }
  c.save();
  c.translate((p.lunge ?? 0) * 6 * p.dir, (awake ? 0 : -10) - hover);
  c.scale(1.3, 1.3);
  // 翼
  const flap = awake ? Math.sin(t * 12) * 0.25 : 0;
  for (const sd of [-1, 1]) {
    c.save();
    c.translate(sd * 6, -26);
    c.rotate(sd * (awake ? -0.3 + flap : 0.5));
    const span = awake ? 36 : 18;
    poly(c, [[0, 0], [sd * span, -14], [sd * (span - 4), -4], [sd * (span - 9), 2], [sd * (span - 15), -1], [sd * (span - 20), 6], [0, 8]], stoneDark);
    c.strokeStyle = 'rgba(0,0,0,0.25)';
    c.lineWidth = 1;
    for (const k of [0.45, 0.75]) { c.beginPath(); c.moveTo(0, 2); c.lineTo(sd * span * k, -10 * k); c.stroke(); }
    c.restore();
  }
  // 胴・足
  c.fillStyle = stone;
  c.beginPath(); c.ellipse(0, -16, 10, 12, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = stoneDark;
  for (const sd of [-1, 1]) { c.beginPath(); c.ellipse(sd * 6, -4, 4, 3, 0, 0, Math.PI * 2); c.fill(); }
  // 腕と爪。石像のときはひざの上に置き、目覚めると前へ構える
  c.lineCap = 'round';
  for (const sd of [-1, 1]) {
    const [ex, ey] = awake ? [sd * 13, -22] : [sd * 10, -16];
    const [hx, hy] = awake ? [sd * 15, -12 + Math.sin(t * 6 + sd) * 1.5] : [sd * 6, -9];
    c.strokeStyle = stone;
    c.lineWidth = 4.5;
    c.beginPath(); c.moveTo(sd * 7, -24); c.lineTo(ex, ey); c.lineTo(hx, hy); c.stroke();
    c.strokeStyle = stoneDark;
    c.lineWidth = 1.4;
    for (const k of [-1.5, 0, 1.5]) { c.beginPath(); c.moveTo(hx, hy); c.lineTo(hx + sd * 1.5 + k, hy + 3.5); c.stroke(); }
  }
  // 頭・角・口・目
  c.fillStyle = stone;
  c.beginPath(); c.ellipse(0, -32, 7.5, 6.5, 0, 0, Math.PI * 2); c.fill();
  for (const sd of [-1, 1]) poly(c, [[sd * 4, -36], [sd * 9, -46], [sd * 6, -35]], stoneDark);
  poly(c, [[-4, -29], [4, -29], [0, -26]], stoneDark);
  c.save();
  if (awake) { c.shadowColor = '#ef4444'; c.shadowBlur = 8; }
  const eye = awake ? '#ff4d4d' : '#4a4a52';
  for (const sd of [-1, 1]) poly(c, [[sd * 1.5, -33], [sd * 5, -34.5], [sd * 4.3, -31.5]], eye);
  c.restore();
  if (!awake) {
    // 石のひび
    c.strokeStyle = 'rgba(40,40,46,0.5)';
    c.lineWidth = 0.8;
    c.beginPath(); c.moveTo(-3, -24); c.lineTo(1, -18); c.lineTo(-1, -12); c.stroke();
  }
  c.restore();
  return (awake ? 64 : 72) + hover;
}

// ミツバチン(front#284): 体=明るい色(黄色)、しま・頭・針=暗い色。宙に浮いて、すばやく羽ばたく
function drawBee(c: CanvasRenderingContext2D, def: EnemyDef, p: EnemyPose): number {
  const t = p.time;
  const d = p.dir;
  const fl = Math.sin(t * 5 + (p.seed ?? 0)) * 3 + (p.moving ? Math.sin(t * 13) * 2 : 0);
  const cy = -30 + fl;
  const flap = Math.sin(t * 40);
  const lunge = p.lunge ?? 0;
  const dark = p.flash ? '#fff' : def.dark;
  shadow(c, 8, 3, 0.14);
  c.save();
  c.translate(d * lunge * 8, 0);
  c.strokeStyle = 'rgba(96,165,250,0.6)';
  c.lineWidth = 0.8;
  c.fillStyle = 'rgba(219,234,254,0.75)';
  c.beginPath(); c.ellipse(-d * 1, cy - 11, 5, 9 + flap * 2, -d * 0.5, 0, Math.PI * 2); c.fill(); c.stroke();
  poly(c, [[-d * 17, cy], [-d * 23, cy + 2], [-d * 17, cy + 4]], dark);
  // おなか(しま)
  c.save();
  c.beginPath(); c.ellipse(-d * 7, cy + 2, 11, 8.5, -d * 0.15, 0, Math.PI * 2); c.clip();
  c.fillStyle = p.flash ? '#fff' : def.color;
  c.fillRect(-25, cy - 10, 50, 24);
  c.fillStyle = dark;
  for (const x of [-3, -8, -13]) c.fillRect(d * x - 1.6, cy - 10, 3.2, 24);
  c.restore();
  // 頭・触角・目
  c.fillStyle = dark;
  c.beginPath(); c.arc(d * 6, cy - 1, 5.2, 0, Math.PI * 2); c.fill();
  c.strokeStyle = dark;
  c.lineWidth = 1.2;
  c.beginPath();
  c.moveTo(d * 7, cy - 5); c.quadraticCurveTo(d * 9, cy - 12, d * 12, cy - 12);
  c.moveTo(d * 5, cy - 5); c.quadraticCurveTo(d * 5, cy - 12, d * 8, cy - 14);
  c.stroke();
  c.fillStyle = '#fff';
  c.beginPath(); c.arc(d * 8, cy - 2, 2.2, 0, Math.PI * 2); c.fill();
  c.fillStyle = p.aggro ? '#dc2626' : '#1f2937';
  c.beginPath(); c.arc(d * 8.6, cy - 2, 1.2, 0, Math.PI * 2); c.fill();
  c.strokeStyle = 'rgba(96,165,250,0.6)';
  c.lineWidth = 0.8;
  c.fillStyle = 'rgba(239,246,255,0.85)';
  c.beginPath(); c.ellipse(-d * 4, cy - 10, 5.5, 10 - flap * 2, d * 0.4, 0, Math.PI * 2); c.fill(); c.stroke();
  c.restore();
  return 46 - fl;
}

// ケルベロス(front#306)。3つ首の犬。首はそれぞれ少しずつずれて揺れ、目は赤く光り、しっぽの先に火がともる
function drawCerberus(c: CanvasRenderingContext2D, def: EnemyDef, p: EnemyPose): number {
  const t = p.time;
  const d = p.dir;
  const bob = p.moving ? -Math.abs(Math.sin(t * 9)) * 2.5 : Math.sin(t * 2 + (p.seed ?? 0)) * 0.8;
  const step = p.moving ? Math.sin(t * 12) * 3.5 : 0;
  const lunge = p.lunge ?? 0;
  const col = p.flash ? '#fff' : def.color;
  const dk = p.flash ? '#fff' : def.dark;
  shadow(c, 30, 9, 0.22);
  // しっぽと、先の火
  const sw = Math.sin(t * 3) * 4;
  c.strokeStyle = col;
  c.lineWidth = 5;
  c.lineCap = 'round';
  c.beginPath(); c.moveTo(-d * 18, bob - 26); c.quadraticCurveTo(-d * 30, bob - 30 + sw, -d * 30, bob - 42 + sw); c.stroke();
  tailFlame(c, -d * 30, bob - 44 + sw, t);
  // 足(対角の足が同時に上がる)と肉球。奥の足は少し暗くする
  for (const [x, s] of [[-15, 1], [-7, -1], [10, 1], [17, -1]]) {
    const up = Math.max(0, s * step);
    c.fillStyle = s === -1 && !p.flash ? shade(def.dark, 0.8) : dk;
    c.beginPath(); c.roundRect(d * x - 4, bob - 18 - up, 8, 18 + up - bob, 3); c.fill();
    c.beginPath(); c.ellipse(d * x + d * 1.5, -1.5 - up * 0.3, 5, 2.6, 0, 0, Math.PI * 2); c.fill();
  }
  // 奥の首(いちばん高く・後ろ)は胴より先に描く
  cerberusHead(c, def, p, d * 13, bob - 58, 0.92, 2.1, true);
  // 胴・背中の毛並み・背中のとげ
  c.fillStyle = col;
  c.beginPath(); c.ellipse(0, bob - 25, 23, 13, 0, 0, Math.PI * 2); c.fill();
  c.strokeStyle = p.flash ? '#fff' : mix(def.color, '#ffffff', 0.28);
  c.lineWidth = 1.3;
  c.stroke();
  c.fillStyle = p.flash ? '#fff' : mix(def.color, '#ffffff', 0.12);
  c.beginPath(); c.ellipse(-d * 3, bob - 31, 15, 5, 0, 0, Math.PI * 2); c.fill();
  for (let i = -2; i <= 1; i++) poly(c, [[d * i * 7 - 3, bob - 35], [d * i * 7 - d * 3, bob - 42], [d * i * 7 + 3, bob - 35]], dk);
  // とげの付いた首輪
  c.fillStyle = p.flash ? '#fff' : '#7f1d1d';
  c.beginPath(); c.ellipse(d * 14, bob - 31, 6, 9, d * 0.4, 0, Math.PI * 2); c.fill();
  for (const k of [-1, 0, 1]) poly(c, [[d * 16 + k * 3, bob - 33 + k * 5], [d * 22 + k * 3, bob - 34 + k * 5], [d * 17 + k * 3, bob - 30 + k * 5]], '#e5e7eb');
  // まん中の首・手前の首
  cerberusHead(c, def, p, d * 29, bob - 46, 1, 0, false);
  cerberusHead(c, def, p, d * 23, bob - 29, 1.05, 4.2, false);
  // 炎の攻撃: まん中の口から火の粉
  if (lunge && def.attack === 'fire') {
    for (let i = 0; i < 6; i++) {
      c.fillStyle = `rgba(255,${150 + i * 18},${60 + i * 10},${Math.min(1, lunge * 1.3) * (1 - i / 7)})`;
      c.beginPath(); c.arc(d * (42 + lunge * 7 + i * 6), bob - 43 + Math.sin(t * 20 + i) * 2, 3.8 - i * 0.45, 0, Math.PI * 2); c.fill();
    }
  }
  return 64;
}

/** ケルベロスの首と頭。(hx, hy) は頭の真ん中、s は大きさ、ph は揺れ方のずれ、far は奥の首(少し暗くする) */
function cerberusHead(c: CanvasRenderingContext2D, def: EnemyDef, p: EnemyPose, hx: number, hy: number, s: number, ph: number, far: boolean): void {
  const t = p.time;
  const d = p.dir;
  const lunge = p.lunge ?? 0;
  const sway = Math.sin(t * 3 + ph) * 1.6 + (p.moving ? Math.sin(t * 9 + ph) * 1.2 : 0);
  // 攻撃のときは3つの首が前へ出る
  const x = hx + d * lunge * 7;
  const y = hy + sway;
  const col = p.flash ? '#fff' : far ? shade(def.color, 0.75) : def.color;
  const dk = p.flash ? '#fff' : far ? shade(def.dark, 0.75) : def.dark;
  // 首(ふちを少し明るくして、重なった首を見分けやすくする)
  const nx = d * 11;
  const ny = p.moving ? y + 18 : hy + 16;
  c.lineCap = 'round';
  c.strokeStyle = p.flash ? '#fff' : mix(def.color, '#ffffff', 0.22);
  c.lineWidth = 10 * s;
  c.beginPath(); c.moveTo(nx, ny); c.lineTo(x - d * 3 * s, y + 3 * s); c.stroke();
  c.strokeStyle = col;
  c.lineWidth = 8 * s;
  c.beginPath(); c.moveTo(nx, ny); c.lineTo(x - d * 3 * s, y + 3 * s); c.stroke();
  // 耳・頭・鼻先
  poly(c, [[x - d * 2 * s, y - 5 * s], [x - d * 7 * s, y - 16 * s], [x + d * 2 * s, y - 6 * s]], dk);
  c.fillStyle = col;
  c.strokeStyle = p.flash ? '#fff' : mix(def.color, '#ffffff', far ? 0.18 : 0.32);
  c.lineWidth = 1.3 * s;
  c.beginPath(); c.ellipse(x, y, 9 * s, 7.5 * s, 0, 0, Math.PI * 2); c.fill(); c.stroke();
  c.beginPath(); c.ellipse(x + d * 8 * s, y + 2 * s, 6.5 * s, 4.3 * s, 0, 0, Math.PI * 2); c.fill(); c.stroke();
  c.beginPath(); c.ellipse(x + d * 2 * s, y + 1 * s, 7 * s, 5.5 * s, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#0b0b10';
  c.beginPath(); c.arc(x + d * 14 * s, y + 0.8 * s, 1.8 * s, 0, Math.PI * 2); c.fill();
  // 口(襲ってくるときは少し、攻撃のときは大きく開けて牙を見せる)
  const open = lunge ? lunge : p.aggro ? 0.3 + Math.sin(t * 6 + ph) * 0.12 : 0;
  if (open > 0.02) {
    poly(c, [[x + d * 3 * s, y + 4 * s], [x + d * 14 * s, y + 4 * s], [x + d * 12 * s, y + (5 + open * 7) * s], [x + d * 3 * s, y + (6 + open * 2) * s]], '#7f1d1d');
    for (const k of [6, 9, 12]) poly(c, [[x + d * (k - 1) * s, y + 4 * s], [x + d * k * s, y + 6.2 * s], [x + d * (k + 1) * s, y + 4 * s]], '#f8fafc');
  }
  // 赤く光る目(襲ってくるとき・攻撃のときは強く光り、怒った目つきになる)
  const angry = p.aggro || lunge > 0;
  const ex = x + d * 3 * s;
  const ey = y - 2 * s;
  const g = c.createRadialGradient(ex, ey, 0, ex, ey, 7 * s);
  g.addColorStop(0, `rgba(255,70,40,${angry ? 0.75 : 0.45})`);
  g.addColorStop(1, 'rgba(255,70,40,0)');
  c.fillStyle = g;
  c.beginPath(); c.arc(ex, ey, 7 * s, 0, Math.PI * 2); c.fill();
  c.fillStyle = angry ? '#ff3b30' : '#f97316';
  c.beginPath(); c.ellipse(ex, ey, 2.3 * s, 1.6 * s, 0, 0, Math.PI * 2); c.fill();
  if (angry) {
    c.strokeStyle = '#0b0b10';
    c.lineWidth = 1.6 * s;
    c.beginPath(); c.moveTo(x - d * 1 * s, y - 5.5 * s); c.lineTo(x + d * 6 * s, y - 3.5 * s); c.stroke();
  }
}

// ケルベロスのしっぽの先でゆらめく火
function tailFlame(c: CanvasRenderingContext2D, x: number, y: number, t: number): void {
  const f = Math.sin(t * 14) * 1.2;
  c.fillStyle = 'rgba(249,115,22,0.85)';
  c.beginPath(); c.ellipse(x, y - 2, 3.4, 5.5 + f, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = 'rgba(253,224,71,0.95)';
  c.beginPath(); c.ellipse(x, y - 1, 1.8, 3 + f * 0.5, 0, 0, Math.PI * 2); c.fill();
}

// 光る(front#284): 体のまわりをやわらかく光らせ(体の前に描く)、小さな星をきらきら散らす(体のあとに描く)
function drawGlow(c: CanvasRenderingContext2D, h: number, t: number, front: boolean): void {
  if (!front) {
    const g = c.createRadialGradient(0, -h * 0.4, 2, 0, -h * 0.4, h * 1.1);
    g.addColorStop(0, `rgba(254,240,138,${0.55 + Math.sin(t * 4) * 0.15})`);
    g.addColorStop(1, 'rgba(254,240,138,0)');
    c.fillStyle = g;
    c.beginPath(); c.ellipse(0, -h * 0.4, h * 1.1, h * 0.8, 0, 0, Math.PI * 2); c.fill();
    return;
  }
  for (let i = 0; i < 4; i++) {
    const a = t * 1.5 + i * 1.6;
    const k = (t * 0.8 + i * 0.25) % 1;
    const x = Math.cos(a) * h * 0.6;
    const y = -h * 0.45 + Math.sin(a) * h * 0.3 - k * 10;
    c.globalAlpha = 1 - k;
    poly(c, [[x, y - 3], [x + 1, y - 1], [x + 3, y], [x + 1, y + 1], [x, y + 3], [x - 1, y + 1], [x - 3, y], [x - 1, y - 1]], '#fffbeb');
  }
  c.globalAlpha = 1;
}

// ドラゴン(front#255): 翼としっぽのある四つ足の大型。体=明るい色、翼・背びれ・足=暗い色。攻撃のとき口から火の粉
function drawDragon(c: CanvasRenderingContext2D, def: EnemyDef, p: EnemyPose): number {
  const t = p.time;
  const d = p.dir;
  const bob = p.moving ? -Math.abs(Math.sin(t * 8)) * 2.5 : Math.sin(t * 2 + (p.seed ?? 0));
  const step = p.moving ? Math.sin(t * 12) * 3 : 0;
  const flap = Math.sin(t * (p.aggro ? 8 : 3));
  const col = p.flash ? '#fff' : def.color;
  const dk = p.flash ? '#fff' : def.dark;
  shadow(c, 28, 9, 0.2);
  // 奥の翼
  poly(c, [[-d * 2, bob - 34], [-d * 18, bob - 62 - flap * 6], [-d * 30, bob - 46 - flap * 4], [-d * 20, bob - 36]], p.flash ? '#fff' : shade(def.dark, 0.8));
  // しっぽ
  const tw = Math.sin(t * 3) * 4;
  c.strokeStyle = col;
  c.lineWidth = 7;
  c.lineCap = 'round';
  c.beginPath(); c.moveTo(-d * 12, bob - 18); c.quadraticCurveTo(-d * 28, bob - 14 + tw, -d * 36, bob - 26 + tw); c.stroke();
  poly(c, [[-d * 34, bob - 26 + tw], [-d * 44, bob - 30 + tw], [-d * 38, bob - 20 + tw]], dk);
  // 足(対角の足が同時に上がる)
  c.fillStyle = dk;
  for (const [x, s] of [[-10, 1], [-2, -1], [8, 1], [15, -1]]) {
    const up = Math.max(0, s * step);
    c.beginPath(); c.roundRect(d * x - 3.5, bob - 14 - up, 7, 14 + up - bob, 3); c.fill();
  }
  // 胴・お腹・背びれ
  c.fillStyle = col;
  c.beginPath(); c.ellipse(0, bob - 22, 22, 13, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = p.flash ? '#fff' : mix(def.color, '#fff7d6', 0.6);
  c.beginPath(); c.ellipse(d * 4, bob - 16, 13, 6, 0, 0, Math.PI * 2); c.fill();
  for (let i = -2; i <= 1; i++) poly(c, [[d * i * 7 - 3, bob - 33], [d * i * 7 - d * 2, bob - 41], [d * i * 7 + 3, bob - 33]], dk);
  // 首・頭・角
  c.fillStyle = col;
  c.beginPath(); c.ellipse(d * 18, bob - 34, 7, 12, d * 0.5, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.ellipse(d * 26, bob - 46, 12, 8, 0, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.ellipse(d * 35, bob - 43, 7, 5, 0, 0, Math.PI * 2); c.fill();
  poly(c, [[d * 20, bob - 52], [d * 14, bob - 62], [d * 24, bob - 53]], '#fef3c7');
  poly(c, [[d * 25, bob - 53], [d * 22, bob - 63], [d * 29, bob - 53]], '#fde68a');
  c.fillStyle = dk;
  c.beginPath(); c.arc(d * 39, bob - 45, 1.3, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#fff';
  c.beginPath(); c.ellipse(d * 27, bob - 48, 3.2, 2.8, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = p.aggro ? '#dc2626' : '#1f2937';
  c.beginPath(); c.ellipse(d * 28, bob - 48, 1.2, 2.3, 0, 0, Math.PI * 2); c.fill();
  if (p.aggro) {
    c.strokeStyle = '#1f2937';
    c.lineWidth = 1.8;
    c.beginPath(); c.moveTo(d * 23, bob - 53); c.lineTo(d * 31, bob - 51); c.stroke();
  }
  if (p.lunge) {
    for (let i = 0; i < 5; i++) {
      c.fillStyle = `rgba(255,${140 + i * 20},40,${p.lunge * (1 - i / 6)})`;
      c.beginPath(); c.arc(d * (44 + i * 6), bob - 42 + Math.sin(t * 20 + i) * 2, 3.5 - i * 0.4, 0, Math.PI * 2); c.fill();
    }
  }
  // 手前の翼
  const tipX = -d * 12;
  const tipY = bob - 66 - flap * 8;
  c.fillStyle = dk;
  c.beginPath();
  c.moveTo(-d * 2, bob - 30);
  c.lineTo(tipX, tipY);
  c.lineTo(-d * 30, bob - 50 - flap * 5);
  c.quadraticCurveTo(-d * 22, bob - 44, -d * 20, bob - 36);
  c.quadraticCurveTo(-d * 12, bob - 38, -d * 8, bob - 28);
  c.closePath();
  c.fill();
  c.strokeStyle = p.flash ? '#fff' : shade(def.dark, 0.7);
  c.lineWidth = 1.2;
  c.beginPath();
  c.moveTo(tipX, tipY); c.lineTo(-d * 20, bob - 36);
  c.moveTo(tipX, tipY); c.lineTo(-d * 8, bob - 28);
  c.stroke();
  return 68;
}

// ===== 攻撃の動き =====

export interface EffectFrame {
  attack: EnemyAttack;
  // 攻撃の進み(0〜1。attackTiming の長さに対する割合)
  k: number;
  time: number;
  // 敵の足元・相手(攻撃する場所)の足元の画面上の位置
  ex: number;
  ey: number;
  tx: number;
  ty: number;
  // 敵の向き(1: 右、-1: 左)
  dir: number;
  // 絵の大きさ(ゲームは 1、プレビューは拡大する)
  s: number;
  // 衝撃波の範囲の、画面上の半径(横方向)
  radiusPx: number;
  // 範囲(まわり何マス)。魔法陣(front#327)の大きさに使う
  radius: number;
  // 当たる時(attackTiming の hitAt / duration)。ジャンプの着地・LV2 の攻撃に使う
  hitK: number;
  // LV2 の攻撃で魔法陣を出す(front#435)。なければ出す
  circle?: boolean;
  // プレイヤーの魔法(front#383)の演出に使う。敵の攻撃の変更(front#435 の速さ・雷LV2)に巻き込まず、前のままの絵にする
  player?: boolean;
}

/** 体当たり・ジャンプで、ためているとき体をふるわせる量 */
export function chargeShake(def: EnemyDef, elapsed: number, time: number): number {
  return (def.attack === 'tackle' || def.attack === 'jump') && elapsed < def.charge ? Math.sin(time * 60) * 2.5 : 0;
}

/** ジャンプで跳んでいる高さ(画面上、上が正)。elapsed は攻撃を始めてからの秒 */
export function jumpHeight(def: EnemyDef, elapsed: number, s = 1): number {
  if (def.attack !== 'jump') return 0;
  const q = (elapsed - def.charge) / 0.42;
  return q > 0 && q < 1 ? Math.sin(q * Math.PI) * (def.dash > 1 ? 55 : 30) * s : 0;
}

/** 攻撃の演出(エフェクト)を描く。地面に出るもの・相手の上に出るものをまとめて描く */
export function drawAttackEffect(c: CanvasRenderingContext2D, f: EffectFrame): void {
  const { attack, k, ex, ey, tx, ty, dir: d, s } = f;
  // 属性の攻撃は、ちらつき・回転もゆっくりにする(front#435)
  const time = SPELLS.includes(attack) && !f.player ? f.time * SPELL_FX_SPEED : f.time;
  if (attack === 'claw' && k > 0.3 && k < 0.8) {
    c.strokeStyle = `rgba(255,255,255,${1 - (k - 0.3) / 0.5})`;
    c.lineWidth = 3;
    c.lineCap = 'round';
    for (let i = -1; i <= 1; i++) {
      c.beginPath(); c.moveTo(tx - 14 * s + i * 7 * s, ty - 38 * s); c.lineTo(tx + 4 * s + i * 7 * s, ty - 8 * s); c.stroke();
    }
  }
  if (attack === 'bite' && k > 0.35 && k < 0.75) {
    const q = (k - 0.35) / 0.4;
    const open = (1 - q) * 10 * s;
    c.fillStyle = '#ffffff';
    for (const sgn of [-1, 1]) {
      c.beginPath();
      c.moveTo(tx - 12 * s, ty - 22 * s + sgn * open);
      c.lineTo(tx + 12 * s, ty - 22 * s + sgn * open);
      c.lineTo(tx, ty - 22 * s + sgn * (open - 8 * s));
      c.closePath();
      c.fill();
    }
  }
  if (attack === 'jump') drawJumpDust(c, f);
  if (attack === 'fire') drawFire(c, k, time, tx, ty, s);
  if (attack === 'water') drawWater(c, k, time, tx, ty, s);
  if (attack === 'wind') drawWind(c, k, time, tx, ty, s);
  if (attack === 'spark') drawSpark(c, k, time, tx, ty, s);
  if (attack === 'dark') drawDark(c, k, time, tx, ty, s);
  if (attack === 'shockwave') drawShockwave(c, k, time, ex, ey, f.radiusPx);
  // プレイヤーのサンダーは、前の雷(雷雲から稲妻)のまま
  if (attack === 'thunder' && f.player) drawThunderCloud(c, k, time, tx, ty, s);
  if (isLv2Attack(attack) && !f.player) drawLv2(c, { ...f, time });
  void d;
}

// 着地の土ぼこり(着地は k = hitAt / duration)
function drawJumpDust(c: CanvasRenderingContext2D, f: EffectFrame): void {
  const land = f.hitK;
  const span = Math.max(0.2, (1 - land) * 0.9);
  if (f.k < land || f.k > land + span) return;
  const q = (f.k - land) / span;
  c.fillStyle = `rgba(180,150,110,${0.6 * (1 - q)})`;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    c.beginPath();
    c.arc(f.ex + Math.cos(a) * 26 * f.s * q, f.ey + Math.sin(a) * 9 * f.s * q, (5 + 4 * q) * f.s, 0, Math.PI * 2);
    c.fill();
  }
}

const rnd = (j: number, m: number) => {
  const v = Math.sin(j * 12.9898 + m * 78.233) * 43758.5453;
  return v - Math.floor(v);
};

// 炎: 足元の地面が赤く光ってから、下から火柱が噴き上がる
function drawFire(c: CanvasRenderingContext2D, k: number, time: number, x: number, y: number, s: number): void {
  if (k < 0.35) {
    c.save(); c.translate(x, y); c.scale(1, 0.5);
    c.fillStyle = `rgba(239,68,68,${0.18 + Math.sin(time * 22) * 0.1})`;
    c.beginPath(); c.arc(0, 0, 28 * s, 0, Math.PI * 2); c.fill();
    c.restore();
    return;
  }
  if (k >= 0.9) return;
  const r = (k - 0.35) / 0.55;
  const hgt = Math.sin(Math.min(1, r * 1.8) * Math.PI * 0.5) * 72 * s * (r > 0.7 ? (1 - r) / 0.3 : 1);
  fireParticles(c, time, x, y, s, hgt, 36 * s, 50);
}

/** 炎の粒(下が黄色、上へ行くほど赤く小さくなる)。hgt: 高さ / width: 幅 / n: 数 / size: 粒の大きさの倍率 */
function fireParticles(c: CanvasRenderingContext2D, time: number, x: number, y: number, s: number, hgt: number, width: number, n: number, size = 1): void {
  for (let j = 0; j < n; j++) {
    const life = (time * 2.6 + rnd(j, 1)) % 1;
    const px = x + (rnd(j, 2) - 0.5) * width * (1 - life * 0.5) + Math.sin(time * 9 + j) * 2 * s;
    const py = y - life * hgt;
    const rr = (11 - life * 6) * s * (0.6 + rnd(j, 3) * 0.6) * size;
    c.fillStyle = life < 0.3 ? 'rgba(255,214,90,0.8)' : life < 0.65 ? 'rgba(251,128,30,0.6)' : 'rgba(220,50,25,0.4)';
    c.beginPath(); c.arc(px, py, rr, 0, Math.PI * 2); c.fill();
  }
}

// 水: 足元に水の輪 → 水柱が吹き上がる → 崩れてしぶきになり、薄くなって消える
function drawWater(c: CanvasRenderingContext2D, k: number, time: number, x: number, y: number, s: number): void {
  if (k < 0.45) {
    const q = k / 0.45;
    c.save(); c.translate(x, y); c.scale(1, 0.5);
    c.strokeStyle = `rgba(96,165,250,${0.5 + Math.sin(time * 18) * 0.3})`;
    c.lineWidth = 3;
    c.beginPath(); c.arc(0, 0, 26 * s * (0.6 + q * 0.4), 0, Math.PI * 2); c.stroke();
    c.fillStyle = 'rgba(96,165,250,0.18)';
    c.fill();
    c.restore();
    return;
  }
  const q = (k - 0.45) / 0.55;
  const up = q < 0.3 ? q / 0.3 : q < 0.6 ? 1 - (q - 0.3) / 0.3 : 0;
  if (up > 0) {
    const hgt = up * 70 * s;
    const g = c.createLinearGradient(0, y - hgt, 0, y);
    g.addColorStop(0, 'rgba(219,234,254,0.95)');
    g.addColorStop(1, 'rgba(59,130,246,0.85)');
    c.fillStyle = g;
    c.beginPath(); c.ellipse(x, y - hgt / 2, 13 * s, hgt / 2, 0, 0, Math.PI * 2); c.fill();
  }
  if (q > 0.3) {
    const r = (q - 0.3) / 0.7;
    c.save();
    c.globalAlpha = 1 - r;
    c.fillStyle = 'rgba(147,197,253,0.9)';
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const py = Math.min(y, y - 70 * s + Math.sin(a) * 6 * s + r * r * 80 * s - (1 - r) * 10 * s);
      c.beginPath(); c.arc(x + Math.cos(a) * 26 * s * r, py, 3 * s, 0, Math.PI * 2); c.fill();
    }
    c.translate(x, y); c.scale(1, 0.5);
    c.fillStyle = 'rgba(96,165,250,0.35)';
    c.beginPath(); c.arc(0, 0, 22 * s * (1 + r * 0.3), 0, Math.PI * 2); c.fill();
    c.restore();
  }
}

// 風: 相手のいたマスに竜巻が起こり、その場で大きくなって消える
function drawWind(c: CanvasRenderingContext2D, k: number, time: number, x: number, y: number, s: number): void {
  tornado(c, Math.min(1, k / 0.35), k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1, time, x, y, s, 1);
}

/** 竜巻。grow: 0〜1(できていく) / fade: 濃さ / big: 大きさ(1 が風LV1。風LV2 は大きく、段も増やす) */
function tornado(c: CanvasRenderingContext2D, grow: number, fade: number, time: number, x: number, y: number, s: number, big: number): void {
  const wide = big > 1;
  c.save();
  c.globalAlpha = Math.max(0, fade);
  c.save(); c.translate(x, y); c.scale(1, 0.5);
  c.strokeStyle = 'rgba(167,243,208,0.7)';
  c.lineWidth = 2 * big;
  c.beginPath(); c.arc(0, 0, 30 * s * big, time * 6, time * 6 + Math.PI * 1.4); c.stroke();
  c.restore();
  const layers = Math.max(1, Math.round(9 * grow * (wide ? 1.4 : 1)));
  c.lineWidth = 2.5 * (wide ? 1.4 : 1);
  for (let i = 0; i < layers; i++) {
    const yy = y - i * 8 * s * (wide ? 1.1 : 1);
    const w = (6 + i * 3.4) * s * (0.6 + grow * 0.4) * big;
    const sway = Math.sin(time * 12 + i * 0.7) * 5 * s;
    c.strokeStyle = `rgba(220,245,235,${0.9 - i * (wide ? 0.045 : 0.06)})`;
    c.beginPath(); c.ellipse(x + sway, yy, w, w * 0.32, 0, 0, Math.PI * 2); c.stroke();
  }
  c.fillStyle = 'rgba(74,222,128,0.85)';
  const leaves = 4 * Math.round(big * 1.5);
  for (let i = 0; i < (wide ? leaves : 4); i++) {
    const a = time * 9 + i * 1.6;
    const h2 = ((time * 0.8 + i / (4 * big)) % 1) * 64 * s * grow * big;
    c.beginPath(); c.ellipse(x + Math.cos(a) * (12 + h2 / (4 * s)) * s * 0.6 * big, y - h2, 3 * s, 1.6 * s, a, 0, Math.PI * 2); c.fill();
  }
  c.restore();
}

// 雷(プレイヤーの魔法サンダー): 頭の上に雷雲 → 太い稲妻が落ち、まわりが一瞬白く光る → 足元に火花。
// 敵の雷は front#435 で 雷LV1(足元を流れる雷)・雷LV2(魔法陣と空からの稲妻)に変えた
function drawThunderCloud(c: CanvasRenderingContext2D, k: number, time: number, x: number, y: number, s: number): void {
  const cyc = y - 95 * s;
  const fade = k > 0.8 ? 1 - (k - 0.8) / 0.2 : 1;
  c.save();
  c.globalAlpha = Math.max(0, Math.min(1, k / 0.15) * fade);
  c.fillStyle = k < 0.45 ? '#64748b' : '#475569';
  for (const [ox, oy, r] of [[-14, 2, 11], [0, -4, 14], [14, 2, 11], [-6, 6, 10], [8, 6, 10]]) {
    c.beginPath(); c.arc(x + ox * s, cyc + oy * s, r * s, 0, Math.PI * 2); c.fill();
  }
  if (k < 0.45) {
    c.fillStyle = `rgba(253,224,71,${0.3 + Math.sin(time * 30) * 0.3})`;
    c.beginPath(); c.arc(x, cyc, 8 * s, 0, Math.PI * 2); c.fill();
    c.save(); c.translate(x, y); c.scale(1, 0.5);
    c.fillStyle = 'rgba(30,41,59,0.25)';
    c.beginPath(); c.arc(0, 0, 22 * s, 0, Math.PI * 2); c.fill();
    c.restore();
  }
  c.restore();
  if (k >= 0.45 && k < 0.7) {
    // まわりが一瞬白く光る
    if (k < 0.52) {
      const g = c.createRadialGradient(x, y - 40 * s, 10 * s, x, y - 40 * s, 160 * s);
      g.addColorStop(0, 'rgba(255,255,255,0.5)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g;
      c.beginPath(); c.arc(x, y - 40 * s, 160 * s, 0, Math.PI * 2); c.fill();
    }
    const pts: [number, number][] = [[0, 0], [-7, 22], [5, 28], [-4, 52], [8, 58], [0, 82]];
    const top = cyc + 8 * s;
    const scaleY = (y - top) / 82;
    c.lineJoin = 'round';
    for (const [w, col] of [[14, 'rgba(253,224,71,0.45)'], [6, '#fffbe6']] as [number, string][]) {
      c.strokeStyle = col;
      c.lineWidth = w * Math.max(0.6, s / 2.2);
      c.beginPath();
      pts.forEach(([px, py], i) => (i ? c.lineTo(x + px * s, top + py * scaleY) : c.moveTo(x + px * s, top + py * scaleY)));
      c.stroke();
    }
  }
  if (k >= 0.5 && k < 0.85) {
    const q = (k - 0.5) / 0.35;
    c.strokeStyle = `rgba(253,224,71,${1 - q})`;
    c.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const r1 = 8 * s + q * 20 * s;
      const r2 = r1 + 7 * s;
      c.beginPath();
      c.moveTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1 * 0.5);
      c.lineTo(x + Math.cos(a) * r2, y + Math.sin(a) * r2 * 0.5);
      c.stroke();
    }
  }
}

// 暗黒: 足元に黒い影が広がる → 闇の柱が立ちのぼり、紫の煙が渦を巻いて消える
function drawDark(c: CanvasRenderingContext2D, k: number, time: number, x: number, y: number, s: number): void {
  c.save(); c.translate(x, y); c.scale(1, 0.5);
  if (k < 0.45) {
    const q = k / 0.45;
    const r = 28 * s * (0.4 + q * 0.6);
    const g = c.createRadialGradient(0, 0, 2, 0, 0, r);
    g.addColorStop(0, 'rgba(10,5,25,0.85)');
    g.addColorStop(0.75, 'rgba(46,16,101,0.6)');
    g.addColorStop(1, 'rgba(147,51,234,0)');
    c.fillStyle = g;
    c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill();
    c.strokeStyle = `rgba(192,132,252,${0.4 + Math.sin(time * 16) * 0.3})`;
    c.lineWidth = 2;
    c.beginPath(); c.arc(0, 0, r, time * 4, time * 4 + Math.PI * 1.3); c.stroke();
  } else {
    const q = (k - 0.45) / 0.55;
    c.globalAlpha = q > 0.6 ? Math.max(0, 1 - (q - 0.6) / 0.4) : 1;
    c.fillStyle = 'rgba(10,5,25,0.7)';
    c.beginPath(); c.arc(0, 0, 28 * s, 0, Math.PI * 2); c.fill();
  }
  c.restore();
  if (k < 0.45) return;
  drawDarkColumn(c, (k - 0.45) / 0.55, time, x, y, s);
}

/**
 * 闇の柱(暗黒・魔法陣 front#327)。q: 0〜1(0.3 までに伸びきり、0.6 から消える)。
 * wide: 太さ(1 が暗黒の柱)。太い柱は、まっすぐな側面と上へ消えていく頭にし、高さも少し高くする
 */
function drawDarkColumn(c: CanvasRenderingContext2D, q: number, time: number, x: number, y: number, s: number, wide = 1): void {
  const up = Math.min(1, q / 0.3);
  const fade = q > 0.6 ? Math.max(0, 1 - (q - 0.6) / 0.4) : 1;
  const hgt = up * 80 * s * (1 + (wide - 1) * 0.3);
  const rx = 15 * s * wide;
  c.save();
  c.globalAlpha = fade;
  const g = c.createLinearGradient(0, y - hgt, 0, y);
  g.addColorStop(0, 'rgba(88,28,135,0)');
  g.addColorStop(0.3, 'rgba(59,7,100,0.75)');
  g.addColorStop(1, 'rgba(10,5,25,0.95)');
  c.fillStyle = g;
  c.beginPath();
  if (wide === 1) c.ellipse(x, y - hgt / 2, rx, hgt / 2 + 1, 0, 0, Math.PI * 2);
  else {
    // 足元はつぶした円、側面はまっすぐ、頭は丸く
    c.ellipse(x, y, rx, rx * 0.5, 0, 0, Math.PI);
    c.lineTo(x - rx, y - hgt + rx * 0.6);
    c.quadraticCurveTo(x - rx, y - hgt, x, y - hgt);
    c.quadraticCurveTo(x + rx, y - hgt, x + rx, y - hgt + rx * 0.6);
    c.closePath();
  }
  c.fill();
  // 太い柱は、中を流れ上がる闇の筋
  for (let i = 0; wide > 1 && i < 6; i++) {
    const ox = (i / 5 - 0.5) * rx * 1.5 + Math.sin(time * 3 + i) * rx * 0.08;
    const life = (time * 1.4 + i / 6) % 1;
    c.strokeStyle = `rgba(192,132,252,${0.35 * (1 - life)})`;
    c.lineWidth = 2 * s;
    c.beginPath(); c.moveTo(x + ox, y - hgt * life * 0.6); c.lineTo(x + ox, y - hgt * (life * 0.6 + 0.35)); c.stroke();
  }
  const n = Math.round(10 * Math.max(1, wide * 0.8));
  for (let i = 0; i < n; i++) {
    const life = (time * 1.8 + i / n) % 1;
    const a = time * 6 + i * 2.4;
    c.fillStyle = `rgba(168,85,247,${0.55 * (1 - life)})`;
    c.beginPath(); c.arc(x + Math.cos(a) * (rx + s) * (0.5 + life * 0.5), y - life * hgt, (3 + life * 4) * s, 0, Math.PI * 2); c.fill();
  }
  c.restore();
}

// ===== LV2 の攻撃(front#435) =====
// 相手の足元に属性の色の魔法陣が浮かんで、すぐ攻撃が出る(当たる時 hitK に伸びきる)。
// 魔法陣の大きさは、範囲のマス(1なら3×3)の外のふちの 65%(見た目だけ。当たる範囲は変えない)

// 魔法陣の大きさ(範囲のマスの外のふちに対する割合)と、広がりきるまでの秒
const CIRCLE_SCALE = 0.65;
const CIRCLE_GROW = slow(0.12);

interface CirclePalette { glow: string; line: string; star: string; mark: string; bg1: string; bg2: string }
const CIRCLE_PALETTES: Record<AttackElement, CirclePalette> = {
  fire: { glow: '#f97316', line: '254,215,170', star: 'rgba(249,115,22,0.95)', mark: 'rgba(254,205,160,0.9)', bg1: '249,115,22', bg2: '127,29,29' },
  water: { glow: '#38bdf8', line: '224,242,254', star: 'rgba(56,189,248,0.95)', mark: 'rgba(186,230,253,0.9)', bg1: '56,189,248', bg2: '12,74,110' },
  wind: { glow: '#4ade80', line: '220,252,231', star: 'rgba(74,222,128,0.95)', mark: 'rgba(187,247,208,0.9)', bg1: '74,222,128', bg2: '20,83,45' },
  thunder: { glow: '#facc15', line: '254,249,195', star: 'rgba(250,204,21,0.95)', mark: 'rgba(254,240,138,0.9)', bg1: '250,204,21', bg2: '113,63,18' },
  dark: { glow: '#a855f7', line: '233,213,255', star: 'rgba(168,85,247,0.9)', mark: 'rgba(245,208,254,0.85)', bg1: '168,85,247', bg2: '46,16,101' }
};

/** LV2 の攻撃。魔法陣(出すときだけ)を描いてから、属性ごとの攻撃を描く */
function drawLv2(c: CanvasRenderingContext2D, f: EffectFrame): void {
  const spec = ENEMY_ATTACKS.find((a) => a.id === f.attack);
  if (!spec?.element) return;
  const radius = Math.max(0, Math.round(f.radius));
  // 範囲のマスの外のふち(マスの幅は rpg-data の TW = 64)。範囲0なら闇LV1の柱くらい
  const R = radius ? (radius + 0.5) * 64 * f.s * CIRCLE_SCALE : 30 * f.s;
  const lv2 = { ...f, hitK: Math.min(0.95, Math.max(0.05, f.hitK)) };
  if (f.circle ?? true) drawCircleBase(c, lv2, R, CIRCLE_PALETTES[spec.element], radius ? 16 : 10);
  if (f.attack === 'blaze') drawBlaze(c, lv2, R);
  if (f.attack === 'splash') drawSplash(c, lv2, R);
  if (f.attack === 'gale') drawGale(c, lv2, R);
  if (f.attack === 'thunder') drawThunderBolt(c, lv2, R);
  if (f.attack === 'circle') drawDarkPillar(c, lv2, R);
}

/** 地面の魔法陣(つぶした円): 二重の輪・回る六芒星・逆に回るルーンの印。当たった瞬間に光の輪が広がる */
function drawCircleBase(c: CanvasRenderingContext2D, f: EffectFrame, R: number, pal: CirclePalette, marks: number): void {
  const { k, time, tx: x, ty: y, s, hitK } = f;
  const sec = k * attackTiming({ attack: f.attack } as EnemyDef).duration;
  const grow = Math.min(1, sec / CIRCLE_GROW);
  const fade = k > hitK ? Math.max(0, 1 - (k - hitK) / (1 - hitK)) : 1;
  const charge = Math.min(1, k / hitK);
  c.save();
  c.translate(x, y);
  c.scale(1, 0.5);
  c.globalAlpha = fade;
  const r = R * (0.3 + 0.7 * grow);
  const bg = c.createRadialGradient(0, 0, 2, 0, 0, r);
  bg.addColorStop(0, `rgba(${pal.bg1},${0.15 + 0.35 * charge})`);
  bg.addColorStop(0.8, `rgba(${pal.bg2},0.35)`);
  bg.addColorStop(1, `rgba(${pal.bg2},0)`);
  c.fillStyle = bg;
  c.beginPath(); c.arc(0, 0, r * 1.08, 0, Math.PI * 2); c.fill();
  c.shadowColor = pal.glow;
  c.shadowBlur = 10 + 14 * charge;
  c.strokeStyle = `rgba(${pal.line},${0.55 + 0.4 * charge})`;
  c.lineWidth = 2.2 * s;
  c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.stroke();
  c.lineWidth = 1.2 * s;
  c.beginPath(); c.arc(0, 0, r * 0.82, 0, Math.PI * 2); c.stroke();
  c.save();
  c.rotate(time * 1.4);
  c.strokeStyle = pal.star;
  c.lineWidth = 1.6 * s;
  for (const off of [0, Math.PI / 3]) {
    c.beginPath();
    for (let i = 0; i <= 3; i++) {
      const a = off + (i * Math.PI * 2) / 3 - Math.PI / 2;
      if (i) c.lineTo(Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.8);
      else c.moveTo(Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.8);
    }
    c.stroke();
  }
  c.restore();
  c.save();
  c.rotate(-time * 0.9);
  c.fillStyle = pal.mark;
  for (let i = 0; i < marks; i++) {
    c.save();
    c.rotate((i * Math.PI * 2) / marks);
    c.fillRect(r * 0.86, -1.5 * s, r * 0.08, 3 * s);
    c.restore();
  }
  c.restore();
  if (k >= hitK) {
    const q = (k - hitK) / (1 - hitK);
    c.shadowBlur = 0;
    c.globalAlpha = 1;
    c.strokeStyle = `rgba(${pal.line},${1 - q})`;
    c.lineWidth = (4 * (1 - q) + 1) * s;
    c.beginPath(); c.arc(0, 0, R * (0.6 + q * 0.8), 0, Math.PI * 2); c.stroke();
  }
  c.restore();
}

/** 当たってからの進み(0〜1)。当たる前は -1 */
const afterHit = (f: EffectFrame) => (f.k < f.hitK ? -1 : (f.k - f.hitK) / (1 - f.hitK));

/** ギザギザの線(稲妻)。seed が変わると形が変わる */
function zigzag(c: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, n: number, amp: number, seed: number): void {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  c.beginPath();
  c.moveTo(x0, y0);
  for (let i = 1; i < n; i++) {
    const t = i / n;
    const o = (rnd(seed, i) - 0.5) * 2 * amp;
    c.lineTo(x0 + dx * t + nx * o, y0 + dy * t + ny * o);
  }
  c.lineTo(x1, y1);
  c.stroke();
}

// 雷LV1: 足元が黄色くちらつく → 足元の中心から、地面を這うように雷がピリピリっと流れる。体のまわりにも小さな電気が走る
function drawSpark(c: CanvasRenderingContext2D, k: number, time: number, x: number, y: number, s: number): void {
  // 形を細かく変えて「ピリピリ」させる
  const flick = Math.floor(time * 24);
  c.save();
  c.lineCap = 'round';
  c.lineJoin = 'round';
  if (k < 0.45) {
    const q = k / 0.45;
    c.save(); c.translate(x, y); c.scale(1, 0.5);
    c.fillStyle = `rgba(250,204,21,${0.12 + Math.abs(Math.sin(time * 26)) * 0.14})`;
    c.beginPath(); c.arc(0, 0, 26 * s * (0.6 + 0.4 * q), 0, Math.PI * 2); c.fill();
    c.restore();
    c.strokeStyle = 'rgba(254,249,195,0.9)';
    c.lineWidth = 1.4 * s;
    for (let i = 0; i < 3; i++) {
      if (rnd(flick, i + 9) < 0.4) continue;
      const a = rnd(flick, i) * Math.PI * 2;
      const l = (5 + 6 * q) * s;
      zigzag(c, x, y, x + Math.cos(a) * l, y + Math.sin(a) * l * 0.5, 3, 2 * s, flick * 7 + i);
    }
    c.restore();
    return;
  }
  const q = (k - 0.45) / 0.55;
  c.globalAlpha = q > 0.55 ? Math.max(0, 1 - (q - 0.55) / 0.45) : 1;
  const reach = Math.min(1, q / 0.18);
  const g = c.createRadialGradient(x, y - 4 * s, 1, x, y - 4 * s, 30 * s);
  g.addColorStop(0, `rgba(255,255,255,${0.8 * (1 - q)})`);
  g.addColorStop(1, 'rgba(250,204,21,0)');
  c.fillStyle = g;
  c.beginPath(); c.arc(x, y - 4 * s, 30 * s, 0, Math.PI * 2); c.fill();
  // 地面を這う雷(7本。先で枝分かれする)
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + rnd(i, 3) * 0.6;
    const l = (24 + rnd(i, 4) * 14) * s * reach;
    const ex = x + Math.cos(a) * l;
    const ey = y + Math.sin(a) * l * 0.5;
    for (const [w, col] of [[5 * s, 'rgba(250,204,21,0.35)'], [1.6 * s, '#fffbe6']] as [number, string][]) {
      c.strokeStyle = col;
      c.lineWidth = w;
      zigzag(c, x, y, ex, ey, 5, 4 * s, flick * 13 + i);
      if (reach >= 1 && rnd(flick, i + 20) > 0.35) {
        const b = a + (rnd(flick, i + 30) - 0.5) * 1.6;
        zigzag(c, ex, ey, ex + Math.cos(b) * 10 * s, ey + Math.sin(b) * 5 * s, 3, 2.5 * s, flick * 17 + i);
      }
    }
  }
  // 体のまわりを走る小さな電気
  c.strokeStyle = 'rgba(254,249,195,0.95)';
  c.lineWidth = 1.5 * s;
  for (let i = 0; i < 4; i++) {
    if (rnd(flick, i + 40) < 0.35) continue;
    const ox = (rnd(flick, i + 50) - 0.5) * 26 * s;
    const oy = -(8 + rnd(flick, i + 60) * 40) * s;
    zigzag(c, x + ox, y + oy, x + ox + (rnd(flick, i + 70) - 0.5) * 14 * s, y + oy - 12 * s, 3, 3 * s, flick * 19 + i);
  }
  // 足元に飛ぶ火花
  c.fillStyle = 'rgba(253,224,71,0.9)';
  for (let i = 0; i < 10; i++) {
    const a = rnd(i, 80) * Math.PI * 2;
    const sp = (18 + rnd(i, 81) * 22) * s * q;
    c.beginPath(); c.arc(x + Math.cos(a) * sp, y - 6 * s - (30 * q - 34 * q * q) * s + Math.sin(a) * sp * 0.4, 1.6 * s, 0, Math.PI * 2); c.fill();
  }
  c.restore();
}

// 雷LV2: 頭の上の空が光る → 空から太い稲妻が落ち、まわりが白く光る。魔法陣の中にも細い稲妻 → 足元に火花
function drawThunderBolt(c: CanvasRenderingContext2D, f: EffectFrame, R: number): void {
  const { k, time, tx: x, ty: y, s, hitK } = f;
  if (k < hitK) {
    const g = c.createRadialGradient(x, y - 150 * s, 2, x, y - 150 * s, 40 * s);
    g.addColorStop(0, `rgba(254,249,195,${0.5 * (k / hitK)})`);
    g.addColorStop(1, 'rgba(254,249,195,0)');
    c.fillStyle = g;
    c.beginPath(); c.arc(x, y - 150 * s, 40 * s, 0, Math.PI * 2); c.fill();
    return;
  }
  const q = afterHit(f);
  c.save();
  if (q < 0.15) {
    const g = c.createRadialGradient(x, y - 40 * s, 10 * s, x, y - 40 * s, 170 * s);
    g.addColorStop(0, 'rgba(255,255,255,0.55)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.beginPath(); c.arc(x, y - 40 * s, 170 * s, 0, Math.PI * 2); c.fill();
  }
  if (q < 0.55) {
    const top = y - 160 * s;
    const pts: [number, number][] = [[0, 0], [-7, 22], [5, 28], [-4, 52], [8, 58], [0, 82]];
    const scaleY = (y - top) / 82;
    c.lineJoin = 'round';
    c.lineCap = 'round';
    for (const [w, col] of [[16, 'rgba(253,224,71,0.45)'], [6, '#fffbe6']] as [number, string][]) {
      c.strokeStyle = col;
      c.lineWidth = w * Math.max(0.6, s / 2.2) * 1.3;
      c.beginPath();
      pts.forEach(([px, py], i) => (i ? c.lineTo(x + px * s * 1.3, top + py * scaleY) : c.moveTo(x + px * s * 1.3, top + py * scaleY)));
      c.stroke();
    }
    const flick = Math.floor(time * 20);
    c.strokeStyle = 'rgba(254,249,195,0.9)';
    c.lineWidth = 2 * s;
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.6;
      const bx = x + Math.cos(a) * R * 0.6;
      const by = y + Math.sin(a) * R * 0.3;
      zigzag(c, bx + 6 * s, by - 110 * s, bx, by, 6, 6 * s, flick * 11 + i);
    }
  }
  if (q > 0.1) {
    const r = (q - 0.1) / 0.9;
    c.strokeStyle = `rgba(253,224,71,${1 - r})`;
    c.lineWidth = 2;
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const r1 = 8 * s + r * 26 * s;
      const r2 = r1 + 8 * s;
      c.beginPath();
      c.moveTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1 * 0.5);
      c.lineTo(x + Math.cos(a) * r2, y + Math.sin(a) * r2 * 0.5);
      c.stroke();
    }
  }
  c.restore();
}

// 水LV2: 中心が泡立つ → 白く光り、太い水柱と斜めの水流が一気に噴き出す。しぶきが2回に分けて尾を引きながら飛び散り、水の壁・霧・波紋が広がる
function drawSplash(c: CanvasRenderingContext2D, f: EffectFrame, R: number): void {
  const { k, time, tx: x, ty: y, s, hitK } = f;
  if (k < hitK) {
    const charge = k / hitK;
    c.fillStyle = `rgba(147,197,253,${0.35 + 0.4 * charge})`;
    for (let i = 0; i < 6; i++) {
      const life = (time * 2.2 + i / 6) % 1;
      const a = i * 2.1;
      c.beginPath(); c.arc(x + Math.cos(a) * 10 * s * life, y - life * 12 * s * charge, (2 + 2 * charge) * s * (1 - life), 0, Math.PI * 2); c.fill();
    }
    return;
  }
  const q = afterHit(f);
  c.save();
  if (q < 0.12) {
    const g = c.createRadialGradient(x, y - 30 * s, 5 * s, x, y - 30 * s, R * 1.4);
    g.addColorStop(0, `rgba(240,249,255,${0.75 * (1 - q / 0.12)})`);
    g.addColorStop(1, 'rgba(56,189,248,0)');
    c.fillStyle = g;
    c.beginPath(); c.arc(x, y - 30 * s, R * 1.4, 0, Math.PI * 2); c.fill();
  }
  // 足元に広がる霧
  c.save(); c.translate(x, y); c.scale(1, 0.5);
  c.fillStyle = `rgba(224,242,254,${0.35 * Math.max(0, 1 - q)})`;
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + time * 0.5;
    const rr = R * (0.2 + 0.8 * Math.min(1, q * 2));
    c.beginPath(); c.arc(Math.cos(a) * rr, Math.sin(a) * rr, (14 + 10 * q) * s, 0, Math.PI * 2); c.fill();
  }
  c.restore();
  // 王冠のような水の壁
  if (q < 0.65) {
    const r = q / 0.65;
    const rr = R * (0.15 + 0.8 * Math.min(1, r * 1.5));
    c.globalAlpha = 1 - r;
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * Math.PI * 2 + rnd(i, 7) * 0.15;
      const px = x + Math.cos(a) * rr;
      const py = y + Math.sin(a) * rr * 0.5;
      const h = (28 + rnd(i, 5) * 26) * s * (1 - r * 0.5);
      poly(c, [[px - 4 * s, py], [px + Math.cos(a) * h * 0.35, py - h], [px + 4 * s, py]], i % 2 ? 'rgba(191,219,254,0.9)' : 'rgba(240,249,255,0.9)');
    }
    c.globalAlpha = 1;
  }
  // 太い水柱と、斜めに飛び出す水流(ゆらぎながら崩れる)
  const up = q < 0.15 ? q / 0.15 : Math.max(0, 1 - (q - 0.35) / 0.3);
  if (up > 0) {
    for (const [ang, hm, wm] of [[0, 1, 1], [-0.45, 0.65, 0.55], [0.45, 0.65, 0.55], [-0.8, 0.45, 0.4], [0.8, 0.45, 0.4]]) {
      const hgt = Math.min(1, up) * 140 * s * hm;
      const w = 26 * s * wm;
      const wob = Math.sin(time * 30 + ang * 5) * 3 * s;
      c.save(); c.translate(x, y); c.rotate(ang);
      const g = c.createLinearGradient(0, -hgt, 0, 0);
      g.addColorStop(0, 'rgba(240,249,255,0.95)');
      g.addColorStop(0.5, 'rgba(96,165,250,0.9)');
      g.addColorStop(1, 'rgba(29,78,216,0.9)');
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(-w, 0);
      c.quadraticCurveTo(-w * 0.45 + wob, -hgt * 0.6, -w * 0.2, -hgt);
      c.quadraticCurveTo(0, -hgt - 10 * s, w * 0.2, -hgt);
      c.quadraticCurveTo(w * 0.45 - wob, -hgt * 0.6, w, 0);
      c.closePath();
      c.fill();
      c.restore();
    }
  }
  // 飛び散るしぶき(2回に分けて噴き出す。尾を引いて放物線を描き、地面で消える)
  c.lineCap = 'round';
  for (const [start, n, seed] of [[0, 70, 1], [0.22, 50, 2]]) {
    for (let i = 0; i < n; i++) {
      const j = i + seed * 100;
      const a = rnd(j, 1) * Math.PI * 2;
      const sp = (0.4 + rnd(j, 2) * 0.9) * R;
      const vz = (80 + rnd(j, 3) * 120) * s;
      const t = Math.min(1, (q - start) * (1.2 + rnd(j, 4) * 0.6));
      if (t <= 0 || t >= 1) continue;
      const pos = (tt: number): [number, number] => [x + Math.cos(a) * sp * tt, y + Math.sin(a) * sp * tt * 0.5 - Math.max(0, vz * 1.6 * tt * (1 - tt))];
      const [px, py] = pos(t);
      const [bx, by] = pos(Math.max(0, t - 0.08));
      const alpha = 0.95 * (1 - t * 0.5);
      const col = j % 3 ? `rgba(147,197,253,${alpha})` : `rgba(240,249,255,${alpha})`;
      const rr = (2.5 + rnd(j, 6) * 3) * s;
      c.strokeStyle = col;
      c.lineWidth = rr * 1.2;
      c.beginPath(); c.moveTo(bx, by); c.lineTo(px, py); c.stroke();
      c.fillStyle = col;
      c.beginPath(); c.arc(px, py, rr, 0, Math.PI * 2); c.fill();
    }
  }
  // 地面に広がる波紋
  c.translate(x, y); c.scale(1, 0.5);
  for (let i = 0; i < 4; i++) {
    const r = q * 1.4 - i * 0.15;
    if (r <= 0 || r >= 1) continue;
    c.strokeStyle = `rgba(186,230,253,${0.9 * (1 - r)})`;
    c.lineWidth = 4 * s * (1 - r) + 0.5;
    c.beginPath(); c.arc(0, 0, R * (0.2 + r), 0, Math.PI * 2); c.stroke();
  }
  c.restore();
}

// 炎LV2: 魔法陣いっぱいに大きな火柱が噴き上がり、炎の輪が地面を走って広がる。火の粉が飛び散る
function drawBlaze(c: CanvasRenderingContext2D, f: EffectFrame, R: number): void {
  const { time, tx: x, ty: y, s } = f;
  const q = afterHit(f);
  if (q < 0) return;
  c.save();
  if (q < 0.18) {
    const g = c.createRadialGradient(x, y - 30 * s, 5 * s, x, y - 30 * s, R * 1.3);
    g.addColorStop(0, `rgba(255,237,213,${0.7 * (1 - q / 0.18)})`);
    g.addColorStop(1, 'rgba(249,115,22,0)');
    c.fillStyle = g;
    c.beginPath(); c.arc(x, y - 30 * s, R * 1.3, 0, Math.PI * 2); c.fill();
  }
  // 地面を走って広がる炎の輪
  if (q < 0.75) {
    const r = q / 0.75;
    const rr = R * (0.25 + 0.75 * Math.min(1, r * 1.6));
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2 + rnd(i, 7) * 0.2;
      const px = x + Math.cos(a) * rr;
      const py = y + Math.sin(a) * rr * 0.5;
      const h = (16 + rnd(i, 8) * 14 + Math.sin(time * 20 + i) * 4) * s * (1 - r);
      const g = c.createLinearGradient(0, py - h, 0, py);
      g.addColorStop(0, 'rgba(220,38,38,0)');
      g.addColorStop(0.5, 'rgba(251,128,30,0.8)');
      g.addColorStop(1, 'rgba(255,214,90,0.95)');
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(px - 6 * s, py);
      c.quadraticCurveTo(px - 4 * s, py - h * 0.6, px, py - h);
      c.quadraticCurveTo(px + 4 * s, py - h * 0.6, px + 6 * s, py);
      c.closePath();
      c.fill();
    }
  }
  // 大きな火柱(すぐ伸びきり、後半で縮む)
  const hgt = Math.sin(Math.min(1, q * 4) * Math.PI * 0.5) * 120 * s * (q > 0.55 ? Math.max(0, (1 - q) / 0.45) : 1);
  if (hgt > 1) fireParticles(c, time * 1.3, x, y, s, hgt, R * 0.9, 90, 1.35);
  // 飛び散る火の粉
  c.globalAlpha = 1 - q;
  c.fillStyle = 'rgba(255,214,90,0.9)';
  for (let i = 0; i < 22; i++) {
    const a = rnd(i, 30) * Math.PI * 2;
    const sp = (0.4 + rnd(i, 31) * 0.7) * R * q;
    c.beginPath(); c.arc(x + Math.cos(a) * sp, y - (90 * q - 70 * q * q) * s * (0.6 + rnd(i, 32)) + Math.sin(a) * sp * 0.5, 2 * s, 0, Math.PI * 2); c.fill();
  }
  c.restore();
}

// 風LV2: 大きな竜巻が立ち、まわりを風の刃(三日月形)が切り裂きながら回る。葉っぱが巻き上がる
function drawGale(c: CanvasRenderingContext2D, f: EffectFrame, R: number): void {
  const { time, tx: x, ty: y, s } = f;
  const q = afterHit(f);
  if (q < 0) return;
  const fade = q > 0.65 ? Math.max(0, 1 - (q - 0.65) / 0.35) : 1;
  c.save();
  c.globalAlpha = fade;
  c.translate(x, y); c.scale(1, 0.5);
  c.lineCap = 'round';
  for (let i = 0; i < 5; i++) {
    const a = time * 9 + (i / 5) * Math.PI * 2;
    const rr = R * (0.45 + 0.4 * Math.min(1, q * 3)) * (0.9 + 0.1 * Math.sin(i * 3 + time * 5));
    for (const [w, col] of [[7 * s, 'rgba(74,222,128,0.35)'], [2.4 * s, 'rgba(240,253,244,0.95)']] as [number, string][]) {
      c.strokeStyle = col;
      c.lineWidth = w;
      c.beginPath(); c.arc(0, 0, rr, a, a + 0.9); c.stroke();
    }
  }
  c.restore();
  tornado(c, Math.min(1, q / 0.2), fade, time, x, y, s, 1.6);
  c.save();
  c.globalAlpha = fade;
  for (let i = 0; i < 14; i++) {
    const life = (time * 1.1 + rnd(i, 40)) % 1;
    const a = time * 7 + i * 2.3;
    const rr = R * (0.85 - life * 0.5);
    c.fillStyle = i % 2 ? 'rgba(74,222,128,0.9)' : 'rgba(134,239,172,0.9)';
    c.beginPath(); c.ellipse(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.5 - life * 110 * s, 3.5 * s, 1.8 * s, a, 0, Math.PI * 2); c.fill();
  }
  c.restore();
}

// 闇LV2(前の魔法陣 front#327): 魔法陣から太い闇の柱が立ちのぼる(当たる時に伸びきる)。当たると白く光り、闇のかけらが飛び散る
function drawDarkPillar(c: CanvasRenderingContext2D, f: EffectFrame, R: number): void {
  const { k, time, tx: x, ty: y, s, hitK } = f;
  // 柱は、当たるまでの後ろの4割で伸びる
  const pillarK = hitK * (LV2_CAST / (LV2_CAST + LV2_RISE));
  // 太さは魔法陣の7割くらい
  if (k >= pillarK) drawDarkColumn(c, Math.min(1, ((k - pillarK) / (hitK - pillarK)) * 0.3), time, x, y, s, Math.max(1, (R * 0.7) / (15 * s)));
  const q = afterHit(f);
  if (q < 0) return;
  if (q < 0.25) {
    c.fillStyle = `rgba(255,255,255,${0.5 * (1 - q / 0.25)})`;
    c.beginPath(); c.ellipse(x, y - 10 * s, R * 0.9, R * 0.45, 0, 0, Math.PI * 2); c.fill();
  }
  for (let i = 0; i < 14; i++) {
    const n1 = Math.sin(i * 5.3 * 12.9898) * 43758.5453;
    const n2 = Math.sin(i * 9.1 * 12.9898) * 43758.5453;
    const a = (n1 - Math.floor(n1)) * Math.PI * 2;
    const sp = (30 + (n2 - Math.floor(n2)) * 50) * s;
    const px = x + Math.cos(a) * sp * q;
    const py = y - 12 * s - (60 * q - 70 * q * q) * s - Math.sin(a) * sp * q * 0.3;
    poly(c, [[px, py - 3 * s], [px + 2 * s, py], [px, py + 3 * s], [px - 2 * s, py]], i % 3 ? `rgba(27,11,51,${1 - q})` : `rgba(168,85,247,${1 - q})`);
  }
}

// 衝撃波: 足元が一瞬赤く光り、輪がすばやく広がって薄くなる
function drawShockwave(c: CanvasRenderingContext2D, k: number, time: number, x: number, y: number, r: number): void {
  c.save(); c.translate(x, y); c.scale(1, 0.5);
  if (k < 0.25) {
    c.fillStyle = `rgba(239,68,68,${0.15 + Math.sin(time * 20) * 0.08})`;
    c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill();
  } else {
    const q = Math.min(1, (k - 0.25) / 0.35);
    c.strokeStyle = `rgba(255,255,255,${Math.max(0, 1 - (k - 0.25) / 0.75)})`;
    c.lineWidth = 6;
    c.beginPath(); c.arc(0, 0, r * q, 0, Math.PI * 2); c.stroke();
  }
  c.restore();
}

// ===== 海の敵(front#421) =====

// カニ。横に長いこうらと、大きなハサミ2つ。歩くと足を細かく動かし、襲ってくるときはハサミを振り上げる
function drawCrab(c: CanvasRenderingContext2D, def: EnemyDef, p: EnemyPose): number {
  const t = p.time + (p.seed ?? 0);
  const d = p.dir;
  const bob = p.moving ? Math.abs(Math.sin(t * 14)) * 1.2 : Math.sin(t * 2) * 0.4;
  const lunge = (p.lunge ?? 0) * 7;
  const body = p.flash ? '#fff' : def.color;
  const dark = p.flash ? '#fff' : def.dark;
  shadow(c, 18, 6);
  c.save();
  c.translate(d * lunge, 0);
  // 足(左右に3本ずつ)
  c.strokeStyle = dark;
  c.lineWidth = 2;
  c.lineCap = 'round';
  for (const s of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const wig = p.moving ? Math.sin(t * 16 + i * 2 + (s > 0 ? Math.PI : 0)) * 2 : 0;
      c.beginPath();
      c.moveTo(s * 9, -7 - bob + i * 1.5);
      c.quadraticCurveTo(s * 17, -12 - bob + i * 2, s * (18 + i * 1.5), wig * 0.4);
      c.stroke();
    }
  }
  // ハサミ(襲ってくるときは高く振り上げ、開け閉めする)
  const raise = p.aggro ? 6 + Math.sin(t * 8) * 2 : 0;
  const snap = Math.abs(Math.sin(t * (p.aggro ? 9 : 2))) * 0.5;
  for (const s of [-1, 1]) {
    const hx = s * 18;
    const hy = -17 - bob - raise;
    c.strokeStyle = body;
    c.lineWidth = 3;
    c.beginPath(); c.moveTo(s * 10, -11 - bob); c.lineTo(hx, hy + 3); c.stroke();
    c.save();
    c.translate(hx, hy);
    c.rotate(s * -0.3);
    c.fillStyle = body;
    c.beginPath(); c.ellipse(0, 0, 6.5, 5, 0, 0, Math.PI * 2); c.fill();
    // はさみの刃(上・下)
    c.fillStyle = dark;
    c.beginPath(); c.moveTo(0, -2); c.lineTo(s * 9, -6 - snap * 5); c.lineTo(s * 4, -1); c.closePath(); c.fill();
    c.fillStyle = body;
    c.beginPath(); c.moveTo(0, 1); c.lineTo(s * 9, -1 + snap * 2); c.lineTo(s * 3, 3); c.closePath(); c.fill();
    c.restore();
  }
  // こうら
  const g = c.createRadialGradient(-3, -14 - bob, 2, 0, -10 - bob, 16);
  g.addColorStop(0, p.flash ? '#fff' : mix(def.color, '#ffffff', 0.3));
  g.addColorStop(1, dark);
  c.fillStyle = g;
  c.beginPath(); c.ellipse(0, -10 - bob, 13, 8, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.25)';
  c.beginPath(); c.ellipse(-4, -14 - bob, 4, 2, -0.3, 0, Math.PI * 2); c.fill();
  // 飛び出した目
  c.strokeStyle = dark;
  c.lineWidth = 1.6;
  for (const s of [-1, 1]) {
    c.beginPath(); c.moveTo(s * 4, -16 - bob); c.lineTo(s * 5 + d, -22 - bob); c.stroke();
    c.fillStyle = '#fff';
    c.beginPath(); c.arc(s * 5 + d, -23 - bob, 2.4, 0, Math.PI * 2); c.fill();
    c.fillStyle = p.aggro ? '#dc2626' : '#1f2937';
    c.beginPath(); c.arc(s * 5 + d * 1.6, -23 - bob, 1.3, 0, Math.PI * 2); c.fill();
  }
  c.restore();
  return 30 + raise;
}

// クラゲ。半透明のかさがふわふわ上下し、長い足がゆらめく。襲ってくるときは体がぴりぴり光る
function drawJellyfish(c: CanvasRenderingContext2D, def: EnemyDef, p: EnemyPose): number {
  const t = p.time + (p.seed ?? 0);
  const d = p.dir;
  const fl = Math.sin(t * 2.4) * 4;
  const pulse = Math.sin(t * 4.8) * 0.08;
  const cy = -34 + fl;
  const lunge = p.lunge ?? 0;
  const dark = p.flash ? '#fff' : def.dark;
  shadow(c, 10, 3.5, 0.12);
  c.save();
  c.translate(d * lunge * 8, 0);
  // 足
  c.strokeStyle = hexA(dark, 0.75);
  c.lineCap = 'round';
  for (let i = -3; i <= 3; i++) {
    c.lineWidth = i % 2 ? 1.2 : 2;
    c.beginPath();
    c.moveTo(i * 3.2, cy + 2);
    for (let k = 1; k <= 6; k++) c.lineTo(i * 3.2 + Math.sin(t * 3.5 + k * 0.9 + i) * (1 + k * 0.5), cy + 2 + k * 4.2);
    c.stroke();
  }
  // かさ(半透明)
  const rx = 14 * (1 + pulse);
  const ry = 13 * (1 - pulse);
  const g = c.createRadialGradient(-4, cy - ry * 0.6, 1, 0, cy - ry * 0.3, rx * 1.2);
  g.addColorStop(0, p.flash ? '#fff' : hexA(mixHex(def.color, '#ffffff', 0.6), 0.95));
  g.addColorStop(1, p.flash ? '#fff' : hexA(def.color, 0.75));
  c.fillStyle = g;
  c.beginPath();
  c.ellipse(0, cy, rx, ry, 0, Math.PI, 0);
  c.quadraticCurveTo(rx * 0.5, cy + 4, 0, cy + 2);
  c.quadraticCurveTo(-rx * 0.5, cy + 4, -rx, cy);
  c.fill();
  c.strokeStyle = hexA(dark, 0.6);
  c.lineWidth = 1;
  c.stroke();
  // 目
  eyes(c, d * 2, cy - 5, 4, 1.6, 2.2, p.aggro ? '#dc2626' : '#1f2937');
  // しびれの光(襲ってくるとき)
  if (p.aggro && Math.sin(t * 11) > 0.4) {
    c.strokeStyle = '#fde047';
    c.lineWidth = 1.6;
    for (const s of [-1, 1]) {
      c.beginPath();
      c.moveTo(s * (rx + 2), cy - 6); c.lineTo(s * (rx + 6), cy - 2); c.lineTo(s * (rx + 3), cy); c.lineTo(s * (rx + 8), cy + 5);
      c.stroke();
    }
  }
  c.restore();
  return 50 - fl;
}

// 魚人(サハギン)。うろこの体に魚の頭、背びれ、三叉の槍を持って二本足で歩く
function drawFishman(c: CanvasRenderingContext2D, def: EnemyDef, p: EnemyPose): number {
  const t = p.time + (p.seed ?? 0);
  const d = p.dir;
  const step = p.moving ? Math.sin(t * 10) : 0;
  const bob = p.moving ? Math.abs(Math.sin(t * 10)) * 1.2 : Math.sin(t * 2) * 0.5;
  const lunge = p.lunge ?? 0;
  const body = p.flash ? '#fff' : def.color;
  const dark = p.flash ? '#fff' : def.dark;
  const belly = p.flash ? '#fff' : mix(def.color, '#ffffff', 0.55);
  shadow(c, 13, 4.5);
  c.save();
  c.translate(d * lunge * 6, 0);
  // 足
  c.strokeStyle = dark;
  c.lineWidth = 4;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(-4, -14); c.lineTo(-5 - step * 3, 0);
  c.moveTo(4, -14); c.lineTo(5 + step * 3, 0);
  c.stroke();
  // 槍(前の手)。突くときは前へ倒す
  const hx = d * 9;
  const hy = -24 - bob;
  c.save();
  c.translate(hx, hy);
  c.rotate(d * (0.15 + lunge * 1.1));
  c.strokeStyle = p.flash ? '#fff' : '#8b6b3e';
  c.lineWidth = 2;
  c.beginPath(); c.moveTo(0, 14); c.lineTo(0, -26); c.stroke();
  c.strokeStyle = p.flash ? '#fff' : '#cbd5e1';
  c.lineWidth = 1.6;
  c.beginPath();
  c.moveTo(-4, -26); c.lineTo(-4, -32); c.moveTo(0, -26); c.lineTo(0, -35); c.moveTo(4, -26); c.lineTo(4, -32);
  c.moveTo(-4, -26); c.lineTo(4, -26);
  c.stroke();
  c.restore();
  // 背びれ
  poly(c, [[-d * 3, -40 - bob], [-d * 10, -48 - bob], [-d * 12, -34 - bob], [-d * 7, -30 - bob]], dark);
  // 胴(うろこ)
  const g = c.createLinearGradient(-9, 0, 9, 0);
  g.addColorStop(0, body);
  g.addColorStop(1, dark);
  c.fillStyle = g;
  c.beginPath(); c.ellipse(0, -22 - bob, 9.5, 11, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = belly;
  c.beginPath(); c.ellipse(d * 2, -20 - bob, 5, 8, 0, 0, Math.PI * 2); c.fill();
  c.strokeStyle = hexA(dark, 0.5);
  c.lineWidth = 0.8;
  for (let i = 0; i < 3; i++) {
    c.beginPath(); c.arc(-d * 4, -27 - bob + i * 5, 2.4, 0.2, Math.PI - 0.2); c.stroke();
  }
  // 腕(槍を持つ手)
  c.strokeStyle = body;
  c.lineWidth = 3.4;
  c.beginPath(); c.moveTo(d * 5, -27 - bob); c.lineTo(hx, hy); c.stroke();
  // 頭(魚の顔: 前に突き出た口)
  c.fillStyle = body;
  c.beginPath(); c.ellipse(d * 2, -38 - bob, 9, 7.5, d * 0.15, 0, Math.PI * 2); c.fill();
  c.fillStyle = belly;
  c.beginPath(); c.ellipse(d * 7, -35 - bob, 4, 2.6, 0, 0, Math.PI * 2); c.fill();
  // えら
  c.strokeStyle = dark;
  c.lineWidth = 1;
  c.beginPath(); c.arc(-d * 2, -37 - bob, 3.5, -0.8, 0.8); c.stroke();
  // 目(大きくて丸い)
  c.fillStyle = '#fef9c3';
  c.beginPath(); c.arc(d * 5, -41 - bob, 3, 0, Math.PI * 2); c.fill();
  c.fillStyle = p.aggro ? '#dc2626' : '#1f2937';
  c.beginPath(); c.arc(d * 5.6, -41 - bob, 1.6, 0, Math.PI * 2); c.fill();
  c.restore();
  return 50;
}

// イカ(クラーケン)。とがった頭(ひれつき)の下に大きな目、10本の足がうねる。ボス向けの大きな形
function drawKraken(c: CanvasRenderingContext2D, def: EnemyDef, p: EnemyPose): number {
  const t = p.time + (p.seed ?? 0);
  const d = p.dir;
  const bob = Math.sin(t * 1.6) * 2;
  const lunge = p.lunge ?? 0;
  const body = p.flash ? '#fff' : def.color;
  const dark = p.flash ? '#fff' : def.dark;
  shadow(c, 26, 9, 0.22);
  c.save();
  c.translate(d * lunge * 6, 0);
  // 足(地面をはうように左右へ広がる。いちばん外の2本は長く、襲うときに持ち上げる)
  c.lineCap = 'round';
  for (let i = 0; i < 10; i++) {
    const s = i % 2 ? 1 : -1;
    const k = Math.floor(i / 2);
    const long = k === 4;
    const reach = long ? 34 : 14 + k * 4.5;
    const lift = long && p.aggro ? 18 + Math.sin(t * 5) * 6 : 0;
    c.strokeStyle = k % 2 ? dark : body;
    c.lineWidth = long ? 4 : 5 - k * 0.5;
    c.beginPath();
    c.moveTo(s * (4 + k), -14 - bob);
    for (let j = 1; j <= 6; j++) {
      const q = j / 6;
      const wave = Math.sin(t * 3 + j * 0.9 + i) * 3 * q;
      c.lineTo(s * (4 + k + reach * q) + wave, -14 - bob + q * (12 + k * 1.5) - lift * Math.sin(q * Math.PI) + wave * 0.4);
    }
    c.stroke();
  }
  // 胴(とがった頭)
  const g = c.createLinearGradient(-16, 0, 16, 0);
  g.addColorStop(0, p.flash ? '#fff' : mix(def.color, '#ffffff', 0.2));
  g.addColorStop(1, dark);
  c.fillStyle = g;
  c.beginPath();
  c.moveTo(0, -78 - bob);
  c.quadraticCurveTo(20, -50 - bob, 15, -18 - bob);
  c.lineTo(-15, -18 - bob);
  c.quadraticCurveTo(-20, -50 - bob, 0, -78 - bob);
  c.fill();
  // ひれ
  poly(c, [[-7, -70 - bob], [-21, -66 - bob], [-12, -54 - bob]], dark);
  poly(c, [[7, -70 - bob], [21, -66 - bob], [12, -54 - bob]], dark);
  // 斑点
  c.fillStyle = p.flash ? '#fff' : hexA(mixHex(def.color, '#ffffff', 0.5), 0.7);
  for (const [x, y] of [[-5, -52], [6, -44], [-2, -36], [8, -60], [-8, -40]]) {
    c.beginPath(); c.arc(x, y - bob, 1.8, 0, Math.PI * 2); c.fill();
  }
  // 目(横長の黒目。襲ってくるときは赤く光る)
  for (const s of [-1, 1]) {
    c.fillStyle = '#fef08a';
    c.beginPath(); c.ellipse(s * 7 + d * 1.5, -26 - bob, 5, 4, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = p.aggro ? '#dc2626' : '#111827';
    c.fillRect(s * 7 + d * 2 - 3, -27 - bob, 6, 2);
  }
  c.restore();
  return 82;
}

// #rrggbb を、透明度 a の rgba() にする
function hexA(hex: string, a: number): string {
  if (!hex.startsWith('#')) return hex;
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}

// 2つの #rrggbb を t の割合で混ぜて、#rrggbb で返す(hexA に渡せるように)
function mixHex(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (sh: number) => Math.round(((pa >> sh) & 255) * (1 - t) + ((pb >> sh) & 255) * t);
  return '#' + [16, 8, 0].map((sh) => ch(sh).toString(16).padStart(2, '0')).join('');
}
