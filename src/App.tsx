// ──────────────────────────────────────────────
// 📁 파일명: App.tsx
// 📌 위치: src/App.tsx
//
// 🎯 이 파일의 역할:
//   - 앱 전체 레이아웃을 담당해요
//   - 로그인 여부에 따라 로그인 화면 or 메인 화면을 보여줘요
//   - 사이드바 메뉴 클릭 시 해당 페이지로 이동해요
//   - 현재 로그인한 유저 정보를 각 페이지에 전달해요
//
// 🔄 변경사항:
//   - 기존: loadUsers()로 유저 목록 불러와서 프론트에서 로그인 검증
//   - 변경: loginUser()로 서버에 직접 로그인 요청
//
// 🔗 연결된 파일들:
//   - Login.tsx: 로그인 화면
//   - Users.tsx: 계정 관리 화면
//   - Backup.tsx: 백업/복원 화면
//   - db.ts: loginUser (서버 API 호출)
// ──────────────────────────────────────────────

import React, { useState } from 'react';
import Dashboard from './pages/Dashboard';
import Partners  from './pages/Partners';
import Items     from './pages/Items';
import Orders    from './pages/Orders';
import Inventory from './pages/Inventory';
import CostCalc  from './pages/CostCalc';
import Login     from './pages/Login';
import Users     from './pages/Users';
import Backup    from './pages/Backup';
import { User, loginUser } from './db';

// ──────────────────────────────────────────────
// 사이드바 메뉴 목록
// ──────────────────────────────────────────────
const MENUS = [
  { id: 'dashboard', label: '대시보드',      icon: '📊', adminOnly: false },
  { id: 'partners',  label: '거래처 관리',   icon: '🏢', adminOnly: false },
  { id: 'items',     label: '품목 관리',     icon: '🌽', adminOnly: false },
  { id: 'orders',    label: '주문 관리',     icon: '📋', adminOnly: false },
  { id: 'inventory', label: '재고 관리',     icon: '📦', adminOnly: false },
  { id: 'costcalc',  label: '수입원가 계산', icon: '💰', adminOnly: false },
  { id: 'users',     label: '계정 관리',     icon: '👤', adminOnly: true  },
  { id: 'backup',    label: '백업 / 복원',   icon: '🗄️', adminOnly: true  },
];

export default function App() {

  // ── 현재 로그인한 유저 (null = 로그아웃 상태) ──
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // ── 현재 선택된 메뉴 ──
  const [activeMenu, setActiveMenu] = useState('dashboard');

  // ── 로그인 에러 메시지 ──
  const [loginError, setLoginError] = useState('');

  // ── 로그인 로딩 상태 ──
  const [loginLoading, setLoginLoading] = useState(false);

  // ──────────────────────────────────────────────
  // 로그인 처리
  //
  // 서버 API에 username/password 보내서 검증해요
  // 성공 시 유저 정보를 받아서 currentUser에 저장해요
  // ──────────────────────────────────────────────
  const handleLogin = async (username: string, password: string) => {
    setLoginLoading(true);
    setLoginError('');
    try {
      const user = await loginUser(username, password);
      setCurrentUser(user);
      setActiveMenu('dashboard');
    } catch (e: any) {
      setLoginError(e.message || '로그인에 실패했어요');
    } finally {
      setLoginLoading(false);
    }
  };

  // ── 로그아웃 처리 ──
  const handleLogout = () => {
    if (!window.confirm('로그아웃 하시겠어요?')) return;
    setCurrentUser(null);
  };

  // ── 현재 메뉴에 맞는 페이지 컴포넌트 반환 ──
  const renderPage = () => {
    switch (activeMenu) {
      case 'dashboard':  return <Dashboard />;
      case 'partners':   return <Partners />;
      case 'items':      return <Items />;
      case 'orders':     return <Orders />;
      case 'inventory':  return <Inventory />;
      case 'costcalc':   return <CostCalc currentUser={currentUser!} />;
      case 'users':      return <Users currentUser={currentUser!} />;
      case 'backup':     return <Backup currentUser={currentUser!} />;
      default:           return <Dashboard />;
    }
  };

  // ── 로그인 안 된 상태면 로그인 화면 표시 ──
  if (!currentUser) {
    return (
      <Login
        onLogin={handleLogin}
        error={loginError}
        loading={loginLoading}
      />
    );
  }

  // ── 로그인 된 상태면 메인 화면 표시 ──
  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">

      {/* ── 사이드바 ── */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">

        {/* 로고 */}
        <div className="px-5 py-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🌾</span>
            <div>
              <h1 className="text-base font-bold text-gray-800">IO Global</h1>
              <p className="text-xs text-gray-400">IO Global ERP</p>
            </div>
          </div>
        </div>

        {/* 메뉴 목록 */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          {MENUS.map(menu => {
            if (menu.adminOnly && currentUser.role !== '관리자') return null;
            return (
              <button
                key={menu.id}
                onClick={() => setActiveMenu(menu.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                            text-sm font-medium transition-colors mb-1
                            ${activeMenu === menu.id
                              ? 'bg-blue-50 text-blue-700'
                              : 'text-gray-600 hover:bg-gray-50'
                            }`}
              >
                <span>{menu.icon}</span>
                <span>{menu.label}</span>
              </button>
            );
          })}
        </nav>

        {/* 로그인 유저 정보 + 로그아웃 */}
        <div className="px-4 py-4 border-t border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center
                            justify-center text-sm font-bold text-blue-600">
              {currentUser.username.slice(0, 1)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">
                {currentUser.username}
              </p>
              <p className="text-xs text-gray-400">{currentUser.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full text-xs text-gray-500 hover:text-red-500
                       border border-gray-200 hover:border-red-200
                       rounded-lg py-2 transition-colors">
            로그아웃
          </button>
        </div>
      </aside>

      {/* ── 메인 콘텐츠 ── */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          {renderPage()}
        </div>
      </main>
    </div>
  );
}