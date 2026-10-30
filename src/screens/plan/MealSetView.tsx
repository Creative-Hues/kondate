import { useMemo, useState } from 'react';
import { ErrorList } from '../../components/Field';
import { Sheet } from '../../components/Sheet';
import { db } from '../../db/db';
import { cancelDayInDb, cancelSetInDb, markCookedInDb, rebookDayInDb, unmarkCookedInDb } from '../../db/mealSetRepo';
import type { DateString, MealSet } from '../../db/types';
import type { PlannerSource } from '../../hooks/usePlannerData';
import { formatDayLabel, formatShortDate } from '../../logic/date';
import { randomId } from '../../logic/id';
import type { MealSetResult } from '../../logic/mealSet';
import { canEditDay, editDayRequest, editPlannerData, plannedDayOf } from '../../logic/planner/edit';
import { warningsForSlot } from '../../logic/planner/fixed';
import { pinDish } from '../../logic/planner/pin';
import { swapDish } from '../../logic/planner/swap';
import { COURSE_SLOTS, type Dishes, type PlannedDay } from '../../logic/planner/types';
import { canRebuildDay } from '../../logic/planner/rebuild';
import { summarizePlan, type DishDetail } from '../../logic/planner/summary';
import { formatDayTotal } from '../../logic/portion';
import { RecipeDetail } from '../RecipeDetail';
import { DayCard } from './DayCard';
import { EditDishSheet } from './EditDishSheet';
import { RecipePickerSheet } from './RecipePickerSheet';
import { ShoppingList } from './ShoppingList';

interface Editing {
  dayIndex: number;
  key: keyof Dishes;
  before: PlannedDay;
  after: PlannedDay;
  /** 入れ替えで、すでに見せた品 */
  shown: string[];
  mode: 'swap' | 'pick';
}

interface Props {
  set: MealSet;
  src: PlannerSource;
  today: DateString;
  /** 「この日の献立を作り直す」を押したとき */
  onRebuild: (set: MealSet, dayIndex: number) => void;
}

