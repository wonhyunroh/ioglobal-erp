// ──────────────────────────────────────────────
// webpack.web.config.ts - 웹 브라우저용 빌드 설정
//
// 이 파일의 역할:
//   - React 앱을 웹 브라우저(아이패드/아이폰 등)에서도 쓸 수 있게 빌드해요
//   - 빌드 결과물은 server/public/ 폴더에 저장돼요
//   - Railway 서버가 이 파일들을 브라우저에게 제공해요
// ──────────────────────────────────────────────

import type { Configuration } from 'webpack';
import webpack from 'webpack';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import path from 'path';
import { rules } from './webpack.rules';

const webConfig: Configuration = {
  mode: 'production',
  entry: './src/renderer.tsx',
  output: {
    path: path.resolve(__dirname, 'server/public'),
    filename: 'bundle.[contenthash].js',
    publicPath: '/',
    clean: true,
  },
  module: {
    rules: [
      // ── TypeScript/React (transpileOnly: Electron 전용 타입과 충돌 방지) ──
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'ts-loader',
          options: { transpileOnly: true },
        },
      },
      // ── CSS (Tailwind 포함) ──
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader', 'postcss-loader'],
      },
      // 참고: node-loader, @vercel/webpack-asset-relocator-loader 는
      //       Electron 전용이므로 웹 빌드에서 제외
    ]
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.SERVER_URL': JSON.stringify(''),
      'process.env.API_KEY': JSON.stringify(''),
      // 브라우저에는 __dirname / __filename 이 없으므로 '/' 로 대체
      '__dirname':  JSON.stringify('/'),
      '__filename': JSON.stringify('/index.js'),
    }),
    new HtmlWebpackPlugin({
      template: './src/index.html',
    }),
  ],
  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css'],
  },
};

export default webConfig;
