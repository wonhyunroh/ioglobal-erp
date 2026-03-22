// ──────────────────────────────────────────────
// 📁 파일명: db.ts
// 📌 위치: src/db.ts
//
// 🎯 이 파일의 역할:
//   - 모든 데이터 저장/불러오기를 담당해요
//   - electron-store 대신 로컬 서버 API를 사용해요
//   - fetch()로 서버에 HTTP 요청을 보내고 결과를 받아요
//
// 🔗 통신 구조:
//   각 페이지 → db.ts 함수 호출
//            → fetch()로 서버에 HTTP 요청
//            → 서버가 SQLite DB에서 데이터 처리
//            → 결과를 페이지로 반환
//
// 🌐 서버 주소 설정:
//   - SERVER_URL 을 서버 PC의 IP로 변경해요
//   - 개발: http://localhost:3000
//   - 실제 운영: http://192.168.x.x:3000 (서버 PC IP)
// ──────────────────────────────────────────────

// ──────────────────────────────────────────────
// 서버 주소 설정
//
// 빌드 시 webpack DefinePlugin이 SERVER_URL을 자동으로 주입해요
//   - 개발 모드: http://localhost:4000
//   - 배포 모드: Railway 서버 URL (GitHub Actions에서 설정)
// ──────────────────────────────────────────────
// ?? 사용: 빈 문자열('')은 그대로 유지 (웹 빌드 = 상대경로)
// undefined일 때만 localhost로 fallback (로컬 개발용)
export const SERVER_URL = process.env.SERVER_URL ?? 'http://localhost:4000';

// Electron 빌드: webpack DefinePlugin이 실제 API_KEY를 주입
// 웹 빌드: API_KEY가 빈 문자열 → 로그인 후 localStorage에서 읽음
const getApiKey = (): string => {
  const buildTimeKey = process.env.API_KEY;
  if (buildTimeKey) return buildTimeKey;
  try { return localStorage.getItem('webToken') || ''; } catch { return ''; }
};

