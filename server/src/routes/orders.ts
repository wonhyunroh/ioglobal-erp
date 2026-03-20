// ──────────────────────────────────────────────
// 📁 파일명: orders.ts
// 📌 위치: server/src/routes/orders.ts
//
// 🎯 이 파일의 역할:
//   - 주문 관련 API를 처리해요
//   - CRUD (생성/조회/수정/삭제) 기능을 제공해요
//
// 🌐 API 목록:
//   GET    /api/orders      → 전체 주문 목록 조회
//   POST   /api/orders      → 주문 추가
//   PUT    /api/orders/:id  → 주문 수정
//   DELETE /api/orders/:id  → 주문 삭제
// ──────────────────────────────────────────────

import { Router } from 'express';
import Database from 'better-sqlite3';

export function createOrdersRouter(db: Database.Database) {
  const router = Router();

  // ── 전체 주문 목록 조회 ──
  // GET /api/orders
  router.get('/', (req, res) => {
    try {
      const rows = db.prepare(`SELECT * FROM orders ORDER BY id ASC`).all();
      res.json(rows);
    } catch (e) {
      res.status(500).json({ error: '주문 목록 조회 실패' });
    }
  });

  // ── 주문 추가 ──
  // POST /api/orders
  router.post('/', (req, res) => {
    try {
      const {
        orderNo, contractNo, blNo, partner, item, quantity, price,
        orderDate, dueDate, type, status, memo
      } = req.body;
      // 총액 자동 계산
      const total = (quantity ?? 0) * (price ?? 0);
      const result = db.prepare(`
        INSERT INTO orders
          (orderNo, contractNo, blNo, partner, item, quantity, price, total,
           orderDate, dueDate, type, status, memo)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        orderNo ?? '', contractNo ?? '', blNo ?? '',
        partner, item,
        quantity ?? 0, price ?? 0, total,
        orderDate ?? '', dueDate ?? '',
        type ?? '매입', status ?? '견적', memo ?? ''
      );
      const created = db.prepare(`SELECT * FROM orders WHERE id = ?`).get(result.lastInsertRowid);
      res.json(created);
    } catch (e) {
      res.status(500).json({ error: '주문 추가 실패' });
    }
  });

  // ── 주문 수정 ──
  // PUT /api/orders/:id
  router.put('/:id', (req, res) => {
    try {
      const {
        orderNo, contractNo, blNo, partner, item, quantity, price,
        orderDate, dueDate, type, status, memo
      } = req.body;
      // 총액 자동 계산
      const total = (quantity ?? 0) * (price ?? 0);
      db.prepare(`
        UPDATE orders
        SET orderNo=?, contractNo=?, blNo=?, partner=?, item=?,
            quantity=?, price=?, total=?,
            orderDate=?, dueDate=?, type=?, status=?, memo=?
        WHERE id=?
      `).run(
        orderNo ?? '', contractNo ?? '', blNo ?? '',
        partner, item,
        quantity ?? 0, price ?? 0, total,
        orderDate ?? '', dueDate ?? '',
        type ?? '매입', status ?? '견적', memo ?? '',
        req.params.id
      );
      const updated = db.prepare(`SELECT * FROM orders WHERE id = ?`).get(req.params.id);
      res.json(updated);
    } catch (e) {
      res.status(500).json({ error: '주문 수정 실패' });
    }
  });

  // ── 주문 삭제 ──
  // DELETE /api/orders/:id
  router.delete('/:id', (req, res) => {
    try {
      db.prepare(`DELETE FROM orders WHERE id = ?`).run(req.params.id);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: '주문 삭제 실패' });
    }
  });

  return router;
}
