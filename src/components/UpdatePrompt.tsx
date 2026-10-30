import { useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { db } from '../db/db';
import { backupFileName, serializeBackup } from '../logic/backup';
import { rememberBackupBeforeUpdate, saveJsonFile } from './saveFile';
import { Sheet } from './Sheet';

/**
 * 新しい版が届いたときのお知らせ。書き出し(バックアップ)を済ませるまで「更新する」は押せない。
 * 「あとで」を選ぶと、今の版のまま使い続ける
 */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  if (!needRefresh) return null;

  const exportNow = async () => {
    setBusy(true);
    setFailed(false);
    try {
      const now = new Date();
      const text = serializeBackup(await db.readAll(), now);
      if ((await saveJsonFile(text, backupFileName(now))) === 'saved') {
        rememberBackupBeforeUpdate(now);
        setSaved(true);
      }
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet title="新しい版があります" onClose={() => setNeedRefresh(false)}>
      <div className="form">
        <p style={{ margin: 0 }}>更新する前に、今のデータを書き出して(バックアップを取って)ください。</p>
        <p className="muted" style={{ margin: 0 }}>
          共有の画面が出たら、「"ファイル"に保存」を選んでください。「閉じる」を押すと、今の版のまま使えます。
        </p>
        <button type="button" className="btn btn-primary btn-block" disabled={busy || saved} onClick={() => void exportNow()}>
          {saved ? '書き出しました' : '1. 今のデータを書き出す'}
        </button>
        <button type="button" className="btn btn-block" disabled={!saved} onClick={() => void updateServiceWorker(true)}>
          2. 更新する
        </button>
        {failed && (
          <p className="errors" role="alert" style={{ margin: 0, paddingLeft: 14 }}>
            書き出しに失敗しました。もう一度試してください。
          </p>
        )}
      </div>
    </Sheet>
  );
}
