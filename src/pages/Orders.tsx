// ──────────────────────────────────────────────
// 📁 파일명: Orders.tsx
// 📌 위치: src/pages/Orders.tsx
//
// 🎯 이 파일의 역할:
//   - 주문 관리 화면이에요
//   - 매입/매출 주문을 등록하고 상태를 관리해요
//   - 데이터는 electron-store에 저장돼서 앱 껐다 켜도 유지돼요
//
// 🔗 연결된 파일들:
//   - db.ts: loadOrders, saveOrders, generateId
// ──────────────────────────────────────────────

import React, { useState, useEffect } from 'react';
import { Order, loadOrders, saveOrders, generateId } from '../db';
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

  const [orders, setOrders] = useState<Order[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [formData, setFormData] = useState<Omit<Order, 'id' | 'total'>>(EMPTY_ORDER);
  const [filterStatus, setFilterStatus] = useState('전체');
  const [filterType, setFilterType] = useState('전체');
  const [loaded, setLoaded] = useState(false);

  // ── 앱 시작 시 저장된 주문 불러오기 ──
  useEffect(() => {
    const load = async () => {
      const data = await loadOrders();
      setOrders(data);
    };
    load();
  }, []);

  // ── 주문 목록이 바뀔 때마다 자동 저장 ──
  useEffect(() => {
    if (!loaded) { setLoaded(true); return; }
    saveOrders(orders);
  }, [orders]);

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

  const handleSave = () => {
    if (!formData.partner.trim()) { alert('거래처를 입력해주세요!'); return; }
    if (!formData.item.trim()) { alert('품목을 입력해주세요!'); return; }
    if (formData.quantity <= 0) { alert('수량은 0보다 커야 해요!'); return; }
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
    const matchType = filterType === '전체' || o.type === filterType;
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
                new Date().toISOString().split('T')[0] // 오늘 날짜 (예: 2026-03-12)
              )
            }
            className="bg-orange-500 text-white px-4 py-2 rounded-lg
                       hover:bg-orange-600 transition-colors font-medium text-sm">
            📥 일출고 저장
          </button>

          {/* 전체 주문 목록 엑셀 저장 버튼
              현재 필터와 상관없이 전체 주문을 저장해요 */}
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
                <span className="text-sm text-blue-700 font-medium">총액 (자동계산): </span>
                <span className="text-lg font-bold text-blue-800">
                  ₩{(formData.quantity * formData.price).toLocaleString()}
                </span>
              </div>

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
                <label className="block text-sm font-medium text-gray-700 mb-1">메모</label>
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