// ──────────────────────────────────────────────
// 📁 파일명: items.ts
// 📌 위치: server/src/routes/items.ts
//
// 🎯 이 파일의 역할:
//   - 품목 관련 API를 처리해요
//   - CRUD (생성/조회/수정/삭제) 기능을 제공해요
//
// 🌐 API 목록:
//   GET    /api/items      → 전체 품목 목록 조회
//   POST   /api/items      → 품목 추가
//   PUT    /api/items/:id  → 품목 수정
//   DELETE /api/items/:id  → 품목 삭제
// ──────────────────────────────────────────────

import { Router } from 'express';
import Database   from 'better-sqlite3';

export function createItemsRouter(db: Database.Database) {
  const router = Router();

  // ── 전체 품목 목록 조회 ──
  // GET /api/items
  router.get('/', (req, res) => {
    try {
      const rows = db.prepare(`SELECT * FROM items ORDER BY id ASC`).all();
      res.json(rows);
    } catch (e) {
      res.status(500).json({ error: '품목 목록 조회 실패' });
    }
  });

  // ── 품목 추가 ──
  // POST /api/items
  router.post('/', (req, res) => {
    try {
      const { name, category, unit, price, origin, memo } = req.body;
      const result = db.prepare(`
        INSERT INTO items (name, category, unit, price, origin, memo)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        name, category ?? '', unit ?? '', price ?? 0, origin ?? '', memo ?? ''
      );
      const created = db.prepare(`SELECT * FROM items WHERE id = ?`).get(result.lastInsertRowid);
      res.json(created);
    } catch (e) {
      res.status(500).json({ error: '품목 추가 실패' });
    }
  });

  // ── 품목 수정 ──
  // PUT /api/items/:id
  router.put('/:id', (req, res) => {
    try {
      const { name, category, unit, price, origin, memo } = req.body;
      db.prepare(`
        UPDATE items
        SET name=?, category=?, unit=?, price=?, origin=?, memo=?
        WHERE id=?
      `).run(
        name, category ?? '', unit ?? '', price ?? 0, origin ?? '', memo ?? '',
        req.params.id
      );
      const updated = db.prepare(`SELECT * FROM items WHERE id = ?`).get(req.params.id);
      res.json(updated);
    } catch (e) {
      res.status(500).json({ error: '품목 수정 실패' });
    }
  });

  // ── 품목 삭제 ──
  // DELETE /api/items/:id
  router.delete('/:id', (req, res) => {
    try {
      db.prepare(`DELETE FROM items WHERE id = ?`).run(req.params.id);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: '품목 삭제 실패' });
    }
  });

  return router;
}