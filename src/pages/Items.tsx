// ──────────────────────────────────────────────
// 📁 파일명: Items.tsx
// 📌 위치: src/pages/Items.tsx
//
// 🎯 이 파일의 역할:
//   - 품목 관리 화면이에요
//   - 품목 목록을 표로 보여줘요
//   - 품목 추가/수정/삭제 기능을 제공해요
//   - 데이터는 electron-store에 저장돼서 앱 껐다 켜도 유지돼요
//
// 🔗 연결된 파일들:
//   - db.ts: loadItems, saveItems, generateId
// ──────────────────────────────────────────────

import React, { useState, useEffect } from 'react';
import { Item, loadItems, saveItems, generateId } from '../db';

const CATEGORIES = [
  '옥수수', '대두박', '소맥피', '면실박', '채종박', '주정박', '당밀', '기타'
];
const UNITS = ['톤', 'kg', 'MT'];
const TABLE_HEADERS = [
  'No', '품목명', '카테고리', '단위', '기준단가', '원산지', '메모', '관리'
];
const EMPTY_ITEM: Omit<Item, 'id'> = {
  name: '', category: '옥수수', unit: '톤',
  price: 0, origin: '', memo: '',
};

export default function Items() {

  const [items, setItems] = useState<Item[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [formData, setFormData] = useState<Omit<Item, 'id'>>(EMPTY_ITEM);
  const [loaded, setLoaded] = useState(false);

  // ── 앱 시작 시 저장된 품목 불러오기 ──
  useEffect(() => {
    const load = async () => {
      const data = await loadItems();
      setItems(data);
    };
    load();
  }, []);

  // ── 품목 목록이 바뀔 때마다 자동 저장 ──
  useEffect(() => {
    if (!loaded) { setLoaded(true); return; }
    saveItems(items);
  }, [items]);

  const handleAdd = () => {
    setEditingItem(null);
    setFormData(EMPTY_ITEM);
    setShowModal(true);
  };

  const handleEdit = (item: Item) => {
    setEditingItem(item);
    setFormData({
      name: item.name, category: item.category,
      unit: item.unit, price: item.price,
      origin: item.origin, memo: item.memo,
    });
    setShowModal(true);
  };

  const handleDelete = (id: number) => {
    if (!window.confirm('정말 삭제하시겠어요?')) return;
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const handleSave = () => {
    if (!formData.name.trim()) { alert('품목명을 입력해주세요!'); return; }
    if (editingItem) {
      setItems(prev =>
        prev.map(i => i.id === editingItem.id ? { ...i, ...formData } : i)
      );
    } else {
      setItems(prev => [...prev, { id: generateId(prev), ...formData }]);
    }
    setShowModal(false);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'price' ? Number(value) : value,
    }));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">🌽 품목 관리</h2>
          <p className="text-gray-500 text-sm mt-1">총 {items.length}개의 품목</p>
        </div>
        <button onClick={handleAdd}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg
                     hover:bg-blue-700 transition-colors font-medium text-sm">
          + 품목 추가
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {TABLE_HEADERS.map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold
                                       text-gray-600 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.length === 0 ? (
              <tr>
                <td colSpan={TABLE_HEADERS.length}
                    className="text-center py-16 text-gray-400">
                  <div className="text-4xl mb-3">🌽</div>
                  <p className="text-sm">등록된 품목이 없어요</p>
                  <p className="text-xs mt-1">"품목 추가" 버튼을 눌러 추가해주세요</p>
                </td>
              </tr>
            ) : (
              items.map((item, index) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-500">{index + 1}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{item.name}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 rounded-full text-xs font-medium
                                     bg-yellow-100 text-yellow-700">
                      {item.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{item.unit}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">
                    ₩{item.price.toLocaleString()}
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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-5">
              {editingItem ? '✏️ 품목 수정' : '➕ 품목 추가'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  품목명 <span className="text-red-500">*</span>
                </label>
                <input type="text" name="name"
                  value={formData.name} onChange={handleChange}
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
                    기준 단가 (원)
                  </label>
                  <input type="number" name="price"
                    value={formData.price || ''} onChange={handleChange} min="0"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2
                               text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
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