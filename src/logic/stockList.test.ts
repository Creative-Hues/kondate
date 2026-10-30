import { describe, expect, it } from 'vitest';
import { INITIAL_FOODS } from '../data/foods';
import type { Stock } from '../db/types';
import { daysUntilShelfLife, filterStockRows, parseStockSort, sortStockRows, type StockRow } from './stockList';

const food = (id: string) => {
  const f = INITIAL_FOODS.find((x) => x.id === id);
  if (!f) throw new Error(id);
  return f;
};
const row = (id: string, addedDate: string, amount = 1): StockRow => ({
  stock: { foodId: id, amount, addedDate } satisfies Stock,
  food: food(id),
});

// キャベツ(葉物・目安14日)、白菜(葉物・7日)、豚こま(肉・3日)、にんじん(根菜・14日)
const rows = [row('cabbage', '2026-10-20'), row('chinese_cabbage', '2026-10-25'), row('pork_koma', '2026-10-28'), row('carrot', '2026-10-10')];
const today = '2026-10-30';

describe('在庫の一覧の絞り込み', () => {
  it('名前・別名で、ひらがな・カタカナ・半角の違いを気にせず探せる', () => {
    expect(filterStockRows(rows, 'はくさい').map((r) => r.food.id)).toEqual(['chinese_cabbage']);
    expect(filterStockRows(rows, 'ｷｬﾍﾞﾂ').map((r) => r.food.id)).toEqual(['cabbage']);
    // 別名「人参」
    expect(filterStockRows(rows, '人参').map((r) => r.food.id)).toEqual(['carrot']);
    expect(filterStockRows(rows, ' ').length).toBe(4);
    expect(filterStockRows(rows, 'ズッキーニ')).toEqual([]);
  });
});

describe('在庫の一覧の並び替え', () => {
  it('ジャンル順:ジャンルの決まった順に見出しを付け、同じジャンルは名前順', () => {
    const groups = sortStockRows(rows, 'genre', today);
    expect(groups.map((g) => g.genre)).toEqual(['肉', '葉物野菜', '根菜・いも']);
    expect(groups[1].rows.map((r) => r.food.name)).toEqual(['キャベツ', '白菜']);
  });

  it('追加日順:追加日が古い順、見出しなし', () => {
    const groups = sortStockRows(rows, 'added', today);
    expect(groups).toHaveLength(1);
    expect(groups[0].genre).toBeNull();
    expect(groups[0].rows.map((r) => r.food.id)).toEqual(['carrot', 'cabbage', 'chinese_cabbage', 'pork_koma']);
  });

  it('目安が近い順:保存の目安までの日数が少ない順(過ぎたものが先)', () => {
    // にんじん 10/24まで(-6)、キャベツ 11/3(+4)、豚こま 10/31(+1)、白菜 11/1(+2)
    expect(daysUntilShelfLife(rows[3].stock, rows[3].food, today)).toBe(-6);
    const groups = sortStockRows(rows, 'shelf', today);
    expect(groups[0].rows.map((r) => r.food.id)).toEqual(['carrot', 'pork_koma', 'chinese_cabbage', 'cabbage']);
  });

  it('在庫が空なら、まとまりも空', () => {
    expect(sortStockRows([], 'genre', today)).toEqual([]);
    expect(sortStockRows([], 'added', today)).toEqual([]);
  });

  it('保存しておいた並び順が読めなければ、ジャンル順', () => {
    expect(parseStockSort('shelf')).toBe('shelf');
    expect(parseStockSort(null)).toBe('genre');
    expect(parseStockSort('abc')).toBe('genre');
  });
});
