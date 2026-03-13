// ──────────────────────────────────────────────
// 📁 파일명: Orders.tsx
// 📌 위치: src/pages/Orders.tsx
//
// 🎯 이 파일의 역할:
//   - 주문 관리 화면이에요
//   - 매입/매출 주문을 등록하고 상태를 관리해요
//   - 주문 상태 변경 시 재고와 자동 연동돼요:
//     * 매입 주문 → 입고완료 시 재고 자동 증가
//     * 매출 주문 → 출고완료 시 재고 자동 차감
//     * 재고 부족 시 매출 주문 등록 차단
//   - 데이터는 electron-store에 저장돼서 앱 껐다 켜도 유지돼요
//
// 🔗 연결된 파일들:
//   - db.ts: loadOrders, saveOrders, loadInventory,
//            saveInventory, generateId
//   - excel.ts: exportOrders, exportDailyShipments
// ──────────────────────────────────────────────

import React, { useState, useEffect } from 'react';
import {
  Order, InventoryItem,
  loadOrders, saveOrders,
  loadInventory, saveInventory,
  generateId,
} from '../db';
import { exportOrders, exportDailyShipments } from '../excel';

const ORDER_STATUSES = ['견적', '계약', '출고준비', '출고완료', '정산완료'];

const STATUS_COLORS: Record<string, string> = {
  '견적':    'bg-gray-100 text-gray-600',
  '계약':    'bg-blue-100 text-blue-700',
  '출고준비': 'bg-yellow-100 text-yellow-700',
  '출고완료': 'bg-orange-100 text-orange-700',
  '정산완료': 'bg-green-100 text-green-700',
};

const TABLE_HEADERS = [
  'No', '주문번호', '거래처', '품목', '수량', '단가', '총액',
  '주문일', '납기일', '유형', '상태', '관리'
];

const today = () => new Date().toISOString().split('T')[0];

const generateOrderNo = (count: number) => {
  const year = new Date().getFullYear();
  const seq = String(count + 1).padStart(3, '0');
  return `ORD-${year}-${seq}`;
};

const EMPTY_ORDER: Omit<Order, 'id' | 'total'> = {
  orderNo: '', partner: '', item: '',
  quantity: 0, price: 0,
  orderDate: today(), dueDate: '',
  type: '매입', status: '견적', memo: '',
};

