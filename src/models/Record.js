const { getDatabase } = require('../config/database');

class RecordModel {
  static create({ amount, type, category, date, description, created_by }) {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO financial_records (amount, type, category, date, description, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(amount, type, category, date, description || null, created_by);

    return RecordModel.findById(result.lastInsertRowid);
  }

  static findById(id) {
    const db = getDatabase();
    return db.prepare(`
      SELECT fr.*, u.name as created_by_name
      FROM financial_records fr
      LEFT JOIN users u ON fr.created_by = u.id
      WHERE fr.id = ? AND fr.is_deleted = 0
    `).get(id);
  }

  static findAll({
    page = 1,
    limit = 20,
    type,
    category,
    startDate,
    endDate,
    search,
    sortBy = 'date',
    order = 'desc',
    created_by,
  } = {}) {
    const db = getDatabase();
    const offset = (page - 1) * limit;
    const conditions = ['fr.is_deleted = 0'];
    const params = [];

    if (type) {
      conditions.push('fr.type = ?');
      params.push(type);
    }

    if (category) {
      conditions.push('fr.category = ?');
      params.push(category);
    }

    if (startDate) {
      conditions.push('fr.date >= ?');
      params.push(startDate);
    }

    if (endDate) {
      conditions.push('fr.date <= ?');
      params.push(endDate);
    }

    if (created_by) {
      conditions.push('fr.created_by = ?');
      params.push(created_by);
    }

    if (search) {
      conditions.push('(fr.description LIKE ? OR fr.category LIKE ?)');
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern);
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    const validSortFields = ['date', 'amount', 'category', 'type', 'created_at'];
    const safeSort = validSortFields.includes(sortBy) ? sortBy : 'date';
    const safeOrder = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const total = db.prepare(
      `SELECT COUNT(*) as count FROM financial_records fr ${whereClause}`
    ).get(...params).count;

    const records = db.prepare(`
      SELECT fr.*, u.name as created_by_name
      FROM financial_records fr
      LEFT JOIN users u ON fr.created_by = u.id
      ${whereClause}
      ORDER BY fr.${safeSort} ${safeOrder}
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    return { records, total };
  }

  static update(id, updates) {
    const db = getDatabase();
    const allowedFields = ['amount', 'type', 'category', 'date', 'description'];
    const setClauses = [];
    const params = [];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key) && value !== undefined) {
        setClauses.push(`${key} = ?`);
        params.push(value);
      }
    }

    if (setClauses.length === 0) return RecordModel.findById(id);

    setClauses.push("updated_at = datetime('now')");
    params.push(id);

    db.prepare(`
      UPDATE financial_records 
      SET ${setClauses.join(', ')} 
      WHERE id = ? AND is_deleted = 0
    `).run(...params);

    return RecordModel.findById(id);
  }

  static softDelete(id) {
    const db = getDatabase();
    const result = db.prepare(`
      UPDATE financial_records 
      SET is_deleted = 1, updated_at = datetime('now') 
      WHERE id = ? AND is_deleted = 0
    `).run(id);
    return result.changes > 0;
  }

  static getSummary() {
    const db = getDatabase();
    const result = db.prepare(`
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as totalIncome,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as totalExpenses,
        COUNT(*) as recordCount
      FROM financial_records
      WHERE is_deleted = 0
    `).get();

    return {
      totalIncome: result.totalIncome,
      totalExpenses: result.totalExpenses,
      netBalance: result.totalIncome - result.totalExpenses,
      recordCount: result.recordCount,
    };
  }

  static getCategoryTotals(type) {
    const db = getDatabase();
    let query = `
      SELECT category, type, 
        SUM(amount) as total, 
        COUNT(*) as count
      FROM financial_records
      WHERE is_deleted = 0
    `;
    const params = [];

    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }

    query += ' GROUP BY category, type ORDER BY total DESC';

    return db.prepare(query).all(...params);
  }

  static getMonthlyTrends(months = 12) {
    const db = getDatabase();
    return db.prepare(`
      SELECT 
        strftime('%Y-%m', date) as month,
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as expenses,
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as net
      FROM financial_records
      WHERE is_deleted = 0 
        AND date >= date('now', '-' || ? || ' months')
      GROUP BY month
      ORDER BY month ASC
    `).all(months);
  }

  static getWeeklyTrends(weeks = 12) {
    const db = getDatabase();
    return db.prepare(`
      SELECT 
        strftime('%Y-W%W', date) as week,
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as expenses,
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as net
      FROM financial_records
      WHERE is_deleted = 0 
        AND date >= date('now', '-' || ? || ' months')
      GROUP BY week
      ORDER BY week ASC
    `).all(weeks);
  }

  static getRecentActivity(limit = 10) {
    const db = getDatabase();
    return db.prepare(`
      SELECT fr.*, u.name as created_by_name
      FROM financial_records fr
      LEFT JOIN users u ON fr.created_by = u.id
      WHERE fr.is_deleted = 0
      ORDER BY fr.created_at DESC
      LIMIT ?
    `).all(limit);
  }
}

module.exports = RecordModel;

