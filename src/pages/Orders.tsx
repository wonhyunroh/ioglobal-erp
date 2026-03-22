// ──────────────────────────────────────────────
// 📁 파일명: Orders.tsx
// 📌 위치: src/pages/Orders.tsx
// ──────────────────────────────────────────────

import React, { useState, useEffect } from 'react';
import {
  Order, InventoryItem, Partner, Item,
  loadOrders, saveOrder, updateOrder, deleteOrder,
  loadInventory, saveInventory, saveInventoryItem,
  loadPartners, loadItems,
} from '../db';
import { exportOrders, exportDailyShipments } from '../excel';

const ORDER_STATUSES = [
  '견적', '계약', '입고', '입고완료', '출고', '출고완료', '정산완료'
];

const ORDER_TYPES = ['매입', '매출', '예상 매입', '예상 매출'];

const STATUS_COLORS: Record<string, string> = {
  '견적':    'bg-gray-100 text-gray-600',
  '계약':    'bg-blue-100 text-blue-700',
  '입고':    'bg-indigo-100 text-indigo-700',
  '입고완료': 'bg-cyan-100 text-cyan-700',
  '출고':    'bg-yellow-100 text-yellow-700',
  '출고완료': 'bg-orange-100 text-orange-700',
  '정산완료': 'bg-green-100 text-green-700',
};

const TYPE_COLORS: Record<string, string> = {
  '매입':    'bg-blue-100 text-blue-700',
  '매출':    'bg-green-100 text-green-700',
  '예상 매입': 'bg-purple-100 text-purple-700',
  '예상 매출': 'bg-orange-100 text-orange-700',
};

const TABLE_HEADERS = [
  'No', '주문번호', '계약번호', 'B/L번호', '거래처', '품목',
  '수량', '단가', '총액', '주문일', '납기일', '유형', '상태', '관리'
];

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

const generateOrderNo = (count: number) => {
  const year = new Date().getFullYear();
  const seq = String(count + 1).padStart(3, '0');
  return `IO-${year}-${seq}`;
};

const EMPTY_ORDER: Omit<Order, 'id' | 'total'> = {
  orderNo: '', contractNo: '', blNo: '',
  partner: '', item: '',
  quantity: 0, price: 0,
  orderDate: today(), dueDate: '',
  type: '매입', status: '견적', memo: '',
};

