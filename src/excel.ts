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
// Excel 파일 파싱 헬퍼 (거래처/품목 불러오기용)
// ──────────────────────────────────────────────
export const parseExcelFile = (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const wb   = XLSX.read(data, { type: 'array' });
        const ws   = wb.Sheets[wb.SheetNames[0]];
        resolve(XLSX.utils.sheet_to_json(ws, { defval: '' }));
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('파일 읽기 실패'));
    reader.readAsArrayBuffer(file);
  });
};

// ──────────────────────────────────────────────
// 오늘 날짜 반환 함수
//
// 파일명에 날짜를 붙여서 구분하기 쉽게 해요
// 예: 20260312
// ──────────────────────────────────────────────
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
};

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

  const fname = `${filename}_${today()}.xlsx`;

  if (typeof window.electronAPI !== 'undefined') {
    // Electron 환경: 저장 다이얼로그
    const result = await window.electronAPI.saveFile(
      fname,
      Array.from(new Uint8Array(excelBuffer)),
    );
    if (result.success) {
      alert(`✅ 저장 완료!\n${result.filePath}`);
    }
  } else {
    // 웹 환경: 브라우저 다운로드
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = fname;
    a.click();
    URL.revokeObjectURL(url);
    alert('✅ 저장 완료!');
  }
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
    '화주':     item.name,
    '품목명':   item.category,
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
// 수입원가 계산 결과 내보내기 (공급단가 형식)
//
// 항목 | 산식 | 건수 | 금액(원) | kg당 금액(원/kg) | 비고
// ──────────────────────────────────────────────
export const exportCostCalc = (result: {
  contractNo: string;
  blNo: string;
  blAmount: number;
  importPrice: number;
  exchangeRate: number;
  containers: number;
  customsRate: number;
  freight: number;
  salesQty: number;
  margin: number;
  goodsCost: number;
  lcOpenFee: number;
  insurance: number;
  importInterest: number;
  termCg: number;
  workFee: number;
  relocate: number;
  foodRelocate: number;
  foodInspect: number;
  doFeeTotal: number;
  wharfageTotal: number;
  ccTotal: number;
  thcTotal: number;
  customsFee: number;
  subtotal: number;
  loss: number;
  total: number;
  loadingPrice: number;
  arrivalPrice: number;
  supplyPrice: number;
  fixedFees: Record<string, number>;
}) => {
  const r = result;
  const perKg = (amt: number) => r.blAmount > 0
    ? Math.round(amt / r.blAmount / 1000 * 100) / 100 : 0;

  const data = [
    // ── 제목 행 ──
    { '항목': `원가계산서`, '산식': '', '건수': '', '금액(원)': '', 'kg당금액(원/kg)': '', '비고': '' },
    { '항목': `계약번호: ${r.contractNo || '-'}  /  B/L번호: ${r.blNo || '-'}`, '산식': '', '건수': '', '금액(원)': '', 'kg당금액(원/kg)': '', '비고': '' },
    { '항목': '', '산식': '', '건수': '', '금액(원)': '', 'kg당금액(원/kg)': '', '비고': '' },
    // ── 헤더 ──
    { '항목': '항   목', '산식': '산      식', '건수': '건수', '금액(원)': '금    액', 'kg당금액(원/kg)': 'kg당 금액', '비고': '비고' },
    // ── 비용 항목 ──
    { '항목': '개설비',     '산식': 'B/L량×단가×환율×1.2%×90/360', '건수': 1, '금액(원)': Math.round(r.lcOpenFee),       'kg당금액(원/kg)': perKg(r.lcOpenFee),       '비고': '' },
    { '항목': '전신료',     '산식': '',                               '건수': 1, '금액(원)': r.fixedFees['전신료']??0,       'kg당금액(원/kg)': perKg(r.fixedFees['전신료']??0), '비고': '' },
    { '항목': 'AMEND',      '산식': '',                               '건수': 1, '금액(원)': r.fixedFees['AMEND수수료']??0,  'kg당금액(원/kg)': perKg(r.fixedFees['AMEND수수료']??0), '비고': '' },
    { '항목': 'LG발급',     '산식': '',                               '건수': 1, '금액(원)': r.fixedFees['LG발급비']??0,    'kg당금액(원/kg)': perKg(r.fixedFees['LG발급비']??0), '비고': '건당' },
    { '항목': '보험료',     '산식': 'B/L량×단가×환율×0.1236%×1.1',  '건수': '',  '금액(원)': Math.round(r.insurance),         'kg당금액(원/kg)': perKg(r.insurance),         '비고': '' },
    { '항목': '품대',       '산식': 'B/L량×단가×환율',               '건수': '',  '금액(원)': Math.round(r.goodsCost),         'kg당금액(원/kg)': perKg(r.goodsCost),         '비고': '' },
    { '항목': '수입이자',   '산식': '품대×1.75%×120/360',            '건수': '',  '금액(원)': Math.round(r.importInterest),    'kg당금액(원/kg)': perKg(r.importInterest),    '비고': '' },
    { '항목': 'TERM CG',    '산식': '품대×1.8%×150/360',             '건수': '',  '금액(원)': Math.round(r.termCg),            'kg당금액(원/kg)': perKg(r.termCg),            '비고': '' },
    { '항목': '작업비',     '산식': `B/L량×작업비/t`,                '건수': '',  '금액(원)': Math.round(r.workFee),           'kg당금액(원/kg)': perKg(r.workFee),           '비고': '' },
    { '항목': '작업이적비', '산식': '',                               '건수': r.containers, '금액(원)': Math.round(r.relocate),     'kg당금액(원/kg)': perKg(r.relocate),     '비고': '' },
    { '항목': '식검이적비', '산식': '',                               '건수': r.containers, '금액(원)': Math.round(r.foodRelocate), 'kg당금액(원/kg)': perKg(r.foodRelocate), '비고': '' },
    { '항목': '식검수수료', '산식': '',                               '건수': 1,  '금액(원)': Math.round(r.foodInspect),       'kg당금액(원/kg)': perKg(r.foodInspect),       '비고': 'B/L기준' },
    { '항목': '검정료',     '산식': '',                               '건수': 1,  '금액(원)': r.fixedFees['검정료']??0,        'kg당금액(원/kg)': perKg(r.fixedFees['검정료']??0), '비고': '' },
    { '항목': 'D/O FEE',    '산식': '',                               '건수': 1,  '금액(원)': Math.round(r.doFeeTotal),        'kg당금액(원/kg)': perKg(r.doFeeTotal),        '비고': 'B/L기준' },
    { '항목': 'WHARFAGE',   '산식': '',                               '건수': r.containers, '금액(원)': Math.round(r.wharfageTotal), 'kg당금액(원/kg)': perKg(r.wharfageTotal), '비고': '' },
    { '항목': 'C/C',        '산식': '',                               '건수': r.containers, '금액(원)': Math.round(r.ccTotal),      'kg당금액(원/kg)': perKg(r.ccTotal),      '비고': '' },
    { '항목': 'T.H.C',      '산식': '',                               '건수': r.containers, '금액(원)': Math.round(r.thcTotal),     'kg당금액(원/kg)': perKg(r.thcTotal),     '비고': '' },
    { '항목': '관세',        '산식': `관세율 ${r.customsRate}%`,       '건수': '',  '금액(원)': Math.round(r.goodsCost * r.customsRate / 100), 'kg당금액(원/kg)': perKg(r.goodsCost * r.customsRate / 100), '비고': '' },
    { '항목': '통관수수료', '산식': '(품대+보험료+관세)×10%×0.7%',   '건수': '',  '금액(원)': Math.round(r.customsFee),        'kg당금액(원/kg)': perKg(r.customsFee),        '비고': '' },
    { '항목': '수입신고',   '산식': '',                               '건수': 1,  '금액(원)': r.fixedFees['수입신고비']??0,   'kg당금액(원/kg)': perKg(r.fixedFees['수입신고비']??0), '비고': '' },
    { '항목': '분석검정',   '산식': '',                               '건수': 1,  '금액(원)': r.fixedFees['분석검정비']??0,   'kg당금액(원/kg)': perKg(r.fixedFees['분석검정비']??0), '비고': '' },
    { '항목': '', '산식': '', '건수': '', '금액(원)': '', 'kg당금액(원/kg)': '', '비고': '' },
    // ── 합계 ──
    { '항목': '소  계',      '산식': '',                               '건수': '',  '금액(원)': Math.round(r.subtotal),          'kg당금액(원/kg)': perKg(r.subtotal),          '비고': '' },
    { '항목': '감모손실',    '산식': '소계×0.3%',                     '건수': 0.003, '금액(원)': Math.round(r.loss),             'kg당금액(원/kg)': perKg(r.loss),             '비고': '' },
    { '항목': '합  계',      '산식': '',                               '건수': '',  '금액(원)': Math.round(r.total),             'kg당금액(원/kg)': perKg(r.total),            '비고': '' },
    { '항목': '', '산식': '', '건수': '', '금액(원)': '', 'kg당금액(원/kg)': '', '비고': '' },
    // ── 단가 요약 ──
    { '항목': '단가(상차도)', '산식': '합계÷B/L원료량÷1,000',         '건수': '',  '금액(원)': '',                              'kg당금액(원/kg)': Math.round(r.loadingPrice * 100)/100, '비고': '' },
    { '항목': '단가(도착도)', '산식': `운송료 ${r.freight}원/kg`,      '건수': '',  '금액(원)': '',                              'kg당금액(원/kg)': Math.round(r.arrivalPrice * 100)/100, '비고': '' },
    { '항목': '', '산식': '', '건수': '', '금액(원)': '', 'kg당금액(원/kg)': '', '비고': '' },
    // ── 입력값 요약 ──
    { '항목': 'B/L원료량 (t)',   '산식': '',  '건수': '',        '금액(원)': r.blAmount,     'kg당금액(원/kg)': '',                          '비고': '금액단위:원' },
    { '항목': '수입단가 (US$/t)', '산식': '', '건수': '환율',    '금액(원)': r.importPrice,  'kg당금액(원/kg)': r.exchangeRate,              '비고': '' },
    { '항목': '마진',            '산식': '공급단가-도착도단가', '건수': '', '금액(원)': r.margin, 'kg당금액(원/kg)': '',                       '비고': '원/kg' },
    { '항목': '공급단가',        '산식': '도착도단가+마진',     '건수': r.salesQty, '금액(원)': Math.round(r.supplyPrice), 'kg당금액(원/kg)': '판매수입단가', '비고': '원/kg' },
  ];

  downloadExcel(data, `수입원가계산_${r.blNo || r.contractNo || today()}`);
};