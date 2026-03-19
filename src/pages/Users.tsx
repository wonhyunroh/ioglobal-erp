// ──────────────────────────────────────────────
// 📁 파일명: Users.tsx
// 📌 위치: src/pages/Users.tsx
//
// 🎯 이 파일의 역할:
//   - 관리자만 접근 가능한 계정 관리 화면이에요
//   - 직원 계정 추가/수정/삭제/비밀번호 변경 기능
//   - 마지막 로그인 시간 표시
//
// 🔄 변경사항:
//   - 기존: electron-store에 전체 배열 저장
//   - 변경: 서버 API로 개별 추가/수정/삭제
//
// 🔗 연결된 파일들:
//   - db.ts: loadUsers, saveUser, updateUser, deleteUser
//   - App.tsx: currentUser 로 권한 체크
// ──────────────────────────────────────────────

import React, { useState, useEffect } from 'react';
import {
  User,
  loadUsers,
  saveUser,
  updateUser,
  deleteUser,
} from '../db';

type Props = {
  currentUser: User;
};

const EMPTY_FORM = {
  username: '',
  password: '1234',
  role: '일반직원' as '관리자' | '일반직원',
};

export default function Users({ currentUser }: Props) {

  const [users, setUsers] = useState<User[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showPwModal, setShowPwModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);

  // ── 앱 시작 시 서버에서 유저 목록 불러오기 ──
  useEffect(() => {
    const load = async () => {
      const data = await loadUsers();
      setUsers(data);
    };
    load();
  }, []);

  // ── 관리자가 아니면 접근 차단 ──
  if (currentUser.role !== '관리자') {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-gray-400">
        <div className="text-6xl mb-4">🔒</div>
        <p className="text-lg font-medium">접근 권한이 없어요</p>
        <p className="text-sm mt-2">관리자만 계정을 관리할 수 있어요</p>
      </div>
    );
  }

  const handleAdd = () => {
    setEditingUser(null);
    setFormData(EMPTY_FORM);
    setShowModal(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: '',
      role: user.role,
    });
    setShowModal(true);
  };

  // ── 계정 삭제 → 서버에 DELETE 요청 ──
  const handleDelete = async (user: User) => {
    if (user.id === currentUser.id) {
      alert('본인 계정은 삭제할 수 없어요!');
      return;
    }
    if (!window.confirm(`"${user.username}" 계정을 삭제하시겠어요?`)) return;
    try {
      await deleteUser(user.id);
      setUsers(prev => prev.filter(u => u.id !== user.id));
    } catch (e: any) {
      alert(e.message || '삭제에 실패했어요.');
    }
  };

  // ── 계정 저장 → 서버에 POST(추가) or PUT(수정) 요청 ──
  const handleSave = async () => {
    if (!formData.username.trim()) { alert('아이디를 입력해주세요!'); return; }
    if (!editingUser && !formData.password.trim()) {
      alert('비밀번호를 입력해주세요!'); return;
    }
    setSaving(true);
    try {
      if (editingUser) {
        // 수정: PUT /api/users/:id
        const updated = await updateUser(editingUser.id, {
          username: formData.username,
          role: formData.role,
          // 비밀번호 입력 시에만 변경해요
          ...(formData.password ? { password: formData.password } : {}),
        });
        setUsers(prev =>
          prev.map(u => u.id === editingUser.id ? { ...u, ...updated } : u)
        );
      } else {
        // 추가: POST /api/users
        const created = await saveUser({
          username: formData.username,
          password: formData.password,
          role: formData.role,
        });
        setUsers(prev => [...prev, created]);
      }
      setShowModal(false);
    } catch (e: any) {
      alert(e.message || '저장에 실패했어요.');
    } finally {
      setSaving(false);
    }
  };

  // ── 비밀번호 변경 → 서버에 PUT 요청 ──
  const handlePasswordChange = async () => {
    if (!newPassword.trim()) { alert('새 비밀번호를 입력해주세요!'); return; }
    if (newPassword.length < 4) { alert('비밀번호는 4자리 이상이어야 해요!'); return; }
    if (!editingUser) return;
    setSaving(true);
    try {
      await updateUser(editingUser.id, { password: newPassword });
      setShowPwModal(false);
      setNewPassword('');
      alert('비밀번호가 변경됐어요!');
    } catch (e: any) {
      alert(e.message || '비밀번호 변경에 실패했어요.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">👤 계정 관리</h2>
          <p className="text-gray-500 text-sm mt-1">총 {users.length}개의 계정</p>
        </div>
        <button onClick={handleAdd}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg
                     hover:bg-blue-700 transition-colors font-medium text-sm">
          + 계정 추가
        </button>
      </div>

      {/* ── 계정 목록 테이블 ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['No', '아이디', '권한', '마지막 로그인', '관리'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold
                                       text-gray-600 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((user, index) => (
              <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-gray-500">{index + 1}</td>
                <td className="px-4 py-3 font-medium text-gray-800">
                  {user.username}
                  {user.id === currentUser.id && (
                    <span className="ml-2 text-xs text-blue-500">(나)</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium
                    ${user.role === '관리자'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-gray-100 text-gray-600'
                    }`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {user.lastLogin || '없음'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(user)}
                      className="text-blue-600 hover:text-blue-800 text-xs
                                 font-medium transition-colors">수정</button>
                    <button onClick={() => {
                      setEditingUser(user);
                      setNewPassword('');
                      setShowPwModal(true);
                    }}
                      className="text-orange-500 hover:text-orange-700 text-xs
                                 font-medium transition-colors">비밀번호</button>
                    <button onClick={() => handleDelete(user)}
                      disabled={user.id === currentUser.id}
                      className="text-red-500 hover:text-red-700 text-xs
                                 font-medium transition-colors disabled:opacity-30">
                      삭제
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── 계정 추가/수정 모달 ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center
                        justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-5">
              {editingUser ? '✏️ 계정 수정' : '➕ 계정 추가'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  아이디 (직원 이름) <span className="text-red-500">*</span>
                </label>
                <input type="text"
                  value={formData.username}
                  onChange={e => setFormData(p => ({ ...p, username: e.target.value }))}
                  placeholder="예: 홍길동"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2
                             text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {/* 추가 시에만 비밀번호 입력 표시 */}
              {!editingUser && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    초기 비밀번호 <span className="text-red-500">*</span>
                  </label>
                  <input type="text"
                    value={formData.password}
                    onChange={e => setFormData(p => ({ ...p, password: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2
                               text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  권한
                </label>
                <select
                  value={formData.role}
                  onChange={e => setFormData(p => ({
                    ...p, role: e.target.value as '관리자' | '일반직원'
                  }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2
                             text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="일반직원">일반직원</option>
                  <option value="관리자">관리자</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600
                           border border-gray-300 rounded-lg hover:bg-gray-50">
                취소
              </button>
              <button onClick={handleSave} disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white
                           bg-blue-600 rounded-lg hover:bg-blue-700
                           disabled:opacity-50">
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 비밀번호 변경 모달 ── */}
      {showPwModal && editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center
                        justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-2">
              🔑 비밀번호 변경
            </h3>
            <p className="text-sm text-gray-500 mb-5">
              {editingUser.username} 계정의 비밀번호를 변경해요
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                새 비밀번호
              </label>
              <input type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="새 비밀번호 입력"
                className="w-full border border-gray-300 rounded-lg px-3 py-2
                           text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowPwModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600
                           border border-gray-300 rounded-lg hover:bg-gray-50">
                취소
              </button>
              <button onClick={handlePasswordChange} disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white
                           bg-orange-500 rounded-lg hover:bg-orange-600
                           disabled:opacity-50">
                {saving ? '변경 중...' : '변경'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}