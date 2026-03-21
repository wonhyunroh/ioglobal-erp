// ──────────────────────────────────────────────
// 📁 파일명: CostCalc.tsx
// 📌 위치: src/pages/CostCalc.tsx
//
// 🎯 이 파일의 역할:
//   - 수입원가 계산 화면이에요
//   - 핵심 입력값(B/L량, 수입단가 등)은 매번 새로 입력해요
//   - 고정 비용 + 계산 기준율은 서버에서 불러와요 (전직원 공유)
//   - 관리자만 고정비용/기준율 수정 가능해요
//   - 환율은 실시간으로 자동으로 불러와요
//
// 🔗 연결된 파일들:
//   - db.ts: loadCostFixedFees, saveCostFixedFee,
//            updateCostFixedFee, loadCalcRates, updateCalcRate
//   - excel.ts: exportCostCalc
//   - App.tsx: currentUser (관리자 여부 확인)
// ──────────────────────────────────────────────

import React, { useState, useEffect } from 'react';
import { exportCostCalc } from '../excel';
import {
  CostFixedFee, CalcRate, CostCalcRecord,
  loadCostFixedFees, saveCostFixedFee, updateCostFixedFee,
  loadCalcRates, updateCalcRate,
  loadCostCalcs, saveCostCalc, deleteCostCalc,
} from '../db';

// ──────────────────────────────────────────────
// 핵심 입력값 타입 (매번 새로 입력)
// ──────────────────────────────────────────────
type CoreInput = {
  contractNo: string;    // 계약번호
  blNo: string;          // B/L 번호
  blQuantity: number;
  importPrice: number;
  exchangeRate: number;
  containers: number;
  tariffRate: number;
  transportFee: number;
  saleQuantity: number;
  margin: number;
};

// ──────────────────────────────────────────────
// 고정비용 필드 목록
// ──────────────────────────────────────────────
const FIXED_FEE_FIELDS = [
  { label: '전신료',       key: '전신료',      unit: '원' },
  { label: 'AMEND 수수료', key: 'AMEND수수료', unit: '원' },
  { label: 'LG 발급비',    key: 'LG발급비',    unit: '원/건' },
  { label: '작업이적비',   key: '작업이적비',  unit: '원/회' },
  { label: '식검이적비',   key: '식검이적비',  unit: '원/회' },
  { label: '식검수수료',   key: '식검수수료',  unit: '원/회' },
  { label: '검정료',       key: '검정료',      unit: '원' },
  { label: 'D/O FEE',      key: 'DO_FEE',      unit: '원/건' },
  { label: 'WHARFAGE',     key: 'WHARFAGE',    unit: '원/EA' },
  { label: 'C/C',          key: 'CC',          unit: '원/EA' },
  { label: 'T.H.C',        key: 'THC',         unit: '원/EA' },
  { label: '수입신고비',   key: '수입신고비',  unit: '원' },
  { label: '분석검정비',   key: '분석검정비',  unit: '원' },
];

const DEFAULT_CORE: CoreInput = {
  contractNo: '', blNo: '',
  blQuantity: 0, importPrice: 0, exchangeRate: 0,
  containers: 0, tariffRate: 0, transportFee: 0,
  saleQuantity: 0, margin: 0,
};

