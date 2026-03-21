const pptxgen = require("pptxgenjs");

const pres = new pptxgen();
pres.layout = 'LAYOUT_16x9';
pres.title = 'IO Global ERP 사용 설명서';
pres.author = 'IO Global';

// ── 색상 팔레트 ──
const C = {
  primary:   '1B4332',  // 짙은 초록
  green2:    '2D6A4F',  // 숲 초록
  green3:    '40916C',  // 중간 초록
  green4:    '52B788',  // 밝은 초록
  mint:      '74C69D',  // 민트
  pale:      'D8F3DC',  // 연한 초록
  paleLight: 'F0FAF3',  // 거의 흰색 초록
  white:     'FFFFFF',
  dark:      '1A1A2E',  // 거의 검정
  gray:      '6B7280',  // 회색
  lightGray: 'F3F4F6',  // 아주 연한 회색
  orange:    'F59E0B',  // 강조 주황
  red:       'EF4444',  // 빨강
  blue:      '3B82F6',  // 파랑
};

const makeShadow = () => ({ type: "outer", blur: 8, offset: 3, angle: 135, color: "000000", opacity: 0.12 });

// ══════════════════════════════════════════════
// 슬라이드 1: 표지
// ══════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.primary };

  // 배경 장식 원들
  s.addShape(pres.shapes.OVAL, { x: -1, y: -1, w: 4, h: 4, fill: { color: C.green2, transparency: 60 }, line: { color: C.green2, transparency: 60 } });
  s.addShape(pres.shapes.OVAL, { x: 7.5, y: 3.5, w: 3.5, h: 3.5, fill: { color: C.green3, transparency: 70 }, line: { color: C.green3, transparency: 70 } });
  s.addShape(pres.shapes.OVAL, { x: 8.5, y: 0.2, w: 2, h: 2, fill: { color: C.mint, transparency: 75 }, line: { color: C.mint, transparency: 75 } });

  // 좌측 녹색 세로 바
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 0.35, h: 5.625, fill: { color: C.green4 }, line: { color: C.green4 } });

  // 이모지/아이콘 영역
  s.addText('🌾', { x: 0.6, y: 0.8, w: 1.2, h: 1.2, fontSize: 52, align: 'center' });

  // 메인 제목
  s.addText('IO Global ERP', {
    x: 0.6, y: 1.85, w: 8.5, h: 1.0,
    fontSize: 44, bold: true, color: C.white, fontFace: 'Arial Black', align: 'left',
  });

  // 부제목
  s.addText('이오글로벌 업무 관리 시스템  |  완벽 사용 가이드', {
    x: 0.6, y: 2.85, w: 8.5, h: 0.55,
    fontSize: 18, color: C.mint, fontFace: 'Arial', align: 'left',
  });

  // 구분선
  s.addShape(pres.shapes.RECTANGLE, { x: 0.6, y: 3.5, w: 4.5, h: 0.04, fill: { color: C.green4 }, line: { color: C.green4 } });

  // 설명
  s.addText('매입·매출 주문 | 재고 관리 | 거래처 관리 | 수입원가 계산', {
    x: 0.6, y: 3.65, w: 8.5, h: 0.45,
    fontSize: 14, color: C.pale, fontFace: 'Arial', align: 'left',
  });

  // 하단 버전 정보
  s.addText('Version 1.0.0  |  2026', {
    x: 0.6, y: 5.0, w: 8.5, h: 0.4,
    fontSize: 11, color: C.green4, fontFace: 'Arial', align: 'left',
  });
}

// ══════════════════════════════════════════════
// 슬라이드 2: 목차
// ══════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.paleLight };

  // 상단 헤더 바
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 1.1, fill: { color: C.primary }, line: { color: C.primary } });
  s.addText('📋  목  차', {
    x: 0.4, y: 0.15, w: 9, h: 0.8,
    fontSize: 28, bold: true, color: C.white, fontFace: 'Arial Black', align: 'left', margin: 0,
  });

  const items = [
    { no: '01', title: '앱 소개 & 작동 원리', desc: '이 앱이 무엇인지, 어떻게 작동하는지', icon: '🌐' },
    { no: '02', title: '로그인 방법',          desc: '처음 시작하는 방법',                 icon: '🔑' },
    { no: '03', title: '대시보드',             desc: '한눈에 보는 현황판',                 icon: '📊' },
    { no: '04', title: '거래처 관리',          desc: '고객사·공급사 등록 및 관리',          icon: '🏢' },
    { no: '05', title: '품목 관리',            desc: '취급 물품 등록 및 관리',              icon: '🌽' },
    { no: '06', title: '주문 관리',            desc: '매입·매출 주문 처리 흐름',            icon: '📋' },
    { no: '07', title: '재고 관리',            desc: '입고·출고 및 재고 현황',              icon: '📦' },
    { no: '08', title: '수입원가 계산',        desc: '수입 비용 자동 계산기',               icon: '🧮' },
    { no: '09', title: '계정 & 백업',          desc: '직원 계정 관리 및 데이터 백업',        icon: '🔒' },
  ];

  const colW = 4.5;
  items.forEach((item, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 0.35 + col * 4.8;
    const y = 1.3 + row * 0.95;

    // 카드 배경
    s.addShape(pres.shapes.RECTANGLE, {
      x, y, w: colW, h: 0.78,
      fill: { color: C.white },
      line: { color: 'E5E7EB', width: 1 },
      shadow: makeShadow(),
    });
    // 좌측 컬러 바
    s.addShape(pres.shapes.RECTANGLE, {
      x, y, w: 0.07, h: 0.78,
      fill: { color: C.green3 }, line: { color: C.green3 },
    });
    // 번호
    s.addText(item.no, { x: x + 0.15, y: y + 0.08, w: 0.45, h: 0.3, fontSize: 11, bold: true, color: C.green3, margin: 0 });
    // 아이콘
    s.addText(item.icon, { x: x + 0.15, y: y + 0.36, w: 0.4, h: 0.3, fontSize: 14, margin: 0 });
    // 제목
    s.addText(item.title, { x: x + 0.62, y: y + 0.06, w: colW - 0.75, h: 0.32, fontSize: 13, bold: true, color: C.dark, margin: 0 });
    // 설명
    s.addText(item.desc, { x: x + 0.62, y: y + 0.38, w: colW - 0.75, h: 0.28, fontSize: 10, color: C.gray, margin: 0 });
  });

  // 9번 (홀수라서 마지막 카드)
  // 이미 포함됨 (index 8)
}