/** 確定した献立セット:作った(と取り消し)・キャンセル・作り直し・買い足し */
export function MealSetView({ set, src, today, onRebuild }: Props) {
  const [errors, setErrors] = useState<string[]>([]);
  const [opened, setOpened] = useState<{ dish: DishDetail; label: string } | null>(null);
  /** 料理を変える前の確認(入れ替え・選ぶのあと) */
  const [editing, setEditing] = useState<Editing | null>(null);
  /** 「選ぶ」で料理を選んでいる枠 */
  const [picking, setPicking] = useState<{ dayIndex: number; key: keyof Dishes } | null>(null);
  const [busy, setBusy] = useState(false);
  const recipesById = useMemo(() => new Map(src.data.recipes.map((r) => [r.id, r])), [src.data.recipes]);
  // 量・栄養・注意書きだけを見るので、在庫は使わない
  const summary = useMemo(() => summarizePlan(set.days, { ...src.data, stocks: [] }).days, [set.days, src.data]);
  const lastDate = set.days[set.days.length - 1]?.date ?? set.startDate;

  const run = async (action: () => Promise<MealSetResult>) => {
    const result = await action();
    setErrors(result.ok ? [] : [result.error]);
  };

  const cancelOne = (dayIndex: number) => {
    if (!window.confirm(`${formatDayLabel(set.days[dayIndex].date)}の献立をキャンセルして、食材を在庫に戻しますか?`)) return;
    void run(() => cancelDayInDb(db, set.id, dayIndex, new Date()));
  };

  const cancelAll = () => {
    // 「作った」の日はキャンセルされずに残るので、確認のときに知らせる
    const cooked = set.days.filter((d) => d.status === '作った').map((d) => formatShortDate(d.date));
    const keepNote = cooked.length > 0 ? `\n${cooked.join('・')}は作った日なので残ります。` : '';
    if (!window.confirm(`この献立をすべてキャンセルして、食材を在庫に戻しますか?${keepNote}`)) return;
    void run(() => cancelSetInDb(db, set.id, new Date()));
  };

  /** 入れ替え:今の品と、すでに見せた品を除いた中から、次に点数の高いものを出す */
  const swap = (dayIndex: number, key: keyof Dishes, shown: string[]) => {
    const before = plannedDayOf(set, dayIndex);
    const trySwap = (seen: string[]) =>
      swapDish(editDayRequest(set, dayIndex), editPlannerData(set, dayIndex, src.data), [before], 0, key, seen);
    let seen = [...new Set([before[key], ...shown])];
    let result = trySwap(seen);
    if (!result.ok && seen.length > 1) {
      // 候補をひと回り見せたら、最初から見せ直す
      seen = [before[key]];
      result = trySwap(seen);
    }
    if (!result.ok) {
      setErrors([result.error]);
      return;
    }
    setErrors([]);
    setEditing({ dayIndex, key, before, after: result.days[0], shown: [...seen, result.days[0][key]], mode: 'swap' });
  };

  /** 選ぶ:その枠を選んだ料理にし、主な材料がかぶる同じ日の品だけ選び直す */
  const pick = (dayIndex: number, key: keyof Dishes, recipeId: string) => {
    setPicking(null);
    const before = plannedDayOf(set, dayIndex);
    const course = COURSE_SLOTS.find((c) => c.key === key)?.course ?? '主菜';
    const request = { ...editDayRequest(set, dayIndex), fixed: [{ dayIndex: 0, course, recipeId }] };
    const result = pinDish(request, editPlannerData(set, dayIndex, src.data), [before], 0, key);
    if (!result.ok) {
      setErrors([result.error]);
      return;
    }
    setErrors([]);
    setEditing({ dayIndex, key, before, after: result.days[0], shown: [], mode: 'pick' });
  };

  const applyEdit = async () => {
    if (!editing) return;
    setBusy(true);
    try {
      const result = await rebookDayInDb(db, {
        mealSetId: set.id,
        dayIndex: editing.dayIndex,
        day: editing.after,
        data: src.data,
        now: new Date(),
        newId: randomId,
      });
      setErrors(result.ok ? [] : [result.error]);
      setEditing(null);
    } finally {
      setBusy(false);
    }
  };

  const undoCooked = (dayIndex: number) => {
    if (!window.confirm(`${formatDayLabel(set.days[dayIndex].date)}の「作った」を取り消して、「予定」に戻しますか?在庫は変わりません。`)) return;
    void run(() => unmarkCookedInDb(db, set.id, dayIndex));
  };

  return (
    <section style={{ marginBottom: 24 }}>
      <h2 className="section-title">
        {formatShortDate(set.startDate)}〜{formatShortDate(lastDate)}の献立
      </h2>
      {summary.map((day, dayIndex) => {
        const status = set.days[dayIndex].status;
        return (
          <DayCard
            key={day.date}
            day={day}
            status={status}
            onOpenDish={(dish) => setOpened({ dish, label: formatDayTotal(day.members) })}
            dishAction={
              canEditDay(set, dayIndex)
                ? (dish) => {
                    const key = COURSE_SLOTS.find((c) => c.course === dish.recipe.course)?.key;
                    if (!key) return null;
                    return (
                      <>
                        <button type="button" className="btn btn-small" onClick={() => swap(dayIndex, key, [])}>
                          入れ替え
                        </button>
                        <button type="button" className="btn btn-small" onClick={() => setPicking({ dayIndex, key })}>
                          選ぶ
                        </button>
                      </>
                    );
                  }
                : undefined
            }
          >
            {status === '予定' && (
              <>
                {day.date < today && <div className="field-hint">過ぎた日です。「作った」かキャンセルを選んでください</div>}
                <div className="btn-row">
                  <button type="button" className="btn" onClick={() => cancelOne(dayIndex)}>
                    キャンセル
                  </button>
                  <button type="button" className="btn btn-primary" onClick={() => void run(() => markCookedInDb(db, set.id, dayIndex))}>
                    作った
                  </button>
                </div>
              </>
            )}
            {status === '作った' && (
              <button type="button" className="btn btn-small" onClick={() => undoCooked(dayIndex)}>
                作ったを取り消す
              </button>
            )}
            {canRebuildDay(set, dayIndex, src.mealSets, today) && (
              <button type="button" className="btn btn-block" onClick={() => onRebuild(set, dayIndex)}>
                この日の献立を作り直す
              </button>
            )}
          </DayCard>
        );
      })}
      <ErrorList errors={errors} />

      <ShoppingList set={set} foodsById={src.foodsById} />

      {/* 「予定」の日が残っていなければ(作った日だけで出ているとき)、キャンセルするものはない */}
      {set.days.some((d) => d.status === '予定') && (
        <button type="button" className="btn btn-danger btn-block" style={{ marginTop: 16 }} onClick={cancelAll}>
          この献立をすべてキャンセル
        </button>
      )}

      {picking && (
        <RecipePickerSheet
          title={`${formatDayLabel(set.days[picking.dayIndex].date)}の${COURSE_SLOTS.find((c) => c.key === picking.key)?.course ?? ''}を選ぶ`}
          course={COURSE_SLOTS.find((c) => c.key === picking.key)?.course ?? '主菜'}
          recipes={src.data.recipes}
          warningsFor={(r) => warningsForSlot(r, 0, set.days[picking.dayIndex].memberIds, [], set.conditions, src.data)}
          onPick={(r) => pick(picking.dayIndex, picking.key, r.id)}
          onClose={() => setPicking(null)}
        />
      )}

      {editing && (
        <EditDishSheet
          before={editing.before}
          after={editing.after}
          recipesById={recipesById}
          busy={busy}
          onNext={editing.mode === 'swap' ? () => swap(editing.dayIndex, editing.key, editing.shown) : undefined}
          onApply={() => void applyEdit()}
          onClose={() => setEditing(null)}
        />
      )}

      {opened && (
        <Sheet title={opened.dish.recipe.name} onClose={() => setOpened(null)}>
          <RecipeDetail
            recipe={opened.dish.recipe}
            byId={src.foodsById}
            scaled={{ ingredients: opened.dish.ingredients, label: opened.label }}
            warnings={opened.dish.safetyWarnings}
          />
        </Sheet>
      )}
    </section>
  );
}