// ──────────────────────────────────────────────
// 원가 계산 함수
//
// fixedMap: { key → amount } 형태의 고정비용 맵
// ratesMap: { key → value } 형태의 기준율 맵
// ──────────────────────────────────────────────
function calcResults(
  v: CoreInput,
  fixedMap: Record<string, number>,
  ratesMap: Record<string, number>
) {
  // 기준율 (서버에서 불러온 값, 없으면 기본값 사용)
  const r = {
    LC_OPEN_RATE:         ratesMap['LC_OPEN_RATE']         ?? 0.012,
    LC_OPEN_DAYS:         (ratesMap['LC_OPEN_DAYS']        ?? 90) / 360,
    INSURANCE_RATE:       ratesMap['INSURANCE_RATE']       ?? 0.001236,
    INSURANCE_FACTOR:     ratesMap['INSURANCE_FACTOR']     ?? 1.1,
    IMPORT_INTEREST_RATE: ratesMap['IMPORT_INTEREST_RATE'] ?? 0.0175,
    IMPORT_INTEREST_DAYS: (ratesMap['IMPORT_INTEREST_DAYS'] ?? 120) / 360,
    TERM_CG_RATE:         ratesMap['TERM_CG_RATE']         ?? 0.018,
    TERM_CG_DAYS:         (ratesMap['TERM_CG_DAYS']        ?? 150) / 360,
    CUSTOMS_RATE1:        ratesMap['CUSTOMS_RATE1']        ?? 0.10,
    CUSTOMS_RATE2:        ratesMap['CUSTOMS_RATE2']        ?? 0.007,
    LOSS_RATE:            ratesMap['LOSS_RATE']            ?? 0.003,
    WORK_FEE_PER_TON:     ratesMap['WORK_FEE_PER_TON']    ?? 13000,
  };

  const f = (key: string) => fixedMap[key] ?? 0;

  const goodsPrice      = v.blQuantity * v.importPrice * v.exchangeRate;
  const tariff          = goodsPrice * (v.tariffRate / 100);
  const lcOpenFee       = goodsPrice * r.LC_OPEN_RATE * r.LC_OPEN_DAYS;
  const insurance       = goodsPrice * r.INSURANCE_RATE * r.INSURANCE_FACTOR;
  const importInterest  = goodsPrice * r.IMPORT_INTEREST_RATE * r.IMPORT_INTEREST_DAYS;
  const termCg          = goodsPrice * r.TERM_CG_RATE * r.TERM_CG_DAYS;
  const workFee         = v.blQuantity * r.WORK_FEE_PER_TON;
  const relocate        = f('작업이적비') * v.containers;
  const foodRelocate    = f('식검이적비') * v.containers;
  // B/L 1건 기준: 식검수수료, DO FEE, LG발급비는 건수 = 1
  const foodInspect     = f('식검수수료') * 1;
  const doFeeTotal      = f('DO_FEE') * 1;
  const wharfageTotal   = f('WHARFAGE') * v.containers;
  const ccTotal         = f('CC') * v.containers;
  const thcTotal        = f('THC') * v.containers;
  const customsFee      = (goodsPrice + insurance + tariff)
                          * r.CUSTOMS_RATE1 * r.CUSTOMS_RATE2;

  const subtotal =
    lcOpenFee + f('전신료') + f('AMEND수수료') + f('LG발급비') +
    insurance + goodsPrice + importInterest + termCg +
    workFee + relocate + foodRelocate + foodInspect +
    f('검정료') + doFeeTotal + wharfageTotal + ccTotal + thcTotal +
    tariff + customsFee + f('수입신고비') + f('분석검정비');

  const loss              = subtotal * r.LOSS_RATE;
  const total             = subtotal + loss;
  const blQuantityKg      = v.blQuantity * 1000;
  const pricePerKgLoad    = blQuantityKg > 0 ? total / blQuantityKg : 0;
  const pricePerKgDelivery = pricePerKgLoad + v.transportFee;
  // 공급단가 = 도착도단가 + 마진 (반올림)
  const supplyPrice       = Math.round(pricePerKgDelivery + v.margin);

  return {
    goodsPrice, tariff, lcOpenFee, insurance, importInterest, termCg,
    workFee, relocate, foodRelocate, foodInspect, doFeeTotal,
    wharfageTotal, ccTotal, thcTotal, customsFee,
    subtotal, loss, total, pricePerKgLoad, pricePerKgDelivery, supplyPrice,
  };
}

const formatKRW = (n: number) => Math.round(n).toLocaleString('ko-KR');

// ──────────────────────────────────────────────
// Props 타입
// currentUser: 관리자 여부 확인용
// ──────────────────────────────────────────────
type Props = {
  currentUser?: { role: string };
};