// ══════════════════════════════════════════════
// 슬라이드 3: 앱 소개 & 작동 원리
// ══════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.paleLight };

  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 1.05, fill: { color: C.primary }, line: { color: C.primary } });
  s.addText('🌐  앱 소개 & 작동 원리', { x: 0.4, y: 0.12, w: 9, h: 0.8, fontSize: 26, bold: true, color: C.white, fontFace: 'Arial Black', margin: 0 });

  // 왼쪽: 앱이란?
  s.addShape(pres.shapes.RECTANGLE, { x: 0.3, y: 1.25, w: 4.2, h: 1.5, fill: { color: C.white }, line: { color: 'E5E7EB' }, shadow: makeShadow() });
  s.addShape(pres.shapes.RECTANGLE, { x: 0.3, y: 1.25, w: 0.07, h: 1.5, fill: { color: C.green3 }, line: { color: C.green3 } });
  s.addText('이 앱은 무엇인가요?', { x: 0.5, y: 1.32, w: 3.9, h: 0.35, fontSize: 14, bold: true, color: C.primary, margin: 0 });
  s.addText([
    { text: '이오글로벌 회사의 업무를 컴퓨터로 관리하는 전용 프로그램이에요.', options: { breakLine: true } },
    { text: '주문·재고·거래처·비용을 한 곳에서 모두 처리할 수 있어요.', options: { breakLine: false } },
  ], { x: 0.5, y: 1.7, w: 3.9, h: 0.9, fontSize: 11, color: C.dark, margin: 0 });

  // 오른쪽: 왜 사용하나요?
  s.addShape(pres.shapes.RECTANGLE, { x: 5.5, y: 1.25, w: 4.2, h: 1.5, fill: { color: C.white }, line: { color: 'E5E7EB' }, shadow: makeShadow() });
  s.addShape(pres.shapes.RECTANGLE, { x: 5.5, y: 1.25, w: 0.07, h: 1.5, fill: { color: C.orange }, line: { color: C.orange } });
  s.addText('왜 사용하나요?', { x: 5.7, y: 1.32, w: 3.9, h: 0.35, fontSize: 14, bold: true, color: C.primary, margin: 0 });
  s.addText([
    { text: '• 엑셀 대신 체계적으로 관리', options: { breakLine: true } },
    { text: '• 두 컴퓨터에서 같은 데이터 공유', options: { breakLine: true } },
    { text: '• 수입원가 자동 계산', options: { breakLine: false } },
  ], { x: 5.7, y: 1.7, w: 3.9, h: 0.9, fontSize: 11, color: C.dark, margin: 0 });

  // 작동 원리 다이어그램
  s.addText('작동 원리', { x: 0.3, y: 2.95, w: 9, h: 0.4, fontSize: 16, bold: true, color: C.primary, margin: 0 });

  // 다이어그램 박스들
  const boxes = [
    { x: 0.3,  label: '엄마 컴퓨터\n(ERP 앱)', icon: '💻', color: C.green3 },
    { x: 2.95, label: '인터넷',            icon: '🌐', color: C.blue },
    { x: 5.6,  label: 'Railway 서버\n(클라우드)', icon: '☁️', color: C.green2 },
    { x: 8.25, label: '아빠 컴퓨터\n(ERP 앱)', icon: '💻', color: C.green3 },
  ];

  boxes.forEach((b, i) => {
    s.addShape(pres.shapes.RECTANGLE, { x: b.x, y: 3.45, w: 1.9, h: 1.6, fill: { color: b.color }, line: { color: b.color }, shadow: makeShadow() });
    s.addText(b.icon, { x: b.x, y: 3.5, w: 1.9, h: 0.7, fontSize: 28, align: 'center', margin: 0 });
    s.addText(b.label, { x: b.x, y: 4.2, w: 1.9, h: 0.75, fontSize: 11, bold: true, color: C.white, align: 'center', margin: 0 });
    // 화살표 (마지막 제외)
    if (i < 3) {
      s.addShape(pres.shapes.RECTANGLE, { x: b.x + 1.9, y: 4.1, w: 0.65, h: 0.06, fill: { color: C.gray }, line: { color: C.gray } });
      s.addText('▶', { x: b.x + 2.4, y: 3.98, w: 0.3, h: 0.3, fontSize: 12, color: C.gray, margin: 0 });
    }
  });

  s.addText('두 컴퓨터 모두 인터넷만 연결되면 같은 데이터를 실시간으로 볼 수 있어요', {
    x: 0.3, y: 5.2, w: 9.4, h: 0.3, fontSize: 11, color: C.gray, align: 'center', italic: true, margin: 0,
  });
}

// ══════════════════════════════════════════════
// 슬라이드 4: 로그인
// ══════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.paleLight };

  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 1.05, fill: { color: C.primary }, line: { color: C.primary } });
  s.addText('🔑  로그인 방법', { x: 0.4, y: 0.12, w: 9, h: 0.8, fontSize: 26, bold: true, color: C.white, fontFace: 'Arial Black', margin: 0 });

  // 1단계 카드들
  const steps = [
    { num: '1', title: '앱 실행', desc: '바탕화면의\n「IO Global ERP」\n아이콘을 더블클릭', icon: '🖥️' },
    { num: '2', title: '아이디 입력', desc: '담당자가 알려준\n아이디를 입력해요\n(기본: admin)', icon: '👤' },
    { num: '3', title: '비밀번호 입력', desc: '비밀번호를 입력해요\n(기본 비밀번호: 1234)\n나중에 변경 권장', icon: '🔐' },
    { num: '4', title: '로그인 버튼 클릭', desc: '파란 「로그인」\n버튼을 클릭하면\n메인 화면으로 이동', icon: '✅' },
  ];

  steps.forEach((step, i) => {
    const x = 0.35 + i * 2.35;
    s.addShape(pres.shapes.RECTANGLE, { x, y: 1.2, w: 2.1, h: 3.2, fill: { color: C.white }, line: { color: 'E5E7EB' }, shadow: makeShadow() });
    // 번호 원
    s.addShape(pres.shapes.OVAL, { x: x + 0.75, y: 1.25, w: 0.6, h: 0.6, fill: { color: C.green3 }, line: { color: C.green3 } });
    s.addText(step.num, { x: x + 0.75, y: 1.3, w: 0.6, h: 0.5, fontSize: 16, bold: true, color: C.white, align: 'center', margin: 0 });
    // 아이콘
    s.addText(step.icon, { x, y: 1.95, w: 2.1, h: 0.7, fontSize: 30, align: 'center', margin: 0 });
    // 제목
    s.addText(step.title, { x: x + 0.1, y: 2.7, w: 1.9, h: 0.4, fontSize: 13, bold: true, color: C.primary, align: 'center', margin: 0 });
    // 설명
    s.addText(step.desc, { x: x + 0.1, y: 3.12, w: 1.9, h: 1.2, fontSize: 10.5, color: C.dark, align: 'center', margin: 0 });

    // 화살표
    if (i < 3) {
      s.addText('→', { x: x + 2.1, y: 2.5, w: 0.25, h: 0.4, fontSize: 18, color: C.green3, align: 'center', margin: 0 });
    }
  });

  // 주의사항
  s.addShape(pres.shapes.RECTANGLE, { x: 0.35, y: 4.55, w: 9.3, h: 0.85, fill: { color: 'FFF8E1' }, line: { color: 'F59E0B', width: 1.5 } });
  s.addText('⚠️  중요 안내', { x: 0.55, y: 4.6, w: 2, h: 0.35, fontSize: 12, bold: true, color: 'B45309', margin: 0 });
  s.addText([
    { text: '• 인터넷이 연결되어 있어야 사용할 수 있어요   ', options: { breakLine: false } },
    { text: '• 로그인이 안 될 경우: 인터넷 연결을 확인하거나 자녀에게 연락해주세요', options: { breakLine: false } },
  ], { x: 0.55, y: 4.97, w: 9.0, h: 0.35, fontSize: 11, color: '92400E', margin: 0 });
}

