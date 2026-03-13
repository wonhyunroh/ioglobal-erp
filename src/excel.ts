// ──────────────────────────────────────────────
// 📁 파일명: excel.ts
// 📌 위치: src/excel.ts
//
// 🎯 이 파일의 역할:
//   - 각 페이지 데이터를 엑셀 파일로 내보내는 함수 모음이에요
//   - "다른 이름으로 저장" 창을 띄워서 원하는 위치에 저장해요
//   - xlsx 라이브러리로 엑셀 파일을 만들고
//     window.electronAPI.saveFile 로 저장 다이얼로그를 띄워요
//
// 📦 사용하는 것들:
//   - xlsx: 엑셀 파일 생성 라이브러리
//   - window.electronAPI.saveFile: 저장 다이얼로그 (preload.ts 제공)
//
// 🔗 연결된 파일들:
//   - preload.ts: saveFile 함수 제공
//   - index.ts: save-file IPC 채널 처리
//   - Partners.tsx, Items.tsx, Orders.tsx,
//     Inventory.tsx, CostCalc.tsx: 각 페이지에서 호출
//
// ⚠️ 수정할 때 주의사항:
//   - 컬럼명(한글)은 엑셀에 그대로 표시돼요
//   - 새 내보내기 함수 추가 시 downloadExcel 함수를 재사용해요
// ──────────────────────────────────────────────

import * as XLSX from 'xlsx';
import { Partner, Item, Order, InventoryItem } from './db';

// ──────────────────────────────────────────────
// 오늘 날짜 반환 함수
//
// 파일명에 날짜를 붙여서 구분하기 쉽게 해요
// 예: 20260312
// ──────────────────────────────────────────────
const today = () =>
  new Date().toISOString().slice(0, 10).replace(/-/g, '');

// ──────────────────────────────────────────────
// 공통 엑셀 다운로드 함수
//
// 동작 순서:
//   1. 데이터 배열 → 엑셀 워크시트로 변환
//   2. 워크북에 시트 추가
//   3. 엑셀 파일을 바이트 배열로 변환
//   4. saveFile IPC로 저장 다이얼로그 띄우기
//   5. 사용자가 선택한 위치에 저장
//
// data: 저장할 데이터 배열 (객체 배열)
// filename: 기본 파일명 (날짜 자동 추가됨)
// ──────────────────────────────────────────────
const downloadExcel = async (data: object[], filename: string) => {
  // 데이터 → 엑셀 워크시트 변환
  const worksheet = XLSX.utils.json_to_sheet(data);

  // 새 워크북 생성
  const workbook = XLSX.utils.book_new();

  // 워크북에 시트 추가
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

  // 엑셀 파일을 바이트 배열로 변환
  // type: 'array' → Uint8Array 형태로 반환
  const excelBuffer = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array',
  });

  // 저장 다이얼로그 띄우기
  // preload.ts → index.ts → dialog.showSaveDialog 순서로 전달돼요
  const result = await window.electronAPI.saveFile(
    `${filename}_${today()}.xlsx`,   // 기본 파일명
    Array.from(new Uint8Array(excelBuffer)), // 바이트 배열
  );

  // 저장 성공/실패 알림
  if (result.success) {
    alert(`✅ 저장 완료!\n${result.filePath}`);
  }
  // 취소했으면 아무것도 안 해요
};

// ──────────────────────────────────────────────
// 거래처 목록 내보내기
//
// 거래처 관리 페이지의 📥 엑셀 저장 버튼에서 호출해요
// ──────────────────────────────────────────────
export const exportPartners = (partners: Partner[]) => {
  const data = partners.map((p, i) => ({
    'No':       i + 1,
    '회사명':   p.company,
    '담당자':   p.contact,
    '연락처':   p.phone,
    '국가':     p.country,
    '거래유형': p.type,
    '주요품목': p.mainItem,
    '메모':     p.memo,
  }));
  downloadExcel(data, '거래처목록');
};

// ──────────────────────────────────────────────
// 품목 목록 내보내기
//
// 품목 관리 페이지의 📥 엑셀 저장 버튼에서 호출해요
// ──────────────────────────────────────────────
export const exportItems = (items: Item[]) => {
  const data = items.map((item, i) => ({
    'No':       i + 1,
    '품목명':   item.name,
    '카테고리': item.category,
    '단위':     item.unit,
    '기준단가': item.price,
    '원산지':   item.origin,
    '메모':     item.memo,
  }));
  downloadExcel(data, '품목목록');
};