export default function CostCalc({ currentUser }: Props) {

  const [core, setCore]           = useState<CoreInput>(DEFAULT_CORE);
  const [fixedFees, setFixedFees] = useState<CostFixedFee[]>([]);
  const [rates, setRates]         = useState<CalcRate[]>([]);
  const [fixedDraft, setFixedDraft]   = useState<Record<string, number>>({});
  const [ratesDraft, setRatesDraft]   = useState<Record<string, number>>({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showRates, setShowRates]       = useState(false);
  const [editingFixed, setEditingFixed] = useState(false);
  const [editingRates, setEditingRates] = useState(false);
  const [rateLoading, setRateLoading]   = useState(false);
  const [rateUpdatedAt, setRateUpdatedAt] = useState('');
  const [saving, setSaving] = useState(false);
  // ── 저장/불러오기 ──
  const [savedCalcs, setSavedCalcs]   = useState<CostCalcRecord[]>([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [saveName, setSaveName]           = useState('');

  // 관리자 여부 확인
  const isAdmin = currentUser?.role === '관리자';

  // ── 앱 시작 시 서버에서 고정비용 + 기준율 + 저장된 계산 불러오기 ──
  useEffect(() => {
    const load = async () => {
      const [fees, rateList, calcs] = await Promise.all([
        loadCostFixedFees(),
        loadCalcRates(),
        loadCostCalcs(),
      ]);
      setFixedFees(fees);
      setRates(rateList);
      setSavedCalcs(calcs);
    };
    load();
    fetchExchangeRate();
  }, []);

  // ── 고정비용 { key → amount } 맵 ──
  const fixedMap = fixedFees.reduce((acc, fee) => {
    acc[fee.name] = fee.amount;
    return acc;
  }, {} as Record<string, number>);

  // ── 기준율 { key → value } 맵 ──
  const ratesMap = rates.reduce((acc, r) => {
    acc[r.key] = r.value;
    return acc;
  }, {} as Record<string, number>);

  // ── 실시간 환율 불러오기 ──
  const fetchExchangeRate = async () => {
    setRateLoading(true);
    try {
      const res  = await fetch('https://open.er-api.com/v6/latest/USD');
      const data = await res.json();
      if (data.result === 'success') {
        setCore(prev => ({
          ...prev,
          exchangeRate: Math.round(data.rates.KRW * 100) / 100
        }));
        setRateUpdatedAt(new Date().toLocaleTimeString('ko-KR'));
      }
    } catch (err) {
      console.error('환율 불러오기 실패:', err);
    } finally {
      setRateLoading(false);
    }
  };

  const handleCoreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // 계약번호, B/L번호는 문자열로 처리
    const textFields = ['contractNo', 'blNo'];
    setCore(prev => ({
      ...prev,
      [name]: textFields.includes(name) ? value : (value === '' ? 0 : parseFloat(value) || 0),
    }));
  };

  // ── 고정비용 편집 시작 ──
  const handleFixedEditStart = () => {
    const draft: Record<string, number> = {};
    FIXED_FEE_FIELDS.forEach(f => { draft[f.key] = fixedMap[f.key] ?? 0; });
    setFixedDraft(draft);
    setEditingFixed(true);
  };

  // ── 기준율 편집 시작 ──
  const handleRatesEditStart = () => {
    const draft: Record<string, number> = {};
    rates.forEach(r => { draft[r.key] = r.value; });
    setRatesDraft(draft);
    setEditingRates(true);
  };

  // ── 고정비용 저장 ──
  const handleFixedSave = async () => {
    setSaving(true);
    try {
      const updatedFees: CostFixedFee[] = [];
      for (const field of FIXED_FEE_FIELDS) {
        const amount   = fixedDraft[field.key] ?? 0;
        const existing = fixedFees.find(f => f.name === field.key);
        if (existing) {
          const updated = await updateCostFixedFee(existing.id, {
            name: field.key, amount, memo: ''
          });
          updatedFees.push(updated);
        } else {
          const created = await saveCostFixedFee({
            name: field.key, amount, memo: ''
          });
          updatedFees.push(created);
        }
      }
      setFixedFees(updatedFees);
      setEditingFixed(false);
      alert('고정 비용이 저장됐어요! 모든 직원에게 적용돼요 ✅');
    } catch (e) {
      alert('저장에 실패했어요. 서버가 실행 중인지 확인해주세요.');
    } finally {
      setSaving(false);
    }
  };

  // ── 기준율 저장 ──
  const handleRatesSave = async () => {
    setSaving(true);
    try {
      const updatedRates: CalcRate[] = [];
      for (const rate of rates) {
        const newValue = ratesDraft[rate.key] ?? rate.value;
        const updated  = await updateCalcRate(rate.key, newValue);
        updatedRates.push(updated);
      }
      setRates(updatedRates);
      setEditingRates(false);
      alert('계산 기준율이 저장됐어요! 모든 직원에게 적용돼요 ✅');
    } catch (e) {
      alert('저장에 실패했어요. 서버가 실행 중인지 확인해주세요.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('핵심 입력값을 초기화할까요?\n(고정 비용/기준율은 유지돼요)')) {
      setCore(DEFAULT_CORE);
      fetchExchangeRate();
    }
  };

  // ── 계산 저장 ──
  const handleSaveCalc = async () => {
    const name = saveName.trim() || core.blNo || core.contractNo;
    if (!name) { alert('저장 이름을 입력해주세요!'); return; }
    try {
      const newCalc = await saveCostCalc({ name, data: core as any });
      setSavedCalcs(prev => [newCalc, ...prev]);
      setShowSaveModal(false);
      setSaveName('');
      alert(`✅ "${name}" 저장 완료!`);
    } catch {
      alert('저장에 실패했어요.');
    }
  };

  // ── 계산 불러오기 ──
  const handleLoadCalc = (calc: CostCalcRecord) => {
    setCore(calc.data as CoreInput);
    setShowLoadModal(false);
    alert(`✅ "${calc.name}" 불러오기 완료!`);
  };

  // ── 저장된 계산 삭제 ──
  const handleDeleteCalc = async (id: number, name: string) => {
    if (!window.confirm(`"${name}"을 삭제할까요?`)) return;
    await deleteCostCalc(id);
    setSavedCalcs(prev => prev.filter(c => c.id !== id));
  };

  const result = calcResults(core, fixedMap, ratesMap);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">💰 수입원가 계산</h2>
          <p className="text-gray-500 text-sm mt-1">
            입력값을 변경하면 모든 항목이 자동으로 계산돼요
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => exportCostCalc({
              contractNo: core.contractNo,
              blNo: core.blNo,
              blAmount: core.blQuantity,
              importPrice: core.importPrice,
              exchangeRate: core.exchangeRate,
              containers: core.containers,
              customsRate: core.tariffRate,
              freight: core.transportFee,
              salesQty: core.saleQuantity,
              margin: core.margin,
              goodsCost: result.goodsPrice,
              lcOpenFee: result.lcOpenFee,
              insurance: result.insurance,
              importInterest: result.importInterest,
              termCg: result.termCg,
              workFee: result.workFee,
              relocate: result.relocate,
              foodRelocate: result.foodRelocate,
              foodInspect: result.foodInspect,
              doFeeTotal: result.doFeeTotal,
              wharfageTotal: result.wharfageTotal,
              ccTotal: result.ccTotal,
              thcTotal: result.thcTotal,
              customsFee: result.customsFee,
              subtotal: result.subtotal,
              loss: result.loss,
              total: result.total,
              loadingPrice: result.pricePerKgLoad,
              arrivalPrice: result.pricePerKgDelivery,
              supplyPrice: result.supplyPrice,
              fixedFees: FIXED_FEE_FIELDS.reduce((acc, f) => {
                acc[f.label] = fixedMap[f.key] ?? 0;
                return acc;
              }, {} as Record<string, number>),
            })}
            className="bg-green-600 text-white px-4 py-2 rounded-lg
                       hover:bg-green-700 transition-colors font-medium text-sm">
            📥 엑셀 저장
          </button>
          <button onClick={() => { setSaveName(core.blNo || core.contractNo || ''); setShowSaveModal(true); }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg
                       hover:bg-blue-700 transition-colors font-medium text-sm">
            💾 계산 저장
          </button>
          <button onClick={() => setShowLoadModal(true)}
            className="px-4 py-2 text-sm font-medium text-gray-600
                       border border-gray-300 rounded-lg hover:bg-gray-50">
            📂 불러오기 {savedCalcs.length > 0 && `(${savedCalcs.length})`}
          </button>
          <button onClick={handleReset}
            className="px-4 py-2 text-sm font-medium text-gray-600
                       border border-gray-300 rounded-lg hover:bg-gray-50">
            🔄 초기화
          </button>
        </div>
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
              {/* 계약번호 + B/L번호 (텍스트 입력) */}
              {[
                { label: '계약번호', name: 'contractNo', placeholder: '예: CT-2026-001' },
                { label: 'B/L 번호', name: 'blNo',       placeholder: '예: BL-2026-001' },
              ].map(f => (
                <div key={f.name} className="flex items-center justify-between">
                  <label className="text-sm text-gray-600 w-40">{f.label}</label>
                  <input type="text" name={f.name}
                    value={(core as any)[f.name]}
                    onChange={handleCoreChange}
                    placeholder={f.placeholder}
                    className="w-36 border border-gray-300 rounded-lg px-3 py-1.5
                               text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
              {[
                { label: 'B/L 원료량',  name: 'blQuantity',   unit: '톤',    step: '0.001' },
                { label: '수입단가',    name: 'importPrice',  unit: 'US$/톤', step: '0.01' },
                { label: '컨테이너 수', name: 'containers',   unit: 'EA',    step: '1' },
                { label: '관세율',      name: 'tariffRate',   unit: '%',     step: '0.1' },
                { label: '운송료',      name: 'transportFee', unit: '원/kg', step: '1' },
                { label: '마진',        name: 'margin',       unit: '원/kg', step: '1' },
              ].map(f => (
                <div key={f.name} className="flex items-center justify-between">
                  <label className="text-sm text-gray-600 w-40">
                    {f.label}
                    <span className="text-xs text-gray-400 ml-1">({f.unit})</span>
                  </label>
                  <input type="number" name={f.name}
                    value={(core as any)[f.name] || ''}
                    onChange={handleCoreChange} step={f.step}
                    className="w-36 border border-gray-300 rounded-lg px-3 py-1.5
                               text-sm text-right focus:outline-none focus:ring-2
                               focus:ring-blue-500"
                  />
                </div>
              ))}

              {/* 환율 */}
              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-600 w-40">
                  환율
                  <span className="text-xs text-gray-400 ml-1">(원/달러)</span>
                </label>
                <div className="flex items-center gap-2">
                  <input type="number" name="exchangeRate"
                    value={core.exchangeRate || ''}
                    onChange={handleCoreChange} step="0.01"
                    className="w-28 border border-gray-300 rounded-lg px-3 py-1.5
                               text-sm text-right focus:outline-none focus:ring-2
                               focus:ring-blue-500"
                  />
                  <button onClick={fetchExchangeRate} disabled={rateLoading}
                    title="실시간 환율 불러오기"
                    className="text-blue-500 hover:text-blue-700
                               disabled:text-gray-300 transition-colors text-lg">
                    {rateLoading ? '⏳' : '🔄'}
                  </button>
                </div>
              </div>
              {rateUpdatedAt && (
                <div className="text-xs text-green-600 text-right">
                  ✅ 환율 업데이트: {rateUpdatedAt}
                </div>
              )}
            </div>
          </div>

          {/* ── 고정 비용 카드 ── */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between text-sm
                         font-bold text-gray-700 uppercase tracking-wider">
              <span>⚙️ 고정 비용</span>
              <span className="text-gray-400">{showAdvanced ? '▲' : '▼'}</span>
            </button>

            {showAdvanced && (
              <div className="mt-4">
                {!editingFixed ? (
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <p className="text-xs text-gray-500">💾 서버 저장 (전직원 공유)</p>
                      {/* 관리자만 수정 버튼 표시 */}
                      {isAdmin && (
                        <button onClick={handleFixedEditStart}
                          className="text-xs text-blue-600 hover:text-blue-800
                                     font-medium border border-blue-200 px-3 py-1
                                     rounded-lg transition-colors">
                          ✏️ 수정
                        </button>
                      )}
                    </div>
                    <div className="space-y-2">
                      {FIXED_FEE_FIELDS.map(f => (
                        <div key={f.key}
                             className="flex justify-between items-center
                                        py-1 border-b border-gray-50">
                          <span className="text-sm text-gray-600">
                            {f.label}
                            <span className="text-xs text-gray-400 ml-1">({f.unit})</span>
                          </span>
                          <span className="text-sm font-medium text-gray-700">
                            ₩{(fixedMap[f.key] ?? 0).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs text-orange-600 font-medium mb-3">
                      ✏️ 수정 중 - 저장 버튼을 눌러야 서버에 반영돼요
                    </p>
                    <div className="space-y-3">
                      {FIXED_FEE_FIELDS.map(f => (
                        <div key={f.key} className="flex items-center justify-between">
                          <label className="text-sm text-gray-600 w-40">
                            {f.label}
                            <span className="text-xs text-gray-400 ml-1">({f.unit})</span>
                          </label>
                          <input type="number"
                            value={fixedDraft[f.key] || ''}
                            onChange={e => setFixedDraft(prev => ({
                              ...prev,
                              [f.key]: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0
                            }))}
                            min="0"
                            className="w-36 border border-orange-300 rounded-lg
                                       px-3 py-1.5 text-sm text-right
                                       focus:outline-none focus:ring-2 focus:ring-orange-400"
                          />
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2 mt-4">
                      <button onClick={() => setEditingFixed(false)}
                        className="flex-1 px-4 py-2 text-sm font-medium text-gray-600
                                   border border-gray-300 rounded-lg hover:bg-gray-50">
                        취소
                      </button>
                      <button onClick={handleFixedSave} disabled={saving}
                        className="flex-1 px-4 py-2 text-sm font-medium text-white
                                   bg-blue-600 rounded-lg hover:bg-blue-700
                                   disabled:opacity-50">
                        {saving ? '저장 중...' : '💾 저장'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── 계산 기준율 카드 (관리자만 수정 가능) ── */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <button
              onClick={() => setShowRates(!showRates)}
              className="w-full flex items-center justify-between text-sm
                         font-bold text-gray-700 uppercase tracking-wider">
              <span>📐 계산 기준율</span>
              <span className="text-gray-400">{showRates ? '▲' : '▼'}</span>
            </button>

            {showRates && (
              <div className="mt-4">
                {!editingRates ? (
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <p className="text-xs text-gray-500">💾 서버 저장 (전직원 공유)</p>
                      {/* 관리자만 수정 버튼 표시 */}
                      {isAdmin && (
                        <button onClick={handleRatesEditStart}
                          className="text-xs text-blue-600 hover:text-blue-800
                                     font-medium border border-blue-200 px-3 py-1
                                     rounded-lg transition-colors">
                          ✏️ 수정
                        </button>
                      )}
                    </div>
                    <div className="space-y-2">
                      {rates.map(r => (
                        <div key={r.key}
                             className="flex justify-between items-center
                                        py-1 border-b border-gray-50">
                          <span className="text-sm text-gray-600">
                            {r.label}
                            <span className="text-xs text-gray-400 ml-1">({r.unit})</span>
                          </span>
                          <span className="text-sm font-medium text-gray-700">
                            {r.unit === '원/톤'
                              ? `₩${r.value.toLocaleString()}`
                              : r.unit === '일'
                                ? `${r.value}일`
                                : r.unit === '배'
                                  ? `${r.value}배`
                                  : `${(r.value * 100).toFixed(4)}%`
                            }
                          </span>
                        </div>
                      ))}
                    </div>
                    {!isAdmin && (
                      <p className="text-xs text-gray-400 mt-3 text-center">
                        🔒 관리자만 수정할 수 있어요
                      </p>
                    )}
                  </div>
                ) : (
                  <div>
                    <p className="text-xs text-orange-600 font-medium mb-3">
                      ✏️ 수정 중 - 저장 버튼을 눌러야 서버에 반영돼요
                    </p>
                    <div className="space-y-3">
                      {rates.map(r => (
                        <div key={r.key} className="flex items-center justify-between">
                          <label className="text-sm text-gray-600 w-40">
                            {r.label}
                            <span className="text-xs text-gray-400 ml-1">({r.unit})</span>
                          </label>
                          <input type="number"
                            value={ratesDraft[r.key] ?? r.value}
                            onChange={e => setRatesDraft(prev => ({
                              ...prev,
                              [r.key]: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0
                            }))}
                            step="0.000001"
                            className="w-36 border border-orange-300 rounded-lg
                                       px-3 py-1.5 text-sm text-right
                                       focus:outline-none focus:ring-2 focus:ring-orange-400"
                          />
                        </div>
                      ))}
                    </div>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg
                                    px-3 py-2 mt-3">
                      <p className="text-xs text-yellow-700">
                        ⚠️ 이율은 소수로 입력해요
                        <br/>예) 1.2% = 0.012 / 기간은 일수로 입력 (90일 = 90)
                      </p>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <button onClick={() => setEditingRates(false)}
                        className="flex-1 px-4 py-2 text-sm font-medium text-gray-600
                                   border border-gray-300 rounded-lg hover:bg-gray-50">
                        취소
                      </button>
                      <button onClick={handleRatesSave} disabled={saving}
                        className="flex-1 px-4 py-2 text-sm font-medium text-white
                                   bg-blue-600 rounded-lg hover:bg-blue-700
                                   disabled:opacity-50">
                        {saving ? '저장 중...' : '💾 저장'}
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
                ['품대',      result.goodsPrice,         true],
                ['개설비',    result.lcOpenFee,           false],
                ['전신료',    fixedMap['전신료'] ?? 0,    false],
                ['AMEND',     fixedMap['AMEND수수료'] ?? 0, false],
                ['보험료',    result.insurance,           false],
                ['수입이자',  result.importInterest,      false],
                ['TERM CG',   result.termCg,              false],
                ['작업비',    result.workFee,             false],
                ['작업이적비', result.relocate,           false],
                ['식검이적비', result.foodRelocate,       false],
                ['식검수수료', result.foodInspect,        false],
                ['검정료',    fixedMap['검정료'] ?? 0,    false],
                ['D/O FEE',   result.doFeeTotal,          false],
                ['WHARFAGE',  result.wharfageTotal,       false],
                ['C/C',       result.ccTotal,             false],
                ['T.H.C',     result.thcTotal,            false],
                ['관세',      result.tariff,              false],
                ['통관수수료', result.customsFee,         false],
                ['수입신고비', fixedMap['수입신고비'] ?? 0, false],
                ['분석검정비', fixedMap['분석검정비'] ?? 0, false],
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
                <span className="text-sm text-gray-600">감모손실</span>
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

      {/* ── 계산 저장 모달 ── */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center
                        justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">💾 계산 저장</h3>
            <p className="text-sm text-gray-500 mb-3">
              이 계산을 나중에 불러올 수 있도록 이름을 지정해 저장해요
            </p>
            <input
              type="text"
              value={saveName}
              onChange={e => setSaveName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSaveCalc()}
              placeholder="예: 카길퓨리나 26.04, BL-2026-001"
              autoFocus
              className="w-full border border-gray-300 rounded-lg px-3 py-2
                         text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowSaveModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600
                           border border-gray-300 rounded-lg hover:bg-gray-50">
                취소
              </button>
              <button onClick={handleSaveCalc}
                className="px-4 py-2 text-sm font-medium text-white
                           bg-blue-600 rounded-lg hover:bg-blue-700">
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 계산 불러오기 모달 ── */}
      {showLoadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center
                        justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">📂 저장된 계산 불러오기</h3>
            {savedCalcs.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">
                저장된 계산이 없어요
              </p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {savedCalcs.map(calc => (
                  <div key={calc.id}
                       className="flex items-center justify-between p-3
                                  border border-gray-200 rounded-lg hover:bg-gray-50">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{calc.name}</p>
                      <p className="text-xs text-gray-400">{calc.created_at}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleLoadCalc(calc)}
                        className="text-xs text-blue-600 hover:text-blue-800
                                   font-medium border border-blue-200 px-2 py-1
                                   rounded-lg transition-colors">
                        불러오기
                      </button>
                      <button
                        onClick={() => handleDeleteCalc(calc.id, calc.name)}
                        className="text-xs text-red-500 hover:text-red-700
                                   font-medium border border-red-200 px-2 py-1
                                   rounded-lg transition-colors">
                        삭제
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end mt-4">
              <button onClick={() => setShowLoadModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600
                           border border-gray-300 rounded-lg hover:bg-gray-50">
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}