// ──────────────────────────────────────────────
// 공통 fetch 함수
//
// 서버에 HTTP 요청을 보내는 공통 함수예요
// method: 'GET' | 'POST' | 'PUT' | 'DELETE'
// path: '/api/partners' 같은 API 경로
// body: POST/PUT 시 보낼 데이터
// ──────────────────────────────────────────────
const api = async (
  method: string,
  path: string,
  body?: unknown
): Promise<any> => {
  const res = await fetch(`${SERVER_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'x-api-key': getApiKey() },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `서버 오류 (${res.status})`);
  }
  return res.json();
};

// ──────────────────────────────────────────────
// 데이터 타입 정의
// ──────────────────────────────────────────────

// 거래처
export type Partner = {
  id: number;
  company: string;
  contact: string;
  phone: string;
  country: string;
  type: '매입처' | '매출처';
  mainItem: string;
  memo: string;
  createdAt: string;
};

// 품목
export type Item = {
  id: number;
  name: string;
  category: string;
  unit: string;
  price: number;
  origin: string;
  memo: string;
  deliveryType: string;  // 상차도 / 도착도
  packType: string;      // 벌크 / 톤백
  priceDate: string;     // 단가 변동일 (YYYY-MM-DD)
};

// 주문
export type Order = {
  id: number;
  orderNo: string;
  contractNo: string;
  blNo: string;
  partner: string;
  item: string;
  quantity: number;
  price: number;
  total: number;
  orderDate: string;
  dueDate: string;
  type: '매입' | '매출' | '예상 매입' | '예상 매출';
  status: string;
  memo: string;
};

// 재고
export type InventoryItem = {
  id: number;
  item: string;
  category: string;
  unit: string;
  current: number;
  minStock: number;
  lastUpdated: string;
  memo: string;
};

// 유저
export type User = {
  id: number;
  username: string;
  password: string;
  role: '관리자' | '일반직원';
  lastLogin: string;
};

// 고정비용
export type CostFixedFee = {
  id: number;
  name: string;
  amount: number;
  memo: string;
};

// 작업비 내역
export type WorkFee = {
  id: number;
  yearMonth: string;
  location: '광양' | '녹산' | '두동';
  partner: string;
  item: string;
  weightKg: number;
  salesPrice: number;
  salesAmount: number;
  purchasePrice: number;
  purchaseAmount: number;
  memo: string;
};

// ──────────────────────────────────────────────
// 작업비 API 함수
// ──────────────────────────────────────────────

export const loadWorkFees = async (): Promise<WorkFee[]> => {
  try { return await api('GET', '/api/work-fees'); }
  catch { return []; }
};

export const saveWorkFee = async (w: Omit<WorkFee, 'id'>): Promise<WorkFee> =>
  api('POST', '/api/work-fees', w);

export const updateWorkFee = async (id: number, w: Omit<WorkFee, 'id'>): Promise<WorkFee> =>
  api('PUT', `/api/work-fees/${id}`, w);

export const deleteWorkFee = async (id: number): Promise<void> =>
  api('DELETE', `/api/work-fees/${id}`);

// ──────────────────────────────────────────────
// 거래처 API 함수
//
// ⚠️ 필드명 매핑 주의:
//   클라이언트 타입  ↔  서버 DB 컬럼
//   company        ↔  name     (회사명)
//   mainItem       ↔  address  (주요품목 → address 컬럼에 저장)
// ──────────────────────────────────────────────

// 서버 응답 row → Partner 타입으로 변환
const toPartner = (row: any): Partner => ({
  id:        row.id,
  company:   row.name,      // DB name → 클라이언트 company
  contact:   row.contact,
  phone:     row.phone,
  country:   row.country,
  type:      row.type,
  mainItem:  row.address,   // DB address → 클라이언트 mainItem (주요품목)
  memo:      row.memo,
  createdAt: row.createdAt || '',
});

// Partner 타입 → 서버 요청 body로 변환
const fromPartner = (p: Omit<Partner, 'id' | 'createdAt'>) => ({
  name:    p.company,    // 클라이언트 company → DB name
  type:    p.type,
  country: p.country,
  contact: p.contact,
  email:   '',
  phone:   p.phone,
  address: p.mainItem,   // 클라이언트 mainItem → DB address (주요품목)
  memo:    p.memo,
});

export const loadPartners = async (): Promise<Partner[]> => {
  try {
    const rows = await api('GET', '/api/partners');
    return rows.map(toPartner);
  }
  catch { return []; }
};

export const savePartner = async (p: Omit<Partner, 'id' | 'createdAt'>): Promise<Partner> => {
  const result = await api('POST', '/api/partners', fromPartner(p));
  return toPartner(result);
};

export const updatePartner = async (id: number, p: Omit<Partner, 'id' | 'createdAt'>): Promise<Partner> => {
  const result = await api('PUT', `/api/partners/${id}`, fromPartner(p));
  return toPartner(result);
};

export const deletePartner = async (id: number): Promise<void> =>
  api('DELETE', `/api/partners/${id}`);

// 기존 코드 호환용
export const savePartners = async (_p: Partner[]): Promise<void> => {};

// ──────────────────────────────────────────────
// 품목 API 함수
// ──────────────────────────────────────────────

export const loadItems = async (): Promise<Item[]> => {
  try { return await api('GET', '/api/items'); }
  catch { return []; }
};

export const saveItem = async (i: Omit<Item, 'id'>): Promise<Item> =>
  api('POST', '/api/items', i);

export const updateItem = async (id: number, i: Omit<Item, 'id'>): Promise<Item> =>
  api('PUT', `/api/items/${id}`, i);

export const deleteItem = async (id: number): Promise<void> =>
  api('DELETE', `/api/items/${id}`);

// 기존 코드 호환용
export const saveItems = async (_i: Item[]): Promise<void> => {};

// ──────────────────────────────────────────────
// 주문 API 함수
// ──────────────────────────────────────────────

export const loadOrders = async (): Promise<Order[]> => {
  try { return await api('GET', '/api/orders'); }
  catch { return []; }
};

export const saveOrder = async (o: Omit<Order, 'id'>): Promise<Order> =>
  api('POST', '/api/orders', o);

export const updateOrder = async (id: number, o: Omit<Order, 'id'>): Promise<Order> =>
  api('PUT', `/api/orders/${id}`, o);

export const deleteOrder = async (id: number): Promise<void> =>
  api('DELETE', `/api/orders/${id}`);

// 기존 코드 호환용
export const saveOrders = async (_o: Order[]): Promise<void> => {};

// ──────────────────────────────────────────────
// 재고 API 함수
// ──────────────────────────────────────────────

export const loadInventory = async (): Promise<InventoryItem[]> => {
  try { return await api('GET', '/api/inventory'); }
  catch { return []; }
};

export const saveInventoryItem = async (i: Omit<InventoryItem, 'id'>): Promise<InventoryItem> =>
  api('POST', '/api/inventory', i);

export const updateInventoryItem = async (id: number, i: Omit<InventoryItem, 'id'>): Promise<InventoryItem> =>
  api('PUT', `/api/inventory/${id}`, i);

export const deleteInventoryItem = async (id: number): Promise<void> =>
  api('DELETE', `/api/inventory/${id}`);

// 기존 코드 호환용 (Orders.tsx에서 재고 전체 배열 업데이트 시 사용)
export const saveInventory = async (inventory: InventoryItem[]): Promise<void> => {
  await Promise.all(
    inventory.map(item => api('PUT', `/api/inventory/${item.id}`, item))
  );
};

// ──────────────────────────────────────────────
// 계정 API 함수
// ──────────────────────────────────────────────

// 로그인
export const loginUser = async (username: string, password: string): Promise<User> =>
  api('POST', '/api/users/login', { username, password });

export const loadUsers = async (): Promise<User[]> => {
  try { return await api('GET', '/api/users'); }
  catch { return []; }
};

export const saveUser = async (u: Omit<User, 'id' | 'lastLogin'>): Promise<User> =>
  api('POST', '/api/users', u);

export const updateUser = async (id: number, u: Partial<Omit<User, 'id'>>): Promise<User> =>
  api('PUT', `/api/users/${id}`, u);

export const deleteUser = async (id: number): Promise<void> =>
  api('DELETE', `/api/users/${id}`);

// 기존 코드 호환용
export const saveUsers = async (_u: User[]): Promise<void> => {};
export const updateLastLogin = async (_id: number): Promise<void> => {};
export const USER_STORE_KEY = 'users';

// ──────────────────────────────────────────────
// 수입원가 고정비용 API 함수
// ──────────────────────────────────────────────

export const loadCostFixedFees = async (): Promise<CostFixedFee[]> => {
  try { return await api('GET', '/api/cost'); }
  catch { return []; }
};

export const saveCostFixedFee = async (f: Omit<CostFixedFee, 'id'>): Promise<CostFixedFee> =>
  api('POST', '/api/cost', f);

export const updateCostFixedFee = async (id: number, f: Omit<CostFixedFee, 'id'>): Promise<CostFixedFee> =>
  api('PUT', `/api/cost/${id}`, f);

export const deleteCostFixedFee = async (id: number): Promise<void> =>
  api('DELETE', `/api/cost/${id}`);

// ──────────────────────────────────────────────
// 기존 코드 호환용
// ──────────────────────────────────────────────
export const generateId = (list: { id: number }[]): number => {
  return list.length > 0
    ? Math.max(...list.map(item => item.id)) + 1
    : 1;
};

export const STORE_KEYS = {
  PARTNERS:  'partners',
  ITEMS:     'items',
  ORDERS:    'orders',
  INVENTORY: 'inventory',
};

// ──────────────────────────────────────────────
// 계산 기준율 API 함수
//
// 수입원가 계산에 사용하는 이율/요율을 서버에서 불러와요
// 관리자가 수정하면 모든 직원에게 적용돼요
// ──────────────────────────────────────────────

// 기준율 타입
export type CalcRate = {
  id: number;
  key: string;
  value: number;
  label: string;
  unit: string;
};

// 기준율 목록 불러오기
export const loadCalcRates = async (): Promise<CalcRate[]> => {
  try { return await api('GET', '/api/rates'); }
  catch { return []; }
};

// 기준율 수정
export const updateCalcRate = async (key: string, value: number): Promise<CalcRate> =>
  api('PUT', `/api/rates/${key}`, { value });

// ──────────────────────────────────────────────
// 저장된 수입원가 계산 API 함수
// ──────────────────────────────────────────────

export type CostCalcRecord = {
  id: number;
  name: string;
  data: Record<string, any>;
  created_at: string;
};

export const loadCostCalcs = async (): Promise<CostCalcRecord[]> => {
  try { return await api('GET', '/api/cost-calc'); }
  catch { return []; }
};

export const saveCostCalc = async (
  record: { name: string; data: Record<string, any> }
): Promise<CostCalcRecord> =>
  api('POST', '/api/cost-calc', record);

export const deleteCostCalc = async (id: number): Promise<void> =>
  api('DELETE', `/api/cost-calc/${id}`);

// ──────────────────────────────────────────────
// 백업 / 복원 API 함수
// ──────────────────────────────────────────────

// 전체 DB 백업 데이터 불러오기
export const fetchBackupData = async (): Promise<any> =>
  api('GET', '/api/backup');

// 전체 DB 복원
export const restoreBackupData = async (data: any): Promise<void> =>
  api('POST', '/api/backup/restore', data);

// ──────────────────────────────────────────────
// 챗봇 API 함수
// ──────────────────────────────────────────────
export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export const sendChatMessage = async (messages: ChatMessage[]): Promise<string> => {
  const result = await api('POST', '/api/chat', { messages });
  return result.reply;
};