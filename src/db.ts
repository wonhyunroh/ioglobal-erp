// ──────────────────────────────────────────────
// 📁 파일명: db.ts
// 📌 위치: src/db.ts
//
// 🎯 이 파일의 역할:
//   - 모든 데이터 저장/불러오기를 담당해요
//   - 마치 엑셀 파일처럼 데이터를 로컬에 저장해요
//   - electron-store를 통해 앱 껐다 켜도 데이터가 유지돼요
//
// 📦 저장되는 데이터:
//   - partners  → 거래처 목록
//   - items     → 품목 목록
//   - orders    → 주문 목록
//   - inventory → 재고 목록
//
// 🔗 연결된 파일들:
//   - preload.ts: window.electronAPI.storeGet/storeSet 제공
//   - index.ts: 실제 electron-store 처리
//   - 각 페이지 컴포넌트에서 이 파일의 함수를 불러와 사용해요
//
// ⚠️ 수정할 때 주의사항:
//   - 저장 키 이름은 STORE_KEYS 에서 관리해요
//   - 새 데이터 타입 추가 시 STORE_KEYS 에 키 추가하고
//     저장/불러오기 함수도 추가해야 해요
//   - 데이터 타입 변경 시 기존 저장된 데이터와 호환성 주의!
// ──────────────────────────────────────────────

// ──────────────────────────────────────────────
// electron-store 저장 키 상수
//
// 여기서 키 이름을 한번에 관리해요
// 오타 방지를 위해 문자열 대신 상수를 사용해요
// ──────────────────────────────────────────────
export const STORE_KEYS = {
  PARTNERS:  'partners',   // 거래처 목록
  ITEMS:     'items',      // 품목 목록
  ORDERS:    'orders',     // 주문 목록
  INVENTORY: 'inventory',  // 재고 목록
};

// ──────────────────────────────────────────────
// 데이터 타입 정의
//
// 각 모듈에서 사용하는 데이터 구조예요
// 타입을 여기서 한번에 관리해서 일관성을 유지해요
// ──────────────────────────────────────────────

// 거래처
export type Partner = {
  id: number;
  company: string;     // 회사명
  contact: string;     // 담당자
  phone: string;       // 연락처
  country: string;     // 국가
  type: '매입처' | '매출처';
  mainItem: string;    // 주요품목
  memo: string;
};

// 품목
export type Item = {
  id: number;
  name: string;        // 품목명
  category: string;    // 카테고리
  unit: string;        // 단위
  price: number;       // 기준단가
  origin: string;      // 원산지
  memo: string;
};

// 주문
export type Order = {
  id: number;
  orderNo: string;     // 주문번호
  partner: string;     // 거래처
  item: string;        // 품목
  quantity: number;    // 수량
  price: number;       // 단가
  total: number;       // 총액
  orderDate: string;   // 주문일
  dueDate: string;     // 납기일
  type: '매입' | '매출';
  status: string;      // 주문상태
  memo: string;
};

// 재고
export type InventoryItem = {
  id: number;
  item: string;        // 품목명
  category: string;    // 카테고리
  unit: string;        // 단위
  current: number;     // 현재재고
  minStock: number;    // 최소재고
  lastUpdated: string; // 마지막업데이트
  memo: string;
};

// ──────────────────────────────────────────────
// 데이터 불러오기 함수
//
// electron-store 에서 데이터를 불러와요
// 저장된 데이터가 없으면 빈 배열을 반환해요
// ──────────────────────────────────────────────

// 거래처 목록 불러오기
export const loadPartners = async (): Promise<Partner[]> => {
  try {
    const data = await window.electronAPI.storeGet(STORE_KEYS.PARTNERS);
    return data || [];  // 없으면 빈 배열
  } catch {
    return [];
  }
};

// 품목 목록 불러오기
export const loadItems = async (): Promise<Item[]> => {
  try {
    const data = await window.electronAPI.storeGet(STORE_KEYS.ITEMS);
    return data || [];
  } catch {
    return [];
  }
};

// 주문 목록 불러오기
export const loadOrders = async (): Promise<Order[]> => {
  try {
    const data = await window.electronAPI.storeGet(STORE_KEYS.ORDERS);
    return data || [];
  } catch {
    return [];
  }
};

// 재고 목록 불러오기
export const loadInventory = async (): Promise<InventoryItem[]> => {
  try {
    const data = await window.electronAPI.storeGet(STORE_KEYS.INVENTORY);
    return data || [];
  } catch {
    return [];
  }
};

// ──────────────────────────────────────────────
// 데이터 저장 함수
//
// 전체 배열을 electron-store 에 저장해요
// 변경이 있을 때마다 전체를 다시 저장해요
// ──────────────────────────────────────────────

// 거래처 목록 저장
export const savePartners = async (partners: Partner[]): Promise<void> => {
  await window.electronAPI.storeSet(STORE_KEYS.PARTNERS, partners);
};

// 품목 목록 저장
export const saveItems = async (items: Item[]): Promise<void> => {
  await window.electronAPI.storeSet(STORE_KEYS.ITEMS, items);
};

// 주문 목록 저장
export const saveOrders = async (orders: Order[]): Promise<void> => {
  await window.electronAPI.storeSet(STORE_KEYS.ORDERS, orders);
};

// 재고 목록 저장
export const saveInventory = async (inventory: InventoryItem[]): Promise<void> => {
  await window.electronAPI.storeSet(STORE_KEYS.INVENTORY, inventory);
};

// ──────────────────────────────────────────────
// 새 ID 생성 함수
//
// 현재 목록에서 가장 큰 id + 1을 반환해요
// 목록이 비어있으면 1부터 시작해요
// ──────────────────────────────────────────────
export const generateId = (list: { id: number }[]): number => {
  return list.length > 0
    ? Math.max(...list.map(item => item.id)) + 1
    : 1;
};


// ──────────────────────────────────────────────
// 👤 유저 관련 타입 및 함수
// ──────────────────────────────────────────────

// 유저 타입
export type User = {
  id: number;
  username: string;    // 아이디 (직원 이름)
  password: string;    // 비밀번호
  role: '관리자' | '일반직원';
  lastLogin: string;   // 마지막 로그인 시간
};

// 저장 키 추가
export const USER_STORE_KEY = 'users';

// 기본 관리자 계정
const DEFAULT_ADMIN: User = {
  id: 1,
  username: 'admin',
  password: '1234',
  role: '관리자',
  lastLogin: '',
};

// 유저 목록 불러오기
// 저장된 유저가 없으면 기본 관리자 계정 반환
export const loadUsers = async (): Promise<User[]> => {
  try {
    const data = await window.electronAPI.storeGet(USER_STORE_KEY);
    if (!data || data.length === 0) return [DEFAULT_ADMIN];
    return data;
  } catch {
    return [DEFAULT_ADMIN];
  }
};

// 유저 목록 저장
export const saveUsers = async (users: User[]): Promise<void> => {
  await window.electronAPI.storeSet(USER_STORE_KEY, users);
};

// 마지막 로그인 시간 업데이트
export const updateLastLogin = async (userId: number): Promise<void> => {
  const users = await loadUsers();
  const now = new Date().toLocaleString('ko-KR');
  const updated = users.map(u =>
    u.id === userId ? { ...u, lastLogin: now } : u
  );
  await saveUsers(updated);
};