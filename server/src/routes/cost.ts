// ──────────────────────────────────────────────
// 📁 파일명: cost.ts
// 📌 위치: server/src/routes/cost.ts
//
// 🎯 이 파일의 역할:
//   - 수입원가 고정비용 관련 API를 처리해요
//   - CRUD (생성/조회/수정/삭제) 기능을 제공해요
//
// 🌐 API 목록:
//   GET    /api/cost      → 전체 고정비용 목록 조회
//   POST   /api/cost      → 고정비용 추가
//   PUT    /api/cost/:id  → 고정비용 수정
//   DELETE /api/cost/:id  → 고정비용 삭제
// ──────────────────────────────────────────────

import { Router } from 'express';
import Database from 'better-sqlite3';

export function createCostRouter(db: Database.Database) {
  const router = Router();

  // ── 전체 고정비용 목록 조회 ──
  // GET /api/cost
  router.get('/', (req, res) => {
    try {
      const rows = db.prepare(
        `SELECT * FROM cost_fixed_fees ORDER BY id ASC`
      ).all();
      res.json(rows);
    } catch (e) {
      res.status(500).json({ error: '고정비용 목록 조회 실패' });
    }
  });

  // ── 고정비용 추가 ──
  // POST /api/cost
  router.post('/', (req, res) => {
    try {
      const { name, amount, memo } = req.body;
      const result = db.prepare(`
        INSERT INTO cost_fixed_fees (name, amount, memo)
        VALUES (?, ?, ?)
      `).run(name, amount ?? 0, memo ?? '');
      const created = db.prepare(
        `SELECT * FROM cost_fixed_fees WHERE id = ?`
      ).get(result.lastInsertRowid);
      res.json(created);
    } catch (e) {
      res.status(500).json({ error: '고정비용 추가 실패' });
    }
  });

  // ── 고정비용 수정 ──
  // PUT /api/cost/:id
  router.put('/:id', (req, res) => {
    try {
      const { name, amount, memo } = req.body;
      db.prepare(`
        UPDATE cost_fixed_fees
        SET name=?, amount=?, memo=?
        WHERE id=?
      `).run(name, amount ?? 0, memo ?? '', req.params.id);
      const updated = db.prepare(
        `SELECT * FROM cost_fixed_fees WHERE id = ?`
      ).get(req.params.id);
      res.json(updated);
    } catch (e) {
      res.status(500).json({ error: '고정비용 수정 실패' });
    }
  });

  // ── 고정비용 삭제 ──
  // DELETE /api/cost/:id
  router.delete('/:id', (req, res) => {
    try {
      db.prepare(`DELETE FROM cost_fixed_fees WHERE id = ?`).run(req.params.id);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: '고정비용 삭제 실패' });
    }
  });

  return router;
}
