"use strict";
// ──────────────────────────────────────────────
// 📁 파일명: index.ts
// 📌 위치: server/src/index.ts
//
// 🎯 이 파일의 역할:
//   - IO Global ERP 로컬 서버의 시작점이에요
//   - Express 웹 서버를 실행하고 모든 API를 등록해요
//   - SQLite 데이터베이스를 초기화하고 테이블을 생성해요
// ──────────────────────────────────────────────
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
// ── import는 항상 맨 위에! ──
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const partners_1 = require("./routes/partners");
const items_1 = require("./routes/items");
const orders_1 = require("./routes/orders");
const inventory_1 = require("./routes/inventory");
const users_1 = require("./routes/users");
const cost_1 = require("./routes/cost");
const rates_1 = require("./routes/rates");
const backup_1 = require("./routes/backup");
const cost_calc_1 = require("./routes/cost-calc");
const work_fees_1 = require("./routes/work-fees");
const app = (0, express_1.default)();
// Railway는 PORT 환경변수를 자동으로 설정해요
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4000;
// ── 미들웨어 ──
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// ── API Key 인증 ──
// API_KEY 환경변수가 설정된 경우에만 인증을 요구해요
// /api/health 는 Railway 헬스체크용으로 인증 제외
const API_KEY = process.env.API_KEY;
app.use('/api', (req, res, next) => {
    if (req.path === '/health')
        return next();
    if (req.path === '/users/login')
        return next(); // 로그인은 인증 제외 (웹 접속 지원)
    if (!API_KEY)
        return next();
    const key = req.headers['x-api-key'];
    if (key !== API_KEY) {
        return res.status(401).json({ error: '인증 실패: API Key가 올바르지 않아요' });
    }
    next();
});
// ── 요청 로깅 (디버깅용) ──
app.use((req, _res, next) => {
    console.log(`[REQ] ${req.method} ${req.path}`);
    next();
});
// ──────────────────────────────────────────────
// 데이터베이스 초기화
// ──────────────────────────────────────────────
// DATA_DIR 환경변수 → Railway 볼륨 경로 (/data)
// Railway 환경이면 /tmp (항상 쓰기 가능)
// 없으면 로컬 server/data 폴더 사용
const dataDir = process.env.DATA_DIR ||
    (process.env.RAILWAY_ENVIRONMENT ? '/tmp' : path_1.default.join(__dirname, '..', 'data'));
if (!fs_1.default.existsSync(dataDir)) {
    fs_1.default.mkdirSync(dataDir, { recursive: true });
}
const db = new better_sqlite3_1.default(path_1.default.join(dataDir, 'ioglobal.db'));
exports.db = db;
db.pragma('journal_mode = WAL');
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

  -- ── 작업비 내역 테이블 ──
  CREATE TABLE IF NOT EXISTS work_fees (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    yearMonth      TEXT NOT NULL DEFAULT '',
    location       TEXT NOT NULL DEFAULT '광양',
    partner        TEXT NOT NULL DEFAULT '',
    item           TEXT NOT NULL DEFAULT '',
    weightKg       REAL NOT NULL DEFAULT 0,
    salesPrice     REAL NOT NULL DEFAULT 0,
    salesAmount    REAL NOT NULL DEFAULT 0,
    purchasePrice  REAL NOT NULL DEFAULT 0,
    purchaseAmount REAL NOT NULL DEFAULT 0,
    memo           TEXT NOT NULL DEFAULT '',
    createdAt      TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  );

  -- ── 저장된 수입원가 계산 테이블 ──
  CREATE TABLE IF NOT EXISTS cost_calculations (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT    NOT NULL,
    data       TEXT    NOT NULL,
    created_at TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
  );