// ══════════════════════════════════════════════
// 슬라이드 5: 대시보드
// ══════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.paleLight };

  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 1.05, fill: { color: C.primary }, line: { color: C.primary } });
  s.addText('📊  대시보드  —  한눈에 보는 현황판', { x: 0.4, y: 0.12, w: 9, h: 0.8, fontSize: 24, bold: true, color: C.white, fontFace: 'Arial Black', margin: 0 });

  // 설명
  s.addText('앱을 켜면 제일 먼저 보이는 화면이에요. 회사 현황을 한눈에 확인할 수 있어요.', {
    x: 0.4, y: 1.15, w: 9.2, h: 0.35, fontSize: 12, color: C.gray, margin: 0,
  });

  // 4개 요약 카드
  const summaryCards = [
    { title: '이번 달 매출', icon: '📈', color: '3B82F6', desc: '이번 달에 판매한\n총 금액 합계' },
    { title: '이번 달 매입', icon: '📉', color: C.green3, desc: '이번 달에 구매한\n총 금액 합계' },
    { title: '진행 중 주문', icon: '📋', color: 'F97316', desc: '아직 정산 완료가\n되지 않은 주문 수' },
    { title: '재고 부족 품목', icon: '⚠️', color: 'EF4444', desc: '최소 재고 이하로\n떨어진 품목 수' },
  ];

  summaryCards.forEach((card, i) => {
    const x = 0.35 + i * 2.35;
    s.addShape(pres.shapes.RECTANGLE, { x, y: 1.6, w: 2.1, h: 1.45, fill: { color: C.white }, line: { color: 'E5E7EB' }, shadow: makeShadow() });
    s.addShape(pres.shapes.RECTANGLE, { x, y: 1.6, w: 2.1, h: 0.1, fill: { color: card.color }, line: { color: card.color } });
    s.addText(card.icon, { x, y: 1.72, w: 2.1, h: 0.55, fontSize: 24, align: 'center', margin: 0 });
    s.addText(card.title, { x: x + 0.05, y: 2.3, w: 2.0, h: 0.3, fontSize: 11, bold: true, color: C.dark, align: 'center', margin: 0 });
    s.addText(card.desc, { x: x + 0.05, y: 2.62, w: 2.0, h: 0.38, fontSize: 9.5, color: C.gray, align: 'center', margin: 0 });
  });

  // 최근 주문 현황
  s.addShape(pres.shapes.RECTANGLE, { x: 0.35, y: 3.2, w: 9.3, h: 2.15, fill: { color: C.white }, line: { color: 'E5E7EB' }, shadow: makeShadow() });
  s.addShape(pres.shapes.RECTANGLE, { x: 0.35, y: 3.2, w: 9.3, h: 0.45, fill: { color: C.lightGray }, line: { color: 'E5E7EB' } });
  s.addText('📋  최근 주문 현황  (최신 5건)', { x: 0.5, y: 3.25, w: 9, h: 0.35, fontSize: 13, bold: true, color: C.dark, margin: 0 });

  // 테이블 헤더
  const headers = ['주문번호', '거래처', '품목', '총액', '주문일', '유형', '상태'];
  const colXs = [0.4, 1.7, 3.1, 4.5, 5.7, 6.9, 7.9];
  const colWs = [1.2, 1.3, 1.3, 1.1, 1.1, 0.95, 1.25];

  headers.forEach((h, i) => {
    s.addText(h, { x: colXs[i], y: 3.7, w: colWs[i], h: 0.28, fontSize: 9, bold: true, color: C.gray, margin: 0 });
  });

  // 예시 행
  const rows = [
    ['ORD-2026-023', '(주)대한사료', '옥수수', '₩52,000,000', '2026-03-18', '매입', '계약'],
    ['ORD-2026-022', '이오글로벌', '대두박', '₩31,500,000', '2026-03-17', '매출', '출고완료'],
  ];

  rows.forEach((row, ri) => {
    const y = 4.0 + ri * 0.4;
    if (ri % 2 === 0) {
      s.addShape(pres.shapes.RECTANGLE, { x: 0.35, y, w: 9.3, h: 0.38, fill: { color: 'F9FAFB' }, line: { color: 'F9FAFB' } });
    }
    row.forEach((cell, ci) => {
      const textColor = ci === 5 ? (cell === '매입' ? '1D4ED8' : '15803D') : ci === 6 ? '374151' : C.dark;
      s.addText(cell, { x: colXs[ci], y: y + 0.04, w: colWs[ci], h: 0.3, fontSize: 9.5, color: textColor, margin: 0 });
    });
  });

  // 새로고침 안내
  s.addText('💡  화면 오른쪽 상단의 「🔄 새로고침」 버튼을 누르면 최신 정보로 업데이트돼요', {
    x: 0.35, y: 5.32, w: 9.3, h: 0.25, fontSize: 10, color: C.gray, italic: true, margin: 0,
  });
}

// ══════════════════════════════════════════════
// 슬라이드 6: 거래처 관리
// ══════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.paleLight };

  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 1.05, fill: { color: C.primary }, line: { color: C.primary } });
  s.addText('🏢  거래처 관리', { x: 0.4, y: 0.12, w: 9, h: 0.8, fontSize: 26, bold: true, color: C.white, fontFace: 'Arial Black', margin: 0 });

  s.addText('함께 거래하는 회사들(고객사·공급사)을 등록하고 관리하는 곳이에요.', {
    x: 0.4, y: 1.13, w: 9.2, h: 0.32, fontSize: 12, color: C.gray, margin: 0,
  });

  // 등록 정보
  s.addShape(pres.shapes.RECTANGLE, { x: 0.3, y: 1.55, w: 4.6, h: 3.8, fill: { color: C.white }, line: { color: 'E5E7EB' }, shadow: makeShadow() });
  s.addShape(pres.shapes.RECTANGLE, { x: 0.3, y: 1.55, w: 4.6, h: 0.5, fill: { color: C.green2 }, line: { color: C.green2 } });
  s.addText('📝  등록하는 정보', { x: 0.4, y: 1.6, w: 4.4, h: 0.4, fontSize: 14, bold: true, color: C.white, margin: 0 });

  const partnerFields = [
    { label: '회사명 *', desc: '거래 회사 이름 (필수)' },
    { label: '담당자', desc: '연락하는 담당자 이름' },
    { label: '연락처', desc: '전화번호' },
    { label: '국가', desc: '어느 나라 회사인지' },
    { label: '거래 유형', desc: '매입처 (사오는 곳) / 매출처 (파는 곳)' },
    { label: '주요 품목', desc: '주로 거래하는 물품' },
    { label: '메모', desc: '추가로 기억할 내용' },
  ];

  partnerFields.forEach((f, i) => {
    const y = 2.15 + i * 0.45;
    s.addShape(pres.shapes.RECTANGLE, { x: 0.4, y, w: 1.3, h: 0.35, fill: { color: C.pale }, line: { color: C.pale } });
    s.addText(f.label, { x: 0.42, y: y + 0.03, w: 1.26, h: 0.29, fontSize: 10, bold: true, color: C.green2, margin: 0 });
    s.addText(f.desc, { x: 1.8, y: y + 0.03, w: 3.0, h: 0.29, fontSize: 10, color: C.dark, margin: 0 });
  });

  // 기능 설명
  s.addShape(pres.shapes.RECTANGLE, { x: 5.1, y: 1.55, w: 4.6, h: 3.8, fill: { color: C.white }, line: { color: 'E5E7EB' }, shadow: makeShadow() });
  s.addShape(pres.shapes.RECTANGLE, { x: 5.1, y: 1.55, w: 4.6, h: 0.5, fill: { color: C.green2 }, line: { color: C.green2 } });
  s.addText('🖱️  사용 방법', { x: 5.2, y: 1.6, w: 4.4, h: 0.4, fontSize: 14, bold: true, color: C.white, margin: 0 });

  const howtos = [
    { icon: '➕', title: '거래처 추가', desc: '오른쪽 상단 「+ 거래처 추가」 버튼 클릭\n→ 정보 입력 → 「저장」 클릭' },
    { icon: '✏️', title: '정보 수정', desc: '수정할 거래처 행 오른쪽의\n「수정」 버튼 클릭 → 변경 → 저장' },
    { icon: '🗑️', title: '거래처 삭제', desc: '삭제할 거래처 행 오른쪽의\n「삭제」 버튼 클릭 → 확인' },
    { icon: '📥', title: '엑셀 저장', desc: '「📥 엑셀 저장」 버튼으로\n전체 목록을 엑셀 파일로 저장' },
  ];

  howtos.forEach((h, i) => {
    const y = 2.15 + i * 0.82;
    s.addShape(pres.shapes.RECTANGLE, { x: 5.2, y, w: 4.4, h: 0.7, fill: { color: C.paleLight }, line: { color: C.pale } });
    s.addText(h.icon + ' ' + h.title, { x: 5.3, y: y + 0.04, w: 4.2, h: 0.28, fontSize: 12, bold: true, color: C.primary, margin: 0 });
    s.addText(h.desc, { x: 5.3, y: y + 0.34, w: 4.2, h: 0.32, fontSize: 9.5, color: C.dark, margin: 0 });
  });

  s.addShape(pres.shapes.RECTANGLE, { x: 5.1, y: 5.3, w: 4.6, h: 0.15, fill: { color: C.mint }, line: { color: C.mint } });
}

