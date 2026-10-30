import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { applyStoredFontSize } from './components/fontSize';
import { UpdateGate } from './components/UpdateGate';
import { requestPersistentStorage } from './db/db';
import './styles.css';

// データが消されにくくなるよう頼む(結果は画面に影響しない)
void requestPersistentStorage();

// 前に選んだ文字の大きさを、最初から当てる
applyStoredFontSize();

// 2本指での拡大を止める(iPhone の Safari は、ページの設定だけでは止まらないため)。文字は設定の「文字の大きさ」で大きくできる
for (const type of ['gesturestart', 'gesturechange'] as const) {
  document.addEventListener(type, (e) => e.preventDefault(), { passive: false });
}

const root = document.getElementById('root');
if (!root) throw new Error('#root が見つかりません');

createRoot(root).render(
  <StrictMode>
    {/* データの形が変わる更新のときは、先にバックアップを取ってもらう */}
    <UpdateGate>
      <App />
    </UpdateGate>
  </StrictMode>,
);
