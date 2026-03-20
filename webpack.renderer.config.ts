// ──────────────────────────────────────────────
// webpack.renderer.config.js - 화면(renderer) 전용 webpack 설정
//
// 이 파일의 역할:
//   - 화면을 담당하는 파일들(React, CSS 등)을
//     webpack이 어떻게 처리할지 설정해요
//
// 중요 설정:
//   - extensions → 파일 확장자를 생략해도 자동으로 찾아줘요
//                  예: import App from './App' 만 써도
//                      App.tsx 를 자동으로 찾아요
//   - rules      → webpack.rules.js 에서 정의한 규칙을 가져와요
//                  (CSS, TypeScript 처리 방법 등)
// ──────────────────────────────────────────────

import type { Configuration } from 'webpack';
import webpack from 'webpack';
import path from 'path';
import fs from 'fs';

import { rules } from './webpack.rules';
import { plugins } from './webpack.plugins';

// .env 파일이 있으면 로드해요 (로컬 개발용)
const envFile = path.join(__dirname, '.env');
if (fs.existsSync(envFile)) {
  const envContent = fs.readFileSync(envFile, 'utf-8');
  for (const line of envContent.split('\n')) {
    const [key, ...rest] = line.split('=');
    if (key && rest.length) process.env[key.trim()] = rest.join('=').trim();
  }
}

// 빌드 시 SERVER_URL 환경변수를 앱 안에 주입해요
// - 개발: .env 파일 또는 Railway URL (기본값)
// - 배포: GitHub Actions에서 RAILWAY_URL secret을 SERVER_URL로 전달
const SERVER_URL = process.env.SERVER_URL || 'https://ioglobal-erp-production.up.railway.app';
const API_KEY = process.env.API_KEY || '';

export const rendererConfig: Configuration = {
  module: {
    rules,
  },
  plugins: [
    ...plugins,
    new webpack.DefinePlugin({
      'process.env.SERVER_URL': JSON.stringify(SERVER_URL),
      'process.env.API_KEY': JSON.stringify(API_KEY),
    }),
  ],
  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css'],
  },
};