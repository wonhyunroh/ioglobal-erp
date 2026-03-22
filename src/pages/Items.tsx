// ──────────────────────────────────────────────
// 📁 파일명: Items.tsx
// 📌 위치: src/pages/Items.tsx
//
// 🎯 이 파일의 역할:
//   - 품목 관리 화면이에요
//   - 품목 목록을 표로 보여줘요
//   - 품목 추가/수정/삭제 기능을 제공해요
//   - 날짜별 검색, 단가 변동 추적, 상차도/도착도, 벌크/톤백 지원
//
// 🔗 연결된 파일들:
//   - db.ts: loadItems, saveItem, updateItem, deleteItem
// ──────────────────────────────────────────────

import React, { useState, useEffect } from 'react';
import { Item, loadItems, saveItem, updateItem, deleteItem } from '../db';
import { exportItems } from '../excel';

const UNITS = ['t', 'kg', 'mt'];
const DELIVERY_TYPES = ['상차도', '도착도'] as const;
const PACK_TYPES = ['벌크', '톤백'] as const;
const TABLE_HEADERS = [
  'No', '화주', '품목명', '단위', '기준단가', '단가변동일',
  '상차도/도착도', '벌크/톤백', '원산지', '메모', '관리'
];

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

const EMPTY_ITEM: Omit<Item, 'id'> = {
  name: '', category: '', unit: 't',
  price: 0, origin: '', memo: '',
  deliveryType: '상차도', packType: '벌크', priceDate: todayStr(),
};

