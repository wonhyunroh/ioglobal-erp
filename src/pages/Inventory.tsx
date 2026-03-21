// ──────────────────────────────────────────────
// 📁 파일명: Inventory.tsx
// 📌 위치: src/pages/Inventory.tsx
//
// 🎯 이 파일의 역할:
//   - 재고 관리 화면이에요
//   - 품목별 현재 재고, 입고/출고 수량을 관리해요
//   - 재고 부족 품목을 빨간색으로 강조해요
//
// 🔄 변경사항:
//   - 기존: electron-store에 전체 배열 저장
//   - 변경: 서버 API로 개별 추가/수정/삭제
//
// 🔗 연결된 파일들:
//   - db.ts: loadInventory, saveInventoryItem,
//            updateInventoryItem, deleteInventoryItem
//   - excel.ts: exportInventory
// ──────────────────────────────────────────────

import React, { useState, useEffect } from 'react';
import {
  InventoryItem, Item,
  loadInventory, loadItems,
  saveInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
} from '../db';
import { exportInventory } from '../excel';

const CATEGORIES = [
  '옥수수', '대두박', '소맥피', '면실박', '채종박', '주정박', '당밀', '기타'
];
const UNITS = ['t', 'kg', 'mt'];
const TABLE_HEADERS = [
  'No', '품목명', '화주', '단위', '현재재고', '최소재고', '상태', '최근업데이트', '관리'
];
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

const EMPTY_ITEM: Omit<InventoryItem, 'id'> = {
  item: '', category: '옥수수', unit: 't',
  current: 0, minStock: 0,
  lastUpdated: today(), memo: '',
};

type StockForm = {
  type: '입고' | '출고';
  quantity: number;
  memo: string;
};