`);
// ── items 테이블 컬럼 마이그레이션 ──
try {
    db.exec(`ALTER TABLE items ADD COLUMN price REAL NOT NULL DEFAULT 0`);
}
catch { }
try {
    db.exec(`ALTER TABLE items ADD COLUMN origin TEXT NOT NULL DEFAULT ''`);
}
catch { }
try {
    db.exec(`ALTER TABLE items ADD COLUMN deliveryType TEXT NOT NULL DEFAULT '상차도'`);
}
catch { }
try {
    db.exec(`ALTER TABLE items ADD COLUMN packType TEXT NOT NULL DEFAULT '벌크'`);
}
catch { }
try {
    db.exec(`ALTER TABLE items ADD COLUMN priceDate TEXT NOT NULL DEFAULT ''`);
}
catch { }
// ── orders 테이블 컬럼 마이그레이션 ──
try {
    db.exec(`ALTER TABLE orders ADD COLUMN contractNo TEXT NOT NULL DEFAULT ''`);
}
catch { }
try {
    db.exec(`ALTER TABLE orders ADD COLUMN blNo TEXT NOT NULL DEFAULT ''`);
}
catch { }
// ── 기본 계정 생성 ──
const defaultUsers = [
    { username: 'admin', password: '1234', role: '관리자' },
    { username: '노한근', password: '1234', role: '관리자' },
    { username: '김지연', password: '1234', role: '관리자' },
];
const insertUser = db.prepare(`
  INSERT OR IGNORE INTO users (username, password, role)
  VALUES (?, ?, ?)
`);
for (const u of defaultUsers) {
    const result = insertUser.run(u.username, u.password, u.role);
    if (result.changes > 0)
        console.log(`✅ 계정 생성: ${u.username} / ${u.password}`);
}
// ── 기본 계산 기준율 삽입 ──
const defaultRates = [
    { key: 'LC_OPEN_RATE', value: 0.012, label: 'LC 개설이율', unit: '율' },
    { key: 'LC_OPEN_DAYS', value: 90, label: 'LC 개설기간', unit: '일' },
    { key: 'INSURANCE_RATE', value: 0.001236, label: '보험요율', unit: '율' },
    { key: 'INSURANCE_FACTOR', value: 1.1, label: '보험부보율', unit: '배' },
    { key: 'IMPORT_INTEREST_RATE', value: 0.0175, label: '수입이자율', unit: '율' },
    { key: 'IMPORT_INTEREST_DAYS', value: 120, label: '수입이자기간', unit: '일' },
    { key: 'TERM_CG_RATE', value: 0.018, label: 'TERM CG 이율', unit: '율' },
    { key: 'TERM_CG_DAYS', value: 150, label: 'TERM CG 기간', unit: '일' },
    { key: 'CUSTOMS_RATE1', value: 0.10, label: '통관수수료율1', unit: '율' },
    { key: 'CUSTOMS_RATE2', value: 0.007, label: '통관수수료율2', unit: '율' },
    { key: 'LOSS_RATE', value: 0.003, label: '감모손실율', unit: '율' },
    { key: 'WORK_FEE_PER_TON', value: 13000, label: '작업비', unit: '원/톤' },
];
const insertRate = db.prepare(`
  INSERT OR IGNORE INTO calc_rates (key, value, label, unit)
  VALUES (?, ?, ?, ?)
