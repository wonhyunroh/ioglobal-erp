// ──────────────────────────────────────────────
// 📁 파일명: index.ts
// 📌 위치: server/src/index.ts
//
// 🎯 이 파일의 역할:
//   - IO Global ERP 로컬 서버의 시작점이에요
//   - Express 웹 서버를 실행하고 모든 API를 등록해요
//   - SQLite 데이터베이스를 초기화하고 테이블을 생성해요
// ──────────────────────────────────────────────

// ── import는 항상 맨 위에! ──
import express  from 'express';
import cors     from 'cors';
import { Database } from 'node-sqlite3-wasm';
import path     from 'path';
import fs       from 'fs';
import { createPartnersRouter }  from './routes/partners';
import { createItemsRouter }     from './routes/items';
import { createOrdersRouter }    from './routes/orders';
import { createInventoryRouter } from './routes/inventory';
import { createUsersRouter }     from './routes/users';
import { createCostRouter }      from './routes/cost';
import { createRatesRouter }     from './routes/rates';
import { createBackupRouter }    from './routes/backup';

const app  = express();
// Railway는 PORT 환경변수를 자동으로 설정해요
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4000;

// ── 미들웨어 ──
app.use(cors());
app.use(express.json());

// ──────────────────────────────────────────────
// 데이터베이스 초기화
// ──────────────────────────────────────────────
// DATA_DIR 환경변수 → Railway 볼륨 경로 (/data)
// 없으면 로컬 server/data 폴더 사용
const dataDir = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(path.join(dataDir, 'ioglobal.db'));
db.exec('PRAGMA journal_mode = WAL');

// ──────────────────────────────────────────────
// 테이블 생성
// ──────────────────────────────────────────────
db.exec(`

  -- ── 거래처 테이블 ──
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

  -- ── 품목 테이블 ──
  CREATE TABLE IF NOT EXISTS items (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    name      TEXT NOT NULL,
    category  TEXT NOT NULL DEFAULT '',
    unit      TEXT NOT NULL DEFAULT '',
    spec      TEXT NOT NULL DEFAULT '',
    memo      TEXT NOT NULL DEFAULT '',
    createdAt TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  );

  -- ── 주문 테이블 ──
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

  -- ── 재고 테이블 ──
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

  -- ── 계정 테이블 ──
  CREATE TABLE IF NOT EXISTS users (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    username  TEXT NOT NULL UNIQUE,
    password  TEXT NOT NULL,
    role      TEXT NOT NULL DEFAULT '일반직원',
    lastLogin TEXT NOT NULL DEFAULT '',
    createdAt TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  );

  -- ── 수입원가 고정비용 테이블 ──
  CREATE TABLE IF NOT EXISTS cost_fixed_fees (
    id     INTEGER PRIMARY KEY AUTOINCREMENT,
    name   TEXT NOT NULL,
    amount REAL NOT NULL DEFAULT 0,
    memo   TEXT NOT NULL DEFAULT ''
  );

  -- ── 계산 기준율 테이블 ──
  CREATE TABLE IF NOT EXISTS calc_rates (
    id    INTEGER PRIMARY KEY AUTOINCREMENT,
    key   TEXT    NOT NULL UNIQUE,
    value REAL    NOT NULL DEFAULT 0,
    label TEXT    NOT NULL DEFAULT '',
    unit  TEXT    NOT NULL DEFAULT ''
  );

`);

// ── items 테이블 컬럼 마이그레이션 ──
// DB가 이미 존재하는 경우 price, origin 컬럼이 없을 수 있어요
// ALTER TABLE은 이미 컬럼이 있으면 에러가 나서 try/catch로 처리해요
try { db.exec(`ALTER TABLE items ADD COLUMN price REAL NOT NULL DEFAULT 0`); } catch {}
try { db.exec(`ALTER TABLE items ADD COLUMN origin TEXT NOT NULL DEFAULT ''`); } catch {}

// ── 기본 관리자 계정 생성 ──
const adminExists = db.prepare(
  `SELECT id FROM users WHERE username = 'admin'`
).get();

if (!adminExists) {
  db.prepare(`
    INSERT INTO users (username, password, role)
    VALUES ('admin', '1234', '관리자')
  `).run();
  console.log('✅ 기본 관리자 계정 생성: admin / 1234');
}

// ── 기본 계산 기준율 삽입 ──
const defaultRates = [
  { key: 'LC_OPEN_RATE',         value: 0.012,   label: 'LC 개설이율',   unit: '율' },
  { key: 'LC_OPEN_DAYS',         value: 90,       label: 'LC 개설기간',   unit: '일' },
  { key: 'INSURANCE_RATE',       value: 0.001236, label: '보험요율',      unit: '율' },
  { key: 'INSURANCE_FACTOR',     value: 1.1,      label: '보험부보율',    unit: '배' },
  { key: 'IMPORT_INTEREST_RATE', value: 0.0175,   label: '수입이자율',    unit: '율' },
  { key: 'IMPORT_INTEREST_DAYS', value: 120,      label: '수입이자기간',  unit: '일' },
  { key: 'TERM_CG_RATE',         value: 0.018,    label: 'TERM CG 이율', unit: '율' },
  { key: 'TERM_CG_DAYS',         value: 150,      label: 'TERM CG 기간', unit: '일' },
  { key: 'CUSTOMS_RATE1',        value: 0.10,     label: '통관수수료율1', unit: '율' },
  { key: 'CUSTOMS_RATE2',        value: 0.007,    label: '통관수수료율2', unit: '율' },
  { key: 'LOSS_RATE',            value: 0.003,    label: '감모손실율',    unit: '율' },
  { key: 'WORK_FEE_PER_TON',     value: 13000,    label: '작업비',        unit: '원/톤' },
];

const insertRate = db.prepare(`
  INSERT OR IGNORE INTO calc_rates (key, value, label, unit)
  VALUES (?, ?, ?, ?)
`);

for (const r of defaultRates) {
  insertRate.run([r.key, r.value, r.label, r.unit]);
}
console.log('✅ 계산 기준율 기본값 설정 완료');

// ── API 라우터 등록 ──
app.use('/api/partners',  createPartnersRouter(db));
app.use('/api/items',     createItemsRouter(db));
app.use('/api/orders',    createOrdersRouter(db));
app.use('/api/inventory', createInventoryRouter(db));
app.use('/api/users',     createUsersRouter(db));
app.use('/api/cost',      createCostRouter(db));
app.use('/api/rates',     createRatesRouter(db));
app.use('/api/backup',   createBackupRouter(db));

// ── 서버 상태 확인 API ──
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'IO Global ERP 서버가 정상 실행 중이에요 🌾',
    time: new Date().toLocaleString('ko-KR'),
  });
});

// ── 서버 시작 ──
app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('🌾 IO Global ERP 서버 시작!');
  console.log(`📡 주소: http://localhost:${PORT}`);
  console.log(`📡 외부: http://[이 PC의 IP]:${PORT}`);
  console.log('');
  console.log('💡 이 PC의 IP 확인 방법:');
  console.log('   Windows: ipconfig → IPv4 주소');
  console.log('   Mac: ifconfig | grep inet');
  console.log('');
});

export { db };