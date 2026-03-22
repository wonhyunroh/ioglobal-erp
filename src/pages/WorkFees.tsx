import React, { useState, useEffect } from 'react';
import {
  WorkFee,
  loadWorkFees,
  saveWorkFee,
  updateWorkFee,
  deleteWorkFee,
} from '../db';
import { exportWorkFees, parseExcelFile } from '../excel';

const LOCATIONS = ['광양', '녹산', '두동'] as const;

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const EMPTY_FEE: Omit<WorkFee, 'id'> = {
  yearMonth: today(),
  location: '광양',
  partner: '',
  item: '',
  weightKg: 0,
  salesPrice: 0,
  salesAmount: 0,
  purchasePrice: 0,
  purchaseAmount: 0,
  memo: '',
};

export default function WorkFees() {
  const [fees, setFees] = useState<WorkFee[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingFee, setEditingFee] = useState<WorkFee | null>(null);
  const [formData, setFormData] = useState<Omit<WorkFee, 'id'>>(EMPTY_FEE);
  const [filterMonth, setFilterMonth] = useState(today());
  const [filterLocation, setFilterLocation] = useState('전체');
  const [searchText, setSearchText] = useState('');
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [loadSearchText, setLoadSearchText] = useState('');

  useEffect(() => {
    const load = async () => {
      const data = await loadWorkFees();
      setFees(data);
    };
    load();
  }, []);

  // ── 불러오기: 저장된 데이터 검색 후 선택 → 수정 폼 ──
  const handleOpenLoad = async () => {
    const data = await loadWorkFees();
    setFees(data);
    setLoadSearchText('');
    setShowLoadModal(true);
  };

  const handleLoadSelect = (fee: WorkFee) => {
    setShowLoadModal(false);
    handleEdit(fee);
  };

  const loadFiltered = fees.filter(f => {
    if (!loadSearchText) return true;
    const q = loadSearchText.toLowerCase();
    return f.partner.toLowerCase().includes(q) ||
      f.item.toLowerCase().includes(q) ||
      f.location.toLowerCase().includes(q) ||
      f.yearMonth.includes(q);
  });

  const handleAdd = () => {
    setEditingFee(null);
    setFormData({ ...EMPTY_FEE, yearMonth: filterMonth });
    setShowModal(true);
  };

  const handleEdit = (fee: WorkFee) => {
    setEditingFee(fee);
    setFormData({
      yearMonth: fee.yearMonth,
      location: fee.location,
      partner: fee.partner,
      item: fee.item,
      weightKg: fee.weightKg,
      salesPrice: fee.salesPrice,
      salesAmount: fee.salesAmount,
      purchasePrice: fee.purchasePrice,
      purchaseAmount: fee.purchaseAmount,
      memo: fee.memo,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('정말 삭제하시겠어요?')) return;
    try {
      await deleteWorkFee(id);
      setFees(prev => prev.filter(f => f.id !== id));
    } catch {
      alert('서버가 실행 중인지 확인해주세요');
    }
  };

  const handleSave = async () => {
    if (!formData.partner.trim()) { alert('거래처를 입력해주세요!'); return; }
    if (!formData.item.trim()) { alert('품목을 입력해주세요!'); return; }
    try {
      if (editingFee) {
        const updated = await updateWorkFee(editingFee.id, formData);
        setFees(prev => prev.map(f => f.id === editingFee.id ? updated : f));
      } else {
        const created = await saveWorkFee(formData);
        setFees(prev => [...prev, created]);
      }
      setShowModal(false);
    } catch {
      alert('서버가 실행 중인지 확인해주세요');
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    const numFields = ['weightKg', 'salesPrice', 'salesAmount', 'purchasePrice', 'purchaseAmount'];
    if (numFields.includes(name)) {
      const num = parseFloat(value) || 0;
      setFormData(prev => {
        const next = { ...prev, [name]: num };
        // 중량 * 단가 자동 계산
        if (name === 'weightKg' || name === 'salesPrice') {
          next.salesAmount = next.weightKg * next.salesPrice;
        }
        if (name === 'weightKg' || name === 'purchasePrice') {
          next.purchaseAmount = next.weightKg * next.purchasePrice;
        }
        return next;
      });
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // ── 월 이동 ──
  const changeMonth = (dir: number) => {
    const [y, m] = filterMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + dir, 1);
    setFilterMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  // ── 필터링된 데이터 ──
  const monthFees = fees.filter(f => f.yearMonth === filterMonth);
  const filteredFees = monthFees.filter(f => {
    const matchLoc = filterLocation === '전체' || f.location === filterLocation;
    const matchSearch = !searchText ||
      f.partner.toLowerCase().includes(searchText.toLowerCase()) ||
      f.item.toLowerCase().includes(searchText.toLowerCase());
    return matchLoc && matchSearch;
  });

  // ── 지역별 합계 ──
  const calcSummary = (list: WorkFee[]) => ({
    weight: list.reduce((s, f) => s + f.weightKg, 0),
    sales: list.reduce((s, f) => s + f.salesAmount, 0),
    purchase: list.reduce((s, f) => s + f.purchaseAmount, 0),
    profit: list.reduce((s, f) => s + (f.salesAmount - f.purchaseAmount), 0),
  });

  const totalSummary = calcSummary(monthFees);
  const locationSummaries = LOCATIONS.map(loc => ({
    location: loc,
    ...calcSummary(monthFees.filter(f => f.location === loc)),
  }));

  // ── 복사 추가 (이전 달 데이터 복사) ──
  const handleCopyPrevMonth = async () => {
    const [y, m] = filterMonth.split('-').map(Number);
    const prevDate = new Date(y, m - 2, 1);
    const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    const prevFees = fees.filter(f => f.yearMonth === prevMonth);
    if (prevFees.length === 0) {
      alert(`${prevMonth} 데이터가 없어요!`);
      return;
    }
    if (!window.confirm(`${prevMonth} 데이터 ${prevFees.length}건을 ${filterMonth}로 복사할까요?\n(중량/금액은 0으로 초기화됩니다)`)) return;
    try {
      const newFees: WorkFee[] = [];
      for (const f of prevFees) {
        const created = await saveWorkFee({
          yearMonth: filterMonth,
          location: f.location,
          partner: f.partner,
          item: f.item,
          weightKg: 0,
          salesPrice: f.salesPrice,
          salesAmount: 0,
          purchasePrice: f.purchasePrice,
          purchaseAmount: 0,
          memo: '',
        });
        newFees.push(created);
      }
      setFees(prev => [...prev, ...newFees]);
      alert(`${newFees.length}건 복사 완료!`);
    } catch {
      alert('복사 실패! 서버를 확인해주세요.');
    }
  };

  // ── 엑셀 파일에서 작업비 데이터 불러오기 ──
  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const rows = await parseExcelFile(file);
      if (rows.length === 0) {
        alert('엑셀 파일에 데이터가 없어요!');
        return;
      }

      // 엑셀 컬럼명 매핑 (유연하게 여러 가지 이름 지원)
      const findCol = (row: any, candidates: string[]): string => {
        for (const c of candidates) {
          if (row[c] !== undefined) return row[c];
        }
        return '';
      };
      const findNum = (row: any, candidates: string[]): number => {
        for (const c of candidates) {
          if (row[c] !== undefined) return parseFloat(row[c]) || 0;
        }
        return 0;
      };

      const parsed = rows.map(row => ({
        yearMonth: findCol(row, ['년월', '연월', 'yearMonth']) || filterMonth,
        location: findCol(row, ['지역', 'location', '구분']) || '광양',
        partner: findCol(row, ['거래처', 'partner', '회사명', '발행처']),
        item: findCol(row, ['품목', 'item', '품목명']),
        weightKg: findNum(row, ['중량', '중량(kg)', '중량(KG)', 'weightKg', 'KG']),
        salesPrice: findNum(row, ['매출단가', 'salesPrice', '매출 단가']),
        salesAmount: findNum(row, ['매출액', 'salesAmount', '매출금액', '매출']),
        purchasePrice: findNum(row, ['매입단가', 'purchasePrice', '매입 단가']),
        purchaseAmount: findNum(row, ['매입액', 'purchaseAmount', '매입금액', '매입']),
        memo: findCol(row, ['메모', 'memo', '비고']) || '',
      })).filter(r => r.partner || r.item); // 거래처나 품목이 있는 행만

      if (parsed.length === 0) {
        alert('유효한 데이터가 없어요!\n\n엑셀에 거래처, 품목 컬럼이 있는지 확인해주세요.');
        return;
      }

      if (!window.confirm(`${parsed.length}건의 작업비 데이터를 불러올까요?`)) return;

      const newFees: WorkFee[] = [];
      for (const p of parsed) {
        const created = await saveWorkFee(p as Omit<WorkFee, 'id'>);
        newFees.push(created);
      }
      setFees(prev => [...prev, ...newFees]);
      alert(`${newFees.length}건 엑셀 불러오기 완료!`);
    } catch {
      alert('엑셀 파일 읽기 실패! 파일 형식을 확인해주세요.');
    }
    // input 초기화 (같은 파일 다시 선택 가능하게)
    e.target.value = '';
  };

  return (
    <div>
      {/* 숨겨진 파일 input */}
      <input
        type="file"
        id="excel-import"
        accept=".xlsx,.xls,.csv"
        onChange={handleExcelImport}
        className="hidden"
      />

      {/* ── 헤더 ── */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">🏭 작업비 관리</h2>
          <p className="text-gray-500 text-sm mt-1">
            광양 / 녹산 / 두동 작업물량 및 매출·매입·영업이익
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleOpenLoad}
            className="bg-orange-500 text-white px-4 py-2 rounded-lg
                       hover:bg-orange-600 transition-colors font-medium text-sm">
            📂 불러오기
          </button>
          <button onClick={() => document.getElementById('excel-import')?.click()}
            className="bg-cyan-500 text-white px-4 py-2 rounded-lg
                       hover:bg-cyan-600 transition-colors font-medium text-sm">
            📄 엑셀 불러오기
          </button>
          <button onClick={handleCopyPrevMonth}
            className="bg-purple-500 text-white px-4 py-2 rounded-lg
                       hover:bg-purple-600 transition-colors font-medium text-sm">
            📋 전월 복사
          </button>
          <button onClick={() => exportWorkFees(filteredFees, filterMonth)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg
                       hover:bg-green-700 transition-colors font-medium text-sm">
            📥 엑셀 저장
          </button>
          <button onClick={handleAdd}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg
                       hover:bg-blue-700 transition-colors font-medium text-sm">
            + 작업비 추가
          </button>
        </div>
      </div>

      {/* ── 월 선택 (한국식) ── */}
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => changeMonth(-1)}
          className="px-2 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">◀</button>
        <select value={filterMonth.split('-')[0]}
          onChange={e => {
            const m = filterMonth.split('-')[1];
            setFilterMonth(`${e.target.value}-${m}`);
          }}
          className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm">
          {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
            <option key={y} value={y}>{y}년</option>
          ))}
        </select>
        <select value={filterMonth.split('-')[1]}
          onChange={e => setFilterMonth(`${filterMonth.split('-')[0]}-${e.target.value}`)}
          className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm">
          {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(m => (
            <option key={m} value={m}>{Number(m)}월</option>
          ))}
        </select>
        <button onClick={() => changeMonth(1)}
          className="px-2 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">▶</button>
      </div>

      {/* ── 토탈 요약 카드 ── */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
          <p className="text-xs text-gray-600 font-medium mb-1">총 작업물량</p>
          <p className="text-lg font-bold text-gray-800">
            {totalSummary.weight.toLocaleString()} kg
          </p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
          <p className="text-xs text-blue-600 font-medium mb-1">총 매출</p>
          <p className="text-lg font-bold text-blue-800">
            ₩{totalSummary.sales.toLocaleString()}
          </p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <p className="text-xs text-red-600 font-medium mb-1">총 매입</p>
          <p className="text-lg font-bold text-red-800">
            ₩{totalSummary.purchase.toLocaleString()}
          </p>
        </div>
        <div className={`border rounded-lg px-4 py-3 ${totalSummary.profit >= 0
          ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}`}>
          <p className={`text-xs font-medium mb-1 ${totalSummary.profit >= 0 ? 'text-green-600' : 'text-orange-600'}`}>
            총 영업이익
          </p>
          <p className={`text-lg font-bold ${totalSummary.profit >= 0 ? 'text-green-800' : 'text-orange-800'}`}>
            ₩{totalSummary.profit.toLocaleString()}
          </p>
        </div>
      </div>

      {/* ── 지역별 요약 ── */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {locationSummaries.map(loc => (
          <div key={loc.location}
            className={`border rounded-lg px-4 py-3 cursor-pointer transition-colors
              ${filterLocation === loc.location ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-200' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
            onClick={() => setFilterLocation(filterLocation === loc.location ? '전체' : loc.location)}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-gray-800">{loc.location}</span>
              <span className="text-xs text-gray-500">{loc.weight.toLocaleString()} kg</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <p className="text-blue-500">매출</p>
                <p className="font-semibold text-blue-700">₩{loc.sales.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-red-500">매입</p>
                <p className="font-semibold text-red-700">₩{loc.purchase.toLocaleString()}</p>
              </div>
              <div>
                <p className={loc.profit >= 0 ? 'text-green-500' : 'text-orange-500'}>영업이익</p>
                <p className={`font-semibold ${loc.profit >= 0 ? 'text-green-700' : 'text-orange-700'}`}>
                  ₩{loc.profit.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── 검색 + 지역 필터 ── */}
      <div className="flex gap-3 mb-4 items-center flex-wrap">
        <input
          type="text"
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          placeholder="🔍 거래처, 품목 검색..."
          className="flex-1 min-w-[200px] border border-gray-300 rounded-lg px-4 py-2
                     text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex gap-2">
          {['전체', ...LOCATIONS].map(loc => (
            <button key={loc} onClick={() => setFilterLocation(loc)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors
                ${filterLocation === loc
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}>
              {loc}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-500">
          {filteredFees.length}건
        </span>
      </div>

      {/* ── 작업비 목록 테이블 ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">No</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">지역</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">거래처</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">품목</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">중량(kg)</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-blue-600">매출단가</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-blue-600">매출액</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-red-600">매입단가</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-red-600">매입액</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-green-600">영업이익</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">메모</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredFees.length === 0 ? (
              <tr>
                <td colSpan={12} className="text-center py-16 text-gray-400">
                  <div className="text-4xl mb-3">🏭</div>
                  <p className="text-sm">작업비 내역이 없어요</p>
                  <p className="text-xs mt-1">"작업비 추가" 버튼으로 추가하거나 "전월 복사"를 사용해보세요</p>
                </td>
              </tr>
            ) : (
              filteredFees.map((fee, index) => {
                const profit = fee.salesAmount - fee.purchaseAmount;
                return (
                  <tr key={fee.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-2 text-gray-500">{index + 1}</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium
                        ${fee.location === '광양' ? 'bg-indigo-100 text-indigo-700'
                          : fee.location === '녹산' ? 'bg-teal-100 text-teal-700'
                          : 'bg-amber-100 text-amber-700'}`}>
                        {fee.location}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-medium text-gray-800">{fee.partner}</td>
                    <td className="px-3 py-2 text-gray-600">{fee.item}</td>
                    <td className="px-3 py-2 text-right text-gray-700">{fee.weightKg.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right text-blue-600">₩{fee.salesPrice.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right font-medium text-blue-700">₩{fee.salesAmount.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right text-red-600">₩{fee.purchasePrice.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right font-medium text-red-700">₩{fee.purchaseAmount.toLocaleString()}</td>
                    <td className={`px-3 py-2 text-right font-medium ${profit >= 0 ? 'text-green-700' : 'text-orange-700'}`}>
                      ₩{profit.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-gray-500 max-w-[100px] truncate">{fee.memo}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <button onClick={() => handleEdit(fee)}
                          className="text-blue-600 hover:text-blue-800 text-xs font-medium">수정</button>
                        <button onClick={() => handleDelete(fee.id)}
                          className="text-red-500 hover:text-red-700 text-xs font-medium">삭제</button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          {filteredFees.length > 0 && (
            <tfoot className="bg-gray-50 border-t-2 border-gray-300">
              <tr className="font-semibold text-sm">
                <td colSpan={4} className="px-3 py-3 text-gray-700">
                  합계 ({filterLocation === '전체' ? '전체' : filterLocation})
                </td>
                <td className="px-3 py-3 text-right text-gray-800">
                  {filteredFees.reduce((s, f) => s + f.weightKg, 0).toLocaleString()}
                </td>
                <td className="px-3 py-3"></td>
                <td className="px-3 py-3 text-right text-blue-700">
                  ₩{filteredFees.reduce((s, f) => s + f.salesAmount, 0).toLocaleString()}
                </td>
                <td className="px-3 py-3"></td>
                <td className="px-3 py-3 text-right text-red-700">
                  ₩{filteredFees.reduce((s, f) => s + f.purchaseAmount, 0).toLocaleString()}
                </td>
                <td className={`px-3 py-3 text-right ${
                  filteredFees.reduce((s, f) => s + (f.salesAmount - f.purchaseAmount), 0) >= 0
                    ? 'text-green-700' : 'text-orange-700'}`}>
                  ₩{filteredFees.reduce((s, f) => s + (f.salesAmount - f.purchaseAmount), 0).toLocaleString()}
                </td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* ── 추가/수정 모달 ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-800 mb-5">
              {editingFee ? '✏️ 작업비 수정' : '➕ 작업비 추가'}
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">년월</label>
                  <input type="text" name="yearMonth" value={formData.yearMonth} onChange={handleChange}
                    placeholder="2026-02"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">지역 <span className="text-red-500">*</span></label>
                  <select name="location" value={formData.location} onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {LOCATIONS.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">거래처 <span className="text-red-500">*</span></label>
                  <input type="text" name="partner" value={formData.partner} onChange={handleChange}
                    placeholder="예: 카우링크"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">품목 <span className="text-red-500">*</span></label>
                  <input type="text" name="item" value={formData.item} onChange={handleChange}
                    placeholder="예: 주정박 BULK"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">중량 (kg)</label>
                <input type="number" name="weightKg" value={formData.weightKg || ''} onChange={handleChange}
                  min="0" step="any" placeholder="0"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-xs font-semibold text-blue-700 mb-2">매출 (부가세별도)</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-blue-600 mb-1">매출단가 (원)</label>
                    <input type="number" name="salesPrice" value={formData.salesPrice || ''} onChange={handleChange}
                      min="0" step="any"
                      className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-blue-600 mb-1">매출액 (자동계산)</label>
                    <input type="number" name="salesAmount" value={formData.salesAmount || ''} onChange={handleChange}
                      min="0" step="any"
                      className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
              </div>
              <div className="bg-red-50 rounded-lg p-3">
                <p className="text-xs font-semibold text-red-700 mb-2">매입 (부가세별도)</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-red-600 mb-1">매입단가 (원)</label>
                    <input type="number" name="purchasePrice" value={formData.purchasePrice || ''} onChange={handleChange}
                      min="0" step="any"
                      className="w-full border border-red-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-red-600 mb-1">매입액 (자동계산)</label>
                    <input type="number" name="purchaseAmount" value={formData.purchaseAmount || ''} onChange={handleChange}
                      min="0" step="any"
                      className="w-full border border-red-200 rounded-lg px-3 py-2 text-sm bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500" />
                  </div>
                </div>
              </div>
              {/* 영업이익 자동계산 표시 */}
              <div className={`rounded-lg px-4 py-3 ${
                (formData.salesAmount - formData.purchaseAmount) >= 0
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-orange-50 border border-orange-200'
              }`}>
                <span className="text-sm font-medium">영업이익:</span>
                <span className={`text-lg font-bold ml-2 ${
                  (formData.salesAmount - formData.purchaseAmount) >= 0
                    ? 'text-green-800' : 'text-orange-800'
                }`}>
                  ₩{(formData.salesAmount - formData.purchaseAmount).toLocaleString()}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">메모</label>
                <textarea name="memo" value={formData.memo} onChange={handleChange}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
                취소
              </button>
              <button onClick={handleSave}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 불러오기 모달: 저장된 작업비 검색 ── */}
      {showLoadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 p-6 max-h-[80vh] flex flex-col">
            <h3 className="text-lg font-bold text-gray-800 mb-1">📂 저장된 작업비 불러오기</h3>
            <p className="text-xs text-gray-500 mb-3">검색 후 선택하면 수정 화면이 열려요</p>
            <input
              type="text"
              value={loadSearchText}
              onChange={e => setLoadSearchText(e.target.value)}
              placeholder="🔍 거래처, 품목, 지역, 년월 검색..."
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm mb-3
                         focus:outline-none focus:ring-2 focus:ring-orange-500"
              autoFocus
            />
            <div className="flex-1 overflow-y-auto border border-gray-200 rounded-lg">
              {loadFiltered.length === 0 ? (
                <p className="text-center text-gray-400 py-8 text-sm">검색 결과가 없어요</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">년월</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">지역</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">거래처</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">품목</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">매출액</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">매입액</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {loadFiltered.map(fee => (
                      <tr key={fee.id}
                        onClick={() => handleLoadSelect(fee)}
                        className="hover:bg-orange-50 cursor-pointer transition-colors">
                        <td className="px-3 py-2 text-gray-600">{fee.yearMonth}</td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium
                            ${fee.location === '광양' ? 'bg-indigo-100 text-indigo-700'
                              : fee.location === '녹산' ? 'bg-teal-100 text-teal-700'
                              : 'bg-amber-100 text-amber-700'}`}>
                            {fee.location}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-medium text-gray-800">{fee.partner}</td>
                        <td className="px-3 py-2 text-gray-600">{fee.item}</td>
                        <td className="px-3 py-2 text-right text-blue-700">₩{fee.salesAmount.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right text-red-700">₩{fee.purchaseAmount.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="flex justify-between items-center mt-4">
              <span className="text-xs text-gray-400">{loadFiltered.length}건</span>
              <button onClick={() => setShowLoadModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
