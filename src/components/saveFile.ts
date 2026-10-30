// 書き出したファイルを保存する(画面の操作。テストはしない)
// iPhone などタッチ操作の端末では共有シートで「ファイル」などに保存し、パソコンではダウンロードする

/** タッチ操作の端末(iPhone など)では共有シートで保存する */
function shouldUseShareSheet(file: File): boolean {
  return navigator.maxTouchPoints > 0 && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });
}

function downloadFile(file: File) {
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * JSON の文字列をファイルにして保存する。
 * 保存したら 'saved'、共有シートを閉じただけなら 'canceled' を返す。失敗したら例外を投げる
 */
export async function saveJsonFile(text: string, fileName: string): Promise<'saved' | 'canceled'> {
  const file = new File([text], fileName, { type: 'application/json' });
  try {
    if (shouldUseShareSheet(file)) await navigator.share({ files: [file] });
    else downloadFile(file);
    return 'saved';
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return 'canceled';
    throw e;
  }
}

// ───────── 更新の前のバックアップ ─────────

const BACKUP_BEFORE_UPDATE_KEY = 'kondate-backup-before-update';
/** 更新の前に書き出してから、この時間のうちに更新すれば、もう一度は聞かない */
const BACKUP_VALID_MS = 30 * 60 * 1000;

/** 更新の前に書き出したことを覚える */
export function rememberBackupBeforeUpdate(now: Date): void {
  try {
    localStorage.setItem(BACKUP_BEFORE_UPDATE_KEY, String(now.getTime()));
  } catch {
    // 覚えられなくても、もう一度聞くだけなので困らない
  }
}

/** 少し前に、更新の前の書き出しを済ませたか */
export function hasRecentBackupBeforeUpdate(now: Date): boolean {
  try {
    const at = Number(localStorage.getItem(BACKUP_BEFORE_UPDATE_KEY));
    return at > 0 && now.getTime() - at < BACKUP_VALID_MS;
  } catch {
    return false;
  }
}
