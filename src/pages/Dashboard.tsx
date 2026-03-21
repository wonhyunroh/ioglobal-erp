// ──────────────────────────────────────────────
// 📁 파일명: Dashboard.tsx
// 📌 위치: src/pages/Dashboard.tsx
//
// 🎯 이 파일의 역할:
//   - ERP 앱을 켰을 때 가장 먼저 보이는 대시보드 화면이에요
//   - 실제 DB 데이터를 불러와서 요약 정보를 보여줘요
//   - 이번 달 매출/매입, 진행중 주문, 재고부족 품목을 카드로 표시해요
//   - 최근 주문 5건을 테이블로 보여줘요
//
// 🔗 연결된 파일들:
//   - db.ts: loadOrders, loadInventory
// ──────────────────────────────────────────────

import React, { useState, useEffect } from 'react';
import { loadOrders, loadInventory, Order, InventoryItem } from '../db';

// ──────────────────────────────────────────────
// 주문 상태 색상 (Orders.tsx 와 동일하게 맞춰요)
// ──────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  '견적':    'bg-gray-100 text-gray-600',
  '계약':    'bg-blue-100 text-blue-700',
  '출고준비': 'bg-yellow-100 text-yellow-700',
  '출고완료': 'bg-orange-100 text-orange-700',
  '정산완료': 'bg-green-100 text-green-700',
};

export default function Dashboard() {

  const [orders, setOrders] = useState<Order[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ── 데이터 불러오기 함수 ──
  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [o, i] = await Promise.all([loadOrders(), loadInventory()]);
      setOrders(o);
      setInventory(i);
    } catch {
      setError('서버에서 데이터를 불러오지 못했어요. 서버가 실행 중인지 확인해주세요.');
    } finally {
      setLoading(false);
    }
  };

  // ── 앱 시작 시 데이터 불러오기 ──
  useEffect(() => {
    load();
  }, []);

  // ── 이번 달 기준 날짜 ──
  // ── 이번 달 기준 (한국 시간) ──
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;

  // ── 이번 달 매출 (예상 vs 출고) ──
  const monthSalesOrders = orders.filter(o => o.type === '매출' && o.orderDate.startsWith(thisMonth));
  const expectedSales = monthSalesOrders
    .filter(o => !['출고완료', '정산완료'].includes(o.status))
    .reduce((sum, o) => sum + o.total, 0);
  const actualSales = monthSalesOrders
    .filter(o => ['출고완료', '정산완료'].includes(o.status))
    .reduce((sum, o) => sum + o.total, 0);

  // ── 이번 달 매입 (예상 통관 vs 원화 매입) ──
  const monthPurchaseOrders = orders.filter(o => o.type === '매입' && o.orderDate.startsWith(thisMonth));
  const expectedPurchase = monthPurchaseOrders
    .filter(o => !['입고완료', '정산완료'].includes(o.status))
    .reduce((sum, o) => sum + o.total, 0);
  const actualPurchase = monthPurchaseOrders
    .filter(o => ['입고완료', '정산완료'].includes(o.status))
    .reduce((sum, o) => sum + o.total, 0);

  // ── 진행 중 주문 수 ──
  // 정산완료가 아닌 주문 수
  const activeOrders = orders
    .filter(o => o.status !== '정산완료').length;

  // ── 재고 부족 품목 수 ──
  const lowStockCount = inventory
    .filter(i => i.minStock > 0 && i.current <= i.minStock).length;

  // ── 최근 주문 5건 ──
  const recentOrders = [...orders]
    .sort((a, b) => b.orderDate.localeCompare(a.orderDate))
    .slice(0, 5);

  // ── 요약 카드 데이터 ──
  const SUMMARY_CARDS = [
    {
      title: '예상 매출',
      value: `₩${expectedSales.toLocaleString()}`,
      icon: '📈',
      color: 'bg-blue-500',
      desc: '출고 전 매출 합계',
    },
    {
      title: '출고 매출',
      value: `₩${actualSales.toLocaleString()}`,
      icon: '💰',
      color: 'bg-green-500',
      desc: '출고완료 매출 합계',
    },
    {
      title: '예상 통관 매입',
      value: `₩${expectedPurchase.toLocaleString()}`,
      icon: '📉',
      color: 'bg-indigo-500',
      desc: '입고 전 매입 합계',
    },
    {
      title: '원화 매입',
      value: `₩${actualPurchase.toLocaleString()}`,
      icon: '🏦',
      color: 'bg-cyan-500',
      desc: '입고완료 매입 합계',
    },
    {
      title: '진행 중 주문',
      value: `${activeOrders}건`,
      icon: '📋',
      color: 'bg-orange-500',
      desc: '정산완료 제외',
    },
    {
      title: '재고 부족 품목',
      value: `${lowStockCount}개`,
      icon: '⚠️',
      color: 'bg-red-500',
      desc: '최소재고 이하 품목',
    },
  ];

  // ── 로딩 중 ──
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <div className="text-4xl mb-3 animate-spin">⏳</div>
        <p className="text-sm">데이터를 불러오는 중이에요...</p>
      </div>
    );
  }

  // ── 에러 ──
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="text-4xl mb-3">⚠️</div>
        <p className="text-sm text-red-500 mb-4">{error}</p>
        <button
          onClick={load}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm
                     hover:bg-blue-600 transition-colors"
        >
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* ── 페이지 제목 ── */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">📊 대시보드</h2>
          <p className="text-gray-500 mt-1">
            {new Date().toLocaleDateString('ko-KR', {
              year: 'numeric', month: 'long',
              day: 'numeric', weekday: 'long',
            })}
          </p>
        </div>
        {/* ── 새로고침 버튼 ── */}
        <button
          onClick={load}
          className="px-3 py-2 text-sm text-gray-500 border border-gray-200
                     rounded-lg hover:bg-gray-50 transition-colors"
        >
          🔄 새로고침
        </button>
      </div>

      {/* ── 요약 카드 4개 ── */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {SUMMARY_CARDS.map((card, index) => (
          <div key={index}
               className="bg-white rounded-xl shadow-sm border border-gray-200
                          overflow-hidden">
            <div className={`${card.color} h-2`} />
            <div className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">{card.icon}</span>
                <span className="text-sm font-medium text-gray-600">
                  {card.title}
                </span>
              </div>
              <div className="text-2xl font-bold text-gray-800 mb-1">
                {card.value}
              </div>
              <div className="text-xs text-gray-400">{card.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── 최근 주문 현황 ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">
          📋 최근 주문 현황
        </h3>

        {recentOrders.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-sm">아직 주문 데이터가 없어요</p>
            <p className="text-xs mt-1">주문을 등록하면 여기에 표시돼요</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['주문번호', '거래처', '품목', '총액', '주문일', '유형', '상태'].map(h => (
                  <th key={h}
                      className="px-4 py-3 text-left text-xs font-semibold
                                 text-gray-600 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentOrders.map(order => (
                <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">
                    {order.orderNo}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-800">
                    {order.partner}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{order.item}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">
                    ₩{order.total.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {order.orderDate}
                  </td>
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
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}