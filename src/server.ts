// ──────────────────────────────────────────────
// 📁 파일명: server.ts
// 📌 위치: src/server.ts
//
// 🎯 이 파일의 역할:
//   - Electron 메인 프로세스 안에서 Express 서버를 실행해요
//   - 앱을 켜면 서버도 자동으로 같이 켜져요
//   - 앱을 끄면 서버도 자동으로 꺼져요
//
// 📦 데이터 저장 위치:
//   - 개발: ~/Desktop/ioglobal-erp/server/data/ioglobal.db
//   - 배포: ~/Library/Application Support/ioglobal-erp/ioglobal.db
//
// 🔗 연결된 파일들:
//   - index.ts: startServer() 호출
//   - server/src/routes/*: 각 API 라우터
// ──────────────────────────────────────────────

import express       from 'express';
import cors          from 'cors';
import Database      from 'better-sqlite3';
import path          from 'path';
import fs            from 'fs';
import { app as electronApp } from 'electron';

// 라우터 임포트
import { createPartnersRouter }  from '../server/src/routes/partners';
import { createItemsRouter }     from '../server/src/routes/items';
import { createOrdersRouter }    from '../server/src/routes/orders';
import { createInventoryRouter } from '../server/src/routes/inventory';
import { createUsersRouter }     from '../server/src/routes/users';
import { createCostRouter }      from '../server/src/routes/cost';
import { createRatesRouter }     from '../server/src/routes/rates';
import { createBackupRouter }    from '../server/src/routes/backup';

const PORT = 4000;