// ══════════════════════════════════════════════
// 슬라이드 7: 품목 관리
// ══════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.paleLight };

  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 1.05, fill: { color: C.primary }, line: { color: C.primary } });
  s.addText('🌽  품목 관리', { x: 0.4, y: 0.12, w: 9, h: 0.8, fontSize: 26, bold: true, color: C.white, fontFace: 'Arial Black', margin: 0 });

  s.addText('회사에서 취급하는 물품들을 등록하고 관리하는 곳이에요.', {
    x: 0.4, y: 1.13, w: 9.2, h: 0.32, fontSize: 12, color: C.gray, margin: 0,
  });

  // 카테고리
  s.addShape(pres.shapes.RECTANGLE, { x: 0.3, y: 1.55, w: 3.3, h: 3.8, fill: { color: C.white }, line: { color: 'E5E7EB' }, shadow: makeShadow() });
  s.addShape(pres.shapes.RECTANGLE, { x: 0.3, y: 1.55, w: 3.3, h: 0.5, fill: { color: C.green3 }, line: { color: C.green3 } });
  s.addText('📦  취급 품목 종류', { x: 0.4, y: 1.6, w: 3.1, h: 0.4, fontSize: 13, bold: true, color: C.white, margin: 0 });

  const categories = ['🌽 옥수수', '🫘 대두박', '🌾 소맥피', '🌿 면실박', '🥬 채종박', '🍶 주정박', '🍯 당밀', '📦 기타'];
  categories.forEach((c, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 0.4 + col * 1.55;
    const y = 2.15 + row * 0.47;
    s.addShape(pres.shapes.RECTANGLE, { x, y, w: 1.45, h: 0.38, fill: { color: C.pale }, line: { color: C.mint } });
    s.addText(c, { x, y: y + 0.04, w: 1.45, h: 0.3, fontSize: 11, color: C.green2, align: 'center', bold: true, margin: 0 });
  });

  s.addText('단위: 톤 / kg / MT', { x: 0.4, y: 4.1, w: 3.0, h: 0.25, fontSize: 10, color: C.gray, margin: 0 });
  s.addShape(pres.shapes.RECTANGLE, { x: 0.4, y: 4.35, w: 3.0, h: 0.85, fill: { color: 'FEF9C3' }, line: { color: 'FDE68A' } });
  s.addText('💡  품목을 먼저 등록해야 주문에서\n선택할 수 있어요!', { x: 0.5, y: 4.38, w: 2.9, h: 0.75, fontSize: 10, color: '854D0E', margin: 0 });

  // 등록 정보
  s.addShape(pres.shapes.RECTANGLE, { x: 3.8, y: 1.55, w: 5.9, h: 3.8, fill: { color: C.white }, line: { color: 'E5E7EB' }, shadow: makeShadow() });
  s.addShape(pres.shapes.RECTANGLE, { x: 3.8, y: 1.55, w: 5.9, h: 0.5, fill: { color: C.green3 }, line: { color: C.green3 } });
  s.addText('📝  등록 정보 & 사용법', { x: 3.9, y: 1.6, w: 5.7, h: 0.4, fontSize: 13, bold: true, color: C.white, margin: 0 });

  const itemInfo = [
    { label: '품목명 *', val: '물품의 이름 (예: 옥수수 미국산)' },
    { label: '카테고리', val: '품목 종류 선택 (옥수수/대두박 등)' },
    { label: '단위', val: '거래 단위 (톤/kg/MT)' },
    { label: '기준 단가', val: '기본 단가 (원) — 주문 시 참고용' },
    { label: '원산지', val: '어느 나라에서 온 물품인지 (예: 미국, 브라질)' },
    { label: '메모', val: '추가로 기억할 내용' },
  ];

  itemInfo.forEach((item, i) => {
    const y = 2.15 + i * 0.44;
    s.addShape(pres.shapes.RECTANGLE, { x: 3.9, y, w: 1.45, h: 0.35, fill: { color: C.pale }, line: { color: C.pale } });
    s.addText(item.label, { x: 3.92, y: y + 0.03, w: 1.41, h: 0.29, fontSize: 10, bold: true, color: C.green2, margin: 0 });
    s.addText(item.val, { x: 5.45, y: y + 0.03, w: 4.1, h: 0.29, fontSize: 10, color: C.dark, margin: 0 });
  });

  s.addShape(pres.shapes.RECTANGLE, { x: 3.9, y: 4.4, w: 5.7, h: 0.75, fill: { color: C.paleLight }, line: { color: C.pale } });
  s.addText([
    { text: '➕ 품목 추가: ', options: { bold: true } },
    { text: '오른쪽 상단 「+ 품목 추가」 → 정보 입력 → 저장', options: {} },
    { text: '\n✏️ 수정/삭제: ', options: { bold: true } },
    { text: '목록에서 해당 행의 「수정」또는「삭제」클릭', options: {} },
  ], { x: 3.9, y: 4.42, w: 5.7, h: 0.7, fontSize: 10.5, color: C.dark, margin: 0 });
}

