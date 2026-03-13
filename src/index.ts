// ──────────────────────────────────────────────
// 📁 파일명: index.ts
// 📌 위치: src/index.ts
//
// 🎯 이 파일의 역할:
//   - Electron 앱의 메인 프로세스예요
//   - 앱 창을 만들고 관리해요
//   - React(렌더러)와 통신하는 IPC 채널을 설정해요
//   - electron-store로 데이터를 저장/불러오기 해요
//
// 📦 사용하는 것들:
//   - electron: 데스크톱 앱 프레임워크
//   - electron-store: 로컬 데이터 저장소
//     (앱 껐다 켜도 데이터가 유지돼요)
//   - fs: 파일 시스템 (엑셀 저장 시 사용)
//   - dialog: 파일 저장 다이얼로그
//
// 🔗 통신 구조:
//   React(렌더러) ←→ preload.ts ←→ index.ts(메인)
//   - 렌더러에서 데이터 저장/불러오기 요청
//   - 메인에서 electron-store로 실제 저장/불러오기
//
// ⚠️ 수정할 때 주의사항:
//   - IPC 채널 추가 시 preload.ts에도 같이 추가해야 해요
//   - store.get/set의 키 이름을 일관되게 유지해요
//
// 📦 IPC 채널 목록:
//   store-get    → 저장된 데이터 불러오기
//   store-set    → 데이터 저장하기
//   store-delete → 데이터 삭제하기
//   save-file    → 파일 저장 다이얼로그 (엑셀 저장 시 사용)
// ──────────────────────────────────────────────

import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as fs from 'fs';

// electron-store: 로컬 파일에 JSON 형태로 데이터를 저장해요
// 마치 브라우저의 localStorage 같은 역할이에요
// 저장 위치: ~/Library/Application Support/ioglobal-erp/config.json (Mac 기준)
import Store from 'electron-store';
const store = new Store<Record<string, unknown>>();

declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

if (require('electron-squirrel-startup')) {
  app.quit();
}

const createWindow = (): void => {
  const mainWindow = new BrowserWindow({
    // ── 창 크기 설정 ──
    // ERP 화면이 넓어야 해서 1280x800으로 설정
    height: 800,
    width: 1280,
    minWidth: 1024,   // 최소 너비 (이보다 작으면 레이아웃이 깨져요)
    minHeight: 600,   // 최소 높이
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // ── 외부 API 호출 허용 ──
  // 환율 API (open.er-api.com) 호출을 위해 CSP 설정을 변경해요
  // 기본 CSP는 외부 API 호출을 막기 때문에 여기서 허용해줘요
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' https://open.er-api.com"
        ]
      }
    });
  });

  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  // 개발 중에만 개발자 도구 자동으로 열기
  // 배포 시에는 이 줄을 주석 처리하거나 삭제하면 돼요
  mainWindow.webContents.openDevTools();
};

// ──────────────────────────────────────────────
// IPC 채널 설정
//
// IPC = Inter-Process Communication (프로세스 간 통신)
// React(렌더러 프로세스)와 이 파일(메인 프로세스)이
// 서로 데이터를 주고받는 통로예요
// ──────────────────────────────────────────────

// ── 데이터 불러오기 ──
// React에서 storeGet('키') 호출 시 여기서 처리해요
ipcMain.handle('store-get', (_event, key: string) => {
  return store.store[key];
});

// ── 데이터 저장하기 ──
// React에서 storeSet('키', 값) 호출 시 여기서 처리해요
ipcMain.handle('store-set', (_event, key: string, value: unknown) => {
  store.store = { ...store.store, [key]: value };
  return true;
});

// ── 데이터 삭제하기 ──
// React에서 storeDelete('키') 호출 시 여기서 처리해요
ipcMain.handle('store-delete', (_event, key: string) => {
  const s = { ...store.store };
  delete s[key];
  store.store = s;
  return true;
});

// ──────────────────────────────────────────────
// 파일 저장 다이얼로그 IPC 채널
//
// 엑셀 저장 시 "다른 이름으로 저장" 창을 띄워요
// 사용자가 원하는 위치에 파일을 저장할 수 있어요
//
// 동작 순서:
//   1. 렌더러(excel.ts)에서 파일 저장 요청
//   2. 메인 프로세스에서 저장 다이얼로그 띄우기
//   3. 사용자가 위치/파일명 선택
//   4. 선택한 경로에 파일 저장
// ──────────────────────────────────────────────
ipcMain.handle('save-file', async (_event, filename: string, buffer: number[]) => {
  // 저장 다이얼로그 띄우기
  // defaultPath: 기본 파일명 (예: 거래처목록_20260312.xlsx)
  const { filePath, canceled } = await dialog.showSaveDialog({
    defaultPath: filename,
    filters: [
      // xlsx 파일만 선택 가능하게 필터링
      { name: 'Excel 파일', extensions: ['xlsx'] }
    ],
  });

  // 취소했으면 success: false 반환
  if (canceled || !filePath) return { success: false };

  try {
    // 선택한 경로에 파일 저장
    // Buffer.from(buffer): 바이트 배열을 Node.js Buffer로 변환
    fs.writeFileSync(filePath, Buffer.from(buffer));
    return { success: true, filePath };
  } catch (err) {
    console.error('파일 저장 실패:', err);
    return { success: false, error: String(err) };
  }
});

// ──────────────────────────────────────────────
// 앱 이벤트 핸들러
// ──────────────────────────────────────────────

// 앱 준비 완료 시 창 생성
app.on('ready', createWindow);

// 모든 창이 닫히면 앱 종료 (Mac 제외)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Mac에서 독 아이콘 클릭 시 창 다시 열기
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});