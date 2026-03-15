// ──────────────────────────────────────────────
// 📁 파일명: index.ts
// 📌 위치: server/src/index.ts
//
// 🎯 이 파일의 역할:
//   - IO Global ERP 로컬 서버의 시작점이에요
//   - Express 웹 서버를 실행하고 모든 API를 등록해요
//   - SQLite 데이터베이스를 초기화하고 테이블을 생성해요
//
// 🔗 통신 구조:
//   Electron 앱 → HTTP 요청 → 이 서버 → SQLite DB
//
// 🌐 서버 주소:
//   - 개발: http://localhost:3000
//   - 실제 운영: http://[서버PC IP]:3000
//     예) http://192.168.1.100:3000
//
// 📦 사용하는 라이브러리:
//   - express: 웹 서버 (HTTP 요청/응답 처리)
//   - better-sqlite3: SQLite DB (로컬 파일 DB)
//   - cors: 다른 PC에서 접속 허용
//
// 🗄️ 데이터베이스 파일:
//   - 위치: server/data/ioglobal.db
//   - SQLite 파일 하나에 모든 데이터가 저장돼요
// ──────────────────────────────────────────────

import express    from 'express';
import cors       from 'cors';
import Database   from 'better-sqlite3';
import path       from 'path';
import fs         from 'fs';

// ── Express 앱 생성 ──
const app = express();

// ── 서버 포트 설정 ──
// 3000번 포트에서 실행해요
// 다른 프로그램이 3000을 쓰면 3001, 3002 등으로 바꿔요
const PORT = 3000;

// ──────────────────────────────────────────────
// 미들웨어 설정
//
// 미들웨어 = 요청이 들어올 때 자동으로 실행되는 처리기예요
// 마치 건물 입구의 보안검색대처럼, 모든 요청이 여기를 통과해요
// ──────────────────────────────────────────────

// CORS 허용 - 다른 PC(직원들)에서 이 서버에 접속할 수 있게 해줘요
app.use(cors());

// JSON 파싱 - 요청 본문을 JSON으로 자동 변환해줘요
app.use(express.json());

// ──────────────────────────────────────────────
// 데이터베이스 초기화
//
// SQLite는 파일 하나가 곧 데이터베이스예요
// MySQL처럼 별도 서버 설치가 필요 없어요
// 마치 엑셀 파일처럼 파일 하나에 모든 데이터가 들어있어요
// ──────────────────────────────────────────────

// data 폴더가 없으면 자동으로 만들어요
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// SQLite DB 파일 열기 (없으면 자동 생성)
const db = new Database(path.join(dataDir, 'ioglobal.db'));

// WAL 모드: 여러 PC에서 동시에 읽기/쓰기할 때 성능이 좋아요
db.pragma('journal_mode = WAL');

// ──────────────────────────────────────────────
// 테이블 생성
//
// 테이블 = 엑셀의 시트와 같아요
// IF NOT EXISTS: 이미 있으면 건너뛰어요
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

`);

// ──────────────────────────────────────────────
// 기본 관리자 계정 생성
//
// 처음 서버 실행 시 admin 계정이 없으면 자동으로 만들어요
// 기본 비밀번호: 1234
// ──────────────────────────────────────────────
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

// ──────────────────────────────────────────────
// API 라우터 등록
//
// 각 기능별로 라우터를 분리해서 관리해요
// /api/partners  → 거래처 관련 요청 처리
// /api/items     → 품목 관련 요청 처리
// /api/orders    → 주문 관련 요청 처리
// /api/inventory → 재고 관련 요청 처리
// /api/users     → 계정 관련 요청 처리
// /api/cost      → 수입원가 고정비용 관련 요청 처리
// ──────────────────────────────────────────────
import { createPartnersRouter }  from './routes/partners';
import { createItemsRouter }     from './routes/items';
import { createOrdersRouter }    from './routes/orders';
import { createInventoryRouter } from './routes/inventory';
import { createUsersRouter }     from './routes/users';
import { createCostRouter }      from './routes/cost';

app.use('/api/partners',  createPartnersRouter(db));
app.use('/api/items',     createItemsRouter(db));
app.use('/api/orders',    createOrdersRouter(db));
app.use('/api/inventory', createInventoryRouter(db));
app.use('/api/users',     createUsersRouter(db));
app.use('/api/cost',      createCostRouter(db));

// ──────────────────────────────────────────────
// 서버 상태 확인 API
//
// GET /api/health
// Electron 앱에서 서버가 켜져있는지 확인할 때 사용해요
// ──────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'IO Global ERP 서버가 정상 실행 중이에요 🌾',
    time: new Date().toLocaleString('ko-KR'),
  });
});

// ── 서버 시작 ──
// 0.0.0.0: 같은 와이파이의 모든 PC에서 접속 허용
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