// ══════════════════════════════════════════════
// 슬라이드 8: 주문 관리 (1) 개요
// ══════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.paleLight };

  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 1.05, fill: { color: C.primary }, line: { color: C.primary } });
  s.addText('📋  주문 관리  ①  —  매입과 매출', { x: 0.4, y: 0.12, w: 9, h: 0.8, fontSize: 24, bold: true, color: C.white, fontFace: 'Arial Black', margin: 0 });

  s.addText('회사의 모든 구매(매입)와 판매(매출) 주문을 기록하고 관리하는 핵심 기능이에요.', {
    x: 0.4, y: 1.13, w: 9.2, h: 0.32, fontSize: 12, color: C.gray, margin: 0,
  });

  // 매입 vs 매출
  // 매입
  s.addShape(pres.shapes.RECTANGLE, { x: 0.3, y: 1.55, w: 4.5, h: 1.8, fill: { color: C.white }, line: { color: 'BFDBFE' }, shadow: makeShadow() });
  s.addShape(pres.shapes.RECTANGLE, { x: 0.3, y: 1.55, w: 4.5, h: 0.5, fill: { color: '3B82F6' }, line: { color: '3B82F6' } });
  s.addText('📥  매입  (사오는 것)', { x: 0.4, y: 1.6, w: 4.3, h: 0.4, fontSize: 14, bold: true, color: C.white, margin: 0 });
  s.addText([
    { text: '• 공급업체로부터 물건을 구입하는 것\n', options: {} },
    { text: '• 예: 미국에서 옥수수를 구입\n', options: {} },
    { text: '• 입고완료 시 재고가 자동으로 늘어나요', options: {} },
  ], { x: 0.4, y: 2.1, w: 4.2, h: 1.1, fontSize: 11, color: C.dark, margin: 0 });

  // 매출
  s.addShape(pres.shapes.RECTANGLE, { x: 5.2, y: 1.55, w: 4.5, h: 1.8, fill: { color: C.white }, line: { color: 'BBF7D0' }, shadow: makeShadow() });
  s.addShape(pres.shapes.RECTANGLE, { x: 5.2, y: 1.55, w: 4.5, h: 0.5, fill: { color: '16A34A' }, line: { color: '16A34A' } });
  s.addText('📤  매출  (파는 것)', { x: 5.3, y: 1.6, w: 4.3, h: 0.4, fontSize: 14, bold: true, color: C.white, margin: 0 });
  s.addText([
    { text: '• 고객에게 물건을 판매하는 것\n', options: {} },
    { text: '• 예: 사료 회사에 옥수수 납품\n', options: {} },
    { text: '• 출고완료 시 재고가 자동으로 줄어들어요', options: {} },
  ], { x: 5.3, y: 2.1, w: 4.2, h: 1.1, fontSize: 11, color: C.dark, margin: 0 });

  // 입력 항목
  s.addShape(pres.shapes.RECTANGLE, { x: 0.3, y: 3.5, w: 9.4, h: 1.9, fill: { color: C.white }, line: { color: 'E5E7EB' }, shadow: makeShadow() });
  s.addShape(pres.shapes.RECTANGLE, { x: 0.3, y: 3.5, w: 9.4, h: 0.45, fill: { color: C.green2 }, line: { color: C.green2 } });
  s.addText('📝  주문 입력 항목', { x: 0.45, y: 3.54, w: 9, h: 0.37, fontSize: 13, bold: true, color: C.white, margin: 0 });

  const orderFields = [
    ['주문번호', '자동 생성 (ORD-2026-001)', '거래처 *', '어느 회사와 거래하는지'],
    ['품목 *', '어떤 물건인지 (등록된 품목 중 선택)', '수량 *', '몇 톤/개 거래하는지'],
    ['단가', '1단위당 가격 (₩)', '총액', '수량 × 단가 (자동 계산)'],
    ['주문일', '주문한 날짜', '납기일', '납품 예정 날짜'],
  ];

  orderFields.forEach((row, ri) => {
    const y = 4.0 + ri * 0.33;
    // 첫 번째 컬럼
    s.addShape(pres.shapes.RECTANGLE, { x: 0.4, y, w: 1.4, h: 0.26, fill: { color: C.pale }, line: { color: C.pale } });
    s.addText(row[0], { x: 0.42, y: y + 0.02, w: 1.36, h: 0.22, fontSize: 9.5, bold: true, color: C.green2, margin: 0 });
    s.addText(row[1], { x: 1.9, y: y + 0.02, w: 2.8, h: 0.22, fontSize: 9.5, color: C.dark, margin: 0 });
    // 두 번째 컬럼
    s.addShape(pres.shapes.RECTANGLE, { x: 5.0, y, w: 1.4, h: 0.26, fill: { color: C.pale }, line: { color: C.pale } });
    s.addText(row[2], { x: 5.02, y: y + 0.02, w: 1.36, h: 0.22, fontSize: 9.5, bold: true, color: C.green2, margin: 0 });
    s.addText(row[3], { x: 6.5, y: y + 0.02, w: 3.1, h: 0.22, fontSize: 9.5, color: C.dark, margin: 0 });
  });
}

// ══════════════════════════════════════════════
// 슬라이드 9: 주문 관리 (2) 상태 흐름
// ══════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.paleLight };

  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 1.05, fill: { color: C.primary }, line: { color: C.primary } });
  s.addText('📋  주문 관리  ②  —  주문 상태 흐름', { x: 0.4, y: 0.12, w: 9, h: 0.8, fontSize: 24, bold: true, color: C.white, fontFace: 'Arial Black', margin: 0 });

  s.addText('주문은 아래 순서대로 상태가 바뀌어요. 현재 어느 단계인지 한눈에 확인할 수 있어요.', {
    x: 0.4, y: 1.13, w: 9.2, h: 0.32, fontSize: 12, color: C.gray, margin: 0,
  });

  // 매입 흐름
  s.addText('📥 매입 (구매) 흐름', { x: 0.3, y: 1.55, w: 4, h: 0.35, fontSize: 13, bold: true, color: C.primary, margin: 0 });

  const buySteps = [
    { status: '견적', color: '9CA3AF', desc: '가격 협의 중' },
    { status: '계약', color: '3B82F6', desc: '계약 완료' },
    { status: '입고', color: '6366F1', desc: '물건 오는 중' },
    { status: '입고완료', color: '06B6D4', desc: '창고 도착\n재고↑ 자동' },
    { status: '정산완료', color: '16A34A', desc: '대금 지급 완료' },
  ];

  buySteps.forEach((step, i) => {
    const x = 0.35 + i * 1.85;
    s.addShape(pres.shapes.RECTANGLE, { x, y: 1.98, w: 1.55, h: 0.95, fill: { color: step.color }, line: { color: step.color }, shadow: makeShadow() });
    s.addText(step.status, { x, y: 2.02, w: 1.55, h: 0.38, fontSize: 12, bold: true, color: C.white, align: 'center', margin: 0 });
    s.addText(step.desc, { x, y: 2.4, w: 1.55, h: 0.5, fontSize: 9, color: C.white, align: 'center', margin: 0 });
    if (i < 4) {
      s.addText('▶', { x: x + 1.55, y: 2.28, w: 0.3, h: 0.3, fontSize: 14, color: C.gray, align: 'center', margin: 0 });
    }
  });

  // 매출 흐름
  s.addText('📤 매출 (판매) 흐름', { x: 0.3, y: 3.1, w: 4, h: 0.35, fontSize: 13, bold: true, color: C.primary, margin: 0 });

  const sellSteps = [
    { status: '견적', color: '9CA3AF', desc: '가격 협의 중' },
    { status: '계약', color: '3B82F6', desc: '계약 완료' },
    { status: '출고', color: 'EAB308', desc: '출고 준비 중' },
    { status: '출고완료', color: 'F97316', desc: '납품 완료\n재고↓ 자동' },
    { status: '정산완료', color: '16A34A', desc: '대금 수령 완료' },
  ];

  sellSteps.forEach((step, i) => {
    const x = 0.35 + i * 1.85;
    s.addShape(pres.shapes.RECTANGLE, { x, y: 3.52, w: 1.55, h: 0.95, fill: { color: step.color }, line: { color: step.color }, shadow: makeShadow() });
    s.addText(step.status, { x, y: 3.56, w: 1.55, h: 0.38, fontSize: 12, bold: true, color: C.white, align: 'center', margin: 0 });
    s.addText(step.desc, { x, y: 3.94, w: 1.55, h: 0.5, fontSize: 9, color: C.white, align: 'center', margin: 0 });
    if (i < 4) {
      s.addText('▶', { x: x + 1.55, y: 3.82, w: 0.3, h: 0.3, fontSize: 14, color: C.gray, align: 'center', margin: 0 });
    }
  });

  // 팁 박스들
  const tips = [
    { icon: '⚡', text: '입고완료로 바꾸면 재고가 자동으로 늘어나요', color: '06B6D4' },
    { icon: '⚡', text: '출고완료로 바꾸면 재고가 자동으로 줄어들어요', color: 'F97316' },
    { icon: '🔍', text: '매입/매출/상태별로 필터링해서 볼 수 있어요', color: C.green3 },
  ];

  tips.forEach((tip, i) => {
    const x = 0.35 + i * 3.15;
    s.addShape(pres.shapes.RECTANGLE, { x, y: 4.65, w: 2.95, h: 0.75, fill: { color: C.white }, line: { color: 'E5E7EB' }, shadow: makeShadow() });
    s.addShape(pres.shapes.RECTANGLE, { x, y: 4.65, w: 0.07, h: 0.75, fill: { color: tip.color }, line: { color: tip.color } });
    s.addText(tip.icon + '  ' + tip.text, { x: x + 0.15, y: 4.7, w: 2.75, h: 0.65, fontSize: 10, color: C.dark, margin: 0 });
  });
}

