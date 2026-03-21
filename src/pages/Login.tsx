// ──────────────────────────────────────────────
// 📁 파일명: Login.tsx
// 📌 위치: src/pages/Login.tsx
//
// 🎯 이 파일의 역할:
//   - 앱 시작 시 가장 먼저 보이는 로그인 화면이에요
//   - 아이디/비밀번호 입력 후 서버에 로그인 요청을 보내요
//   - 로그인 성공 시 App.tsx로 전달해서 메인 화면으로 이동
//   - 로그인 실패 시 서버에서 받은 에러 메시지 표시
//
// 🔄 변경사항:
//   - 기존: users 목록 받아서 프론트에서 비교
//   - 변경: 서버에 username/password 보내서 서버가 검증
//
// 🔗 연결된 파일들:
//   - App.tsx: onLogin 콜백으로 로그인 처리
// ──────────────────────────────────────────────

import React, { useState } from 'react';
import logoSvg from '../assets/logo.svg';

type Props = {
  // username, password 를 받아서 서버에 요청해요
  onLogin: (username: string, password: string) => Promise<void>;
  // App.tsx에서 내려주는 에러 메시지
  error: string;
  // 로그인 중 로딩 상태
  loading: boolean;
};

export default function Login({ onLogin, error, loading }: Props) {

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');

  // ── 로그인 버튼 클릭 ──
  const handleLogin = async () => {
    if (!username.trim()) { setLocalError('아이디를 입력해주세요'); return; }
    if (!password.trim()) { setLocalError('비밀번호를 입력해주세요'); return; }
    setLocalError('');
    await onLogin(username, password);
  };

  // ── Enter 키로도 로그인 가능하게 ──
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleLogin();
  };

  // 로컬 에러 또는 서버 에러 중 하나를 표시해요
  const displayError = localError || error;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100
                    flex items-center justify-center">
      <div className="w-full max-w-md">

        {/* ── 로고/타이틀 ── */}
        <div className="text-center mb-8">
          <img src={logoSvg} alt="IO Global" className="w-20 h-20 mx-auto mb-4 rounded-xl" />
          <h1 className="text-3xl font-bold text-gray-800">IO Global</h1>
          <p className="text-gray-500 mt-2">농산물 무역 ERP 시스템</p>
        </div>

        {/* ── 로그인 카드 ── */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-xl font-bold text-gray-800 mb-6">로그인</h2>

          <div className="space-y-4">

            {/* 아이디 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                아이디
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="아이디를 입력하세요"
                className="w-full border border-gray-300 rounded-lg px-4 py-3
                           text-sm focus:outline-none focus:ring-2
                           focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* 비밀번호 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                비밀번호
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="비밀번호를 입력하세요"
                className="w-full border border-gray-300 rounded-lg px-4 py-3
                           text-sm focus:outline-none focus:ring-2
                           focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* 에러 메시지 */}
            {displayError && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                <p className="text-red-600 text-sm">⚠️ {displayError}</p>
              </div>
            )}

            {/* 서버 연결 안내 */}
            <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3">
              <p className="text-blue-600 text-xs">
                💡 서버가 실행 중이어야 로그인할 수 있어요
              </p>
            </div>

            {/* 로그인 버튼 */}
            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg
                         font-medium hover:bg-blue-700 transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </div>
        </div>

        {/* ── 하단 안내 ── */}
        <p className="text-center text-gray-400 text-xs mt-6">
          계정 문의는 관리자에게 연락하세요
        </p>
      </div>
    </div>
  );
}