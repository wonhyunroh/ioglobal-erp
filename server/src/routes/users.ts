// ──────────────────────────────────────────────
// 📁 파일명: users.ts
// 📌 위치: server/src/routes/users.ts
//
// 🎯 이 파일의 역할:
//   - 계정 관련 API를 처리해요
//   - 로그인, CRUD (생성/조회/수정/삭제) 기능을 제공해요
//
// 🌐 API 목록:
//   POST   /api/users/login   → 로그인
//   GET    /api/users         → 전체 계정 목록 조회
//   POST   /api/users         → 계정 추가
//   PUT    /api/users/:id     → 계정 수정
//   DELETE /api/users/:id     → 계정 삭제
// ──────────────────────────────────────────────

import { Router } from 'express';
import Database   from 'better-sqlite3';

export function createUsersRouter(db: Database.Database) {
  const router = Router();

  // ── 로그인 ──
  // POST /api/users/login
  // body: { username, password }
  // 반환: 유저 정보 (비밀번호 제외) 또는 에러
  router.post('/login', (req, res) => {
    try {
      const { username, password } = req.body;
      const user = db.prepare(
        `SELECT * FROM users WHERE username = ? AND password = ?`
      ).get(username, password) as any;

      if (!user) {
        // 아이디 또는 비밀번호가 틀린 경우
        return res.status(401).json({ error: '아이디 또는 비밀번호가 틀렸어요' });
      }

      // 마지막 로그인 시간 업데이트
      const lastLogin = new Date().toLocaleString('ko-KR');
      db.prepare(`UPDATE users SET lastLogin = ? WHERE id = ?`)
        .run(lastLogin, user.id);

      // 비밀번호는 빼고 반환해요 (보안)
      const { password: _, ...userWithoutPassword } = user;
      res.json({ ...userWithoutPassword, lastLogin });
    } catch (e) {
      res.status(500).json({ error: '로그인 실패' });
    }
  });

  // ── 전체 계정 목록 조회 ──
  // GET /api/users
  router.get('/', (req, res) => {
    try {
      // 비밀번호는 빼고 반환해요
      const rows = db.prepare(
        `SELECT id, username, role, lastLogin, createdAt FROM users ORDER BY id ASC`
      ).all();
      res.json(rows);
    } catch (e) {
      res.status(500).json({ error: '계정 목록 조회 실패' });
    }
  });

  // ── 계정 추가 ──
  // POST /api/users
  router.post('/', (req, res) => {
    try {
      const { username, password, role } = req.body;
      const result = db.prepare(`
        INSERT INTO users (username, password, role)
        VALUES (?, ?, ?)
      `).run(username, password, role ?? '일반직원');
      const created = db.prepare(
        `SELECT id, username, role, lastLogin, createdAt FROM users WHERE id = ?`
      ).get(result.lastInsertRowid);
      res.json(created);
    } catch (e: any) {
      // username UNIQUE 제약 위반 시
      if (e.message?.includes('UNIQUE')) {
        return res.status(400).json({ error: '이미 사용 중인 아이디예요' });
      }
      res.status(500).json({ error: '계정 추가 실패' });
    }
  });

  // ── 계정 수정 ──
  // PUT /api/users/:id
  router.put('/:id', (req, res) => {
    try {
      const { username, password, role } = req.body;

      if (password) {
        // 비밀번호도 변경하는 경우
        db.prepare(`
          UPDATE users SET username=?, password=?, role=? WHERE id=?
        `).run(username, password, role, req.params.id);
      } else {
        // 비밀번호는 그대로, 나머지만 변경
        db.prepare(`
          UPDATE users SET username=?, role=? WHERE id=?
        `).run(username, role, req.params.id);
      }

      const updated = db.prepare(
        `SELECT id, username, role, lastLogin, createdAt FROM users WHERE id = ?`
      ).get(req.params.id);
      res.json(updated);
    } catch (e: any) {
      if (e.message?.includes('UNIQUE')) {
        return res.status(400).json({ error: '이미 사용 중인 아이디예요' });
      }
      res.status(500).json({ error: '계정 수정 실패' });
    }
  });

  // ── 계정 삭제 ──
  // DELETE /api/users/:id
  router.delete('/:id', (req, res) => {
    try {
      // admin 계정은 삭제 불가
      const user = db.prepare(`SELECT username FROM users WHERE id = ?`)
        .get(req.params.id) as any;
      if (user?.username === 'admin') {
        return res.status(400).json({ error: 'admin 계정은 삭제할 수 없어요' });
      }
      db.prepare(`DELETE FROM users WHERE id = ?`).run(req.params.id);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: '계정 삭제 실패' });
    }
  });

  return router;
}