import { useEffect, useState, type ReactNode } from 'react';
import { CURRENT_DB_VERSION, db } from '../db/db';
import { readRawTables, storedDbVersion } from '../db/updateCheck';
import { backupFileName, formatVersionForDb, serializeRawBackup } from '../logic/backup';
import { hasRecentBackupBeforeUpdate, rememberBackupBeforeUpdate, saveJsonFile } from './saveFile';

type State =
  | { type: 'checking' }
  | { type: 'ready' }
  /** データの形が変わる更新:書き出すまでは先に進まない */
  | { type: 'need'; from: number; formatVersion: number };

/**
 * アプリが新しくなり、データの形が変わるとき(データベースの版が上がるとき)は、
 * 新しい形に直す前に、今のデータを書き出してもらう。書き出すまでアプリを開かない(データは新しい形に直さない)
 */
export function UpdateGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({ type: 'checking' });

  useEffect(() => {
    let alive = true;
    void (async () => {
      const from = await storedDbVersion(db.name);
      const formatVersion = from === null ? null : formatVersionForDb(from);
      // データベースがまだない(初めて開いた)・今の版・調べられない・少し前に書き出し済み → そのまま開く
      const need = from !== null && from < CURRENT_DB_VERSION && formatVersion !== null && !hasRecentBackupBeforeUpdate(new Date());
      if (alive) setState(need ? { type: 'need', from, formatVersion } : { type: 'ready' });
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (state.type === 'checking') return null;
  if (state.type === 'ready') return <>{children}</>;
  return <BackupBeforeUpdate formatVersion={state.formatVersion} onDone={() => setState({ type: 'ready' })} />;
}

function BackupBeforeUpdate({ formatVersion, onDone }: { formatVersion: number; onDone: () => void }) {
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const exportNow = async () => {
    setBusy(true);
    setFailed(false);
    try {
      const now = new Date();
      const text = serializeRawBackup(await readRawTables(db.name), formatVersion, now);
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

  const skip = () => {
    if (window.confirm('バックアップを取らずに更新します。うまくいかなかったときに、元に戻せなくなります。よろしいですか?')) onDone();
  };

  return (
    <div className="app-main">
      <div className="screen-header">
        <h1 className="screen-title">アプリが新しくなりました</h1>
      </div>
      <div className="form">
        <p style={{ margin: 0 }}>
          新しい版では、データの形が少し変わります。変える前に、今のデータを書き出して(バックアップを取って)ください。
        </p>
        <p className="muted" style={{ margin: 0 }}>
          共有の画面が出たら、「"ファイル"に保存」を選んでください。書き出すまで、データは今のまま変わりません。
        </p>
        <button type="button" className="btn btn-primary btn-block" disabled={busy || saved} onClick={() => void exportNow()}>
          {saved ? '書き出しました' : '1. 今のデータを書き出す'}
        </button>
        <button type="button" className="btn btn-block" disabled={!saved} onClick={onDone}>
          2. 更新を続ける
        </button>
        {failed && (
          <>
            <p className="errors" role="alert" style={{ margin: 0, paddingLeft: 14 }}>
              書き出しに失敗しました。もう一度試してください。
            </p>
            <button type="button" className="btn btn-text" onClick={skip}>
              書き出さずに更新する(おすすめしません)
            </button>
          </>
        )}
      </div>
    </div>
  );
}