export default function Orders() {

  const [orders, setOrders]       = useState<Order[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [partners, setPartners]   = useState<Partner[]>([]);
  const [items, setItems]         = useState<Item[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [formData, setFormData]   = useState<Omit<Order, 'id' | 'total'>>(EMPTY_ORDER);
  const [filterStatus, setFilterStatus] = useState('전체');
  const [filterType, setFilterType]     = useState('전체');
  const [searchText, setSearchText]     = useState('');
  const [filterMonth, setFilterMonth]   = useState('');
  const [filterDay, setFilterDay]       = useState('');

  useEffect(() => {
    const load = async () => {
      const [o, i, p, it] = await Promise.all([
        loadOrders(), loadInventory(), loadPartners(), loadItems()
      ]);
      setOrders(o);
      setInventory(i);
      setPartners(p);
      setItems(it);
    };
    load();
  }, []);

  // 거래처 자동완성 목록 (기존 입력값 + 거래처 관리 데이터)
  const usedPartners = [...new Set([
    ...orders.map(o => o.partner).filter(Boolean),
    ...partners.map(p => p.company),
  ])].sort();

  // 품목 자동완성 목록 (Items.category = 실제 품목명: 옥수수, 대두박 등)
  const usedItems = [...new Set([
    ...items.map(i => i.category).filter(Boolean),
    ...orders.map(o => o.item).filter(Boolean),
  ])].sort();

  const syncInventory = async (
    itemName: string,
    quantity: number,
    type: '매입' | '매출'
  ): Promise<boolean> => {
    const targetIndex = inventory.findIndex(i => i.item === itemName);

    if (type === '매입') {
      if (targetIndex === -1) {
        const confirmed = window.confirm(
          `📦 재고 자동 등록\n\n` +
          `재고 목록에 "${itemName}" 품목이 없어요.\n` +
          `입고 수량 ${quantity.toLocaleString()}으로 재고를 새로 등록할까요?`
        );
        if (!confirmed) return false;
        const newItem = await saveInventoryItem({
          item: itemName, category: '', unit: 't',
          current: quantity, minStock: 0,
          lastUpdated: today(), memo: '주문 입고완료로 자동 등록',
        });
        setInventory(prev => [...prev, newItem]);
        return true;
      }
      const target = inventory[targetIndex];
      const confirmed = window.confirm(
        `📥 재고 증가 확인\n\n품목: ${itemName}\n` +
        `현재 재고: ${target.current.toLocaleString()} ${target.unit}\n` +
        `입고 수량: ${quantity.toLocaleString()} ${target.unit}\n` +
        `입고 후 재고: ${(target.current + quantity).toLocaleString()} ${target.unit}\n\n재고를 증가할까요?`
      );
      if (!confirmed) return false;
      const updated = [...inventory];
      updated[targetIndex] = { ...target, current: target.current + quantity, lastUpdated: today() };
      setInventory(updated);
      await saveInventory(updated);
    } else {
      if (targetIndex === -1) {
        alert(`⚠️ 재고 연동 실패!\n재고 목록에 "${itemName}" 품목이 없어요.`);
        return false;
      }
      const target = inventory[targetIndex];
      if (target.current < quantity) {
        alert(
          `⚠️ 재고 부족!\n품목: ${itemName}\n` +
          `현재 재고: ${target.current.toLocaleString()} ${target.unit}\n` +
          `출고 수량: ${quantity.toLocaleString()} ${target.unit}`
        );
        return false;
      }
      const confirmed = window.confirm(
        `📤 재고 차감 확인\n\n품목: ${itemName}\n` +
        `현재 재고: ${target.current.toLocaleString()} ${target.unit}\n` +
        `차감 수량: ${quantity.toLocaleString()} ${target.unit}\n` +
        `차감 후 재고: ${(target.current - quantity).toLocaleString()} ${target.unit}\n\n재고를 차감할까요?`
      );
      if (!confirmed) return false;
      const updated = [...inventory];
      updated[targetIndex] = { ...target, current: target.current - quantity, lastUpdated: today() };
      setInventory(updated);
      await saveInventory(updated);
    }
    return true;
  };

  const handleAdd = () => {
    setEditingOrder(null);
    setFormData({ ...EMPTY_ORDER, orderNo: generateOrderNo(orders.length) });
    setShowModal(true);
  };

  const handleEdit = (order: Order) => {
    setEditingOrder(order);
    setFormData({
      orderNo: order.orderNo,
      contractNo: order.contractNo || '',
      blNo: order.blNo || '',
      partner: order.partner,
      item: order.item,
      quantity: order.quantity,
      price: order.price,
      orderDate: order.orderDate,
      dueDate: order.dueDate,
      type: order.type,
      status: order.status,
      memo: order.memo,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('정말 삭제하시겠어요?')) return;
    try {
      await deleteOrder(id);
      setOrders(prev => prev.filter(o => o.id !== id));
    } catch {
      alert('서버가 실행 중인지 확인해주세요');
    }
  };

  const handleSave = async () => {
    if (!formData.partner.trim()) { alert('거래처를 입력해주세요!'); return; }
    if (!formData.item.trim())    { alert('품목을 입력해주세요!'); return; }
    if (formData.quantity <= 0)   { alert('수량은 0보다 커야 해요!'); return; }

    // 예상 매입/매출은 재고 연동 안 함
    const isActualType = formData.type === '매입' || formData.type === '매출';

    const isBuyingComplete = isActualType &&
      formData.type === '매입' &&
      editingOrder?.status !== '입고완료' &&
      formData.status === '입고완료';

    const isSellingComplete = isActualType &&
      formData.type === '매출' &&
      editingOrder?.status !== '출고완료' &&
      formData.status === '출고완료';

    if (isBuyingComplete || isSellingComplete) {
      const success = await syncInventory(
        formData.item, formData.quantity,
        isBuyingComplete ? '매입' : '매출',
      );
      if (!success) return;
    }

    const total = formData.quantity * formData.price;
    try {
      if (editingOrder) {
        const updated = await updateOrder(editingOrder.id, { ...formData, total });
        setOrders(prev => prev.map(o => o.id === editingOrder.id ? updated : o));
      } else {
        const created = await saveOrder({ ...formData, total });
        setOrders(prev => [...prev, created]);
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
    if (name === 'item') {
      // Items.category = 품목명(옥수수 등), Items.name = 화주명
      const selectedItem = items.find(i => i.category === value);
      setFormData(prev => ({
        ...prev,
        item: value,
        ...(selectedItem && !editingOrder ? { price: selectedItem.price } : {}),
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: (name === 'quantity' || name === 'price') ? (parseFloat(value) || 0) : value,
      }));
    }
  };

  // 날짜 필터 적용된 주문 목록
  const dateFilterPrefix = filterDay && filterMonth
    ? `${filterMonth}-${filterDay}`
    : filterMonth || '';
  const monthOrders = dateFilterPrefix
    ? orders.filter(o => o.orderDate.startsWith(dateFilterPrefix))
    : orders;

  // 4가지 유형별 합계 (월/일 필터 적용)
  const totalByType = (type: string) =>
    monthOrders.filter(o => o.type === type).reduce((sum, o) => sum + o.total, 0);

  const expectedSales    = totalByType('예상 매출');
  const actualSales      = totalByType('매출');
  const expectedPurchase = totalByType('예상 매입');
  const actualPurchase   = totalByType('매입');

  const filteredOrders = monthOrders.filter(o => {
    const matchStatus = filterStatus === '전체' || o.status === filterStatus;
    const matchType   = filterType === '전체' || o.type === filterType;
    const matchSearch = !searchText ||
      o.partner.toLowerCase().includes(searchText.toLowerCase()) ||
      o.item.toLowerCase().includes(searchText.toLowerCase()) ||
      o.orderNo.toLowerCase().includes(searchText.toLowerCase()) ||
      (o.contractNo || '').toLowerCase().includes(searchText.toLowerCase()) ||
      (o.blNo || '').toLowerCase().includes(searchText.toLowerCase());
    return matchStatus && matchType && matchSearch;
  });

  // 상태 필터 선택 시 하위 요약 계산
  const statusSummary = filterStatus !== '전체' ? {
    expectedSales:    filteredOrders.filter(o => o.type === '예상 매출').reduce((s, o) => s + o.total, 0),
    actualSales:      filteredOrders.filter(o => o.type === '매출').reduce((s, o) => s + o.total, 0),
    expectedPurchase: filteredOrders.filter(o => o.type === '예상 매입').reduce((s, o) => s + o.total, 0),
    actualPurchase:   filteredOrders.filter(o => o.type === '매입').reduce((s, o) => s + o.total, 0),
  } : null;

  // 월 이동 헬퍼
  const changeMonth = (dir: number) => {
    setFilterDay('');
    if (!filterMonth) {
      const d = new Date();
      setFilterMonth(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);
      return;
    }
    const [y, m] = filterMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + dir, 1);
    setFilterMonth(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);
  };

  // 선택된 월의 일수 계산
  const daysInMonth = filterMonth
    ? new Date(
        Number(filterMonth.split('-')[0]),
        Number(filterMonth.split('-')[1]),
        0
      ).getDate()
    : 31;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">📋 주문 관리</h2>
          <p className="text-gray-500 text-sm mt-1">총 {orders.length}건의 주문</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => exportDailyShipments(orders, today())}
            className="bg-yellow-500 text-white px-4 py-2 rounded-lg
                       hover:bg-yellow-600 transition-colors font-medium text-sm">
            📥 일출고 저장
          </button>
          <button onClick={() => exportOrders(orders)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg
                       hover:bg-green-700 transition-colors font-medium text-sm">
            📥 엑셀 저장
          </button>
          <button onClick={handleAdd}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg
                       hover:bg-blue-700 transition-colors font-medium text-sm">
            + 주문 추가
          </button>
        </div>
      </div>

      {/* ── 날짜 선택 (연/월/일) ── */}
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
            onChange={e => { setFilterMonth(`${filterMonth.split('-')[0]}-${e.target.value}`); setFilterDay(''); }}
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
            {Array.from({length: daysInMonth}, (_, i) => String(i+1).padStart(2,'0')).map(d => (
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
      </div>

      {/* ── 매출/매입 요약 (4가지 유형) ── */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-3">
          <p className="text-xs text-orange-600 font-medium mb-1">예상 매출</p>
          <p className="text-base font-bold text-orange-800">
            ₩{expectedSales.toLocaleString()}
          </p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3">
          <p className="text-xs text-green-600 font-medium mb-1">출고(출고 + 작업비)</p>
          <p className="text-base font-bold text-green-800">
            ₩{actualSales.toLocaleString()}
          </p>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg px-4 py-3">
          <p className="text-xs text-purple-600 font-medium mb-1">예상 매입</p>
          <p className="text-base font-bold text-purple-800">
            ₩{expectedPurchase.toLocaleString()}
          </p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
          <p className="text-xs text-blue-600 font-medium mb-1">매입 합계</p>
          <p className="text-base font-bold text-blue-800">
            ₩{actualPurchase.toLocaleString()}
          </p>
        </div>
      </div>

      {/* ── 검색 ── */}
      <div className="mb-3">
        <input
          type="text"
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          placeholder="🔍 거래처, 품목, 주문번호, 계약번호, B/L번호 검색..."
          className="w-full border border-gray-300 rounded-lg px-4 py-2
                     text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* ── 필터 영역 ── */}
      <div className="flex gap-3 mb-4 flex-wrap items-center">
        {/* 유형 필터 */}
        <div className="flex gap-2">
          {['전체', ...ORDER_TYPES].map(type => (
            <button key={type} onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                ${filterType === type
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}>
              {type}
            </button>
          ))}
        </div>
        <div className="w-px bg-gray-200 h-6" />
        {/* 상태 필터 */}
        <div className="flex gap-2 flex-wrap">
          {['전체', ...ORDER_STATUSES].map(status => (
            <button key={status} onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                ${filterStatus === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}>
              {status}
            </button>
          ))}
        </div>
        {(searchText || filterType !== '전체' || filterStatus !== '전체') && (
          <span className="text-xs text-gray-500">
            검색결과: {filteredOrders.length}건
          </span>
        )}
      </div>

      {/* ── 상태 필터 선택 시 하위 요약 ── */}
      {statusSummary && (
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
            <p className="text-xs text-orange-600 font-medium">예상 매출</p>
            <p className="text-sm font-bold text-orange-800">₩{statusSummary.expectedSales.toLocaleString()}</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            <p className="text-xs text-green-600 font-medium">출고(출고+작업비)</p>
            <p className="text-sm font-bold text-green-800">₩{statusSummary.actualSales.toLocaleString()}</p>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg px-3 py-2">
            <p className="text-xs text-purple-600 font-medium">예상 매입</p>
            <p className="text-sm font-bold text-purple-800">₩{statusSummary.expectedPurchase.toLocaleString()}</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
            <p className="text-xs text-blue-600 font-medium">매입 합계</p>
            <p className="text-sm font-bold text-blue-800">₩{statusSummary.actualPurchase.toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* ── 주문 목록 테이블 ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {TABLE_HEADERS.map(h => (
                <th key={h} className="px-3 py-2 text-left text-xs font-semibold
                                       text-gray-600 uppercase tracking-wider whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={TABLE_HEADERS.length}
                    className="text-center py-16 text-gray-400">
                  <div className="text-4xl mb-3">📭</div>
                  <p className="text-sm">주문이 없어요</p>
                  <p className="text-xs mt-1">"주문 추가" 버튼을 눌러 추가해주세요</p>
                </td>
              </tr>
            ) : (
              filteredOrders.map((order, index) => (
                <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-3 py-2 text-gray-500">{index + 1}</td>
                  <td className="px-3 py-2 font-mono text-gray-700">{order.orderNo}</td>
                  <td className="px-3 py-2 text-gray-600">{order.contractNo || '-'}</td>
                  <td className="px-3 py-2 text-gray-600">{order.blNo || '-'}</td>
                  <td className="px-3 py-2 font-medium text-gray-800">{order.partner}</td>
                  <td className="px-3 py-2 text-gray-600">{order.item}</td>
                  <td className="px-3 py-2 text-gray-600">{order.quantity.toLocaleString()} kg</td>
                  <td className="px-3 py-2 text-gray-600">₩{order.price.toLocaleString()}</td>
                  <td className="px-3 py-2 font-medium text-gray-800">
                    ₩{order.total.toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-gray-500">{order.orderDate}</td>
                  <td className="px-3 py-2 text-gray-500">{order.dueDate}</td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium
                      ${TYPE_COLORS[order.type] || 'bg-gray-100 text-gray-600'}`}>
                      {order.type}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium
                      ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-600'}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <button onClick={() => handleEdit(order)}
                        className="text-blue-600 hover:text-blue-800 text-xs
                                   font-medium transition-colors">수정</button>
                      <button onClick={() => handleDelete(order.id)}
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

      {/* ── 주문 추가/수정 모달 ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center
                        justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6
                          max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-800 mb-5">
              {editingOrder ? '✏️ 주문 수정' : '➕ 주문 추가'}
            </h3>
            <div className="space-y-4">

              {/* 주문번호 + 유형 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">주문번호</label>
                  <input type="text" name="orderNo"
                    value={formData.orderNo} onChange={handleChange}
                    placeholder="IO-2026-001"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2
                               text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">주문 유형</label>
                  <select name="type" value={formData.type} onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2
                               text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {ORDER_TYPES.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 계약번호 + B/L 번호 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">계약번호</label>
                  <input type="text" name="contractNo"
                    value={formData.contractNo} onChange={handleChange}
                    placeholder="예: CT-2026-001"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2
                               text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">B/L 번호</label>
                  <input type="text" name="blNo"
                    value={formData.blNo} onChange={handleChange}
                    placeholder="예: BL-2026-001"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2
                               text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* 거래처 (타이핑 + 자동완성) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  거래처 <span className="text-red-500">*</span>
                </label>
                <input type="text" name="partner" list="partner-list"
                  value={formData.partner} onChange={handleChange}
                  placeholder="거래처명 입력 (자동완성)"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2
                             text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <datalist id="partner-list">
                  {usedPartners.map(p => (
                    <option key={p} value={p} />
                  ))}
                </datalist>
              </div>

              {/* 품목 (타이핑 + 자동완성) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  품목 <span className="text-red-500">*</span>
                  <span className="text-xs text-blue-500 ml-2">
                    (품목 관리에 등록된 품목 선택 시 기준단가 자동입력)
                  </span>
                </label>
                <input type="text" name="item" list="item-list"
                  value={formData.item} onChange={handleChange}
                  placeholder="예: 옥수수, 대두박"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2
                             text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <datalist id="item-list">
                  {usedItems.map(i => (
                    <option key={i} value={i} />
                  ))}
                </datalist>
              </div>

              {/* 수량 + 단가 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">수량 (kg)</label>
                  <input type="number" name="quantity"
                    value={formData.quantity || ''} onChange={handleChange}
                    min="0" step="any"
                    placeholder="예: 30000"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2
                               text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    단가 (원)
                    <span className="text-xs text-gray-400 ml-1">변동 가능</span>
                  </label>
                  <input type="number" name="price"
                    value={formData.price || ''} onChange={handleChange}
                    min="0" step="any"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2
                               text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* 총액 자동 계산 */}
              <div className="bg-blue-50 rounded-lg px-4 py-3">
                <span className="text-sm text-blue-700 font-medium">총액 (자동계산):</span>
                <span className="text-lg font-bold text-blue-800 ml-2">
                  ₩{(formData.quantity * formData.price).toLocaleString()}
                </span>
              </div>

              {/* 재고 현황 */}
              {formData.item && (() => {
                const stock = inventory.find(i => i.item === formData.item);
                if (!stock) return null;
                const isLow = stock.minStock > 0 && stock.current <= stock.minStock;
                return (
                  <div className={`rounded-lg px-4 py-3 text-sm
                    ${isLow ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
                    <span className={isLow ? 'text-red-700' : 'text-green-700'}>
                      {isLow ? '⚠️' : '📦'} 현재 재고:
                      <span className="font-bold ml-1">
                        {stock.current.toLocaleString()} {stock.unit}
                      </span>
                      {isLow && ' (재고 부족!)'}
                    </span>
                  </div>
                );
              })()}

              {/* 주문일 + 납기일 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">주문일</label>
                  <input type="date" name="orderDate"
                    value={formData.orderDate} onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2
                               text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">납기일</label>
                  <input type="date" name="dueDate"
                    value={formData.dueDate} onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2
                               text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* 주문 상태 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">주문 상태</label>
                <select name="status" value={formData.status} onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2
                             text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* 메모 */}
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