// ──────────────────────────────────────────────
// 주문 목록 내보내기
//
// 주문 관리 페이지의 📥 엑셀 저장 버튼에서 호출해요
// 현재 필터와 상관없이 전체 주문을 저장해요
// ──────────────────────────────────────────────
export const exportOrders = (orders: Order[]) => {
  const data = orders.map((o, i) => ({
    'No':       i + 1,
    '주문번호': o.orderNo,
    '거래처':   o.partner,
    '품목':     o.item,
    '수량':     o.quantity,
    '단가':     o.price,
    '총액':     o.total,
    '주문일':   o.orderDate,
    '납기일':   o.dueDate,
    '유형':     o.type,
    '상태':     o.status,
    '메모':     o.memo,
  }));
  downloadExcel(data, '주문목록');
};

// ──────────────────────────────────────────────
// 재고 목록 내보내기
//
// 재고 관리 페이지의 📥 엑셀 저장 버튼에서 호출해요
// 재고 부족 품목은 상태 컬럼에 '부족'으로 표시돼요
// ──────────────────────────────────────────────
export const exportInventory = (inventory: InventoryItem[]) => {
  const data = inventory.map((item, i) => ({
    'No':           i + 1,
    '품목명':       item.item,
    '카테고리':     item.category,
    '단위':         item.unit,
    '현재재고':     item.current,
    '최소재고':     item.minStock,
    '상태':         item.minStock > 0 && item.current <= item.minStock
                      ? '⚠️ 부족' : '✅ 정상',
    '최근업데이트': item.lastUpdated,
    '메모':         item.memo,
  }));
  downloadExcel(data, '재고목록');
};

// ──────────────────────────────────────────────
// 일별 출고 목록 내보내기
//
// 주문 관리 페이지의 📥 일출고 저장 버튼에서 호출해요
// 오늘 날짜 기준으로 납기일이 오늘이고
// 출고완료 상태인 주문만 필터링해서 저장해요
// ──────────────────────────────────────────────
export const exportDailyShipments = (orders: Order[], date: string) => {
  // 선택한 날짜 + 출고완료 상태인 주문만 필터링
  const shipments = orders.filter(o =>
    o.dueDate === date && o.status === '출고완료'
  );

  // 해당 날짜 출고 데이터가 없으면 알림
  if (shipments.length === 0) {
    alert(`📭 ${date} 출고 데이터가 없어요!\n납기일이 오늘이고 출고완료인 주문을 확인해주세요`);
    return;
  }

  const data = shipments.map((o, i) => ({
    'No':       i + 1,
    '주문번호': o.orderNo,
    '거래처':   o.partner,
    '품목':     o.item,
    '수량':     o.quantity,
    '단가':     o.price,
    '총액':     o.total,
    '출고일':   o.dueDate,
    '유형':     o.type,
    '메모':     o.memo,
  }));

  downloadExcel(data, `일출고_${date.replace(/-/g, '')}`);
};

// ──────────────────────────────────────────────
// 수입원가 계산 결과 내보내기
//
// 수입원가 계산 페이지의 📥 엑셀 저장 버튼에서 호출해요
// 입력값, 고정비용, 계산 결과를 모두 포함해요
// ──────────────────────────────────────────────
export const exportCostCalc = (result: {
  blAmount: number;
  importPrice: number;
  exchangeRate: number;
  containers: number;
  customsRate: number;
  freight: number;
  salesQty: number;
  margin: number;
  goodsCost: number;
  loadingPrice: number;
  arrivalPrice: number;
  supplyPrice: number;
  fixedFees: Record<string, number>;
}) => {
  const data = [
    { '항목': '── 기본 입력값 ──',      '금액(원)': '' },
    { '항목': 'B/L 원료량 (톤)',         '금액(원)': result.blAmount },
    { '항목': '수입단가 (US$/톤)',        '금액(원)': result.importPrice },
    { '항목': '환율 (원/달러)',           '금액(원)': result.exchangeRate },
    { '항목': '컨테이너수 (EA)',          '금액(원)': result.containers },
    { '항목': '관세율 (%)',               '금액(원)': result.customsRate },
    { '항목': '운송료 (원/kg)',           '금액(원)': result.freight },
    { '항목': '판매수량 (톤)',            '금액(원)': result.salesQty },
    { '항목': '마진 (원/kg)',             '금액(원)': result.margin },
    { '항목': '',                         '금액(원)': '' },
    { '항목': '── 고정비용 ──',          '금액(원)': '' },
    ...Object.entries(result.fixedFees).map(([key, value]) => ({
      '항목': key,
      '금액(원)': value,
    })),
    { '항목': '',                         '금액(원)': '' },
    { '항목': '── 계산 결과 ──',         '금액(원)': '' },
    { '항목': '품대 (원)',                '금액(원)': result.goodsCost },
    { '항목': '상차도 단가 (원/kg)',      '금액(원)': result.loadingPrice },
    { '항목': '도착도 단가 (원/kg)',      '금액(원)': result.arrivalPrice },
    { '항목': '🎯 공급단가 (원/kg)',      '금액(원)': result.supplyPrice },
  ];

  downloadExcel(data, '수입원가계산');
};