// ──────────────────────────────────────────────
// 📁 파일명: preload.ts
// 📌 위치: src/preload.ts
//
// 🎯 이 파일의 역할:
//   - React(렌더러)와 Electron(메인) 사이의 다리 역할이에요
//   - 보안상 React에서 Node.js 기능을 직접 못 써요
//   - 그래서 이 파일을 통해서만 메인 프로세스와 통신해요
//
// 🔗 통신 구조:
//   React → window.electronAPI.xxx() 호출
//        → 이 파일에서 ipcRenderer로 메인에 전달
//        → index.ts의 ipcMain.handle()이 처리
//        → 결과값을 React로 돌려줌
//
// ⚠️ 수정할 때 주의사항:
//   - 새 기능 추가 시 index.ts의 ipcMain.handle과 짝을 맞춰야 해요
//   - contextBridge.exposeInMainWorld의 첫 번째 인자('electronAPI')는
//     React에서 window.electronAPI 로 접근하는 이름이에요
//
// 📦 현재 제공하는 기능:
//   - storeGet/storeSet/storeDelete: 데이터 저장/불러오기/삭제
//   - saveFile: 파일 저장 다이얼로그 (엑셀 저장 시 사용)
// ──────────────────────────────────────────────

import { contextBridge, ipcRenderer } from 'electron';

// ──────────────────────────────────────────────
// electronAPI를 window 객체에 노출시켜요
//
// React 컴포넌트에서 이렇게 사용해요:
//   const value = await window.electronAPI.storeGet('키이름');
//   await window.electronAPI.storeSet('키이름', 값);
//   await window.electronAPI.storeDelete('키이름');
//   await window.electronAPI.saveFile('파일명.xlsx', buffer);
// ──────────────────────────────────────────────
contextBridge.exposeInMainWorld('electronAPI', {

  // ── 데이터 불러오기 ──
  // key: 저장할 때 사용한 키 이름
  // 반환값: 저장된 데이터 (없으면 undefined)
  storeGet: (key: string) =>
    ipcRenderer.invoke('store-get', key),

  // ── 데이터 저장하기 ──
  // key: 저장할 키 이름
  // value: 저장할 데이터 (객체, 배열, 숫자, 문자열 모두 가능)
  storeSet: (key: string, value: unknown) =>
    ipcRenderer.invoke('store-set', key, value),

  // ── 데이터 삭제하기 ──
  // key: 삭제할 키 이름
  storeDelete: (key: string) =>
    ipcRenderer.invoke('store-delete', key),

  // ── 파일 저장 다이얼로그 ──
  // 엑셀 저장 시 "다른 이름으로 저장" 창을 띄워요
  // 사용자가 원하는 위치에 직접 저장할 수 있어요
  //
  // filename: 기본 파일명 (예: 거래처목록_20260312.xlsx)
  // buffer: 저장할 파일 데이터 (바이트 배열)
  // 반환값: { success: true, filePath } 또는 { success: false }
  saveFile: (filename: string, buffer: number[]) =>
    ipcRenderer.invoke('save-file', filename, buffer),

});