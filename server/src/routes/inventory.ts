// ──────────────────────────────────────────────
// 📁 파일명: inventory.ts
// 📌 위치: server/src/routes/inventory.ts
//
// 🎯 이 파일의 역할:
//   - 재고 관련 API를 처리해요
//   - CRUD (생성/조회/수정/삭제) 기능을 제공해요
//
// 🌐 API 목록:
//   GET    /api/inventory      → 전체 재고 목록 조회
//   POST   /api/inventory      → 재고 품목 추가
//   PUT    /api/inventory/:id  → 재고 수정
//   DELETE /api/inventory/:id  → 재고 삭제
// ──────────────────────────────────────────────

import { Router } from 'express';
import Database from 'better-sqlite3';

export function createInventoryRouter(db: Database.Database) {
  const router = Router();

  // ── 전체 재고 목록 조회 ──
  // GET /api/inventory
  router.get('/', (req, res) => {
    try {
      const rows = db.prepare(`SELECT * FROM inventory ORDER BY id ASC`).all();
      res.json(rows);
    } catch (e) {
      res.status(500).json({ error: '재고 목록 조회 실패' });
    }
  });

  // ── 재고 품목 추가 ──
  // POST /api/inventory
  router.post('/', (req, res) => {
    try {
      const { item, category, unit, current, minStock, lastUpdated, memo } = req.body;
      const result = db.prepare(`
        INSERT INTO inventory (item, category, unit, current, minStock, lastUpdated, memo)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        item, category ?? '', unit ?? '',
        current ?? 0, minStock ?? 0,
        lastUpdated ?? new Date().toISOString().split('T')[0],
        memo ?? ''
      );
      const created = db.prepare(`SELECT * FROM inventory WHERE id = ?`).get(result.lastInsertRowid);
      res.json(created);
    } catch (e) {
      res.status(500).json({ error: '재고 추가 실패' });
    }
  });

  // ── 재고 수정 ──
  // PUT /api/inventory/:id
  router.put('/:id', (req, res) => {
    try {
      const { item, category, unit, current, minStock, lastUpdated, memo } = req.body;
      db.prepare(`
        UPDATE inventory
        SET item=?, category=?, unit=?, current=?, minStock=?, lastUpdated=?, memo=?
        WHERE id=?
      `).run(
        item, category ?? '', unit ?? '',
        current ?? 0, minStock ?? 0,
        lastUpdated ?? new Date().toISOString().split('T')[0],
        memo ?? '',
        req.params.id
      );
      const updated = db.prepare(`SELECT * FROM inventory WHERE id = ?`).get(req.params.id);
      res.json(updated);
    } catch (e) {
      res.status(500).json({ error: '재고 수정 실패' });
    }
  });

  // ── 재고 삭제 ──
  // DELETE /api/inventory/:id
  router.delete('/:id', (req, res) => {
    try {
      db.prepare(`DELETE FROM inventory WHERE id = ?`).run(req.params.id);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: '재고 삭제 실패' });
    }
  });

  return router;
}