// ══════════════════════════════════════════════
// 슬라이드 10: 재고 관리
// ══════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.paleLight };

  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 1.05, fill: { color: C.primary }, line: { color: C.primary } });
  s.addText('📦  재고 관리', { x: 0.4, y: 0.12, w: 9, h: 0.8, fontSize: 26, bold: true, color: C.white, fontFace: 'Arial Black', margin: 0 });

  s.addText('창고에 있는 물건의 수량을 실시간으로 확인하고 관리해요.', {
    x: 0.4, y: 1.13, w: 9.2, h: 0.32, fontSize: 12, color: C.gray, margin: 0,
  });

  // 핵심 기능 카드들
  const invCards = [
    { icon: '📊', title: '현재 재고 확인', color: C.green3, desc: '각 품목별로 지금 창고에\n몇 톤이 있는지 바로 확인' },
    { icon: '📥', title: '입고 처리', color: '3B82F6', desc: '「📥 입고」 버튼으로\n수량 추가 (주문과 별개)' },
    { icon: '📤', title: '출고 처리', color: 'F97316', desc: '「📤 출고」 버튼으로\n수량 감소 처리' },
    { icon: '⚠️', title: '재고 부족 알림', color: 'EF4444', desc: '최소 재고 이하가 되면\n빨간색으로 경고 표시' },
  ];

  invCards.forEach((card, i) => {
    const x = 0.3 + i * 2.4;
    s.addShape(pres.shapes.RECTANGLE, { x, y: 1.55, w: 2.15, h: 1.9, fill: { color: C.white }, line: { color: 'E5E7EB' }, shadow: makeShadow() });
    s.addShape(pres.shapes.RECTANGLE, { x, y: 1.55, w: 2.15, h: 0.12, fill: { color: card.color }, line: { color: card.color } });
    s.addText(card.icon, { x, y: 1.72, w: 2.15, h: 0.65, fontSize: 28, align: 'center', margin: 0 });
    s.addText(card.title, { x: x + 0.08, y: 2.4, w: 1.99, h: 0.35, fontSize: 12, bold: true, color: card.color, align: 'center', margin: 0 });
    s.addText(card.desc, { x: x + 0.08, y: 2.77, w: 1.99, h: 0.6, fontSize: 9.5, color: C.dark, align: 'center', margin: 0 });
  });

  // 재고 부족 경고 설명
  s.addShape(pres.shapes.RECTANGLE, { x: 0.3, y: 3.6, w: 4.5, h: 1.7, fill: { color: C.white }, line: { color: 'E5E7EB' }, shadow: makeShadow() });
  s.addShape(pres.shapes.RECTANGLE, { x: 0.3, y: 3.6, w: 4.5, h: 0.45, fill: { color: 'EF4444' }, line: { color: 'EF4444' } });
  s.addText('⚠️  재고 부족 경고', { x: 0.4, y: 3.64, w: 4.3, h: 0.37, fontSize: 13, bold: true, color: C.white, margin: 0 });
  s.addText([
    { text: '최소 재고량', options: { bold: true } },
    { text: '을 설정해두면, 재고가 그 이하로 떨어졌을 때:\n', options: {} },
    { text: '• 해당 행이 ', options: {} },
    { text: '빨간색', options: { bold: true, color: 'EF4444' } },
    { text: '으로 표시돼요\n', options: {} },
    { text: '• 대시보드에서 ', options: {} },
    { text: '「재고 부족 품목」', options: { bold: true } },
    { text: ' 카운트가 올라가요\n', options: {} },
    { text: '• 빠른 발주가 필요하다는 신호예요!', options: {} },
  ], { x: 0.4, y: 4.1, w: 4.3, h: 1.1, fontSize: 10.5, color: C.dark, margin: 0 });

  // 사용 팁
  s.addShape(pres.shapes.RECTANGLE, { x: 5.0, y: 3.6, w: 4.7, h: 1.7, fill: { color: C.white }, line: { color: 'E5E7EB' }, shadow: makeShadow() });
  s.addShape(pres.shapes.RECTANGLE, { x: 5.0, y: 3.6, w: 4.7, h: 0.45, fill: { color: C.green2 }, line: { color: C.green2 } });
  s.addText('💡  알아두면 편한 점', { x: 5.1, y: 3.64, w: 4.5, h: 0.37, fontSize: 13, bold: true, color: C.white, margin: 0 });
  s.addText([
    { text: '• 주문에서 입고완료/출고완료로 상태를 바꾸면\n', options: {} },
    { text: '  재고가 자동으로 업데이트돼요\n', options: { bold: true } },
    { text: '• 직접 입고/출고 버튼으로도 수동 조정 가능\n', options: {} },
    { text: '• 마지막 업데이트 날짜가 자동으로 기록돼요\n', options: {} },
    { text: '• 엑셀로 저장해서 보관할 수 있어요', options: {} },
  ], { x: 5.1, y: 4.1, w: 4.5, h: 1.1, fontSize: 10.5, color: C.dark, margin: 0 });
}