export default function Orders() {

  const [orders, setOrders]       = useState<Order[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [formData, setFormData]   = useState<Omit<Order, 'id' | 'total'>>(EMPTY_ORDER);
  const [filterStatus, setFilterStatus] = useState('전체');
  const [filterType, setFilterType]     = useState('전체');
  const [loaded, setLoaded]       = useState(false);

  // ── 앱 시작 시 주문 + 재고 같이 불러오기 ──
  useEffect(() => {
    const load = async () => {
      const [o, i] = await Promise.all([loadOrders(), loadInventory()]);
      setOrders(o);
      setInventory(i);
    };
    load();
  }, []);

  // ── 주문 목록 바뀔 때마다 자동 저장 ──
  useEffect(() => {
    if (!loaded) { setLoaded(true); return; }
    saveOrders(orders);
  }, [orders]);

  // ──────────────────────────────────────────────
  // 재고 연동 함수
  //
  // 주문 상태가 변경될 때 재고를 자동으로 업데이트해요
  //
  // 매입 주문 → 출고완료(입고) 시 재고 증가
  // 매출 주문 → 출고완료(출고) 시 재고 감소
  //
  // itemName: 주문의 품목명 (재고 품목명과 일치해야 해요)
  // quantity: 주문 수량
  // type: 매입(재고증가) or 매출(재고감소)
  // ──────────────────────────────────────────────
  const syncInventory = async (
    itemName: string,
    quantity: number,
    type: '매입' | '매출'
  ): Promise<boolean> => {
    // 재고에서 품목명이 일치하는 항목 찾기
    const targetIndex = inventory.findIndex(i => i.item === itemName);

    if (targetIndex === -1) {
      // 재고에 해당 품목이 없으면 경고
      alert(`⚠️ 재고 연동 실패!\n재고 목록에 "${itemName}" 품목이 없어요.\n재고 관리에서 품목을 먼저 등록해주세요.`);
      return false;
    }

    const target = inventory[targetIndex];

    if (type === '매출') {
      // ── 매출 주문 출고완료 시 재고 차감 ──
      // 재고가 부족하면 차단해요
      if (target.current < quantity) {
        alert(
          `⚠️ 재고 부족!\n` +
          `품목: ${itemName}\n` +
          `현재 재고: ${target.current.toLocaleString()} ${target.unit}\n` +
          `출고 수량: ${quantity.toLocaleString()} ${target.unit}\n\n` +
          `재고가 부족해서 출고완료로 변경할 수 없어요.`
        );
        return false;
      }

      // 확인 팝업
      const confirmed = window.confirm(
        `📤 재고 차감 확인\n\n` +
        `품목: ${itemName}\n` +
        `현재 재고: ${target.current.toLocaleString()} ${target.unit}\n` +
        `차감 수량: ${quantity.toLocaleString()} ${target.unit}\n` +
        `차감 후 재고: ${(target.current - quantity).toLocaleString()} ${target.unit}\n\n` +
        `재고를 차감할까요?`
      );
      if (!confirmed) return false;

      // 재고 차감
      const updated = [...inventory];
      updated[targetIndex] = {
        ...target,
        current: target.current - quantity,
        lastUpdated: today(),
      };
      setInventory(updated);
      await saveInventory(updated);

    } else {
      // ── 매입 주문 출고완료(입고) 시 재고 증가 ──
      // 확인 팝업
      const confirmed = window.confirm(
        `📥 재고 증가 확인\n\n` +
        `품목: ${itemName}\n` +
        `현재 재고: ${target.current.toLocaleString()} ${target.unit}\n` +
        `입고 수량: ${quantity.toLocaleString()} ${target.unit}\n` +
        `입고 후 재고: ${(target.current + quantity).toLocaleString()} ${target.unit}\n\n` +
        `재고를 증가할까요?`
      );
      if (!confirmed) return false;

      // 재고 증가
      const updated = [...inventory];
      updated[targetIndex] = {
        ...target,
        current: target.current + quantity,
        lastUpdated: today(),
      };
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
      orderNo: order.orderNo, partner: order.partner,
      item: order.item, quantity: order.quantity,
      price: order.price, orderDate: order.orderDate,
      dueDate: order.dueDate, type: order.type,
      status: order.status, memo: order.memo,
    });
    setShowModal(true);
  };

  const handleDelete = (id: number) => {
    if (!window.confirm('정말 삭제하시겠어요?')) return;
    setOrders(prev => prev.filter(o => o.id !== id));
  };

  // ──────────────────────────────────────────────
  // 주문 저장 함수
  //
  // 주문 상태가 출고완료로 변경될 때 재고 연동을 실행해요
  // 재고 연동 실패 시 주문 상태 변경을 취소해요
  // ──────────────────────────────────────────────
  const handleSave = async () => {
    if (!formData.partner.trim()) { alert('거래처를 입력해주세요!'); return; }
    if (!formData.item.trim())    { alert('품목을 입력해주세요!'); return; }
    if (formData.quantity <= 0)   { alert('수량은 0보다 커야 해요!'); return; }

    // ── 재고 부족 시 매출 주문 등록 차단 ──
    // 새 주문이고 매출 유형이면 재고 확인
    if (!editingOrder && formData.type === '매출') {
      const target = inventory.find(i => i.item === formData.item);
      if (target && target.current < formData.quantity) {
        alert(
          `⚠️ 재고 부족으로 주문 등록 불가!\n\n` +
          `품목: ${formData.item}\n` +
          `현재 재고: ${target.current.toLocaleString()} ${target.unit}\n` +
          `주문 수량: ${formData.quantity.toLocaleString()} ${target.unit}\n\n` +
          `재고를 먼저 확보해주세요.`
        );
        return;
      }
    }

    // ── 출고완료로 상태 변경 시 재고 연동 ──
    // 기존 주문의 상태가 출고완료로 바뀌는 경우에만 실행해요
    if (
      editingOrder &&
      editingOrder.status !== '출고완료' &&
      formData.status === '출고완료'
    ) {
      const success = await syncInventory(
        formData.item,
        formData.quantity,
        formData.type,
      );
      // 재고 연동 실패 또는 취소 시 저장 중단
      if (!success) return;
    }

    const total = formData.quantity * formData.price;
    if (editingOrder) {
      setOrders(prev =>
        prev.map(o =>
          o.id === editingOrder.id ? { ...o, ...formData, total } : o
        )
      );
    } else {
      setOrders(prev => [...prev, { id: generateId(prev), ...formData, total }]);
    }
    setShowModal(false);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: (name === 'quantity' || name === 'price') ? Number(value) : value,
    }));
  };

  const filteredOrders = orders.filter(o => {
    const matchStatus = filterStatus === '전체' || o.status === filterStatus;
    const matchType   = filterType === '전체' || o.type === filterType;
    return matchStatus && matchType;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">📋 주문 관리</h2>
          <p className="text-gray-500 text-sm mt-1">총 {orders.length}건의 주문</p>
        </div>

        {/* ── 버튼 그룹 ── */}
        <div className="flex gap-2">

          {/* 일출고 저장 버튼
              오늘 날짜 기준으로 출고완료 상태인 주문만 엑셀로 저장해요
              납기일(dueDate)이 오늘인 주문 중 출고완료인 것만 포함돼요 */}
          <button
            onClick={() =>
              exportDailyShipments(
                orders,
                new Date().toISOString().split('T')[0]
              )
            }
            className="bg-orange-500 text-white px-4 py-2 rounded-lg
                       hover:bg-orange-600 transition-colors font-medium text-sm">
            📥 일출고 저장
          </button>

          {/* 전체 주문 목록 엑셀 저장 버튼 */}
          <button
            onClick={() => exportOrders(orders)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg
                       hover:bg-green-700 transition-colors font-medium text-sm">
            📥 엑셀 저장
          </button>

          {/* 주문 추가 버튼 */}
          <button
            onClick={handleAdd}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg
                       hover:bg-blue-700 transition-colors font-medium text-sm">
            + 주문 추가
          </button>

        </div>
      </div>

      {/* ── 필터 영역 ── */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="flex gap-2">
          {['전체', '매입', '매출'].map(type => (
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
        <div className="w-px bg-gray-200" />
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
      </div>

      {/* ── 주문 목록 테이블 ── */}
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
                  <td className="px-4 py-3 text-gray-500">{index + 1}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">
                    {order.orderNo}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-800">{order.partner}</td>
                  <td className="px-4 py-3 text-gray-600">{order.item}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {order.quantity.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    ₩{order.price.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-800">
                    ₩{order.total.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{order.orderDate}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{order.dueDate}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium
                      ${order.type === '매입'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-green-100 text-green-700'
                      }`}>
                      {order.type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium
                      ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-600'}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
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
                          max-h-screen overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-800 mb-5">
              {editingOrder ? '✏️ 주문 수정' : '➕ 주문 추가'}
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    주문번호
                  </label>
                  <input type="text" name="orderNo"
                    value={formData.orderNo} onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2
                               text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    주문 유형
                  </label>
                  <select name="type" value={formData.type} onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2
                               text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="매입">매입</option>
                    <option value="매출">매출</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  거래처 <span className="text-red-500">*</span>
                </label>
                <input type="text" name="partner"
                  value={formData.partner} onChange={handleChange}
                  placeholder="예: 카길코리아"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2
                             text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  품목 <span className="text-red-500">*</span>
                  {/* 재고 연동 안내 */}
                  <span className="text-xs text-blue-500 ml-2">
                    (재고 품목명과 정확히 일치해야 연동돼요)
                  </span>
                </label>
                {/* 재고 품목 드롭다운 + 직접 입력 */}
                <input type="text" name="item"
                  value={formData.item} onChange={handleChange}
                  placeholder="예: 옥수수 (미국산)"
                  list="inventory-items"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2
                             text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {/* 재고 품목 자동완성 목록 */}
                <datalist id="inventory-items">
                  {inventory.map(i => (
                    <option key={i.id} value={i.item} />
                  ))}
                </datalist>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    수량
                  </label>
                  <input type="number" name="quantity"
                    value={formData.quantity || ''} onChange={handleChange} min="0"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2
                               text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    단가 (원)
                  </label>
                  <input type="number" name="price"
                    value={formData.price || ''} onChange={handleChange} min="0"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2
                               text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* 총액 자동 계산 */}
              <div className="bg-blue-50 rounded-lg px-4 py-3">
                <span className="text-sm text-blue-700 font-medium">
                  총액 (자동계산):
                </span>
                <span className="text-lg font-bold text-blue-800 ml-2">
                  ₩{(formData.quantity * formData.price).toLocaleString()}
                </span>
              </div>

              {/* 재고 현황 표시 (품목 입력 시 실시간으로 보여줘요) */}
              {formData.item && (() => {
                const stock = inventory.find(i => i.item === formData.item);
                if (!stock) return null;
                const isLow = stock.minStock > 0 && stock.current <= stock.minStock;
                return (
                  <div className={`rounded-lg px-4 py-3 text-sm
                    ${isLow
                      ? 'bg-red-50 border border-red-200'
                      : 'bg-green-50 border border-green-200'
                    }`}>
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    주문일
                  </label>
                  <input type="date" name="orderDate"
                    value={formData.orderDate} onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2
                               text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    납기일
                  </label>
                  <input type="date" name="dueDate"
                    value={formData.dueDate} onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2
                               text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  주문 상태
                </label>
                <select name="status" value={formData.status} onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2
                             text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
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