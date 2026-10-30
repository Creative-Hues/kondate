import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { APP_DESCRIPTION, APP_NAME, APP_SHORT_NAME, BASE_PATH } from './src/config/app.ts';

export default defineConfig({
  base: BASE_PATH,
  plugins: [
    react(),
    // index.html の %APP_NAME% %APP_SHORT_NAME% に、src/config/app.ts のアプリ名を入れる(名前を1か所で決めるため)
    {
      name: 'app-name',
      transformIndexHtml: (html: string) =>
        html.replaceAll('%APP_SHORT_NAME%', APP_SHORT_NAME).replaceAll('%APP_NAME%', APP_NAME),
    },
    VitePWA({
      // 新しい版が届いても自動では切り替えず、お知らせを出す(書き出しを済ませてから更新する。UpdatePrompt.tsx)
      registerType: 'prompt',
      // 【この版だけの切り替え用】前の版のアプリは「お知らせ」の仕組みを持っていないため、新しい版を待たせたままにすると、
      // いつまでも更新されない。そこでこの版だけは、届いたらすぐに切り替える(次に開いたときに新しい版になる)。
      // データの形が変わる更新は、開いたときに UpdateGate.tsx が先にバックアップを取ってもらうので、データは守られる。
      // 次に公開するときは、この1行を消して「お知らせ」に戻す(SPEC.md 3章「保存とバックアップ」を参照)
      workbox: { skipWaiting: true },
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: APP_NAME,
        short_name: APP_SHORT_NAME,
        description: APP_DESCRIPTION,
        lang: 'ja',
        theme_color: '#f7f3ea',
        background_color: '#f7f3ea',
        display: 'standalone',
        start_url: BASE_PATH,
        scope: BASE_PATH,
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
});
