import { useRef, useState, type MouseEvent, type PointerEvent, type ReactNode } from 'react';

/** 左にスワイプしたときに出る「削除」ボタンの幅 */
const ACTION_WIDTH = 88;
/** 横に動いたとみなす距離。これより小さい動きはタップかスクロールとして扱う */
const DRAG_START = 10;

interface Props {
  /** 「削除」ボタンが出ているか(1行だけ開くよう、親が持つ) */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 行をタップしたとき(開いているときは閉じるだけで、これは呼ばない) */
  onTap: () => void;
  onDelete: () => void;
  /** 読み上げ用の名前(「キャベツを削除」) */
  label: string;
  children: ReactNode;
}

/**
 * 左にスワイプすると赤い「削除」ボタンが出る行(iPhone の「メール」と同じ形)。
 * 縦の動きはふつうのスクロールにする(touch-action: pan-y で、ブラウザに任せる)
 */
export function SwipeRow({ open, onOpenChange, onTap, onDelete, label, children }: Props) {
  const [offset, setOffset] = useState<number | null>(null);
  const drag = useRef<{ x: number; y: number; base: number; moving: boolean } | null>(null);
  /** 横に動かしたあとのクリックは、タップとして扱わない */
  const suppressClick = useRef(false);

  const shown = offset ?? (open ? -ACTION_WIDTH : 0);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    drag.current = { x: e.clientX, y: e.clientY, base: open ? -ACTION_WIDTH : 0, moving: false };
    suppressClick.current = false;
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.moving) {
      if (Math.abs(dx) < DRAG_START || Math.abs(dx) < Math.abs(dy)) return;
      d.moving = true;
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    setOffset(Math.max(-ACTION_WIDTH, Math.min(0, d.base + dx)));
  };

  const finish = (e: PointerEvent<HTMLDivElement>, cancelled: boolean) => {
    const d = drag.current;
    drag.current = null;
    if (!d?.moving) return;
    suppressClick.current = true;
    const current = Math.max(-ACTION_WIDTH, Math.min(0, d.base + (e.clientX - d.x)));
    setOffset(null);
    if (!cancelled) onOpenChange(current < -ACTION_WIDTH / 2);
  };

  const onClickCapture = (e: MouseEvent) => {
    if (suppressClick.current) {
      suppressClick.current = false;
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (open) {
      e.preventDefault();
      e.stopPropagation();
      onOpenChange(false);
    }
  };

  return (
    <div className="swipe-row">
      <button
        type="button"
        className="swipe-delete"
        aria-label={`${label}を削除`}
        tabIndex={open ? 0 : -1}
        onClick={onDelete}
      >
        削除
      </button>
      <div
        className="swipe-content"
        style={{ transform: `translateX(${shown}px)`, transition: offset === null ? 'transform 0.2s ease' : 'none' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(e) => finish(e, false)}
        onPointerCancel={(e) => finish(e, true)}
        onClickCapture={onClickCapture}
      >
        <button type="button" className="list-item" onClick={onTap}>
          {children}
        </button>
      </div>
    </div>
  );
}
