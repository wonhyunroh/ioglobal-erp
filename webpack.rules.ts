// ──────────────────────────────────────────────
// webpack.rules.ts - Webpack 로더 규칙 설정 파일
//
// 이 파일의 역할:
//   - webpack이 각각의 파일을 어떻게 처리할지 규칙을 정해요
//   - 파일 확장자마다 담당 로더(처리 도구)를 지정해요
//
// 쉽게 말하면:
//   - 파일 종류별 "담당자"를 정해두는 규칙표예요
//   - .tsx 파일 → ts-loader 담당 (TypeScript 변환)
//   - .css 파일 → style/css/postcss-loader 담당 (Tailwind 변환)
//
// 주의:
//   - 이 파일은 TypeScript (.ts) 이므로
//     module.exports 대신 export 를 사용해요
// ──────────────────────────────────────────────

import type { ModuleOptions } from 'webpack';
// ModuleOptions → webpack 규칙의 타입 정의예요
//                 타입을 지정하면 오타를 미리 잡아줘요

export const rules: Required<ModuleOptions>['rules'] = [

  // ── 규칙 1: 네이티브 Node 모듈 (.node 파일) ──
  // C++로 만들어진 네이티브 모듈을 처리해요
  // 예: better-sqlite3 같은 DB 라이브러리
  {
    test: /native_modules[/\\].+\.node$/,
    use: 'node-loader',
  },

  // ── 규칙 2: node_modules 안의 JS 파일 ──
  // 설치한 라이브러리들을 Electron에서 올바르게
  // 불러올 수 있도록 파일 경로를 재조정해줘요
  {
    test: /[/\\]node_modules[/\\].+\.(m?js|node)$/,
    parser: { amd: false },
    use: {
      loader: '@vercel/webpack-asset-relocator-loader',
      options: {
        outputAssetBase: 'native_modules',
      },
    },
  },

  // ── 규칙 3: TypeScript + React (TS/TSX 파일) ──
  // .ts, .tsx 파일을 브라우저가 이해할 수 있는
  // 일반 JavaScript로 변환해줘요
  // 예: <Button /> → React.createElement(Button)
  {
    test: /\.tsx?$/,                      // .ts 또는 .tsx 파일에 적용
    exclude: /(node_modules|\.webpack)/, // 라이브러리는 건드리지 않아요
    use: {
      loader: 'ts-loader', // TypeScript 전용 변환 도구
    },
  },

  // ── 규칙 4: 이미지/SVG 파일 ──
  // 로고 등 이미지 파일을 URL로 변환해요
  {
    test: /\.(svg|png|jpg|jpeg|gif)$/,
    type: 'asset/resource',
  },

  // ── 규칙 5: CSS 파일 (Tailwind CSS 포함) ──
  // CSS 파일을 화면에 적용하기까지 3단계로 처리해요
  // webpack은 배열을 오른쪽 → 왼쪽 순서로 실행해요
  //
  //   1단계: postcss-loader → Tailwind 문법을 일반 CSS로 변환
  //   2단계: css-loader     → CSS 파일을 JS가 읽을 수 있게 변환
  //   3단계: style-loader   → 변환된 CSS를 화면 <style>태그에 삽입
  {
    test: /\.css$/,  // .css 파일에 적용
    use: [
      'style-loader',   // 3단계: CSS를 <style> 태그로 HTML에 삽입
      'css-loader',     // 2단계: CSS를 JS 모듈로 변환
      'postcss-loader', // 1단계: Tailwind → 일반 CSS 변환
    ],
  },
];