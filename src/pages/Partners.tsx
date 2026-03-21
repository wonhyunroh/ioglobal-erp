// ──────────────────────────────────────────────
// 📁 파일명: Partners.tsx
// 📌 위치: src/pages/Partners.tsx
//
// 🎯 이 파일의 역할:
//   - 거래처 관리 화면이에요
//   - 거래처 목록을 표로 보여줘요
//   - 거래처 추가/수정/삭제 기능을 제공해요
//   - 데이터는 electron-store에 저장돼서 앱 껐다 켜도 유지돼요
//
// 📦 사용하는 것들:
//   - React: 화면을 만드는 라이브러리
//   - useState: 화면 상태를 기억하는 기능
//   - useEffect: 앱 시작 시 저장된 데이터를 불러오는 기능
//   - db.ts: 데이터 저장/불러오기 함수
//
// 🔗 연결된 파일들:
//   - db.ts: loadPartners, savePartners, generateId
//   - App.tsx: 여기서 Partners를 불러와서 화면에 표시해요
// ──────────────────────────────────────────────

import React, { useState, useEffect } from 'react';
import {
  Partner, Item,
  loadPartners, loadItems,
  savePartner,
  updatePartner,
  deletePartner,
} from '../db';
import { exportPartners } from '../excel';

// ──────────────────────────────────────────────
// 테이블 헤더 목록
// ──────────────────────────────────────────────
const TABLE_HEADERS = [
  'No', '회사명', '담당자', '연락처', '국가', '거래유형', '주요품목', '메모', '관리'
];

// ──────────────────────────────────────────────
// 빈 거래처 객체 (새 거래처 추가 시 초기값)
// ──────────────────────────────────────────────
const EMPTY_PARTNER: Omit<Partner, 'id' | 'createdAt'> = {
  company: '',
  contact: '',
  phone: '',
  country: '',
  type: '매입처',
  mainItem: '',
  memo: '',
};