// ══════════════════════════════════════════════
// 슬라이드 11: 수입원가 계산
// ══════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.paleLight };

  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 1.05, fill: { color: C.primary }, line: { color: C.primary } });
  s.addText('🧮  수입원가 계산', { x: 0.4, y: 0.12, w: 9, h: 0.8, fontSize: 26, bold: true, color: C.white, fontFace: 'Arial Black', margin: 0 });

  s.addText('물건을 수입할 때 드는 총 비용을 자동으로 계산해주는 기능이에요.', {
    x: 0.4, y: 1.13, w: 9.2, h: 0.32, fontSize: 12, color: C.gray, margin: 0,
  });

  // 입력 항목
  s.addShape(pres.shapes.RECTANGLE, { x: 0.3, y: 1.55, w: 4.5, h: 3.8, fill: { color: C.white }, line: { color: 'E5E7EB' }, shadow: makeShadow() });
  s.addShape(pres.shapes.RECTANGLE, { x: 0.3, y: 1.55, w: 4.5, h: 0.48, fill: { color: C.green2 }, line: { color: C.green2 } });
  s.addText('📥  입력하는 내용', { x: 0.4, y: 1.59, w: 4.3, h: 0.4, fontSize: 13, bold: true, color: C.white, margin: 0 });

  const costInputs = [
    { label: '수입 물량', desc: 'B/L 원본 수량 (톤)' },
    { label: '수입 단가', desc: '달러 기준 가격 (US$/톤)' },
    { label: '환율', desc: '현재 원/달러 환율 (자동 조회 가능 🔄)' },
    { label: '컨테이너 수', desc: '컨테이너 개수 (EA)' },
    { label: '통관 세율', desc: '세관에서 부과하는 세율 (%)' },
    { label: '운송비', desc: '국내 운송 비용 (원/kg)' },
    { label: '마진', desc: '회사 이익 (원/kg)' },
  ];

  costInputs.forEach((item, i) => {
    const y = 2.1 + i * 0.44;
    s.addShape(pres.shapes.RECTANGLE, { x: 0.4, y, w: 1.5, h: 0.35, fill: { color: C.pale }, line: { color: C.pale } });
    s.addText(item.label, { x: 0.42, y: y + 0.03, w: 1.46, h: 0.29, fontSize: 10, bold: true, color: C.green2, margin: 0 });
    s.addText(item.desc, { x: 2.0, y: y + 0.03, w: 2.7, h: 0.29, fontSize: 10, color: C.dark, margin: 0 });
  });

  // 결과 카드
  s.addShape(pres.shapes.RECTANGLE, { x: 5.0, y: 1.55, w: 4.7, h: 3.8, fill: { color: C.white }, line: { color: 'E5E7EB' }, shadow: makeShadow() });
  s.addShape(pres.shapes.RECTANGLE, { x: 5.0, y: 1.55, w: 4.7, h: 0.48, fill: { color: C.green2 }, line: { color: C.green2 } });
  s.addText('📊  자동 계산 결과', { x: 5.1, y: 1.59, w: 4.5, h: 0.4, fontSize: 13, bold: true, color: C.white, margin: 0 });

  // 결과 최종 가격 하이라이트
  s.addShape(pres.shapes.RECTANGLE, { x: 5.1, y: 2.1, w: 4.5, h: 1.05, fill: { color: C.primary }, line: { color: C.primary } });
  s.addText('🎯  최종 공급 단가', { x: 5.15, y: 2.13, w: 4.4, h: 0.32, fontSize: 12, color: C.mint, margin: 0 });
  s.addText('₩ 자동 계산', { x: 5.15, y: 2.45, w: 4.4, h: 0.55, fontSize: 22, bold: true, color: C.orange, margin: 0 });
  s.addText('원/kg', { x: 5.15, y: 2.95, w: 4.4, h: 0.18, fontSize: 10, color: C.mint, margin: 0 });

  const costResults = [
    ['선적 가격', '한국 도착 전 가격'],
    ['보험료', '화물 보험 비용'],
    ['LC 개설비', '수입 신용장 수수료'],
    ['수입 이자', '수입 금융 비용'],
    ['관세', '세관 관세'],
    ['통관 수수료', '통관 처리 비용'],
    ['운송비', '국내 운송 비용'],
    ['감모 손실', '수입 과정 손실분'],
  ];

  s.addText('※ 포함된 비용 항목:', { x: 5.1, y: 3.25, w: 4.5, h: 0.28, fontSize: 10, bold: true, color: C.gray, margin: 0 });

  costResults.forEach((r, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 5.1 + col * 2.25;
    const y = 3.55 + row * 0.38;
    s.addText('• ' + r[0], { x, y, w: 2.2, h: 0.3, fontSize: 9.5, color: C.dark, margin: 0 });
  });

  s.addShape(pres.shapes.RECTANGLE, { x: 5.1, y: 5.1, w: 4.5, h: 0.18, fill: { color: C.mint }, line: { color: C.mint } });
  s.addText('엑셀로 저장하면 견적서로 활용할 수 있어요', { x: 5.1, y: 5.18, w: 4.5, h: 0.25, fontSize: 9.5, color: C.gray, italic: true, margin: 0 });
}

// ══════════════════════════════════════════════
// 슬라이드 12: 계정 관리 & 백업
// ══════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.paleLight };

  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 1.05, fill: { color: C.primary }, line: { color: C.primary } });
  s.addText('🔒  계정 관리  &  데이터 백업', { x: 0.4, y: 0.12, w: 9, h: 0.8, fontSize: 24, bold: true, color: C.white, fontFace: 'Arial Black', margin: 0 });

  // 계정 관리
  s.addShape(pres.shapes.RECTANGLE, { x: 0.3, y: 1.15, w: 4.5, h: 4.2, fill: { color: C.white }, line: { color: 'E5E7EB' }, shadow: makeShadow() });
  s.addShape(pres.shapes.RECTANGLE, { x: 0.3, y: 1.15, w: 4.5, h: 0.5, fill: { color: '7C3AED' }, line: { color: '7C3AED' } });
  s.addText('👤  계정 관리  (관리자만)', { x: 0.4, y: 1.19, w: 4.3, h: 0.42, fontSize: 13, bold: true, color: C.white, margin: 0 });

  s.addText('직원들의 프로그램 접속 계정을 관리해요.', { x: 0.4, y: 1.73, w: 4.3, h: 0.3, fontSize: 10.5, color: C.gray, margin: 0 });

  const accountFeatures = [
    { icon: '➕', title: '계정 추가', desc: '직원이 새로 생기면 「+ 계정 추가」로 아이디와 초기 비밀번호(1234)를 만들어요' },
    { icon: '👑', title: '권한 설정', desc: '관리자: 모든 기능 사용 가능\n일반직원: 계정관리·백업 제외' },
    { icon: '🔑', title: '비밀번호 변경', desc: '직원이 비밀번호를 잊어버리면 관리자가 리셋해 줄 수 있어요' },
    { icon: '🗑️', title: '계정 삭제', desc: '퇴사한 직원의 계정을 삭제해요 (본인 계정은 삭제 불가)' },
  ];

  accountFeatures.forEach((f, i) => {
    const y = 2.08 + i * 0.73;
    s.addShape(pres.shapes.RECTANGLE, { x: 0.4, y, w: 4.3, h: 0.62, fill: { color: C.paleLight }, line: { color: C.pale } });
    s.addText(f.icon + ' ' + f.title, { x: 0.5, y: y + 0.03, w: 4.1, h: 0.26, fontSize: 11, bold: true, color: '6D28D9', margin: 0 });
    s.addText(f.desc, { x: 0.5, y: y + 0.3, w: 4.1, h: 0.28, fontSize: 9.5, color: C.dark, margin: 0 });
  });

  // 백업/복원
  s.addShape(pres.shapes.RECTANGLE, { x: 5.0, y: 1.15, w: 4.7, h: 4.2, fill: { color: C.white }, line: { color: 'E5E7EB' }, shadow: makeShadow() });
  s.addShape(pres.shapes.RECTANGLE, { x: 5.0, y: 1.15, w: 4.7, h: 0.5, fill: { color: C.green2 }, line: { color: C.green2 } });
  s.addText('💾  백업 & 복원  (관리자만)', { x: 5.1, y: 1.19, w: 4.5, h: 0.42, fontSize: 13, bold: true, color: C.white, margin: 0 });

  s.addText('모든 데이터를 파일로 저장하고, 필요시 복원할 수 있어요.', { x: 5.1, y: 1.73, w: 4.5, h: 0.3, fontSize: 10.5, color: C.gray, margin: 0 });

  // 백업
  s.addShape(pres.shapes.RECTANGLE, { x: 5.1, y: 2.1, w: 4.5, h: 1.4, fill: { color: C.paleLight }, line: { color: C.pale } });
  s.addText('💾 백업 하는 법', { x: 5.2, y: 2.13, w: 4.3, h: 0.3, fontSize: 12, bold: true, color: C.green2, margin: 0 });
  s.addText([
    { text: '1. 왼쪽 메뉴에서 「백업/복원」 클릭\n', options: {} },
    { text: '2. 「💾 지금 백업하기」 버튼 클릭\n', options: {} },
    { text: '3. 저장할 위치 선택 후 저장\n', options: {} },
    { text: '4. 파일명: IOGlobal_ERP_백업_날짜.json', options: { bold: true } },
  ], { x: 5.2, y: 2.45, w: 4.3, h: 1.0, fontSize: 10, color: C.dark, margin: 0 });

  // 복원
  s.addShape(pres.shapes.RECTANGLE, { x: 5.1, y: 3.6, w: 4.5, h: 1.4, fill: { color: 'FFF8E1' }, line: { color: 'FDE68A' } });
  s.addText('📂 복원 하는 법', { x: 5.2, y: 3.63, w: 4.3, h: 0.3, fontSize: 12, bold: true, color: 'B45309', margin: 0 });
  s.addText([
    { text: '1. 「📂 백업 파일 불러오기」 버튼 클릭\n', options: {} },
    { text: '2. 저장해 둔 .json 파일 선택\n', options: {} },
    { text: '3. 경고 확인 후 복원 진행\n', options: {} },
    { text: '⚠️ 복원하면 현재 데이터가 덮어씌워져요!', options: { bold: true, color: 'B45309' } },
  ], { x: 5.2, y: 3.95, w: 4.3, h: 1.0, fontSize: 10, color: C.dark, margin: 0 });

  // 백업 권장
  s.addShape(pres.shapes.RECTANGLE, { x: 5.1, y: 5.1, w: 4.5, h: 0.22, fill: { color: C.green3 }, line: { color: C.green3 } });
  s.addText('💡 매달 1회 이상 백업을 권장해요!', { x: 5.2, y: 5.14, w: 4.3, h: 0.16, fontSize: 9.5, bold: true, color: C.white, margin: 0 });
}

