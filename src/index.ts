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
//   - fs: 파일 시스템 (엑셀/백업 파일 저장 시 사용)
//   - dialog: 파일 저장/열기 다이얼로그
//
// 🔗 통신 구조:
//   React(렌더러) ←→ preload.ts ←→ index.ts(메인)
//
// 📦 IPC 채널 목록:
//   store-get    → 저장된 데이터 불러오기
//   store-set    → 데이터 저장하기
//   store-delete → 데이터 삭제하기
//   save-file    → 파일 저장 다이얼로그
//   open-file    → 파일 열기 다이얼로그
// ──────────────────────────────────────────────

import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as fs from 'fs';
import { startServer } from './server';

import Store from 'electron-store';
const store = new Store<Record<string, unknown>>();

declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

if (require('electron-squirrel-startup')) {
  app.quit();
}

const createWindow = (): void => {
  const mainWindow = new BrowserWindow({
    height: 800,
    width: 1280,
    minWidth: 1024,
    minHeight: 600,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // ──────────────────────────────────────────────
  // CSP 설정
  //
  // 외부 API 호출을 허용해요:
  //   - https://open.er-api.com  → 실시간 환율 API
  //   - http://localhost:3000    → 로컬 ERP 서버
  //   - http://127.0.0.1:3000   → 로컬 ERP 서버 (IP 방식)
  // ──────────────────────────────────────────────
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
          "connect-src 'self' " +
          "https://open.er-api.com " +
          "http://localhost:4000 " +
          "http://127.0.0.1:4000"
        ]
      }
    });
  });

  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  // 개발 중에만 개발자 도구 자동으로 열기
  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }
};

// ──────────────────────────────────────────────
// IPC 채널 설정
// ──────────────────────────────────────────────

// ── 데이터 불러오기 ──
ipcMain.handle('store-get', (_event, key: string) => {
  return store.store[key];
});

// ── 데이터 저장하기 ──
ipcMain.handle('store-set', (_event, key: string, value: unknown) => {
  store.store = { ...store.store, [key]: value };
  return true;
});

// ── 데이터 삭제하기 ──
ipcMain.handle('store-delete', (_event, key: string) => {
  const s = { ...store.store };
  delete s[key];
  store.store = s;
  return true;
});

// ──────────────────────────────────────────────
// 파일 저장 다이얼로그 IPC 채널
//
// 엑셀/백업 저장 시 "다른 이름으로 저장" 창을 띄워요
// ──────────────────────────────────────────────
ipcMain.handle('save-file', async (_event, filename: string, buffer: number[]) => {
  // 파일명 확장자에 따라 필터 순서 결정
  // JSON 파일이면 JSON 필터를 먼저, 아니면 Excel 필터를 먼저
  const isJson = filename.endsWith('.json');
  const filters = isJson
    ? [
        { name: 'JSON 백업 파일', extensions: ['json'] },
        { name: 'Excel 파일',     extensions: ['xlsx'] },
      ]
    : [
        { name: 'Excel 파일',     extensions: ['xlsx'] },
        { name: 'JSON 백업 파일', extensions: ['json'] },
      ];

  const { filePath, canceled } = await dialog.showSaveDialog({
    defaultPath: filename,
    filters,
  });

  if (canceled || !filePath) return { success: false };

  try {
    fs.writeFileSync(filePath, Buffer.from(buffer));
    return { success: true, filePath };
  } catch (err) {
    console.error('파일 저장 실패:', err);
    return { success: false, error: String(err) };
  }
});

// ──────────────────────────────────────────────
// 파일 열기 다이얼로그 IPC 채널
//
// 백업 복원 시 JSON 파일을 불러올 때 사용해요
// ──────────────────────────────────────────────
ipcMain.handle('open-file', async () => {
  const { filePaths, canceled } = await dialog.showOpenDialog({
    filters: [{ name: 'JSON 백업 파일', extensions: ['json'] }],
    properties: ['openFile'],
  });

  if (canceled || filePaths.length === 0) return { success: false };

  try {
    const data = fs.readFileSync(filePaths[0], 'utf-8');
    return { success: true, data };
  } catch (err) {
    console.error('파일 읽기 실패:', err);
    return { success: false, error: String(err) };
  }
});

// ──────────────────────────────────────────────
// 앱 이벤트 핸들러
// ──────────────────────────────────────────────

app.on('ready', () => {
  startServer();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});