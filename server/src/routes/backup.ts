// ──────────────────────────────────────────────
// 📁 파일명: backup.ts
// 📌 위치: server/src/routes/backup.ts
//
// 🎯 이 파일의 역할:
//   - 전체 DB 백업/복원 API를 처리해요
//
// 🌐 API 목록:
//   GET  /api/backup         → 전체 데이터를 JSON으로 반환 (백업)
//   POST /api/backup/restore → JSON 데이터로 DB 전체 복원
// ──────────────────────────────────────────────

import { Router } from 'express';
import Database   from 'better-sqlite3';

export function createBackupRouter(db: Database.Database) {
  const router = Router();

  // ── 전체 데이터 백업 ──
  // GET /api/backup
  // 모든 테이블 데이터를 JSON으로 반환해요
  router.get('/', (req, res) => {
    try {
      const data = {
        _meta: {
          version:   '2.0',
          appName:   'IO Global ERP',
          createdAt: new Date().toLocaleString('ko-KR'),
        },
        partners:  db.prepare('SELECT * FROM partners').all(),
        items:     db.prepare('SELECT * FROM items').all(),
        orders:    db.prepare('SELECT * FROM orders').all(),
        inventory: db.prepare('SELECT * FROM inventory').all(),
        users:     db.prepare(
          'SELECT id, username, password, role, lastLogin, createdAt FROM users'
        ).all(),
        cost:      db.prepare('SELECT * FROM cost_fixed_fees').all(),
        rates:     db.prepare('SELECT * FROM calc_rates').all(),
      };
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: '백업 데이터 조회 실패' });
    }
  });

  // ── 전체 데이터 복원 ──
  // POST /api/backup/restore
  // body: 백업 JSON 데이터
  // 전체 테이블을 비우고 백업 데이터로 다시 채워요
  router.post('/restore', (req, res) => {
    try {
      const { partners, items, orders, inventory, users, cost, rates } = req.body;

      // ── 트랜잭션으로 묶어서 실패 시 롤백 ──
      const doRestore = db.transaction(() => {

        // ── 기존 데이터 전부 삭제 ──
        db.prepare('DELETE FROM partners').run();
        db.prepare('DELETE FROM items').run();
        db.prepare('DELETE FROM orders').run();
        db.prepare('DELETE FROM inventory').run();
        db.prepare('DELETE FROM users').run();
        db.prepare('DELETE FROM cost_fixed_fees').run();

        // ── 거래처 복원 ──
        if (partners?.length) {
          const stmt = db.prepare(`
            INSERT OR REPLACE INTO partners
              (id, name, type, country, contact, email, phone, address, memo, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          for (const p of partners) {
            stmt.run(
              p.id, p.name, p.type ?? '매입처',
              p.country ?? '', p.contact ?? '', p.email ?? '',
              p.phone ?? '', p.address ?? '', p.memo ?? '', p.createdAt ?? ''
            );
          }
        }

        // ── 품목 복원 ──
        if (items?.length) {
          const stmt = db.prepare(`
            INSERT OR REPLACE INTO items
              (id, name, category, unit, spec, memo, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `);
          for (const i of items) {
            stmt.run(
              i.id, i.name, i.category ?? '', i.unit ?? '',
              i.spec ?? '', i.memo ?? '', i.createdAt ?? ''
            );
          }
        }

        // ── 주문 복원 ──
        if (orders?.length) {
          const stmt = db.prepare(`
            INSERT OR REPLACE INTO orders
              (id, orderNo, partner, item, quantity, price, total,
               orderDate, dueDate, type, status, memo, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          for (const o of orders) {
            stmt.run(
              o.id, o.orderNo, o.partner, o.item,
              o.quantity ?? 0, o.price ?? 0, o.total ?? 0,
              o.orderDate ?? '', o.dueDate ?? '',
              o.type ?? '매입', o.status ?? '견적',
              o.memo ?? '', o.createdAt ?? ''
            );
          }
        }

        // ── 재고 복원 ──
        if (inventory?.length) {
          const stmt = db.prepare(`
            INSERT OR REPLACE INTO inventory
              (id, item, category, unit, current, minStock, lastUpdated, memo)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `);
          for (const i of inventory) {
            stmt.run(
              i.id, i.item, i.category ?? '', i.unit ?? '',
              i.current ?? 0, i.minStock ?? 0,
              i.lastUpdated ?? '', i.memo ?? ''
            );
          }
        }

        // ── 계정 복원 ──
        if (users?.length) {
          const stmt = db.prepare(`
            INSERT OR REPLACE INTO users
              (id, username, password, role, lastLogin, createdAt)
            VALUES (?, ?, ?, ?, ?, ?)
          `);
          for (const u of users) {
            stmt.run(
              u.id, u.username, u.password, u.role ?? '일반직원',
              u.lastLogin ?? '', u.createdAt ?? ''
            );
          }
        }

        // ── 수입원가 고정비용 복원 ──
        if (cost?.length) {
          const stmt = db.prepare(`
            INSERT OR REPLACE INTO cost_fixed_fees (id, name, amount, memo)
            VALUES (?, ?, ?, ?)
          `);
          for (const c of cost) {
            stmt.run(c.id, c.name, c.amount ?? 0, c.memo ?? '');
          }
        }

        // ── 계산 기준율 복원 (있는 경우만) ──
        if (rates?.length) {
          const stmt = db.prepare(`
            INSERT OR REPLACE INTO calc_rates (id, key, value, label, unit)
            VALUES (?, ?, ?, ?, ?)
          `);
          for (const r of rates) {
            stmt.run(r.id, r.key, r.value ?? 0, r.label ?? '', r.unit ?? '');
          }
        }
      });

      doRestore();
      res.json({ success: true });

    } catch (e: any) {
      console.error('복원 실패:', e);
      res.status(500).json({ error: '복원 실패: ' + e.message });
    }
  });

  return router;
}
