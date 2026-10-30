import { useEffect, useRef, type ReactNode } from 'react';

interface Props {
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** 右上に置くボタン(保存など) */
  action?: ReactNode;
}

// ───────── 枠の外の操作 ─────────
// 枠を開いている間も、枠の外(後ろの画面)はスクロールだけできる。
// 枠の外のボタンや入力欄は、タップしても反応しないようにする(誤操作を防ぐため)。
// 枠を重ねて開いたときは、いちばん上の枠だけを操作できる

/** 開いている枠(あとから開いたものが後ろ) */
const openSheets: HTMLElement[] = [];

function topSheet(): HTMLElement | undefined {
  return openSheets[openSheets.length - 1];
}

/** いちばん上の枠の外への操作か */
function isOutside(target: EventTarget | null): boolean {
  const top = topSheet();
  return top !== undefined && target instanceof Node && !top.contains(target);
}

/** タップ・クリックを止める(スクロールの動きは止めない) */
function blockOutside(e: Event) {
  if (!isOutside(e.target)) return;
  e.preventDefault();
  e.stopPropagation();
}

/** 枠の外の入力欄などに入ってしまったら外す */
function blurOutside(e: FocusEvent) {
  if (isOutside(e.target) && e.target instanceof HTMLElement) e.target.blur();
}

// touchend を止めると、iPhone ではタップ(クリック)と入力欄へのフォーカスが起きない。スクロールはそのまま
const BLOCKED_EVENTS = ['click', 'mousedown', 'touchend'] as const;

function watchOutside(on: boolean) {
  for (const type of BLOCKED_EVENTS) {
    if (on) document.addEventListener(type, blockOutside, { capture: true, passive: false });
    else document.removeEventListener(type, blockOutside, { capture: true });
  }
  if (on) document.addEventListener('focusin', blurOutside, true);
  else document.removeEventListener('focusin', blurOutside, true);
}

/** 画面の真ん中に出る枠 */
export function Sheet({ title, onClose, children, action }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (openSheets.length === 0) watchOutside(true);
    openSheets.push(el);
    return () => {
      const i = openSheets.indexOf(el);
      if (i >= 0) openSheets.splice(i, 1);
      if (openSheets.length === 0) watchOutside(false);
    };
  }, []);

  return (
    <div className="sheet-backdrop">
      <div ref={ref} className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        {/* 見出しは2段:上の段にボタン(1行のまま)、下の段に題名(横幅いっぱい。長ければ折り返す) */}
        <div className="sheet-header">
          <div className="sheet-header-buttons">
            <button type="button" className="btn btn-small" onClick={onClose}>
              閉じる
            </button>
            {action && <div className="sheet-header-action">{action}</div>}
          </div>
          <h2 className="sheet-title">{title}</h2>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}
