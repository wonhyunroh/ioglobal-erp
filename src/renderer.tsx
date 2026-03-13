// ──────────────────────────────────────────────
// src/renderer.ts - React 앱 시작점
//
// 이 파일의 역할:
//   - index.html 의 <div id="root"> 를 찾아요
//   - 거기에 React 앱을 연결해줘요
//   - 앱이 시작될 때 가장 먼저 실행되는 파일이에요
//
// 쉽게 말하면:
//   - 빈 도화지(index.html)에 그림(React 앱)을 붙이는 역할이에요
//   - 이 파일이 없으면 화면에 아무것도 안 나와요
// ──────────────────────────────────────────────

// React 라이브러리 불러오기
// React    → 화면을 만드는 핵심 라이브러리
import React from 'react';

// ReactDOM 라이브러리 불러오기
// createRoot → React 18 방식의 앱 시작 함수
import { createRoot } from 'react-dom/client';

// 전역 CSS 불러오기 (Tailwind CSS 포함)
import './index.css';

// 우리가 만든 메인 앱 컴포넌트 불러오기
import App from './App';

// index.html 의 <div id="root"> 를 찾아요
const container = document.getElementById('root');

// React 앱을 container(div#root) 에 연결해요
// 이제부터 App 컴포넌트가 화면을 담당해요
const root = createRoot(container!);

// App 컴포넌트를 화면에 그려요
root.render(<App />);