// 食材のジャンル(在庫の一覧を「ジャンル順」に並べるときの見出し)
// 並び順は冷蔵庫や売り場を見る順に近づけている。食品グループ(赤・緑・黄)とは別のもの
import type { FoodKind } from '../db/types';

export const GENRES = [
  '肉',
  '魚介',
  '卵・乳製品',
  '豆腐・大豆製品',
  '葉物野菜',
  'その他の野菜',
  '根菜・いも',
  'きのこ',
  '海藻・乾物',
  '主食・麺',
  '加工品・缶詰',
  '調味料',
  'その他',
] as const;

export type Genre = (typeof GENRES)[number];

/** ジャンルを決めていない食材の初期値:調味料は「調味料」、それ以外は「その他」 */
export function defaultGenre(kind: FoodKind): Genre {
  return kind === '調味料' ? '調味料' : 'その他';
}

/** 初期食材のジャンル(調味料はすべて「調味料」なので書かない) */
const GENRE_GROUPS: Readonly<Record<Exclude<Genre, '調味料' | 'その他'>, readonly string[]>> = {
  肉: ['pork_koma', 'pork_bara', 'pork_loin', 'pork_mince', 'mixed_mince', 'chicken_thigh', 'chicken_breast', 'chicken_tender', 'chicken_wing', 'chicken_mince', 'beef_koma'],
  魚介: ['salmon', 'mackerel', 'yellowtail', 'cod', 'shrimp', 'squid', 'clam'],
  '卵・乳製品': ['egg', 'milk', 'cheese'],
  '豆腐・大豆製品': ['tofu', 'fried_tofu', 'atsuage', 'natto', 'soybeans', 'soy_milk'],
  葉物野菜: ['cabbage', 'chinese_cabbage', 'lettuce', 'spinach', 'komatsuna', 'bok_choy', 'mizuna', 'nira', 'scallion', 'ooba'],
  その他の野菜: ['green_pepper', 'bell_pepper', 'eggplant', 'cucumber', 'tomato', 'cherry_tomato', 'broccoli', 'bean_sprouts', 'green_onion', 'pumpkin', 'green_beans', 'okra', 'asparagus'],
  '根菜・いも': ['onion', 'carrot', 'daikon', 'burdock', 'lotus', 'ginger', 'garlic', 'potato', 'sweet_potato', 'taro'],
  きのこ: ['shiitake', 'dried_shiitake', 'shimeji', 'enoki', 'maitake', 'nameko', 'eringi'],
  '海藻・乾物': ['wakame', 'hijiki', 'nori', 'kiriboshi', 'harusame', 'fu'],
  '主食・麺': ['rice', 'udon', 'spaghetti', 'gyoza_skin'],
  '加工品・缶詰': ['ham', 'bacon', 'sausage', 'tuna_can', 'mackerel_can', 'chikuwa', 'kamaboko', 'tomato_can', 'corn_can', 'kimchi', 'konnyaku'],
};

/** 初期食材ID → ジャンル */
export const GENRE_BY_FOOD: ReadonlyMap<string, Genre> = new Map(
  (Object.entries(GENRE_GROUPS) as [Genre, readonly string[]][]).flatMap(([genre, ids]) => ids.map((id) => [id, genre] as const)),
);

/** 初期食材のジャンル。表にない食材は種類から決める */
export function seedGenre(id: string, kind: FoodKind): Genre {
  return kind === '調味料' ? '調味料' : (GENRE_BY_FOOD.get(id) ?? defaultGenre(kind));
}
