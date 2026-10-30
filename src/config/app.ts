// アプリ名と公開先のパス。名前を変えるときはここだけ直す(index.html のタイトルとホーム画面の名前にも、ビルド時にここから入る)
// 公開先のパス・データベース名・書き出しファイルの識別子(kondate)は、変えるとホーム画面のアプリや今のデータが使えなくなるので変えない
export const APP_NAME = 'みっかごはん';
export const APP_SHORT_NAME = 'みっかごはん';
export const APP_DESCRIPTION = '冷蔵庫の在庫から3日分の夕飯を提案するアプリ';

// GitHub Pages のリポジトリ名(公開URLの /kondate/ の部分)
export const BASE_PATH = '/kondate/';

// 書き出しファイルの形式バージョン。データの形を変えたら上げる
export const BACKUP_FORMAT_VERSION = 6;

// 文字の大きさの設定(小・中・大)ごとの、もとになる文字の大きさ(px)。画面の文字はすべてこれに合わせて大きさが変わる
// 拡大の操作を止めているので、そのかわりに設定画面で選べるようにしている
export const FONT_SIZE_PX = { 小: 14, 中: 16, 大: 19 } as const;
