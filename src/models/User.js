const { getDatabase } = require('../config/database');

class UserModel {
  static create({ name, email, password, role = 'viewer', status = 'active' }) {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO users (name, email, password, role, status)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(name, email, password, role, status);

    return UserModel.findById(result.lastInsertRowid);
  }

  static findById(id) {
    const db = getDatabase();
    return db.prepare(
      'SELECT id, name, email, role, status, created_at, updated_at FROM users WHERE id = ?'
    ).get(id);
  }

  static findByEmail(email) {
    const db = getDatabase();
    return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  }

  static findAll({ page = 1, limit = 20, status, role } = {}) {
    const db = getDatabase();
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (status) {
      whereClause += ' AND status = ?';
      params.push(status);
    }
    if (role) {
      whereClause += ' AND role = ?';
      params.push(role);
    }

    const total = db.prepare(
      `SELECT COUNT(*) as count FROM users ${whereClause}`
    ).get(...params).count;

    const users = db.prepare(
      `SELECT id, name, email, role, status, created_at, updated_at 
       FROM users ${whereClause} 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`
    ).all(...params, limit, offset);

    return { users, total };
  }

  static update(id, updates) {
    const db = getDatabase();
    const allowedFields = ['name', 'email', 'password', 'role', 'status'];
    const setClauses = [];
    const params = [];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key) && value !== undefined) {
        setClauses.push(`${key} = ?`);
        params.push(value);
      }
    }

    if (setClauses.length === 0) return UserModel.findById(id);

    setClauses.push("updated_at = datetime('now')");
    params.push(id);

    db.prepare(
      `UPDATE users SET ${setClauses.join(', ')} WHERE id = ?`
    ).run(...params);

    return UserModel.findById(id);
  }

  static delete(id) {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM users WHERE id = ?').run(id);
    return result.changes > 0;
  }

  static countByRole() {
    const db = getDatabase();
    return db.prepare(
      'SELECT role, COUNT(*) as count FROM users GROUP BY role'
    ).all();
  }
}

module.exports = UserModel;
