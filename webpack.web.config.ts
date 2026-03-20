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
      ...rules.filter((r: any) => r?.use?.loader !== 'ts-loader'),
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'ts-loader',
          options: { transpileOnly: true }, // 타입 체크 생략 (웹 빌드 속도 향상)
        },
      },
    ]
  },
  plugins: [
    new webpack.DefinePlugin({
      // 웹 빌드: SERVER_URL은 빈 문자열 (같은 서버에서 서빙되므로 상대경로 사용)
      'process.env.SERVER_URL': JSON.stringify(''),
      // 웹 빌드: API_KEY는 빈 문자열 (로그인 후 localStorage에서 읽음)
      'process.env.API_KEY': JSON.stringify(''),
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
