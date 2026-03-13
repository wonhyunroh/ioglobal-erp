// ──────────────────────────────────────────────
// 📁 파일명: CostCalc.tsx
// 📌 위치: src/pages/CostCalc.tsx
//
// 🎯 이 파일의 역할:
//   - 수입원가 계산 화면이에요
//   - 핵심 입력값(B/L량, 수입단가 등)은 매번 새로 입력해요
//   - 고정 비용은 한번 저장하면 앱 껐다 켜도 유지돼요
//   - 환율은 실시간으로 자동으로 불러와요
//
// 📦 사용하는 것들:
//   - React: 화면을 만드는 라이브러리
//   - useState: 입력값과 계산 결과를 기억하는 기능
//   - useEffect: 앱 시작 시 저장된 고정비용/환율을 불러오는 기능
//   - window.electronAPI: electron-store에 데이터 저장/불러오기
//
// 🔗 연결된 파일들:
//   - preload.ts: window.electronAPI 를 제공해요
//   - index.ts: 실제 store.get/set 처리해요
//
// ⚠️ 수정할 때 주의사항:
//   - 고정비용 저장 키: 'costCalcFixedFees'
//   - 환율 API: https://open.er-api.com/v6/latest/USD (무료)
//   - 계산식 변경 시 calcResults 함수만 수정하면 돼요
//   - 이율/요율은 RATES 상수에서 관리해요
// ──────────────────────────────────────────────

import React, { useState, useEffect } from 'react';

// ──────────────────────────────────────────────
// 기준 이율/요율 상수
// 변경이 필요하면 여기서만 수정하면 돼요
// ──────────────────────────────────────────────
const RATES = {
  LC_OPEN_RATE: 0.012,
  LC_OPEN_DAYS: 90 / 360,
  INSURANCE_RATE: 0.001236,
  INSURANCE_FACTOR: 1.1,
  IMPORT_INTEREST_RATE: 0.0175,
  IMPORT_INTEREST_DAYS: 120 / 360,
  TERM_CG_RATE: 0.018,
  TERM_CG_DAYS: 150 / 360,
  CUSTOMS_RATE1: 0.10,
  CUSTOMS_RATE2: 0.007,
  LOSS_RATE: 0.003,
  WORK_FEE_PER_TON: 13000,
};

// ──────────────────────────────────────────────
// 핵심 입력값 타입 (매번 새로 입력)
// ──────────────────────────────────────────────
type CoreInput = {
  blQuantity: number;   // B/L 원료량 (톤)
  importPrice: number;  // 수입단가 (US$/톤)
  exchangeRate: number; // 환율 (원/달러) - 자동으로 불러와요
  containers: number;   // 컨테이너 수 (EA)
  tariffRate: number;   // 관세율 (%)
  transportFee: number; // 운송료 (원/kg)
  saleQuantity: number; // 판매수량 (톤)
  margin: number;       // 마진 (원/kg)
};

// ──────────────────────────────────────────────
// 고정 비용 타입 (한번 저장하면 계속 유지)
// ──────────────────────────────────────────────
type FixedFees = {
  telegraphFee: number;
  amendFee: number;
  lgFee: number;
  workTransportFee: number;
  relocateFee: number;
  foodInspectRelocate: number;
  foodInspectFee: number;
  certFee: number;
  doFee: number;
  wharfage: number;
  cc: number;
  thc: number;
  customsDeclare: number;
  analysisInspect: number;
};

// ──────────────────────────────────────────────
// 핵심 입력값 기본값 (0으로 시작)
// ──────────────────────────────────────────────
const DEFAULT_CORE: CoreInput = {
  blQuantity: 0,
  importPrice: 0,
  exchangeRate: 0,  // 앱 시작 시 실시간 환율로 자동 채워져요
  containers: 0,
  tariffRate: 0,
  transportFee: 0,
  saleQuantity: 0,
  margin: 0,
};

