import { Router } from 'express';
import Database from 'better-sqlite3';

export function createWorkFeesRouter(db: Database.Database) {
  const router = Router();

  // GET /api/work-fees
  router.get('/', (req, res) => {
    try {
      const rows = db.prepare(`SELECT * FROM work_fees ORDER BY yearMonth DESC, location ASC, id ASC`).all();
      res.json(rows);
    } catch (e) {
      res.status(500).json({ error: '작업비 목록 조회 실패' });
    }
  });

  // POST /api/work-fees
  router.post('/', (req, res) => {
    try {
      const { yearMonth, location, partner, item, weightKg, salesPrice, salesAmount, purchasePrice, purchaseAmount, memo } = req.body;
      const result = db.prepare(`
        INSERT INTO work_fees (yearMonth, location, partner, item, weightKg, salesPrice, salesAmount, purchasePrice, purchaseAmount, memo)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        yearMonth ?? '', location ?? '광양', partner ?? '', item ?? '',
        weightKg ?? 0, salesPrice ?? 0, salesAmount ?? 0,
        purchasePrice ?? 0, purchaseAmount ?? 0, memo ?? ''
      );
      const created = db.prepare(`SELECT * FROM work_fees WHERE id = ?`).get(result.lastInsertRowid);
      res.json(created);
    } catch (e) {
      res.status(500).json({ error: '작업비 추가 실패' });
    }
  });

  // PUT /api/work-fees/:id
  router.put('/:id', (req, res) => {
    try {
      const { yearMonth, location, partner, item, weightKg, salesPrice, salesAmount, purchasePrice, purchaseAmount, memo } = req.body;
      db.prepare(`
        UPDATE work_fees
        SET yearMonth=?, location=?, partner=?, item=?, weightKg=?, salesPrice=?, salesAmount=?, purchasePrice=?, purchaseAmount=?, memo=?
        WHERE id=?
      `).run(
        yearMonth ?? '', location ?? '광양', partner ?? '', item ?? '',
        weightKg ?? 0, salesPrice ?? 0, salesAmount ?? 0,
        purchasePrice ?? 0, purchaseAmount ?? 0, memo ?? '',
        req.params.id
      );
      const updated = db.prepare(`SELECT * FROM work_fees WHERE id = ?`).get(req.params.id);
      res.json(updated);
    } catch (e) {
      res.status(500).json({ error: '작업비 수정 실패' });
    }
  });

  // DELETE /api/work-fees/:id
  router.delete('/:id', (req, res) => {
    try {
      db.prepare(`DELETE FROM work_fees WHERE id = ?`).run(req.params.id);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: '작업비 삭제 실패' });
    }
  });

  return router;
}
