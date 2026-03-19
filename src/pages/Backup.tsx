// ──────────────────────────────────────────────
// 📁 파일명: Backup.tsx
// 📌 위치: src/pages/Backup.tsx
//
// 🎯 이 파일의 역할:
//   - 전체 데이터 백업/복원 화면이에요
//   - 백업: 서버 SQLite DB 전체를 JSON 파일로 저장해요
//   - 복원: JSON 파일을 불러와서 서버 DB를 덮어써요
//   - 관리자만 접근 가능해요
//
// 📦 백업 대상 데이터:
//   - 거래처 목록 (partners)
//   - 품목 목록 (items)
//   - 주문 목록 (orders)
//   - 재고 목록 (inventory)
//   - 계정 목록 (users)
//   - 수입원가 고정비용 (cost)
//   - 계산 기준율 (rates)
//
// 🔗 연결된 파일들:
//   - db.ts: fetchBackupData, restoreBackupData
//   - server/src/routes/backup.ts: 백업/복원 API
//   - index.ts: save-file, open-file IPC 채널
// ──────────────────────────────────────────────

import React, { useState } from 'react';
import { User, fetchBackupData, restoreBackupData } from '../db';

type Props = {
  currentUser: User;  // 현재 로그인한 유저 (권한 체크용)
};

// ── 백업 대상 목록 (화면 표시용) ──
const BACKUP_ITEMS = [
  { label: '거래처 목록',       icon: '🏢' },
  { label: '품목 목록',         icon: '🌽' },
  { label: '주문 목록',         icon: '📋' },
  { label: '재고 목록',         icon: '📦' },
  { label: '계정 목록',         icon: '👤' },
  { label: '수입원가 고정비용', icon: '💰' },
  { label: '계산 기준율',       icon: '📐' },
];