// ──────────────────────────────────────────────
// 고정 비용 기본값 (처음 한번만 사용, 이후엔 저장된 값 사용)
// ──────────────────────────────────────────────
const DEFAULT_FIXED: FixedFees = {
  telegraphFee: 0,
  amendFee: 0,
  lgFee: 0,
  workTransportFee: 0,
  relocateFee: 0,
  foodInspectRelocate: 0,
  foodInspectFee: 0,
  certFee: 0,
  doFee: 0,
  wharfage: 0,
  cc: 0,
  thc: 0,
  customsDeclare: 0,
  analysisInspect: 0,
};

// ──────────────────────────────────────────────
// 원가 계산 함수
// ──────────────────────────────────────────────
function calcResults(v: CoreInput, f: FixedFees) {
  const goodsPrice = v.blQuantity * v.importPrice * v.exchangeRate;
  const tariff = goodsPrice * (v.tariffRate / 100);
  const lcOpenFee = goodsPrice * RATES.LC_OPEN_RATE * RATES.LC_OPEN_DAYS;
  const insurance = goodsPrice * RATES.INSURANCE_RATE * RATES.INSURANCE_FACTOR;
  const importInterest = goodsPrice * RATES.IMPORT_INTEREST_RATE * RATES.IMPORT_INTEREST_DAYS;
  const termCg = goodsPrice * RATES.TERM_CG_RATE * RATES.TERM_CG_DAYS;
  const workFee = v.blQuantity * RATES.WORK_FEE_PER_TON;
  const foodInspectCount = Math.max(1, Math.ceil(v.containers / 12));
  const relocate = f.relocateFee * v.containers;
  const foodRelocate = f.foodInspectRelocate * v.containers;
  const foodInspect = f.foodInspectFee * foodInspectCount;
  const doFeeTotal = f.doFee * foodInspectCount;
  const wharfageTotal = f.wharfage * v.containers;
  const ccTotal = f.cc * v.containers;
  const thcTotal = f.thc * v.containers;
  const customsFee = (goodsPrice + insurance + tariff)
    * RATES.CUSTOMS_RATE1 * RATES.CUSTOMS_RATE2;

  const subtotal =
    lcOpenFee + f.telegraphFee + f.amendFee + (f.lgFee * foodInspectCount) +
    insurance + goodsPrice + importInterest + termCg +
    workFee + relocate + foodRelocate + foodInspect +
    f.certFee + doFeeTotal + wharfageTotal + ccTotal + thcTotal +
    tariff + customsFee + f.customsDeclare + f.analysisInspect;

  const loss = subtotal * RATES.LOSS_RATE;
  const total = subtotal + loss;
  const blQuantityKg = v.blQuantity * 1000;
  const pricePerKgLoad = blQuantityKg > 0 ? total / blQuantityKg : 0;
  const pricePerKgDelivery = pricePerKgLoad + v.transportFee;
  const supplyPrice = Math.ceil((pricePerKgDelivery + v.margin) / 10) * 10;

  return {
    goodsPrice, tariff, lcOpenFee, insurance, importInterest, termCg,
    workFee, relocate, foodRelocate, foodInspect, doFeeTotal,
    wharfageTotal, ccTotal, thcTotal, customsFee,
    subtotal, loss, total, pricePerKgLoad, pricePerKgDelivery, supplyPrice,
  };
}

// 숫자를 원화 형식으로 포맷
const formatKRW = (n: number) => Math.round(n).toLocaleString('ko-KR');

// ──────────────────────────────────────────────
// electron-store 저장 키
// ──────────────────────────────────────────────
const STORE_KEY_FIXED = 'costCalcFixedFees'; // 고정비용 저장 키

