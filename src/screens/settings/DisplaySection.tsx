import { useLiveQuery } from 'dexie-react-hooks';
import { SingleChoice } from '../../components/Choice';
import { defaultHouseholdPrefs } from '../../data/household';
import { db } from '../../db/db';
import type { FontSize } from '../../db/types';

const FONT_SIZES: readonly FontSize[] = ['小', '中', '大'];

/** 見え方の設定:文字の大きさ、保存の目安の印 */
export function DisplaySection() {
  const prefs = useLiveQuery(async () => (await db.household.get('household')) ?? defaultHouseholdPrefs(), []);
  if (!prefs) return null;

  return (
    <>
      <h2 className="section-title">見え方</h2>
      <div className="field">
        <span className="field-label">文字の大きさ</span>
        <SingleChoice<FontSize> options={FONT_SIZES} value={prefs.fontSize} onChange={(v) => db.household.put({ ...prefs, fontSize: v })} />
        <span className="field-hint">画面の文字がすべてこの大きさに合わせて変わります</span>
      </div>
      <div className="field" style={{ marginTop: 16 }}>
        <span className="field-label">保存の目安</span>
        <SingleChoice<'表示する' | '表示しない'>
          options={['表示する', '表示しない']}
          value={prefs.showShelfLife ? '表示する' : '表示しない'}
          onChange={(v) => db.household.put({ ...prefs, showShelfLife: v === '表示する' })}
        />
        <span className="field-hint">
          在庫の一覧に「目安を過ぎています」の印を出すかどうかです。表示しないときも、在庫の整理の「目安を過ぎたものを選ぶ」は使えます
        </span>
      </div>
    </>
  );
}
