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
  Partner,
  loadPartners,
  savePartner,
  updatePartner,
  deletePartner,
} from '../db';
import { exportPartners, parseExcelFile } from '../excel';

// ──────────────────────────────────────────────
// 테이블 헤더 목록
// ──────────────────────────────────────────────
const TABLE_HEADERS = [
  'No', '회사명', '담당자', '연락처', '국가', '거래유형', '주요품목', '메모', '관리'
];

// ──────────────────────────────────────────────
// 빈 거래처 객체 (새 거래처 추가 시 초기값)
// ──────────────────────────────────────────────
const EMPTY_PARTNER: Omit<Partner, 'id'> = {
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
  const [formData, setFormData] = useState<Omit<Partner, 'id'>>(EMPTY_PARTNER);

  // ── 앱 시작 시 저장된 거래처 불러오기 ──
  useEffect(() => {
    const load = async () => {
      const data = await loadPartners();
      setPartners(data);
    };
    load();
  }, []);


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

  // ── 엑셀 파일에서 거래처 일괄 불러오기 ──
  // 엑셀 컬럼: 회사명, 담당자, 연락처, 국가, 거래유형, 주요품목, 메모
  const handleImportExcel = () => {
    const input    = document.createElement('input');
    input.type     = 'file';
    input.accept   = '.xlsx,.xls';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const rows = await parseExcelFile(file);
        let count = 0;
        for (const row of rows) {
          const company = String(row['회사명'] || row['company'] || '').trim();
          if (!company) continue;
          const partner: Omit<Partner, 'id'> = {
            company,
            contact:  String(row['담당자'] || row['contact'] || ''),
            phone:    String(row['연락처'] || row['phone'] || ''),
            country:  String(row['국가'] || row['country'] || ''),
            type:     row['거래유형'] === '매출처' ? '매출처' : '매입처',
            mainItem: String(row['주요품목'] || row['mainItem'] || ''),
            memo:     String(row['메모'] || row['memo'] || ''),
          };
          const created = await savePartner(partner);
          setPartners(prev => [...prev, created]);
          count++;
        }
        alert(`✅ ${count}개 거래처를 불러왔어요!`);
      } catch {
        alert('파일 읽기에 실패했어요. 올바른 엑셀 파일인지 확인해주세요.');
      }
    };
    input.click();
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
          <button
            onClick={() => exportPartners(partners)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg
                       hover:bg-green-700 transition-colors font-medium text-sm"
          >
            📥 엑셀 저장
          </button>
          <button
            onClick={handleImportExcel}
            className="bg-orange-500 text-white px-4 py-2 rounded-lg
                       hover:bg-orange-600 transition-colors font-medium text-sm"
          >
            📂 엑셀 불러오기
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
            {partners.length === 0 ? (
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
              partners.map((partner, index) => (
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
    </div>
  );
}