export default function Items() {

  const [items, setItems] = useState<Item[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [formData, setFormData] = useState<Omit<Item, 'id'>>(EMPTY_ITEM);
  const [searchText, setSearchText] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterDay, setFilterDay] = useState('');

  // ── 앱 시작 시 저장된 품목 불러오기 ──
  useEffect(() => {
    const load = async () => {
      const data = await loadItems();
      setItems(data);
    };
    load();
  }, []);

  const handleAdd = () => {
    setEditingItem(null);
    setFormData({ ...EMPTY_ITEM, priceDate: todayStr() });
    setShowModal(true);
  };

  const handleEdit = (item: Item) => {
    setEditingItem(item);
    setFormData({
      name: item.name, category: item.category,
      unit: item.unit, price: item.price,
      origin: item.origin, memo: item.memo,
      deliveryType: item.deliveryType || '상차도',
      packType: item.packType || '벌크',
      priceDate: item.priceDate || '',
    });
    setShowModal(true);
  };

  // ── 품목 삭제: 서버에 DELETE 요청 후 목록에서 제거 ──
  const handleDelete = async (id: number) => {
    if (!window.confirm('정말 삭제하시겠어요?')) return;
    try {
      await deleteItem(id);
      setItems(prev => prev.filter(i => i.id !== id));
    } catch {
      alert('서버가 실행 중인지 확인해주세요');
    }
  };

  // ── 품목 저장 (추가/수정): 서버에 POST/PUT 요청 ──
  const handleSave = async () => {
    if (!formData.name.trim()) { alert('품목명을 입력해주세요!'); return; }
    try {
      if (editingItem) {
        const updated = await updateItem(editingItem.id, formData);
        setItems(prev => prev.map(i => i.id === editingItem.id ? updated : i));
      } else {
        const created = await saveItem(formData);
        setItems(prev => [...prev, created]);
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
    setFormData(prev => ({
      ...prev,
      [name]: name === 'price' ? (Number(value) || 0) : value,
    }));
  };

  // ── 이전에 입력한 품목명 목록 (자동완성용) ──
  const usedCategories = [...new Set(items.map(i => i.category).filter(Boolean))];

  // ── 월 이동 헬퍼 ──
  const changeMonth = (dir: number) => {
    if (!filterMonth) {
      const d = new Date();
      setFilterMonth(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);
      return;
    }
    const [y, m] = filterMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + dir, 1);
    setFilterMonth(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);
    setFilterDay('');
  };

  // ── 해당 월의 일수 계산 ──
  const getDaysInMonth = () => {
    if (!filterMonth) return [];
    const [y, m] = filterMonth.split('-').map(Number);
    const days = new Date(y, m, 0).getDate();
    return Array.from({ length: days }, (_, i) => String(i + 1).padStart(2, '0'));
  };

  // ── 필터링된 품목 목록 ──
  const filteredItems = items.filter(item => {
    // 텍스트 검색
    const matchSearch = !searchText || (() => {
      const q = searchText.toLowerCase();
      return item.name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.origin.toLowerCase().includes(q);
    })();
    // 날짜 필터 (단가변동일 기준)
    let matchDate = true;
    if (filterMonth && filterDay) {
      matchDate = (item.priceDate || '').startsWith(`${filterMonth}-${filterDay}`);
    } else if (filterMonth) {
      matchDate = (item.priceDate || '').startsWith(filterMonth);
    }
    return matchSearch && matchDate;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">🌽 품목 관리</h2>
          <p className="text-gray-500 text-sm mt-1">총 {items.length}개의 품목</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => exportItems(items)}
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

      {/* ── 날짜 필터 (연별/월별/일별) ── */}
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => changeMonth(-1)}
          className="px-2 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">◀</button>
        <select value={filterMonth ? filterMonth.split('-')[0] : ''}
          onChange={e => {
            if (!e.target.value) { setFilterMonth(''); setFilterDay(''); return; }
            const m = filterMonth ? filterMonth.split('-')[1] : String(new Date().getMonth()+1).padStart(2,'0');
            setFilterMonth(`${e.target.value}-${m}`);
            setFilterDay('');
          }}
          className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm">
          <option value="">전체</option>
          {Array.from({length:5}, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
            <option key={y} value={y}>{y}년</option>
          ))}
        </select>
        {filterMonth && (
          <select value={filterMonth.split('-')[1]}
            onChange={e => {
              setFilterMonth(`${filterMonth.split('-')[0]}-${e.target.value}`);
              setFilterDay('');
            }}
            className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm">
            {Array.from({length:12}, (_, i) => String(i+1).padStart(2,'0')).map(m => (
              <option key={m} value={m}>{Number(m)}월</option>
            ))}
          </select>
        )}
        {filterMonth && (
          <select value={filterDay}
            onChange={e => setFilterDay(e.target.value)}
            className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm">
            <option value="">전체 일</option>
            {getDaysInMonth().map(d => (
              <option key={d} value={d}>{Number(d)}일</option>
            ))}
          </select>
        )}
        <button onClick={() => changeMonth(1)}
          className="px-2 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">▶</button>
        {filterMonth && (
          <button onClick={() => { setFilterMonth(''); setFilterDay(''); }}
            className="px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">
            전체 보기
          </button>
        )}
        {filterMonth && (
          <span className="text-xs text-gray-400 ml-1">
            단가변동일 기준 필터
          </span>
        )}
      </div>

      {/* ── 검색 ── */}
      <div className="flex gap-3 mb-4 items-center">
        <input
          type="text"
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          placeholder="🔍 화주, 품목명, 원산지 검색..."
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2
                     text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {(searchText || filterMonth) && (
          <span className="text-xs text-gray-500">
            검색결과: {filteredItems.length}건
          </span>
        )}
      </div>


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
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={TABLE_HEADERS.length}
                    className="text-center py-16 text-gray-400">
                  <div className="text-4xl mb-3">🌽</div>
                  <p className="text-sm">등록된 품목이 없어요</p>
                  <p className="text-xs mt-1">"품목 추가" 버튼을 눌러 추가해주세요</p>
                </td>
              </tr>
            ) : (
              filteredItems.map((item, index) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-500">{index + 1}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{item.name}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 rounded-full text-xs font-medium
                                     bg-green-100 text-green-700">
                      {item.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{item.unit}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">
                    ₩{item.price.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {item.priceDate || '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium
                      ${(item.deliveryType || '상차도') === '상차도'
                        ? 'bg-sky-100 text-sky-700'
                        : 'bg-violet-100 text-violet-700'}`}>
                      {item.deliveryType || '상차도'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium
                      ${(item.packType || '벌크') === '벌크'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-lime-100 text-lime-700'}`}>
                      {item.packType || '벌크'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{item.origin}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{item.memo}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
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

      {/* ── 품목 추가/수정 모달 ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center
                        justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-800 mb-5">
              {editingItem ? '✏️ 품목 수정' : '➕ 품목 추가'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  화주 <span className="text-red-500">*</span>
                </label>
                <input type="text" name="name"
                  value={formData.name} onChange={handleChange}
                  placeholder="예: 카길퓨리나, CJ제일제당"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2
                             text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    품목명
                  </label>
                  <input type="text" name="category"
                    value={formData.category} onChange={handleChange}
                    list="category-list"
                    placeholder="예: 옥수수, 대두박"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2
                               text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <datalist id="category-list">
                    {usedCategories.map(c => <option key={c} value={c} />)}
                  </datalist>
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
                    기준 단가 (원)
                  </label>
                  <input type="text" inputMode="numeric" name="price"
                    value={formData.price || ''}
                    onChange={handleChange}
                    placeholder="예: 150000"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2
                               text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    단가 변동일
                  </label>
                  <input type="date" name="priceDate"
                    value={formData.priceDate || ''}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2
                               text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    상차도 / 도착도
                  </label>
                  <select name="deliveryType" value={formData.deliveryType || '상차도'} onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2
                               text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {DELIVERY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    벌크 / 톤백
                  </label>
                  <select name="packType" value={formData.packType || '벌크'} onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2
                               text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {PACK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  원산지
                </label>
                <input type="text" name="origin"
                  value={formData.origin} onChange={handleChange}
                  placeholder="예: 미국, 브라질"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2
                             text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  메모
                </label>
                <textarea name="memo" value={formData.memo} onChange={handleChange}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2
                             text-sm focus:outline-none focus:ring-2
                             focus:ring-blue-500 resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600
                           border border-gray-300 rounded-lg hover:bg-gray-50">
                취소
              </button>
              <button onClick={handleSave}
                className="px-4 py-2 text-sm font-medium text-white
                           bg-blue-600 rounded-lg hover:bg-blue-700">
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
