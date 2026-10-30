// 更新の前のバックアップ:アプリが新しくなってデータの形が変わる前に、今のデータを書き出す
// データベースを Dexie で開くと、その場で新しい形に直されてしまう。そのため、ここでは開く前に版を調べ、
// 古い形のままのデータを IndexedDB から直接読む(読むだけで、何も変えない)
import { TABLE_NAMES } from './types';

/** IndexedDB に保存されている版を、Dexie の版にする(Dexie は版を10倍して保存する) */
function toDexieVersion(idbVersion: number): number {
  return idbVersion >= 10 ? Math.round(idbVersion / 10) : idbVersion;
}

/**
 * 端末に保存されているデータベースの版(Dexie の版)。
 * データベースがまだない(初めて開いた)ときや、調べられないブラウザでは null
 */
export async function storedDbVersion(name: string): Promise<number | null> {
  if (typeof indexedDB === 'undefined' || typeof indexedDB.databases !== 'function') return null;
  try {
    const found = (await indexedDB.databases()).find((d) => d.name === name);
    return found?.version ? toDexieVersion(found.version) : null;
  } catch {
    return null;
  }
}

/** データベースを今の版のまま開き、全部の表の中身を読む(形は直さない) */
export function readRawTables(name: string): Promise<Record<string, unknown[]>> {
  return new Promise((resolve, reject) => {
    // 版を指定せずに開くと、今の版のまま開く(形を直す処理は起きない)
    const req = indexedDB.open(name);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const idb = req.result;
      const names = TABLE_NAMES.filter((t) => idb.objectStoreNames.contains(t));
      if (names.length === 0) {
        idb.close();
        resolve({});
        return;
      }
      const tx = idb.transaction(names, 'readonly');
      const result: Record<string, unknown[]> = {};
      for (const t of names) {
        const getAll = tx.objectStore(t).getAll();
        getAll.onsuccess = () => {
          result[t] = getAll.result as unknown[];
        };
      }
      tx.oncomplete = () => {
        idb.close();
        resolve(result);
      };
      tx.onerror = () => {
        idb.close();
        reject(tx.error);
      };
    };
  });
}