export default function Backup({ currentUser }: Props) {

  // ── 백업/복원 진행 상태 ──
  const [backupLoading,  setBackupLoading]  = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);

  // ── 결과 메시지 ──
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // ── 관리자가 아니면 접근 차단 ──
  if (currentUser.role !== '관리자') {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-gray-400">
        <div className="text-6xl mb-4">🔒</div>
        <p className="text-lg font-medium">접근 권한이 없어요</p>
        <p className="text-sm mt-2">관리자만 백업/복원을 할 수 있어요</p>
      </div>
    );
  }

  // ──────────────────────────────────────────────
  // 백업 함수
  //
  // 동작 순서:
  //   1. 서버 GET /api/backup 으로 전체 데이터 불러오기
  //   2. JSON 파일로 저장 다이얼로그 띄우기
  //   3. 선택한 위치에 파일 저장
  // ──────────────────────────────────────────────
  const handleBackup = async () => {
    setBackupLoading(true);
    setMessage(null);

    try {
      // 서버에서 전체 데이터 가져오기
      const backupData = await fetchBackupData();

      // JSON 문자열로 변환 (들여쓰기 2칸으로 읽기 쉽게)
      const jsonString = JSON.stringify(backupData, null, 2);

      // 문자열 → 바이트 배열로 변환
      const encoder = new TextEncoder();
      const buffer  = Array.from(encoder.encode(jsonString));

      // 오늘 날짜 (파일명에 사용)
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');

      // 저장 다이얼로그 띄우기
      const result = await window.electronAPI.saveFile(
        `IOGlobal_ERP_백업_${dateStr}.json`,
        buffer,
      );

      if (result.success) {
        setMessage({
          type: 'success',
          text: `✅ 백업 완료!\n저장 위치: ${result.filePath}`,
        });
      }
    } catch (err) {
      console.error('백업 실패:', err);
      setMessage({
        type: 'error',
        text: '❌ 백업에 실패했어요. 서버가 실행 중인지 확인해주세요.',
      });
    } finally {
      setBackupLoading(false);
    }
  };

  // ──────────────────────────────────────────────
  // 복원 함수
  //
  // 동작 순서:
  //   1. 파일 열기 다이얼로그 띄우기
  //   2. JSON 파일 읽기 및 유효성 검사
  //   3. 서버 POST /api/backup/restore 로 전체 복원
  // ──────────────────────────────────────────────
  const handleRestore = async () => {
    // 복원 전 경고
    if (!window.confirm(
      '⚠️ 복원 시 현재 모든 데이터가 백업 파일로 업데이트됩니다!\n\n' +
      '현재 데이터를 먼저 백업하셨나요?\n\n' +
      '계속하시겠어요?'
    )) return;

    setRestoreLoading(true);
    setMessage(null);

    try {
      // 파일 열기 다이얼로그 띄우기
      const result = await window.electronAPI.openFile();

      // 취소했으면 종료
      if (!result.success || !result.data) {
        setRestoreLoading(false);
        return;
      }

      // JSON 파싱
      let backupData: any;
      try {
        backupData = JSON.parse(result.data);
      } catch {
        setMessage({ type: 'error', text: '❌ 올바른 JSON 파일이 아니에요!' });
        setRestoreLoading(false);
        return;
      }

      // 백업 파일 유효성 검사
      if (!backupData._meta || backupData._meta.appName !== 'IO Global ERP') {
        setMessage({ type: 'error', text: '❌ IO Global ERP 백업 파일이 아니에요!' });
        setRestoreLoading(false);
        return;
      }

      // 서버에 복원 요청
      await restoreBackupData(backupData);

      setMessage({
        type: 'success',
        text:
          `✅ 복원 완료!\n` +
          `백업 날짜: ${backupData._meta.createdAt}\n` +
          `백업 버전: ${backupData._meta.version}\n\n` +
          `페이지를 이동하면 복원된 데이터가 바로 보여요!`,
      });

    } catch (err) {
      console.error('복원 실패:', err);
      setMessage({
        type: 'error',
        text: '❌ 복원에 실패했어요. 서버가 실행 중인지 확인해주세요.',
      });
    } finally {
      setRestoreLoading(false);
    }
  };

  return (
    <div>
      {/* ── 페이지 제목 ── */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800">🗄️ 백업 / 복원</h2>
        <p className="text-gray-500 text-sm mt-1">
          서버 DB 전체를 JSON 파일로 백업하고 복원해요
        </p>
      </div>

      {/* ── 결과 메시지 ── */}
      {message && (
        <div className={`rounded-xl px-5 py-4 mb-6 whitespace-pre-line text-sm
          ${message.type === 'success'
            ? 'bg-green-50 border border-green-200 text-green-700'
            : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">

        {/* ── 백업 카드 ── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="text-4xl mb-4">💾</div>
          <h3 className="text-lg font-bold text-gray-800 mb-2">데이터 백업</h3>
          <p className="text-sm text-gray-500 mb-6">
            서버 DB의 모든 데이터를 JSON 파일로 저장해요.
            정기적으로 백업해두면 데이터 손실을 방지할 수 있어요.
          </p>

          {/* 백업 대상 데이터 목록 */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-xs font-semibold text-gray-500 uppercase
                          tracking-wider mb-3">
              백업 대상 데이터
            </p>
            <div className="space-y-2">
              {BACKUP_ITEMS.map(({ label, icon }) => (
                <div key={label} className="flex items-center gap-2">
                  <span>{icon}</span>
                  <span className="text-sm text-gray-600">{label}</span>
                  <span className="ml-auto text-xs text-green-600 font-medium">
                    ✅ 포함
                  </span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleBackup}
            disabled={backupLoading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg
                       font-medium hover:bg-blue-700 transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed text-sm">
            {backupLoading ? '⏳ 백업 중...' : '💾 지금 백업하기'}
          </button>
        </div>

        {/* ── 복원 카드 ── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="text-4xl mb-4">📂</div>
          <h3 className="text-lg font-bold text-gray-800 mb-2">데이터 복원</h3>
          <p className="text-sm text-gray-500 mb-6">
            백업 파일을 불러와서 서버 DB를 복원해요.
            복원 시 현재 데이터가 모두 덮어써지니 주의하세요!
          </p>

          {/* 복원 시 주의사항 */}
          <div className="bg-red-50 border border-red-100 rounded-lg p-4 mb-6">
            <p className="text-xs font-semibold text-red-500 uppercase
                          tracking-wider mb-3">
              ⚠️ 주의사항
            </p>
            <div className="space-y-1.5 text-sm text-red-600">
              <p>• 현재 데이터가 모두 업데이트됩니다</p>
              <p>• 복원 전 반드시 백업을 먼저 해주세요</p>
              <p>• IO Global ERP 백업 파일만 사용 가능해요</p>
              <p>• 복원 후 바로 적용돼요 (재시작 불필요)</p>
            </div>
          </div>

          <button
            onClick={handleRestore}
            disabled={restoreLoading}
            className="w-full bg-orange-500 text-white py-3 rounded-lg
                       font-medium hover:bg-orange-600 transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed text-sm">
            {restoreLoading ? '⏳ 복원 중...' : '📂 백업 파일 불러오기'}
          </button>
        </div>
      </div>
    </div>
  );
}
