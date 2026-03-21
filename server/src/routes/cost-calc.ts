import { Router } from 'express';
import type Database from 'better-sqlite3';

export function createCostCalcRouter(db: Database.Database) {
  const router = Router();

  // 저장된 계산 목록 전체 조회
  router.get('/', (_req, res) => {
    const rows = db.prepare(
      'SELECT * FROM cost_calculations ORDER BY id DESC'
    ).all() as any[];
    res.json(rows.map(r => ({ ...r, data: JSON.parse(r.data) })));
  });

  // 계산 저장
  router.post('/', (req, res) => {
    const { name, data } = req.body;
    if (!name || !data) {
      return res.status(400).json({ error: '이름과 데이터가 필요해요' });
    }
    const result = db.prepare(
      'INSERT INTO cost_calculations (name, data) VALUES (?, ?)'
    ).run(name, JSON.stringify(data));
    res.json({ id: result.lastInsertRowid, name, data });
  });

  // 계산 삭제
  router.delete('/:id', (req, res) => {
    db.prepare('DELETE FROM cost_calculations WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
  });

  return router;
}
