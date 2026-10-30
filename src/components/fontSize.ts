// 文字の大きさの設定を画面に当てる(画面の操作。テストはしない)
// 画面の文字の大きさは rem(もとになる文字の大きさに対する倍率)で書いてあるので、もとの大きさを変えると全部が変わる
import { FONT_SIZE_PX } from '../config/app';
import type { FontSize } from '../db/types';

const KEY = 'kondate-font-size';

export function applyFontSize(size: FontSize): void {
  document.documentElement.style.fontSize = `${FONT_SIZE_PX[size]}px`;
  try {
    // 次に開いたとき、データベースを読む前から同じ大きさで出すため
    localStorage.setItem(KEY, size);
  } catch {
    // 覚えられなくても、データベースを読んだあとに当て直すので困らない
  }
}

/** 前に選んだ文字の大きさを、すぐに当てる(アプリを開いた直後に使う) */
export function applyStoredFontSize(): void {
  try {
    const size = localStorage.getItem(KEY);
    if (size === '小' || size === '中' || size === '大') document.documentElement.style.fontSize = `${FONT_SIZE_PX[size]}px`;
  } catch {
    // 読めなければ「中」のまま
  }
}
