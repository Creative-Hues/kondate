// 確定した献立の1品を変える(確定後の再編集)ための条件づくり(純粋関数)
// 候補の選び方は、提案の画面と同じ swapDish・pinDish を、その1日分だけに使う
import type { MealSet } from '../../db/types';
import { stocksWithDayReturned } from '../mealSet';
import { otherDayRecipeIds } from './rebuild';
import type { PlannedDay, PlannerData, PlanRequest } from './types';

/** 料理を変えられる日か:「予定」の日だけ(「作った」・キャンセルした日は変えない) */
export function canEditDay(set: MealSet, dayIndex: number): boolean {
  return set.days[dayIndex]?.status === '予定';
}

/**
 * 1日分の条件。メンバーはその日のまま、条件は献立を作ったときのまま。
 * 同じ献立セットのほかの日で使っているレシピは選ばない
 */
export function editDayRequest(set: MealSet, dayIndex: number): PlanRequest {
  const day = set.days[dayIndex];
  return {
    days: day ? [{ date: day.date, memberIds: [...day.memberIds] }] : [],
    conditions: set.conditions,
    fixed: [],
    excludeRecipeIds: otherDayRecipeIds(set, dayIndex),
  };
}

/** 献立セットの1日を、提案の1日分の形にする */
export function plannedDayOf(set: MealSet, dayIndex: number): PlannedDay {
  const d = set.days[dayIndex];
  return {
    date: d.date,
    memberIds: [...d.memberIds],
    mainId: d.mainId,
    sideId: d.sideId,
    soupId: d.soupId,
    overLimit: set.overLimitDays.includes(dayIndex),
  };
}

/** 候補選び用のデータ:その日に確保した食材を在庫に戻したとして、在庫の見込みを計算する */
export function editPlannerData(set: MealSet, dayIndex: number, data: PlannerData): PlannerData {
  return { ...data, stocks: stocksWithDayReturned(set, dayIndex, data.stocks) };
}
