// ──────────────────────────────────────────────
// 📁 파일명: App.tsx
// 📌 위치: src/App.tsx
//
// 🎯 이 파일의 역할:
//   - ERP 전체 화면의 뼈대(레이아웃)를 잡아요
//   - 왼쪽 사이드바 메뉴 + 오른쪽 컨텐츠 영역으로 구성돼요
//   - 메뉴 클릭 시 오른쪽에 해당 페이지를 보여줘요
//
// 📦 사용하는 것들:
//   - React: 화면을 만드는 라이브러리
//   - useState: 현재 선택된 메뉴를 기억하는 기능
//   - 각 페이지 컴포넌트들 (Dashboard, Partners 등)
//
// 🔗 연결된 파일들:
//   - src/pages/Dashboard.tsx  → 대시보드 화면
//   - src/pages/Partners.tsx   → 거래처 관리 화면
//   - src/pages/Items.tsx      → 품목 관리 화면
//   - src/pages/Orders.tsx     → 주문 관리 화면
//   - src/pages/Inventory.tsx  → 재고 관리 화면
//   - src/pages/CostCalc.tsx   → 수입원가 계산 화면
//
// ⚠️ 수정할 때 주의사항:
//   - 새 메뉴 추가 시 MENUS 배열과 renderPage() 함수 둘 다 수정해야 해요
//   - 사이드바 색상 바꾸려면 aside 태그의 bg-blue-900 클래스를 수정해요
// ──────────────────────────────────────────────

import React, { useState } from 'react';

// ── 각 페이지 컴포넌트 불러오기 ──
// 메뉴 클릭 시 해당 컴포넌트를 오른쪽에 보여줘요
import Dashboard from './pages/Dashboard';
import Partners  from './pages/Partners';
import Items     from './pages/Items';
import Orders    from './pages/Orders';
import Inventory from './pages/Inventory';
import CostCalc  from './pages/CostCalc';

// ──────────────────────────────────────────────
// 사이드바 메뉴 목록
//
// id    → 메뉴 고유값 (renderPage 함수에서 이 값으로 페이지를 구분해요)
// label → 화면에 보여줄 메뉴 이름
// icon  → 메뉴 아이콘
//
// ⚠️ 새 메뉴 추가 시:
//   1. 여기 배열에 항목 추가
//   2. 아래 renderPage() 함수에 case 추가
//   3. src/pages/ 에 해당 컴포넌트 파일 생성
// ──────────────────────────────────────────────
const MENUS = [
  { id: 'dashboard', label: '대시보드',      icon: '📊' },
  { id: 'partners',  label: '거래처 관리',   icon: '🏢' },
  { id: 'items',     label: '품목 관리',     icon: '🌽' },
  { id: 'orders',    label: '주문 관리',     icon: '📋' },
  { id: 'inventory', label: '재고 관리',     icon: '📦' },
  { id: 'costcalc',  label: '수입원가 계산', icon: '💰' },
];

// ──────────────────────────────────────────────
// 현재 선택된 메뉴에 맞는 페이지를 반환하는 함수
//
// activeMenu 값에 따라 다른 페이지 컴포넌트를 보여줘요
// 새 메뉴 추가 시 반드시 여기에도 case를 추가해야 해요
// ──────────────────────────────────────────────
function renderPage(activeMenu: string) {
  switch (activeMenu) {
    case 'dashboard': return <Dashboard />;   // 대시보드
    case 'partners':  return <Partners />;    // 거래처 관리
    case 'items':     return <Items />;       // 품목 관리
    case 'orders':    return <Orders />;      // 주문 관리
    case 'inventory': return <Inventory />;   // 재고 관리
    case 'costcalc':  return <CostCalc />;    // 수입원가 계산
    default:          return <Dashboard />;   // 기본값: 대시보드
  }
}

// ──────────────────────────────────────────────
// App 컴포넌트 - 전체 레이아웃
//
// 화면 구조:
//   ┌──────────┬─────────────────────────┐
//   │          │                         │
//   │ 사이드바  │    선택된 페이지 화면    │
//   │  (메뉴)  │                         │
//   │          │                         │
//   └──────────┴─────────────────────────┘
// ──────────────────────────────────────────────
export default function App() {

  // 현재 선택된 메뉴를 기억해요
  // 앱 시작 시 대시보드가 기본으로 선택돼요
  const [activeMenu, setActiveMenu] = useState('dashboard');

  return (
    // 전체 화면 컨테이너 (가로 배치, 화면 전체 높이)
    <div className="flex h-screen bg-gray-100">

      {/* ── 왼쪽 사이드바 ── */}
      <aside className="w-56 bg-blue-900 text-white flex flex-col">

        {/* 로고 영역 */}
        <div className="p-6 border-b border-blue-700">
          <h1 className="text-lg font-bold">IO Global</h1>
          <p className="text-xs text-blue-300 mt-1">ERP 시스템</p>
        </div>

        {/* 메뉴 목록 */}
        <nav className="flex-1 p-4 overflow-y-auto">
          {MENUS.map(menu => (
            <button
              key={menu.id}
              onClick={() => setActiveMenu(menu.id)}
              className={`
                w-full text-left px-4 py-3 rounded-lg mb-1
                flex items-center gap-3 text-sm transition-colors
                ${activeMenu === menu.id
                  // 선택된 메뉴: 밝은 파란색 배경
                  ? 'bg-blue-600 text-white font-semibold'
                  // 선택 안 된 메뉴: 투명 배경, 호버 시 어두운 파란색
                  : 'text-blue-200 hover:bg-blue-800'
                }
              `}
            >
              <span>{menu.icon}</span>
              <span>{menu.label}</span>
            </button>
          ))}
        </nav>

        {/* 하단 버전 표시 */}
        <div className="p-4 text-xs text-blue-400 border-t border-blue-700">
          v1.0.0
        </div>
      </aside>

      {/* ── 오른쪽 메인 컨텐츠 영역 ── */}
      {/* overflow-auto = 내용이 많으면 스크롤 생김 */}
      <main className="flex-1 overflow-auto p-8">
        {/* 현재 선택된 메뉴에 맞는 페이지 표시 */}
        {renderPage(activeMenu)}
      </main>

    </div>
  );
}