export default function Partners() {

  const [partners, setPartners] = useState<Partner[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [formData, setFormData] = useState<Omit<Partner, 'id' | 'createdAt'>>(EMPTY_PARTNER);
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState('전체');
  const [filterMonth, setFilterMonth] = useState('');
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [masterItems, setMasterItems] = useState<Item[]>([]);

  // ── 앱 시작 시 저장된 거래처 불러오기 ──
  useEffect(() => {
    const load = async () => {
      const data = await loadPartners();
      setPartners(data);
    };
    load();
  }, []);


  // ── 품목에서 불러오기: 품목 선택 → 거래처 추가 폼에 주요품목 자동 입력 ──
  const handleOpenLoad = async () => {
    const items = await loadItems();
    setMasterItems(items);
    setShowLoadModal(true);
  };

  const handleLoadFromItem = (item: Item) => {
    setEditingPartner(null);
    setFormData({ ...EMPTY_PARTNER, mainItem: item.category });
    setShowLoadModal(false);
    setShowModal(true);
  };

  const handleAdd = () => {
    setEditingPartner(null);
    setFormData(EMPTY_PARTNER);
    setShowModal(true);
  };

  const handleEdit = (partner: Partner) => {
    setEditingPartner(partner);
    setFormData({
      company: partner.company,
      contact: partner.contact,
      phone: partner.phone,
      country: partner.country,
      type: partner.type,
      mainItem: partner.mainItem,
      memo: partner.memo,
    });
    setShowModal(true);
  };

  // ── 거래처 삭제: 서버에 DELETE 요청 후 목록에서 제거 ──
  const handleDelete = async (id: number) => {
    if (!window.confirm('정말 삭제하시겠어요?')) return;
    try {
      await deletePartner(id);
      setPartners(prev => prev.filter(p => p.id !== id));
    } catch {
      alert('서버가 실행 중인지 확인해주세요');
    }
  };

  // ── 거래처 저장 (추가/수정): 서버에 POST/PUT 요청 ──
  const handleSave = async () => {
    if (!formData.company.trim()) {
      alert('회사명을 입력해주세요!');
      return;
    }
    try {
      if (editingPartner) {
        // 수정: PUT 요청 후 목록 업데이트
        const updated = await updatePartner(editingPartner.id, formData);
        setPartners(prev => prev.map(p => p.id === editingPartner.id ? updated : p));
      } else {
        // 추가: POST 요청 후 목록에 추가
        const created = await savePartner(formData);
        setPartners(prev => [...prev, created]);
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
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // ── 필터링된 거래처 목록 ──
  const filteredPartners = partners.filter(p => {
    const matchType = filterType === '전체' || p.type === filterType;
    const matchSearch = !searchText ||
      p.company.toLowerCase().includes(searchText.toLowerCase()) ||
      p.contact.toLowerCase().includes(searchText.toLowerCase()) ||
      p.mainItem.toLowerCase().includes(searchText.toLowerCase()) ||
      p.country.toLowerCase().includes(searchText.toLowerCase());
    const matchMonth = !filterMonth || (p.createdAt || '').startsWith(filterMonth);
    return matchType && matchSearch && matchMonth;
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
      {/* ── 페이지 제목 + 추가 버튼 ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">🏢 거래처 관리</h2>
          <p className="text-gray-500 text-sm mt-1">
            총 {partners.length}개의 거래처
          </p>
        </div>
        
        <div className="flex gap-2">
          <button onClick={handleOpenLoad}
            className="bg-orange-500 text-white px-4 py-2 rounded-lg
                       hover:bg-orange-600 transition-colors font-medium text-sm">
            📂 불러오기
          </button>
          <button
            onClick={() => exportPartners(partners)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg
                       hover:bg-green-700 transition-colors font-medium text-sm"
          >
            📥 엑셀 저장
          </button>
          <button
            onClick={handleAdd}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg
                       hover:bg-blue-700 transition-colors font-medium text-sm"
          >
            + 거래처 추가
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
          placeholder="🔍 회사명, 담당자, 품목, 국가 검색..."
          className="flex-1 min-w-[200px] border border-gray-300 rounded-lg px-4 py-2
                     text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex gap-2">
          {['전체', '매입처', '매출처'].map(type => (
            <button key={type} onClick={() => setFilterType(type)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors
                ${filterType === type
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}>
              {type}
            </button>
          ))}
        </div>
        {(searchText || filterType !== '전체') && (
          <span className="text-xs text-gray-500">
            검색결과: {filteredPartners.length}건
          </span>
        )}
      </div>

      {/* ── 거래처 목록 테이블 ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {TABLE_HEADERS.map(header => (
                <th key={header}
                    className="px-4 py-3 text-left text-xs font-semibold
                               text-gray-600 uppercase tracking-wider">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredPartners.length === 0 ? (
              <tr>
                <td colSpan={TABLE_HEADERS.length}
                    className="text-center py-16 text-gray-400">
                  <div className="text-4xl mb-3">🏢</div>
                  <p className="text-sm">등록된 거래처가 없어요</p>
                  <p className="text-xs mt-1">
                    위의 "거래처 추가" 버튼을 눌러 추가해주세요
                  </p>
                </td>
              </tr>
            ) : (
              filteredPartners.map((partner, index) => (
                <tr key={partner.id}
                    className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-500">{index + 1}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">
                    {partner.company}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{partner.contact}</td>
                  <td className="px-4 py-3 text-gray-600">{partner.phone}</td>
                  <td className="px-4 py-3 text-gray-600">{partner.country}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium
                      ${partner.type === '매입처'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-green-100 text-green-700'
                      }`}>
                      {partner.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{partner.mainItem}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{partner.memo}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(partner)}
                        className="text-blue-600 hover:text-blue-800 text-xs
                                   font-medium transition-colors">
                        수정
                      </button>
                      <button
                        onClick={() => handleDelete(partner.id)}
                        className="text-red-500 hover:text-red-700 text-xs
                                   font-medium transition-colors">
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── 거래처 추가/수정 모달 ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center
                        justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-5">
              {editingPartner ? '✏️ 거래처 수정' : '➕ 거래처 추가'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  회사명 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text" name="company"
                  value={formData.company} onChange={handleChange}
                  placeholder="예: 카길코리아"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2
                             text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    담당자명
                  </label>
                  <input
                    type="text" name="contact"
                    value={formData.contact} onChange={handleChange}
                    placeholder="예: 홍길동"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2
                               text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    연락처
                  </label>
                  <input
                    type="text" name="phone"
                    value={formData.phone} onChange={handleChange}
                    placeholder="예: 010-1234-5678"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2
                               text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    국가
                  </label>
                  <input
                    type="text" name="country"
                    value={formData.country} onChange={handleChange}
                    placeholder="예: 미국, 한국"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2
                               text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    거래 유형
                  </label>
                  <select
                    name="type" value={formData.type} onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2
                               text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="매입처">매입처</option>
                    <option value="매출처">매출처</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  주요 품목
                </label>
                <input
                  type="text" name="mainItem"
                  value={formData.mainItem} onChange={handleChange}
                  placeholder="예: 옥수수, 대두박"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2
                             text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  메모
                </label>
                <textarea
                  name="memo" value={formData.memo} onChange={handleChange}
                  placeholder="특이사항이나 참고 내용을 입력해주세요"
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2
                             text-sm focus:outline-none focus:ring-2
                             focus:ring-blue-500 resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600
                           border border-gray-300 rounded-lg hover:bg-gray-50">
                취소
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 text-sm font-medium text-white
                           bg-blue-600 rounded-lg hover:bg-blue-700">
                저장
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
              품목을 선택하면 주요품목이 자동으로 채워진 거래처 추가 화면이 열려요
            </p>
            <div className="flex-1 overflow-y-auto border border-gray-200 rounded-lg">
              {masterItems.length === 0 ? (
                <p className="text-center text-gray-400 py-8 text-sm">등록된 품목이 없어요</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">화주</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">품목명</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">단가</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">원산지</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">선택</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {masterItems.map(item => (
                      <tr key={item.id} className="hover:bg-blue-50">
                        <td className="px-3 py-2 font-medium text-gray-800">{item.name}</td>
                        <td className="px-3 py-2">
                          <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">{item.category}</span>
                        </td>
                        <td className="px-3 py-2 text-gray-600">₩{item.price.toLocaleString()}</td>
                        <td className="px-3 py-2 text-gray-500">{item.origin}</td>
                        <td className="px-3 py-2">
                          <button onClick={() => handleLoadFromItem(item)}
                            className="text-xs px-3 py-1 rounded bg-orange-100 text-orange-700 hover:bg-orange-200">
                            선택
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="flex justify-end mt-4">
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