export default function CostCalc() {

  // 핵심 입력값 (매번 새로 입력)
  const [core, setCore] = useState<CoreInput>(DEFAULT_CORE);

  // 고정 비용 (저장/불러오기)
  const [fixed, setFixed] = useState<FixedFees>(DEFAULT_FIXED);

  // 고정 비용 편집 중인 임시값
  // 저장 버튼 누르기 전까지는 실제 fixed에 반영 안 돼요
  const [fixedDraft, setFixedDraft] = useState<FixedFees>(DEFAULT_FIXED);

  // 고정 비용 패널 열림/닫힘
  const [showAdvanced, setShowAdvanced] = useState(false);

  // 고정 비용 편집 모드 여부
  const [editingFixed, setEditingFixed] = useState(false);

  // 환율 로딩 상태
  const [rateLoading, setRateLoading] = useState(false);

  // 환율 마지막 업데이트 시간
  const [rateUpdatedAt, setRateUpdatedAt] = useState<string>('');

  // ──────────────────────────────────────────────
  // 앱 시작 시 실행
  // 1. electron-store에서 고정비용 불러오기
  // 2. 실시간 환율 불러오기
  // ──────────────────────────────────────────────
  useEffect(() => {
    // 고정비용 불러오기
    const loadFixed = async () => {
      try {
        const saved = await window.electronAPI.storeGet(STORE_KEY_FIXED);
        if (saved) {
          // 저장된 값이 있으면 그걸 사용해요
          setFixed(saved);
          setFixedDraft(saved);
        }
      } catch (err) {
        console.error('고정비용 불러오기 실패:', err);
      }
    };

    loadFixed();
    fetchExchangeRate(); // 환율도 바로 불러와요
  }, []);

  // ──────────────────────────────────────────────
  // 실시간 환율 불러오기
  //
  // 무료 환율 API (open.er-api.com) 사용
  // USD → KRW 환율을 가져와요
  // ──────────────────────────────────────────────
  const fetchExchangeRate = async () => {
    setRateLoading(true);
    try {
      const res = await fetch('https://open.er-api.com/v6/latest/USD');
      const data = await res.json();

      if (data.result === 'success') {
        const krwRate = data.rates.KRW;
        // 환율을 핵심 입력값에 자동으로 채워요
        setCore(prev => ({ ...prev, exchangeRate: Math.round(krwRate * 100) / 100 }));
        // 마지막 업데이트 시간 저장
        setRateUpdatedAt(new Date().toLocaleTimeString('ko-KR'));
      }
    } catch (err) {
      console.error('환율 불러오기 실패:', err);
    } finally {
      setRateLoading(false);
    }
  };

  // ── 핵심 입력값 변경 핸들러 ──
  const handleCoreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCore(prev => ({
      ...prev,
      [name]: value === '' ? 0 : parseFloat(value) || 0,
    }));
  };

  // ── 고정비용 편집 중 변경 핸들러 ──
  const handleFixedDraftChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFixedDraft(prev => ({
      ...prev,
      [name]: value === '' ? 0 : parseFloat(value) || 0,
    }));
  };

  // ── 고정비용 저장 버튼 클릭 ──
  // electron-store에 저장해요 (앱 껐다 켜도 유지)
  const handleFixedSave = async () => {
    try {
      await window.electronAPI.storeSet(STORE_KEY_FIXED, fixedDraft);
      setFixed(fixedDraft);   // 실제 계산에 반영
      setEditingFixed(false); // 편집 모드 종료
      alert('고정 비용이 저장됐어요! 다음에 앱을 켜도 유지돼요 ✅');
    } catch (err) {
      console.error('고정비용 저장 실패:', err);
      alert('저장에 실패했어요. 다시 시도해주세요.');
    }
  };

  // ── 고정비용 편집 취소 ──
  const handleFixedCancel = () => {
    setFixedDraft(fixed);   // 저장된 값으로 되돌리기
    setEditingFixed(false);
  };

  // ── 핵심 입력값 초기화 ──
  const handleReset = () => {
    if (window.confirm('핵심 입력값을 초기화할까요?\n(고정 비용은 유지돼요)')) {
      setCore(DEFAULT_CORE);
      fetchExchangeRate(); // 환율은 다시 불러와요
    }
  };

  // 계산 결과 (core + fixed 합쳐서 계산)
  const result = calcResults(core, fixed);

  return (
    <div>
      {/* ── 페이지 제목 ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">💰 수입원가 계산</h2>
          <p className="text-gray-500 text-sm mt-1">
            입력값을 변경하면 모든 항목이 자동으로 계산돼요
          </p>
        </div>
        <button
          onClick={handleReset}
          className="px-4 py-2 text-sm font-medium text-gray-600
                     border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          🔄 초기화
        </button>
      </div>

      <div className="grid grid-cols-2 gap-6">

        {/* ── 왼쪽: 입력 영역 ── */}
        <div className="space-y-4">

          {/* 핵심 입력값 카드 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h3 className="font-bold text-gray-700 mb-4 text-sm uppercase tracking-wider">
              📥 핵심 입력값
            </h3>
            <div className="space-y-3">

              {/* B/L 원료량 */}
              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-600 w-40">
                  B/L 원료량
                  <span className="text-xs text-gray-400 ml-1">(톤)</span>
                </label>
                <input
                  type="number" name="blQuantity"
                  value={core.blQuantity || ''}
                  onChange={handleCoreChange} step="0.001"
                  className="w-36 border border-gray-300 rounded-lg px-3 py-1.5
                             text-sm text-right focus:outline-none focus:ring-2
                             focus:ring-blue-500"
                />
              </div>

              {/* 수입단가 */}
              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-600 w-40">
                  수입단가
                  <span className="text-xs text-gray-400 ml-1">(US$/톤)</span>
                </label>
                <input
                  type="number" name="importPrice"
                  value={core.importPrice || ''}
                  onChange={handleCoreChange} step="0.01"
                  className="w-36 border border-gray-300 rounded-lg px-3 py-1.5
                             text-sm text-right focus:outline-none focus:ring-2
                             focus:ring-blue-500"
                />
              </div>

              {/* 환율 (실시간 자동 불러오기) */}
              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-600 w-40">
                  환율
                  <span className="text-xs text-gray-400 ml-1">(원/달러)</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number" name="exchangeRate"
                    value={core.exchangeRate || ''}
                    onChange={handleCoreChange} step="0.01"
                    className="w-28 border border-gray-300 rounded-lg px-3 py-1.5
                               text-sm text-right focus:outline-none focus:ring-2
                               focus:ring-blue-500"
                  />
                  {/* 환율 새로고침 버튼 */}
                  <button
                    onClick={fetchExchangeRate}
                    disabled={rateLoading}
                    title="실시간 환율 불러오기"
                    className="text-blue-500 hover:text-blue-700 disabled:text-gray-300
                               transition-colors text-lg"
                  >
                    {rateLoading ? '⏳' : '🔄'}
                  </button>
                </div>
              </div>

              {/* 환율 업데이트 시간 표시 */}
              {rateUpdatedAt && (
                <div className="text-xs text-green-600 text-right">
                  ✅ 환율 업데이트: {rateUpdatedAt}
                </div>
              )}

              {/* 컨테이너 수 */}
              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-600 w-40">
                  컨테이너 수
                  <span className="text-xs text-gray-400 ml-1">(EA)</span>
                </label>
                <input
                  type="number" name="containers"
                  value={core.containers || ''}
                  onChange={handleCoreChange} min="0"
                  className="w-36 border border-gray-300 rounded-lg px-3 py-1.5
                             text-sm text-right focus:outline-none focus:ring-2
                             focus:ring-blue-500"
                />
              </div>

              {/* 관세율 */}
              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-600 w-40">
                  관세율
                  <span className="text-xs text-gray-400 ml-1">(%)</span>
                </label>
                <input
                  type="number" name="tariffRate"
                  value={core.tariffRate || ''}
                  onChange={handleCoreChange} step="0.1" min="0"
                  className="w-36 border border-gray-300 rounded-lg px-3 py-1.5
                             text-sm text-right focus:outline-none focus:ring-2
                             focus:ring-blue-500"
                />
              </div>

              {/* 운송료 */}
              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-600 w-40">
                  운송료
                  <span className="text-xs text-gray-400 ml-1">(원/kg)</span>
                </label>
                <input
                  type="number" name="transportFee"
                  value={core.transportFee || ''}
                  onChange={handleCoreChange} min="0"
                  className="w-36 border border-gray-300 rounded-lg px-3 py-1.5
                             text-sm text-right focus:outline-none focus:ring-2
                             focus:ring-blue-500"
                />
              </div>

              {/* 마진 */}
              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-600 w-40">
                  마진
                  <span className="text-xs text-gray-400 ml-1">(원/kg)</span>
                </label>
                <input
                  type="number" name="margin"
                  value={core.margin || ''}
                  onChange={handleCoreChange}
                  className="w-36 border border-gray-300 rounded-lg px-3 py-1.5
                             text-sm text-right focus:outline-none focus:ring-2
                             focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* 고정 비용 카드 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between text-sm
                         font-bold text-gray-700 uppercase tracking-wider"
            >
              <span>⚙️ 고정 비용 설정</span>
              <span className="text-gray-400">{showAdvanced ? '▲' : '▼'}</span>
            </button>

            {showAdvanced && (
              <div className="mt-4">

                {/* 편집 모드 안내 */}
                {!editingFixed ? (
                  // 보기 모드
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <p className="text-xs text-gray-500">
                        💾 저장된 고정비용이 계산에 적용돼요
                      </p>
                      <button
                        onClick={() => setEditingFixed(true)}
                        className="text-xs text-blue-600 hover:text-blue-800
                                   font-medium border border-blue-200 px-3 py-1
                                   rounded-lg transition-colors"
                      >
                        ✏️ 수정
                      </button>
                    </div>

                    {/* 저장된 고정비용 표시 (읽기 전용) */}
                    <div className="space-y-2">
                      {[
                        { label: '전신료', key: 'telegraphFee', unit: '원' },
                        { label: 'AMEND 수수료', key: 'amendFee', unit: '원' },
                        { label: 'LG 발급비', key: 'lgFee', unit: '원/건' },
                        { label: '작업이적비', key: 'relocateFee', unit: '원/회' },
                        { label: '식검이적비', key: 'foodInspectRelocate', unit: '원/회' },
                        { label: '식검수수료', key: 'foodInspectFee', unit: '원/회' },
                        { label: '검정료', key: 'certFee', unit: '원' },
                        { label: 'D/O FEE', key: 'doFee', unit: '원/건' },
                        { label: 'WHARFAGE', key: 'wharfage', unit: '원/EA' },
                        { label: 'C/C', key: 'cc', unit: '원/EA' },
                        { label: 'T.H.C', key: 'thc', unit: '원/EA' },
                        { label: '수입신고비', key: 'customsDeclare', unit: '원' },
                        { label: '분석검정비', key: 'analysisInspect', unit: '원' },
                      ].map(f => (
                        <div key={f.key}
                             className="flex justify-between items-center
                                        py-1 border-b border-gray-50">
                          <span className="text-sm text-gray-600">
                            {f.label}
                            <span className="text-xs text-gray-400 ml-1">
                              ({f.unit})
                            </span>
                          </span>
                          <span className="text-sm font-medium text-gray-700">
                            ₩{(fixed as any)[f.key].toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  // 편집 모드
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <p className="text-xs text-orange-600 font-medium">
                        ✏️ 수정 중 - 저장 버튼을 눌러야 반영돼요
                      </p>
                    </div>

                    <div className="space-y-3">
                      {[
                        { label: '전신료', name: 'telegraphFee', unit: '원' },
                        { label: 'AMEND 수수료', name: 'amendFee', unit: '원' },
                        { label: 'LG 발급비', name: 'lgFee', unit: '원/건' },
                        { label: '작업이적비', name: 'relocateFee', unit: '원/회' },
                        { label: '식검이적비', name: 'foodInspectRelocate', unit: '원/회' },
                        { label: '식검수수료', name: 'foodInspectFee', unit: '원/회' },
                        { label: '검정료', name: 'certFee', unit: '원' },
                        { label: 'D/O FEE', name: 'doFee', unit: '원/건' },
                        { label: 'WHARFAGE', name: 'wharfage', unit: '원/EA' },
                        { label: 'C/C', name: 'cc', unit: '원/EA' },
                        { label: 'T.H.C', name: 'thc', unit: '원/EA' },
                        { label: '수입신고비', name: 'customsDeclare', unit: '원' },
                        { label: '분석검정비', name: 'analysisInspect', unit: '원' },
                      ].map(f => (
                        <div key={f.name}
                             className="flex items-center justify-between">
                          <label className="text-sm text-gray-600 w-40">
                            {f.label}
                            <span className="text-xs text-gray-400 ml-1">
                              ({f.unit})
                            </span>
                          </label>
                          <input
                            type="number" name={f.name}
                            value={(fixedDraft as any)[f.name] || ''}
                            onChange={handleFixedDraftChange}
                            min="0"
                            className="w-36 border border-orange-300 rounded-lg
                                       px-3 py-1.5 text-sm text-right
                                       focus:outline-none focus:ring-2
                                       focus:ring-orange-400"
                          />
                        </div>
                      ))}
                    </div>

                    {/* 저장/취소 버튼 */}
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={handleFixedCancel}
                        className="flex-1 px-4 py-2 text-sm font-medium
                                   text-gray-600 border border-gray-300
                                   rounded-lg hover:bg-gray-50"
                      >
                        취소
                      </button>
                      <button
                        onClick={handleFixedSave}
                        className="flex-1 px-4 py-2 text-sm font-medium
                                   text-white bg-blue-600 rounded-lg
                                   hover:bg-blue-700"
                      >
                        💾 저장
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── 오른쪽: 계산 결과 영역 ── */}
        <div className="space-y-4">

          {/* 최종 단가 요약 */}
          <div className="bg-blue-900 text-white rounded-xl p-5">
            <h3 className="font-bold mb-4 text-sm uppercase tracking-wider text-blue-200">
              📊 최종 단가 요약
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-blue-200 text-sm">상차도 단가</span>
                <span className="font-bold text-lg">
                  ₩{formatKRW(result.pricePerKgLoad)}
                  <span className="text-xs text-blue-300 ml-1">/kg</span>
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-blue-200 text-sm">도착도 단가</span>
                <span className="font-bold text-lg">
                  ₩{formatKRW(result.pricePerKgDelivery)}
                  <span className="text-xs text-blue-300 ml-1">/kg</span>
                </span>
              </div>
              <div className="border-t border-blue-700 pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-white font-bold">🎯 공급단가</span>
                  <span className="font-bold text-2xl text-yellow-300">
                    ₩{formatKRW(result.supplyPrice)}
                    <span className="text-sm text-blue-300 ml-1">/kg</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 비용 항목 상세 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h3 className="font-bold text-gray-700 mb-4 text-sm uppercase tracking-wider">
              📋 비용 항목 상세
            </h3>
            <div className="space-y-2">
              {[
                ['품대', result.goodsPrice, true],
                ['개설비', result.lcOpenFee, false],
                ['전신료', fixed.telegraphFee, false],
                ['AMEND', fixed.amendFee, false],
                ['보험료', result.insurance, false],
                ['수입이자', result.importInterest, false],
                ['TERM CG', result.termCg, false],
                ['작업비', result.workFee, false],
                ['작업이적비', result.relocate, false],
                ['식검이적비', result.foodRelocate, false],
                ['식검수수료', result.foodInspect, false],
                ['검정료', fixed.certFee, false],
                ['D/O FEE', result.doFeeTotal, false],
                ['WHARFAGE', result.wharfageTotal, false],
                ['C/C', result.ccTotal, false],
                ['T.H.C', result.thcTotal, false],
                ['관세', result.tariff, false],
                ['통관수수료', result.customsFee, false],
                ['수입신고비', fixed.customsDeclare, false],
                ['분석검정비', fixed.analysisInspect, false],
              ].map(([label, value, bold]) => (
                <div key={label as string}
                     className="flex justify-between items-center
                                py-1.5 border-b border-gray-50">
                  <span className={`text-sm
                    ${bold ? 'font-medium text-gray-800' : 'text-gray-600'}`}>
                    {label as string}
                  </span>
                  <span className={`text-sm
                    ${bold ? 'font-bold text-gray-800' : 'text-gray-600'}`}>
                    ₩{formatKRW(value as number)}
                  </span>
                </div>
              ))}

              <div className="flex justify-between items-center py-2
                              border-t-2 border-gray-200 mt-2">
                <span className="text-sm font-bold text-gray-700">소계</span>
                <span className="text-sm font-bold text-gray-700">
                  ₩{formatKRW(result.subtotal)}
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span className="text-sm text-gray-600">감모손실 (0.3%)</span>
                <span className="text-sm text-gray-600">
                  ₩{formatKRW(result.loss)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2
                              border-t-2 border-blue-200 mt-1">
                <span className="font-bold text-gray-800">합계</span>
                <span className="font-bold text-blue-700 text-lg">
                  ₩{formatKRW(result.total)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}