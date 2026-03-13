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

import { rules } from './webpack.rules';
import { plugins } from './webpack.plugins';

export const rendererConfig: Configuration = {
  module: {
    rules, // webpack.rules.js 에서 정의한 규칙 전체 사용
  },
  plugins,
  resolve: {
    // 이 확장자들은 import 시 생략 가능해요
    // 예: import App from './App' → App.ts, App.tsx 순서로 자동 탐색
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css'],
  },
};