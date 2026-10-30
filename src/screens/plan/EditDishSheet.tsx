import { Sheet } from '../../components/Sheet';
import type { Recipe } from '../../db/types';
import { formatDayLabel } from '../../logic/date';
import { COURSE_SLOTS, type PlannedDay } from '../../logic/planner/types';

interface Props {
  before: PlannedDay;
  after: PlannedDay;
  recipesById: ReadonlyMap<string, Recipe>;
  busy: boolean;
  /** 「ほかの候補」(入れ替えのときだけ) */
  onNext?: () => void;
  onApply: () => void;
  onClose: () => void;
}

/** 確定した献立の料理を変える前の確認:変わる品と、在庫・買い足しへの影響 */
export function EditDishSheet({ before, after, recipesById, busy, onNext, onApply, onClose }: Props) {
  const name = (id: string) => recipesById.get(id)?.name ?? '(見つからない料理)';
  const changes = COURSE_SLOTS.filter((s) => before[s.key] !== after[s.key]);

  return (
    <Sheet title={`${formatDayLabel(before.date)}の料理を変える`} onClose={onClose}>
      <div className="form">
        <ul className="list">
          {changes.map((s) => (
            <li key={s.key} className="list-item">
              <span className="dish-course">{s.course}</span>
              <span className="list-main edit-change">
                <span className="list-sub">{name(before[s.key])}</span>
                <span className="list-title">→ {name(after[s.key])}</span>
              </span>
            </li>
          ))}
        </ul>
        {changes.length > 1 && <p className="muted" style={{ margin: 0 }}>主な材料がかぶらないよう、ほかの品も変わります。</p>}
        {after.overLimit && <div className="note note-warn">この日は買い足しが上限を超えます</div>}
        <p className="muted" style={{ margin: 0 }}>
          前の料理で使う予定だった食材を在庫に戻してから、新しい料理の分を在庫から減らします。足りない食材は買い足しリストに入ります。
        </p>
        {/* ボタンの文字が折り返さないよう、縦に並べる */}
        <button type="button" className="btn btn-primary btn-block" disabled={busy} onClick={onApply}>
          この内容で変える
        </button>
        {onNext && (
          <button type="button" className="btn btn-block" disabled={busy} onClick={onNext}>
            ほかの候補
          </button>
        )}
      </div>
    </Sheet>
  );
}