export default function Inventory() {

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [formData, setFormData] = useState<Omit<InventoryItem, 'id'>>(EMPTY_ITEM);
  const [stockForm, setStockForm] = useState<StockForm>({
    type: '입고', quantity: 0, memo: '',
  });
  const [saving, setSaving] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filterCategory, setFilterCategory] = useState('전체');
  const [filterMonth, setFilterMonth] = useState('');
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [masterItems, setMasterItems] = useState<Item[]>([]);
  const [selectedLoadIds, setSelectedLoadIds] = useState<Set<number>>(new Set());

  // ── 앱 시작 시 서버에서 재고 목록 불러오기 ──
  useEffect(() => {
    const load = async () => {
      const data = await loadInventory();
      setInventory(data);
    };
    load();
  }, []);

  // ── 품목에서 불러오기: 품목 목록 모달 열기 ──
  const handleOpenLoad = async () => {
    const items = await loadItems();
    setMasterItems(items);
    setSelectedLoadIds(new Set());
    setShowLoadModal(true);
  };

  // ── 선택한 품목을 재고에 추가 ──
  const handleLoadSelected = async () => {
    const toLoad = masterItems.filter(i => selectedLoadIds.has(i.id));
    let count = 0;
    for (const item of toLoad) {
      // 이미 재고에 있는 품목은 건너뛰기
      if (inventory.some(inv => inv.item === item.name)) continue;
      const created = await saveInventoryItem({
        item: item.name, category: item.category, unit: item.unit,
        current: 0, minStock: 0, lastUpdated: today(), memo: '',
      });
      setInventory(prev => [...prev, created]);
      count++;
    }
    setShowLoadModal(false);
    if (count > 0) alert(`${count}개 품목을 재고에 추가했어요!`);
    else alert('추가할 새 품목이 없어요. (이미 등록된 품목)');
  };

  const handleAdd = () => {
    setEditingItem(null);
    setFormData(EMPTY_ITEM);
    setShowAddModal(true);
  };

  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setFormData({
      item: item.item, category: item.category,
      unit: item.unit, current: item.current,
      minStock: item.minStock, lastUpdated: item.lastUpdated,
      memo: item.memo,
    });
    setShowAddModal(true);
  };

  const handleStock = (item: InventoryItem, type: '입고' | '출고') => {
    setSelectedItem(item);
    setStockForm({ type, quantity: 0, memo: '' });
    setShowStockModal(true);
  };

  // ── 재고 삭제 → 서버에 DELETE 요청 ──
  const handleDelete = async (id: number) => {
    if (!window.confirm('정말 삭제하시겠어요?')) return;
    try {
      await deleteInventoryItem(id);
      setInventory(prev => prev.filter(i => i.id !== id));
    } catch (e) {
      alert('삭제에 실패했어요. 서버가 실행 중인지 확인해주세요.');
    }
  };

  // ── 재고 항목 저장 → 서버에 POST(추가) or PUT(수정) 요청 ──
  const handleSave = async () => {
    if (!formData.item.trim()) { alert('품목명을 입력해주세요!'); return; }
    setSaving(true);
    try {
      const data = { ...formData, lastUpdated: today() };
      if (editingItem) {
        // 수정: PUT /api/inventory/:id
        const updated = await updateInventoryItem(editingItem.id, data);
        setInventory(prev =>
          prev.map(i => i.id === editingItem.id ? updated : i)
        );
      } else {
        // 추가: POST /api/inventory
        const created = await saveInventoryItem(data);
        setInventory(prev => [...prev, created]);
      }
      setShowAddModal(false);
    } catch (e) {
      alert('저장에 실패했어요. 서버가 실행 중인지 확인해주세요.');
    } finally {
      setSaving(false);
    }
  };

  // ── 입고/출고 처리 → 서버에 PUT 요청 ──
  const handleStockSave = async () => {
    if (!selectedItem) return;
    if (stockForm.quantity <= 0) { alert('수량은 0보다 커야 해요!'); return; }
    if (stockForm.type === '출고' && stockForm.quantity > selectedItem.current) {
      alert(`재고가 부족해요!\n현재 재고: ${selectedItem.current}${selectedItem.unit}`);
      return;
    }
    setSaving(true);
    try {
      const newCurrent = stockForm.type === '입고'
        ? selectedItem.current + stockForm.quantity
        : selectedItem.current - stockForm.quantity;

      // 서버에 업데이트된 재고 수량 저장
      const updated = await updateInventoryItem(selectedItem.id, {
        ...selectedItem,
        current: newCurrent,
        lastUpdated: today(),
      });
      setInventory(prev =>
        prev.map(i => i.id === selectedItem.id ? updated : i)
      );
      setShowStockModal(false);
    } catch (e) {
      alert('처리에 실패했어요. 서버가 실행 중인지 확인해주세요.');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: (name === 'current' || name === 'minStock') ? Number(value) : value,
    }));
  };

  const handleStockChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setStockForm(prev => ({
      ...prev,
      [name]: name === 'quantity' ? Number(value) : value,
    }));
  };

  const isLowStock = (item: InventoryItem) =>
    item.minStock > 0 && item.current <= item.minStock;

  const lowStockCount = inventory.filter(isLowStock).length;

  // ── 필터링된 재고 목록 ──
  const filteredInventory = inventory.filter(item => {
    const matchCategory = filterCategory === '전체' || item.category === filterCategory;
    const matchSearch = !searchText ||
      item.item.toLowerCase().includes(searchText.toLowerCase()) ||
      item.category.toLowerCase().includes(searchText.toLowerCase());
    const matchMonth = !filterMonth || (item.lastUpdated || '').startsWith(filterMonth);
    return matchCategory && matchSearch && matchMonth;
  });

  // 월 이동 헬퍼
  const changeMonth = (dir: number) => {
    if (!filterMonth) {
      const d = new Date();
      setFilterMonth(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);
      return;
    }
    const [y, m] = filterMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + dir, 1);
    setFilterMonth(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">📦 재고 관리</h2>
          <p className="text-gray-500 text-sm mt-1">
            총 {inventory.length}개 품목
            {lowStockCount > 0 && (
              <span className="ml-2 text-red-500 font-medium">
                ⚠️ 재고 부족 {lowStockCount}개
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleOpenLoad}
            className="bg-orange-500 text-white px-4 py-2 rounded-lg
                       hover:bg-orange-600 transition-colors font-medium text-sm">
            📂 불러오기
          </button>
          <button onClick={() => exportInventory(inventory)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg
                       hover:bg-green-700 transition-colors font-medium text-sm">
            📥 엑셀 저장
          </button>
          <button onClick={handleAdd}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg
                       hover:bg-blue-700 transition-colors font-medium text-sm">
            + 품목 추가
          </button>
        </div>
      </div>

      {/* ── 월별 선택 (한국식) ── */}
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => changeMonth(-1)}
          className="px-2 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">◀</button>
        <select value={filterMonth ? filterMonth.split('-')[0] : ''}
          onChange={e => {
            if (!e.target.value) { setFilterMonth(''); return; }
            const m = filterMonth ? filterMonth.split('-')[1] : String(new Date().getMonth()+1).padStart(2,'0');
            setFilterMonth(`${e.target.value}-${m}`);
          }}
          className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm">
          <option value="">전체</option>
          {Array.from({length:5}, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
            <option key={y} value={y}>{y}년</option>
          ))}
        </select>
        {filterMonth && (
          <select value={filterMonth.split('-')[1]}
            onChange={e => setFilterMonth(`${filterMonth.split('-')[0]}-${e.target.value}`)}
            className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm">
            {Array.from({length:12}, (_, i) => String(i+1).padStart(2,'0')).map(m => (
              <option key={m} value={m}>{Number(m)}월</option>
            ))}
          </select>
        )}
        <button onClick={() => changeMonth(1)}
          className="px-2 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">▶</button>
        {filterMonth && (
          <button onClick={() => setFilterMonth('')}
            className="px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">
            전체 보기
          </button>
        )}
      </div>

      {/* ── 검색 + 필터 ── */}
      <div className="flex gap-3 mb-4 items-center flex-wrap">
        <input
          type="text"
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          placeholder="🔍 품목명 검색..."
          className="flex-1 min-w-[200px] border border-gray-300 rounded-lg px-4 py-2
                     text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex gap-1 flex-wrap">
          {['전체', ...CATEGORIES].map(cat => (
            <button key={cat} onClick={() => setFilterCategory(cat)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors
                ${filterCategory === cat
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}>
              {cat}
            </button>
          ))}
        </div>
        {(searchText || filterCategory !== '전체') && (
          <span className="text-xs text-gray-500">
            검색결과: {filteredInventory.length}건
          </span>
        )}
      </div>

      {/* ── 재고 목록 테이블 ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {TABLE_HEADERS.map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold
                                       text-gray-600 uppercase tracking-wider whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredInventory.length === 0 ? (
              <tr>
                <td colSpan={TABLE_HEADERS.length}
                    className="text-center py-16 text-gray-400">
                  <div className="text-4xl mb-3">📦</div>
                  <p className="text-sm">등록된 재고가 없어요</p>
                  <p className="text-xs mt-1">"품목 추가" 버튼을 눌러 추가해주세요</p>
                </td>
              </tr>
            ) : (
              filteredInventory.map((item, index) => (
                <tr key={item.id}
                    className={`hover:bg-gray-50 transition-colors
                      ${isLowStock(item) ? 'bg-red-50' : ''}`}>
                  <td className="px-4 py-3 text-gray-500">{index + 1}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{item.item}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 rounded-full text-xs font-medium
                                     bg-yellow-100 text-yellow-700">
                      {item.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{item.unit}</td>
                  <td className={`px-4 py-3 font-bold
                    ${isLowStock(item) ? 'text-red-600' : 'text-green-600'}`}>
                    {item.current.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {item.minStock.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium
                      ${isLowStock(item)
                        ? 'bg-red-100 text-red-700'
                        : 'bg-green-100 text-green-700'
                      }`}>
                      {isLowStock(item) ? '⚠️ 부족' : '✅ 정상'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{item.lastUpdated}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      <button onClick={() => handleStock(item, '입고')}
                        className="text-green-600 hover:text-green-800 text-xs
                                   font-medium border border-green-200
                                   px-2 py-0.5 rounded transition-colors">
                        입고
                      </button>
                      <button onClick={() => handleStock(item, '출고')}
                        className="text-orange-600 hover:text-orange-800 text-xs
                                   font-medium border border-orange-200
                                   px-2 py-0.5 rounded transition-colors">
                        출고
                      </button>
                      <button onClick={() => handleEdit(item)}
                        className="text-blue-600 hover:text-blue-800 text-xs
                                   font-medium transition-colors">수정</button>
                      <button onClick={() => handleDelete(item.id)}
                        className="text-red-500 hover:text-red-700 text-xs
                                   font-medium transition-colors">삭제</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── 재고 항목 추가/수정 모달 ── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center
                        justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-5">
              {editingItem ? '✏️ 재고 항목 수정' : '➕ 재고 항목 추가'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  품목명 <span className="text-red-500">*</span>
                </label>
                <input type="text" name="item"
                  value={formData.item} onChange={handleChange}
                  placeholder="예: 옥수수 (미국산)"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2
                             text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    카테고리
                  </label>
                  <select name="category" value={formData.category}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2
                               text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    단위
                  </label>
                  <select name="unit" value={formData.unit} onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2
                               text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    현재 재고
                  </label>
                  <input type="number" name="current"
                    value={formData.current || ''} onChange={handleChange} min="0"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2
                               text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    최소 재고 기준
                  </label>
                  <input type="number" name="minStock"
                    value={formData.minStock || ''} onChange={handleChange}
                    min="0" placeholder="0 = 기준 없음"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2
                               text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">메모</label>
                <textarea name="memo" value={formData.memo} onChange={handleChange}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2
                             text-sm focus:outline-none focus:ring-2
                             focus:ring-blue-500 resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600
                           border border-gray-300 rounded-lg hover:bg-gray-50">
                취소
              </button>
              <button onClick={handleSave} disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white
                           bg-blue-600 rounded-lg hover:bg-blue-700
                           disabled:opacity-50">
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 입고/출고 처리 모달 ── */}
      {showStockModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center
                        justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-2">
              {stockForm.type === '입고' ? '📥 입고 처리' : '📤 출고 처리'}
            </h3>
            <div className="bg-gray-50 rounded-lg px-4 py-3 mb-4">
              <p className="text-sm font-medium text-gray-700">{selectedItem.item}</p>
              <p className="text-xs text-gray-500 mt-1">
                현재 재고:
                <span className="font-bold text-gray-700 ml-1">
                  {selectedItem.current.toLocaleString()} {selectedItem.unit}
                </span>
              </p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">유형</label>
                <select name="type" value={stockForm.type} onChange={handleStockChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2
                             text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="입고">📥 입고</option>
                  <option value="출고">📤 출고</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  수량 ({selectedItem.unit})
                </label>
                <input type="number" name="quantity"
                  value={stockForm.quantity || ''} onChange={handleStockChange} min="0"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2
                             text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="bg-blue-50 rounded-lg px-4 py-3">
                <span className="text-sm text-blue-700">처리 후 예상 재고: </span>
                <span className="font-bold text-blue-800">
                  {(stockForm.type === '입고'
                    ? selectedItem.current + stockForm.quantity
                    : selectedItem.current - stockForm.quantity
                  ).toLocaleString()} {selectedItem.unit}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">메모</label>
                <input type="text" name="memo"
                  value={stockForm.memo} onChange={handleStockChange}
                  placeholder="예: ORD-2026-001 출고"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2
                             text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowStockModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600
                           border border-gray-300 rounded-lg hover:bg-gray-50">
                취소
              </button>
              <button onClick={handleStockSave} disabled={saving}
                className={`px-4 py-2 text-sm font-medium text-white rounded-lg
                  disabled:opacity-50
                  ${stockForm.type === '입고'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-orange-600 hover:bg-orange-700'
                  }`}>
                {saving ? '처리 중...' : stockForm.type === '입고' ? '입고 처리' : '출고 처리'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 품목에서 불러오기 모달 ── */}
      {showLoadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6 max-h-[80vh] flex flex-col">
            <h3 className="text-lg font-bold text-gray-800 mb-1">📂 품목에서 불러오기</h3>
            <p className="text-xs text-gray-500 mb-4">
              품목 관리에 등록된 항목을 재고에 추가해요. (이미 등록된 품목은 건너뜁니다)
            </p>
            <div className="flex-1 overflow-y-auto border border-gray-200 rounded-lg">
              {masterItems.length === 0 ? (
                <p className="text-center text-gray-400 py-8 text-sm">등록된 품목이 없어요</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left">
                        <input type="checkbox"
                          checked={selectedLoadIds.size === masterItems.length}
                          onChange={e => {
                            if (e.target.checked) setSelectedLoadIds(new Set(masterItems.map(i => i.id)));
                            else setSelectedLoadIds(new Set());
                          }} />
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">화주</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">품목명</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">단위</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">상태</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {masterItems.map(item => {
                      const exists = inventory.some(inv => inv.item === item.name);
                      return (
                        <tr key={item.id} className={exists ? 'bg-gray-50 opacity-50' : 'hover:bg-blue-50'}>
                          <td className="px-3 py-2">
                            <input type="checkbox" disabled={exists}
                              checked={selectedLoadIds.has(item.id)}
                              onChange={e => {
                                const next = new Set(selectedLoadIds);
                                if (e.target.checked) next.add(item.id);
                                else next.delete(item.id);
                                setSelectedLoadIds(next);
                              }} />
                          </td>
                          <td className="px-3 py-2 text-gray-800">{item.name}</td>
                          <td className="px-3 py-2">
                            <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">{item.category}</span>
                          </td>
                          <td className="px-3 py-2 text-gray-600">{item.unit}</td>
                          <td className="px-3 py-2 text-xs">
                            {exists ? <span className="text-gray-400">등록됨</span> : <span className="text-blue-600">추가 가능</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
            <div className="flex justify-between items-center mt-4">
              <span className="text-xs text-gray-500">{selectedLoadIds.size}개 선택</span>
              <div className="flex gap-3">
                <button onClick={() => setShowLoadModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
                  취소
                </button>
                <button onClick={handleLoadSelected} disabled={selectedLoadIds.size === 0}
                  className="px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600 disabled:opacity-50">
                  불러오기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}