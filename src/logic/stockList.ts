// 在庫の一覧の絞り込みと並び替え(純粋関数)
import { GENRES, type Genre } from '../data/genres';
import type { DateString, Food, Stock } from '../db/types';
import { addDays, diffDays } from './date';
import { normalizeForSearch } from './foodSearch';

/** 並び順:ジャンル順・追加日が古い順・保存の目安が近い順 */
export type StockSort = 'genre' | 'added' | 'shelf';

export const STOCK_SORTS: readonly { id: StockSort; label: string }[] = [
  { id: 'genre', label: 'ジャンル順' },
  { id: 'added', label: '追加日順' },
  { id: 'shelf', label: '目安が近い順' },
];

export interface StockRow {
  stock: Stock;
  food: Food;
}

/** 一覧の見出しごとのまとまり。ジャンル順のときだけ見出し(genre)があり、ほかは1つのまとまりで見出しなし */
export interface StockGroup {
  genre: Genre | null;
  rows: StockRow[];
}

/** 食材名と別名で絞り込む(ひらがな・カタカナ・半角の違いは同じとみなす)。空なら全部 */
export function filterStockRows(rows: readonly StockRow[], query: string): StockRow[] {
  const q = normalizeForSearch(query);
  if (q === '') return [...rows];
  return rows.filter((r) => [r.food.name, ...r.food.aliases].some((n) => normalizeForSearch(n).includes(q)));
}

/** 保存の目安まで、あと何日か(過ぎていれば負の数) */
export function daysUntilShelfLife(stock: Stock, food: Food, today: DateString): number {
  return diffDays(today, addDays(stock.addedDate, food.shelfLifeDays));
}

const byName = (a: StockRow, b: StockRow) => a.food.name.localeCompare(b.food.name, 'ja');

/** 並び替えて、見出しごとにまとめる */
export function sortStockRows(rows: readonly StockRow[], sort: StockSort, today: DateString): StockGroup[] {
  if (sort === 'genre') {
    return GENRES.map((genre) => ({ genre, rows: rows.filter((r) => r.food.genre === genre).sort(byName) })).filter(
      (g) => g.rows.length > 0,
    );
  }
  const sorted = [...rows].sort((a, b) => {
    if (sort === 'added') return a.stock.addedDate.localeCompare(b.stock.addedDate) || byName(a, b);
    return daysUntilShelfLife(a.stock, a.food, today) - daysUntilShelfLife(b.stock, b.food, today) || byName(a, b);
  });
  return sorted.length > 0 ? [{ genre: null, rows: sorted }] : [];
}

/** 保存しておいた並び順を読む(読めなければジャンル順) */
export function parseStockSort(value: string | null): StockSort {
  return STOCK_SORTS.some((s) => s.id === value) ? (value as StockSort) : 'genre';
}
