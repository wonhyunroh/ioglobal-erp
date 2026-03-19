"use strict";
// ──────────────────────────────────────────────
// 📁 파일명: partners.ts
// 📌 위치: server/src/routes/partners.ts
//
// 🎯 이 파일의 역할:
//   - 거래처 관련 API를 처리해요
//   - CRUD (생성/조회/수정/삭제) 기능을 제공해요
//
// 🌐 API 목록:
//   GET    /api/partners      → 전체 거래처 목록 조회
//   POST   /api/partners      → 거래처 추가
//   PUT    /api/partners/:id  → 거래처 수정
//   DELETE /api/partners/:id  → 거래처 삭제
// ──────────────────────────────────────────────
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPartnersRouter = createPartnersRouter;
const express_1 = require("express");
function createPartnersRouter(db) {
    const router = (0, express_1.Router)();
    // ── 전체 거래처 목록 조회 ──
    // GET /api/partners
    router.get('/', (req, res) => {
        try {
            const rows = db.prepare(`SELECT * FROM partners ORDER BY id ASC`).all();
            res.json(rows);
        }
        catch (e) {
            res.status(500).json({ error: '거래처 목록 조회 실패' });
        }
    });
    // ── 거래처 추가 ──
    // POST /api/partners
    router.post('/', (req, res) => {
        try {
            const { name, type, country, contact, email, phone, address, memo } = req.body;
            const result = db.prepare(`
        INSERT INTO partners (name, type, country, contact, email, phone, address, memo)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run([
                name, type ?? '매입처', country ?? '', contact ?? '',
                email ?? '', phone ?? '', address ?? '', memo ?? ''
            ]);
            // 방금 추가한 거래처 전체 데이터 반환
            const created = db.prepare(`SELECT * FROM partners WHERE id = ?`).get(result.lastInsertRowid);
            res.json(created);
        }
        catch (e) {
            res.status(500).json({ error: '거래처 추가 실패' });
        }
    });
    // ── 거래처 수정 ──
    // PUT /api/partners/:id
    router.put('/:id', (req, res) => {
        try {
            const { name, type, country, contact, email, phone, address, memo } = req.body;
            db.prepare(`
        UPDATE partners
        SET name=?, type=?, country=?, contact=?, email=?, phone=?, address=?, memo=?
        WHERE id=?
      `).run([
                name, type, country ?? '', contact ?? '',
                email ?? '', phone ?? '', address ?? '', memo ?? '',
                req.params.id
            ]);
            const updated = db.prepare(`SELECT * FROM partners WHERE id = ?`).get(req.params.id);
            res.json(updated);
        }
        catch (e) {
            res.status(500).json({ error: '거래처 수정 실패' });
        }
    });
    // ── 거래처 삭제 ──
    // DELETE /api/partners/:id
    router.delete('/:id', (req, res) => {
        try {
            db.prepare(`DELETE FROM partners WHERE id = ?`).run(req.params.id);
            res.json({ success: true });
        }
        catch (e) {
            res.status(500).json({ error: '거래처 삭제 실패' });
        }
    });
    return router;
}
