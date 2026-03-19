// ──────────────────────────────────────────────
// 📁 파일명: rates.ts
// 📌 위치: server/src/routes/rates.ts
//
// 🎯 이 파일의 역할:
//   - 수입원가 계산 기준율 API를 처리해요
//   - 관리자가 앱에서 이율/요율을 수정하면 서버에 저장해요
//   - 모든 직원이 같은 기준율로 계산해요
//
// 🌐 API 목록:
//   GET /api/rates      → 전체 기준율 목록 조회
//   PUT /api/rates/:key → 특정 기준율 수정 (key로 구분)
// ──────────────────────────────────────────────

import { Router } from 'express';
import Database from 'better-sqlite3';

export function createRatesRouter(db: Database.Database) {
  const router = Router();

  // ── 전체 기준율 목록 조회 ──
  // GET /api/rates
  // 반환: [{ id, key, value, label, unit }, ...]
  router.get('/', (req, res) => {
    try {
      const rows = db.prepare(
        `SELECT * FROM calc_rates ORDER BY id ASC`
      ).all();
      res.json(rows);
    } catch (e) {
      res.status(500).json({ error: '기준율 목록 조회 실패' });
    }
  });

  // ── 기준율 수정 ──
  // PUT /api/rates/:key
  // body: { value: number }
  // key로 특정 기준율을 찾아서 value만 업데이트해요
  router.put('/:key', (req, res) => {
    try {
      const { value } = req.body;
      db.prepare(`
        UPDATE calc_rates SET value = ? WHERE key = ?
      `).run(value, req.params.key);
      const updated = db.prepare(
        `SELECT * FROM calc_rates WHERE key = ?`
      ).get(req.params.key);
      res.json(updated);
    } catch (e) {
      res.status(500).json({ error: '기준율 수정 실패' });
    }
  });

  return router;
}