// ══════════════════════════════════════════════
// 슬라이드 13: 자주 묻는 질문 (FAQ)
// ══════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.paleLight };

  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 1.05, fill: { color: C.primary }, line: { color: C.primary } });
  s.addText('❓  자주 묻는 질문  (FAQ)', { x: 0.4, y: 0.12, w: 9, h: 0.8, fontSize: 26, bold: true, color: C.white, fontFace: 'Arial Black', margin: 0 });

  const faqs = [
    { q: '앱이 안 열려요', a: '• 바탕화면 아이콘을 더블클릭해보세요\n• 그래도 안 되면 컴퓨터를 재시작해보세요\n• 해결 안 되면 자녀에게 연락주세요' },
    { q: '로그인이 안 돼요', a: '• 인터넷 연결을 확인해주세요\n• 아이디/비밀번호를 다시 확인해주세요\n• 기본 계정: admin / 1234' },
    { q: '데이터가 안 보여요', a: '• 오른쪽 상단 「🔄 새로고침」을 클릭해보세요\n• 인터넷 연결을 확인해주세요\n• 잠시 후 다시 시도해보세요' },
    { q: '재고가 자동으로 안 바뀌어요', a: '• 주문 상태를 「입고완료」또는「출고완료」\n  로 바꿔야 재고가 자동 업데이트돼요\n• 상태 변경 후 확인 창에서 「확인」 클릭' },
    { q: '수입원가 계산이 이상해요', a: '• 입력값을 다시 확인해주세요 (수량, 단가, 환율)\n• 환율은 「🔄 환율 자동 조회」로 최신 환율 적용\n• 「초기화」 버튼으로 다시 시작할 수 있어요' },
    { q: '데이터를 백업하고 싶어요', a: '• 왼쪽 메뉴 「백업/복원」 클릭\n• 「💾 지금 백업하기」 버튼 클릭\n• 파일을 USB나 클라우드에도 저장해두세요' },
  ];

  faqs.forEach((faq, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 0.35 + col * 4.85;
    const y = 1.2 + row * 1.43;

    s.addShape(pres.shapes.RECTANGLE, { x, y, w: 4.55, h: 1.3, fill: { color: C.white }, line: { color: 'E5E7EB' }, shadow: makeShadow() });
    s.addShape(pres.shapes.RECTANGLE, { x, y, w: 0.07, h: 1.3, fill: { color: C.green3 }, line: { color: C.green3 } });

    // Q 뱃지
    s.addShape(pres.shapes.OVAL, { x: x + 0.13, y: y + 0.07, w: 0.32, h: 0.28, fill: { color: C.green3 }, line: { color: C.green3 } });
    s.addText('Q', { x: x + 0.13, y: y + 0.07, w: 0.32, h: 0.28, fontSize: 11, bold: true, color: C.white, align: 'center', margin: 0 });

    s.addText(faq.q, { x: x + 0.52, y: y + 0.08, w: 3.95, h: 0.3, fontSize: 12, bold: true, color: C.primary, margin: 0 });
    s.addText(faq.a, { x: x + 0.15, y: y + 0.42, w: 4.3, h: 0.82, fontSize: 9.5, color: C.dark, margin: 0 });
  });
}

// ══════════════════════════════════════════════
// 슬라이드 14: 마무리
// ══════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.primary };

  // 배경 장식
  s.addShape(pres.shapes.OVAL, { x: -0.5, y: 3.5, w: 3, h: 3, fill: { color: C.green2, transparency: 70 }, line: { color: C.green2, transparency: 70 } });
  s.addShape(pres.shapes.OVAL, { x: 8, y: -0.5, w: 3, h: 3, fill: { color: C.green3, transparency: 70 }, line: { color: C.green3, transparency: 70 } });

  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 0.35, h: 5.625, fill: { color: C.green4 }, line: { color: C.green4 } });

  s.addText('🌾', { x: 3.5, y: 0.5, w: 3, h: 1.2, fontSize: 52, align: 'center', margin: 0 });
  s.addText('감사합니다!', { x: 0.6, y: 1.6, w: 8.5, h: 0.9, fontSize: 40, bold: true, color: C.white, fontFace: 'Arial Black', align: 'center', margin: 0 });
  s.addText('모르시는 것이 있으시면 언제든지 연락해주세요 😊', {
    x: 0.6, y: 2.55, w: 8.5, h: 0.45, fontSize: 15, color: C.mint, align: 'center', margin: 0,
  });

  // 구분선
  s.addShape(pres.shapes.RECTANGLE, { x: 2.5, y: 3.1, w: 5, h: 0.04, fill: { color: C.green4 }, line: { color: C.green4 } });

  // 연락처 정보
  const contacts = [
    { icon: '👨‍💻', label: '개발자', value: '원현 (아들)' },
    { icon: '📱', label: '연락처', value: '010-XXXX-XXXX' },
    { icon: '⏰', label: '운영 시간', value: '24시간 클라우드 운영' },
  ];

  contacts.forEach((c, i) => {
    const x = 1.5 + i * 2.8;
    s.addText(c.icon, { x, y: 3.3, w: 2.5, h: 0.5, fontSize: 24, align: 'center', margin: 0 });
    s.addText(c.label, { x, y: 3.85, w: 2.5, h: 0.3, fontSize: 11, color: C.mint, align: 'center', margin: 0 });
    s.addText(c.value, { x, y: 4.17, w: 2.5, h: 0.3, fontSize: 13, bold: true, color: C.white, align: 'center', margin: 0 });
  });

  s.addText('IO Global ERP v1.0.0  |  2026', {
    x: 0.6, y: 5.1, w: 8.5, h: 0.3, fontSize: 11, color: C.green4, align: 'center', margin: 0,
  });
}

// ── 파일 저장 ──
pres.writeFile({ fileName: '/Users/wonhyun/Desktop/IOGlobal_ERP_사용설명서.pptx' })
  .then(() => console.log('✅ PPT 저장 완료: /Users/wonhyun/Desktop/IOGlobal_ERP_사용설명서.pptx'))
  .catch(e => console.error('❌ 오류:', e));