`);
for (const r of defaultRates) {
    insertRate.run(r.key, r.value, r.label, r.unit);
}
console.log('✅ 계산 기준율 기본값 설정 완료');
// ── API 라우터 등록 ──
app.use('/api/partners', (0, partners_1.createPartnersRouter)(db));
app.use('/api/items', (0, items_1.createItemsRouter)(db));
app.use('/api/orders', (0, orders_1.createOrdersRouter)(db));
app.use('/api/inventory', (0, inventory_1.createInventoryRouter)(db));
app.use('/api/users', (0, users_1.createUsersRouter)(db));
app.use('/api/cost', (0, cost_1.createCostRouter)(db));
app.use('/api/rates', (0, rates_1.createRatesRouter)(db));
app.use('/api/backup', (0, backup_1.createBackupRouter)(db));
app.use('/api/cost-calc', (0, cost_calc_1.createCostCalcRouter)(db));
app.use('/api/work-fees', (0, work_fees_1.createWorkFeesRouter)(db));
// ──────────────────────────────────────────────
// 챗봇 API
// Claude API를 사용해서 ERP 사용법을 안내해요
// ──────────────────────────────────────────────
const anthropic = new sdk_1.default({ apiKey: process.env.ANTHROPIC_API_KEY });
const CHATBOT_SYSTEM_PROMPT = `당신은 IO Global ERP 시스템의 친절한 도우미입니다.
부모님(회사 대표님)이 ERP 사용 중 모르는 것을 물어보면 쉽고 친절하게 안내해 주세요.

## IO Global ERP 기능 안내

### 메뉴 구성
- 📊 대시보드: 주문/재고/매출 현황을 한눈에 볼 수 있어요
- 🏢 거래처 관리: 매입처/매출처 회사 정보를 관리해요
- 🌽 품목 관리: 취급하는 상품 목록을 관리해요
- 📋 주문 관리: 매입/매출 주문을 등록하고 관리해요
- 📦 재고 관리: 현재 재고 수량을 관리해요
- 💰 수입원가 계산: 수입 상품의 원가를 계산해요
- 👤 계정 관리: 직원 계정을 관리해요 (관리자만)
- 🗄️ 백업/복원: 데이터를 백업하고 복원해요 (관리자만)

### 주문 상태 흐름
견적 → 계약 → 입고 → 입고완료 → 출고 → 출고완료 → 정산완료

### 예상 매출 vs 출고 매출
- 예상 매출: 아직 출고되지 않은 매출 주문의 합계 (견적~출고 상태)
- 출고 매출: 이미 출고 완료된 매출 주문의 합계 (출고완료~정산완료 상태)

### 자주 묻는 질문
- 주문 추가: 주문 관리 → 우측 상단 "주문 추가" 버튼
- 거래처 추가: 거래처 관리 → "거래처 추가" 버튼
- 재고 수정: 재고 관리 → 항목 클릭 후 수정
- 비밀번호 변경: 계정 관리에서 변경 가능 (관리자만)

항상 한국어로 답변하고, 어르신도 이해하기 쉽게 간단명료하게 설명해 주세요.`;
app.post('/api/chat', async (req, res) => {
    try {
        const { messages } = req.body;
        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: '메시지가 올바르지 않아요' });
        }
        const response = await anthropic.messages.create({
            model: 'claude-haiku-4-5',
            max_tokens: 1024,
            system: CHATBOT_SYSTEM_PROMPT,
            messages: messages,
        });
        const text = response.content
            .filter((b) => b.type === 'text')
            .map(b => b.text)
            .join('');
        res.json({ reply: text });
    }
    catch (e) {
        console.error('[CHAT ERROR]', e.message);
        res.status(500).json({ error: '챗봇 오류가 발생했어요. 잠시 후 다시 시도해 주세요.' });
    }
});
// ── 서버 상태 확인 API ──
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'IO Global ERP 서버가 정상 실행 중이에요 🌾',
        time: new Date().toLocaleString('ko-KR'),
    });
});
// ── 웹 앱 정적 파일 서빙 (아이패드/브라우저 접속 지원) ──
const publicDir = path_1.default.join(__dirname, '..', 'public');
console.log('[WEB] publicDir:', publicDir, '존재:', fs_1.default.existsSync(publicDir));
if (fs_1.default.existsSync(publicDir)) {
    app.use(express_1.default.static(publicDir));
    // SPA 라우팅: /api 이외의 모든 경로에 index.html 반환 (Express 5 호환)
    app.use(/^(?!\/api).*/, (req, res) => {
        res.sendFile(path_1.default.join(publicDir, 'index.html'));
    });
}
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
