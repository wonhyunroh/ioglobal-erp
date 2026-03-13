// ──────────────────────────────────────────────
// 📁 파일명: Login.tsx
// 📌 위치: src/pages/Login.tsx
//
// 🎯 이 파일의 역할:
//   - 앱 시작 시 가장 먼저 보이는 로그인 화면이에요
//   - 아이디/비밀번호 입력 후 로그인 버튼 클릭
//   - 로그인 성공 시 App.tsx로 전달해서 메인 화면으로 이동
//   - 로그인 실패 시 에러 메시지 표시
//
// 🔗 연결된 파일들:
//   - App.tsx: 로그인 성공 시 currentUser 상태 업데이트
//   - db.ts: loadUsers 로 저장된 계정 불러오기
// ──────────────────────────────────────────────

import React, { useState } from 'react';
import { User } from '../db';

type Props = {
  users: User[];
  onLogin: (user: User) => void;
};

export default function Login({ users, onLogin }: Props) {

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = () => {
    if (!username.trim()) { setError('아이디를 입력해주세요'); return; }
    if (!password.trim()) { setError('비밀번호를 입력해주세요'); return; }

    setLoading(true);
    setError('');

    // 잠깐 딜레이 (자연스러운 UX)
    setTimeout(() => {
      // 아이디/비밀번호 일치하는 유저 찾기
      const user = users.find(
        u => u.username === username && u.password === password
      );

      if (user) {
        onLogin(user); // 로그인 성공 → App.tsx로 전달
      } else {
        setError('아이디 또는 비밀번호가 올바르지 않아요');
        setLoading(false);
      }
    }, 500);
  };

  // Enter 키로도 로그인 가능하게
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleLogin();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100
                    flex items-center justify-center">
      <div className="w-full max-w-md">

        {/* ── 로고/타이틀 ── */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🌾</div>
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
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                <p className="text-red-600 text-sm">⚠️ {error}</p>
              </div>
            )}

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