export function startServer(): void {
  try {
    // ── DB 파일 경로 설정 ──
    // 배포 시: Electron userData 폴더 (앱별 데이터 저장 공간)
    // 개발 시: 기존 server/data 폴더 유지
    const dataDir = electronApp.isPackaged
      ? electronApp.getPath('userData')
      : path.join(__dirname, '..', 'server', 'data');

    // 데이터 폴더 없으면 생성
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const dbPath = path.join(dataDir, 'ioglobal.db');
    console.log(`📂 DB 경로: ${dbPath}`);

    // ── DB 초기화 ──
    const db = new Database(dbPath);
    db.pragma('journal_mode = WAL');

    // ── 테이블 생성 ──
    db.exec(`
      CREATE TABLE IF NOT EXISTS partners (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        name      TEXT NOT NULL,
        type      TEXT NOT NULL DEFAULT '매입처',
        country   TEXT NOT NULL DEFAULT '',
        contact   TEXT NOT NULL DEFAULT '',
        email     TEXT NOT NULL DEFAULT '',
        phone     TEXT NOT NULL DEFAULT '',
        address   TEXT NOT NULL DEFAULT '',
        memo      TEXT NOT NULL DEFAULT '',
        createdAt TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
      );

      CREATE TABLE IF NOT EXISTS items (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        name      TEXT NOT NULL,
        category  TEXT NOT NULL DEFAULT '',
        unit      TEXT NOT NULL DEFAULT '',
        spec      TEXT NOT NULL DEFAULT '',
        memo      TEXT NOT NULL DEFAULT '',
        createdAt TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
      );

      CREATE TABLE IF NOT EXISTS orders (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        orderNo   TEXT NOT NULL,
        partner   TEXT NOT NULL,
        item      TEXT NOT NULL,
        quantity  REAL NOT NULL DEFAULT 0,
        price     REAL NOT NULL DEFAULT 0,
        total     REAL NOT NULL DEFAULT 0,
        orderDate TEXT NOT NULL DEFAULT '',
        dueDate   TEXT NOT NULL DEFAULT '',
        type      TEXT NOT NULL DEFAULT '매입',
        status    TEXT NOT NULL DEFAULT '견적',
        memo      TEXT NOT NULL DEFAULT '',
        createdAt TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
      );

      CREATE TABLE IF NOT EXISTS inventory (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        item        TEXT NOT NULL,
        category    TEXT NOT NULL DEFAULT '',
        unit        TEXT NOT NULL DEFAULT '',
        current     REAL NOT NULL DEFAULT 0,
        minStock    REAL NOT NULL DEFAULT 0,
        lastUpdated TEXT NOT NULL DEFAULT (date('now', 'localtime')),
        memo        TEXT NOT NULL DEFAULT ''
      );

      CREATE TABLE IF NOT EXISTS users (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        username  TEXT NOT NULL UNIQUE,
        password  TEXT NOT NULL,
        role      TEXT NOT NULL DEFAULT '일반직원',
        lastLogin TEXT NOT NULL DEFAULT '',
        createdAt TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
      );

      CREATE TABLE IF NOT EXISTS cost_fixed_fees (
        id     INTEGER PRIMARY KEY AUTOINCREMENT,
        name   TEXT NOT NULL,
        amount REAL NOT NULL DEFAULT 0,
        memo   TEXT NOT NULL DEFAULT ''
      );

      CREATE TABLE IF NOT EXISTS calc_rates (
        id    INTEGER PRIMARY KEY AUTOINCREMENT,
        key   TEXT    NOT NULL UNIQUE,
        value REAL    NOT NULL DEFAULT 0,
        label TEXT    NOT NULL DEFAULT '',
        unit  TEXT    NOT NULL DEFAULT ''
      );
    `);

    // ── 컬럼 마이그레이션 (기존 DB 대응) ──
    try { db.exec(`ALTER TABLE items ADD COLUMN price REAL NOT NULL DEFAULT 0`); } catch {}
    try { db.exec(`ALTER TABLE items ADD COLUMN origin TEXT NOT NULL DEFAULT ''`); } catch {}

    // ── 기본 관리자 계정 생성 ──
    const adminExists = db.prepare(`SELECT id FROM users WHERE username = 'admin'`).get();
    if (!adminExists) {
      db.prepare(`INSERT INTO users (username, password, role) VALUES ('admin', '1234', '관리자')`).run();
    }

    // ── 기본 계산 기준율 삽입 ──
    const defaultRates = [
      { key: 'LC_OPEN_RATE',         value: 0.012,    label: 'LC 개설이율',   unit: '율' },
      { key: 'LC_OPEN_DAYS',         value: 90,        label: 'LC 개설기간',   unit: '일' },
      { key: 'INSURANCE_RATE',       value: 0.001236,  label: '보험요율',      unit: '율' },
      { key: 'INSURANCE_FACTOR',     value: 1.1,       label: '보험부보율',    unit: '배' },
      { key: 'IMPORT_INTEREST_RATE', value: 0.0175,    label: '수입이자율',    unit: '율' },
      { key: 'IMPORT_INTEREST_DAYS', value: 120,       label: '수입이자기간',  unit: '일' },
      { key: 'TERM_CG_RATE',         value: 0.018,     label: 'TERM CG 이율', unit: '율' },
      { key: 'TERM_CG_DAYS',         value: 150,       label: 'TERM CG 기간', unit: '일' },
      { key: 'CUSTOMS_RATE1',        value: 0.10,      label: '통관수수료율1', unit: '율' },
      { key: 'CUSTOMS_RATE2',        value: 0.007,     label: '통관수수료율2', unit: '율' },
      { key: 'LOSS_RATE',            value: 0.003,     label: '감모손실율',    unit: '율' },
      { key: 'WORK_FEE_PER_TON',     value: 13000,     label: '작업비',        unit: '원/톤' },
    ];
    const insertRate = db.prepare(`INSERT OR IGNORE INTO calc_rates (key, value, label, unit) VALUES (?, ?, ?, ?)`);
    for (const r of defaultRates) insertRate.run(r.key, r.value, r.label, r.unit);

    // ── Express 앱 설정 ──
    const expressApp = express();
    expressApp.use(cors());
    expressApp.use(express.json());

    // ── API 라우터 등록 ──
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const use = (path: string, router: any) => expressApp.use(path, router);
    use('/api/partners',  createPartnersRouter(db));
    use('/api/items',     createItemsRouter(db));
    use('/api/orders',    createOrdersRouter(db));
    use('/api/inventory', createInventoryRouter(db));
    use('/api/users',     createUsersRouter(db));
    use('/api/cost',      createCostRouter(db));
    use('/api/rates',     createRatesRouter(db));
    use('/api/backup',    createBackupRouter(db));

    // ── 헬스체크 ──
    expressApp.get('/api/health', (_req, res) => res.json({ ok: true }));

    // ── 서버 시작 ──
    expressApp.listen(PORT, () => {
      console.log(`🌾 IO Global ERP 서버 시작! (포트 ${PORT})`);
    });

  } catch (err) {
    console.error('서버 시작 실패:', err);
  }
}
