/**
 * Dashboard Analytics API Tests
 *
 * Tests cover:
 * - Financial summary endpoint
 * - Category-wise totals
 * - Monthly and weekly trends
 * - Recent activity
 * - Access control for different roles
 */

const request = require('supertest');
const path = require('path');
const fs = require('fs');

const TEST_DB_PATH = path.resolve(__dirname, '..', 'data', 'test_dashboard.db');

process.env.DB_PATH = TEST_DB_PATH;
process.env.JWT_SECRET = 'test-secret-key';
process.env.NODE_ENV = 'test';

const { getDatabase, closeDatabase, resetDatabase } = require('../src/config/database');

let app;
let adminToken;
let analystToken;
let viewerToken;

beforeAll(async () => {
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }
  resetDatabase();
  getDatabase(TEST_DB_PATH);
  app = require('../src/app');

  // Register users
  const adminRes = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Admin', email: 'admin@test.com', password: 'password123', role: 'admin' });
  adminToken = adminRes.body.data.token;

  const analystRes = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Analyst', email: 'analyst@test.com', password: 'password123', role: 'analyst' });
  analystToken = analystRes.body.data.token;

  const viewerRes = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Viewer', email: 'viewer@test.com', password: 'password123', role: 'viewer' });
  viewerToken = viewerRes.body.data.token;

  // Create sample records
  const records = [
    { amount: 50000, type: 'income', category: 'salary', date: '2025-01-15', description: 'Jan salary' },
    { amount: 50000, type: 'income', category: 'salary', date: '2025-02-15', description: 'Feb salary' },
    { amount: 10000, type: 'income', category: 'freelance', date: '2025-01-20', description: 'Consulting' },
    { amount: 15000, type: 'expense', category: 'rent', date: '2025-01-01', description: 'Jan rent' },
    { amount: 15000, type: 'expense', category: 'rent', date: '2025-02-01', description: 'Feb rent' },
    { amount: 3000, type: 'expense', category: 'food', date: '2025-01-10', description: 'Groceries' },
    { amount: 2000, type: 'expense', category: 'transport', date: '2025-02-05', description: 'Fuel' },
    { amount: 5000, type: 'expense', category: 'shopping', date: '2025-02-20', description: 'Clothes' },
  ];

  for (const record of records) {
    await request(app)
      .post('/api/records')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(record);
  }
});

afterAll(() => {
  closeDatabase();
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }
});

describe('GET /api/dashboard/summary', () => {
  it('should return financial summary for viewer', async () => {
    const res = await request(app)
      .get('/api/dashboard/summary')
      .set('Authorization', `Bearer ${viewerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.summary).toBeDefined();
    expect(res.body.data.summary.totalIncome).toBe(110000);
    expect(res.body.data.summary.totalExpenses).toBe(40000);
    expect(res.body.data.summary.netBalance).toBe(70000);
    expect(res.body.data.summary.recordCount).toBe(8);
  });

  it('should return financial summary for analyst', async () => {
    const res = await request(app)
      .get('/api/dashboard/summary')
      .set('Authorization', `Bearer ${analystToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.summary).toBeDefined();
  });

  it('should return financial summary for admin', async () => {
    const res = await request(app)
      .get('/api/dashboard/summary')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.summary).toBeDefined();
  });

  it('should require authentication', async () => {
    const res = await request(app)
      .get('/api/dashboard/summary');

    expect(res.status).toBe(401);
  });
});

describe('GET /api/dashboard/category-totals', () => {
  it('should return category totals for analyst', async () => {
    const res = await request(app)
      .get('/api/dashboard/category-totals')
      .set('Authorization', `Bearer ${analystToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.categoryTotals)).toBe(true);
    expect(res.body.data.categoryTotals.length).toBeGreaterThan(0);

    // Verify salary total
    const salaryTotal = res.body.data.categoryTotals.find(
      ct => ct.category === 'salary' && ct.type === 'income'
    );
    expect(salaryTotal).toBeDefined();
    expect(salaryTotal.total).toBe(100000);
  });

  it('should filter by type', async () => {
    const res = await request(app)
      .get('/api/dashboard/category-totals?type=expense')
      .set('Authorization', `Bearer ${analystToken}`);

    expect(res.status).toBe(200);
    res.body.data.categoryTotals.forEach(ct => {
      expect(ct.type).toBe('expense');
    });
  });

  it('should deny access for viewer', async () => {
    const res = await request(app)
      .get('/api/dashboard/category-totals')
      .set('Authorization', `Bearer ${viewerToken}`);

    expect(res.status).toBe(403);
  });

  it('should allow access for admin', async () => {
    const res = await request(app)
      .get('/api/dashboard/category-totals')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
  });
});

describe('GET /api/dashboard/trends', () => {
  it('should return monthly trends for analyst', async () => {
    const res = await request(app)
      .get('/api/dashboard/trends?period=monthly')
      .set('Authorization', `Bearer ${analystToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.trends)).toBe(true);
    expect(res.body.data.period).toBe('monthly');
  });

  it('should return weekly trends', async () => {
    const res = await request(app)
      .get('/api/dashboard/trends?period=weekly')
      .set('Authorization', `Bearer ${analystToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.period).toBe('weekly');
  });

  it('should default to monthly trends', async () => {
    const res = await request(app)
      .get('/api/dashboard/trends')
      .set('Authorization', `Bearer ${analystToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.period).toBe('monthly');
  });

  it('should deny access for viewer', async () => {
    const res = await request(app)
      .get('/api/dashboard/trends')
      .set('Authorization', `Bearer ${viewerToken}`);

    expect(res.status).toBe(403);
  });
});

describe('GET /api/dashboard/recent', () => {
  it('should return recent activity for viewer', async () => {
    const res = await request(app)
      .get('/api/dashboard/recent')
      .set('Authorization', `Bearer ${viewerToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.recentActivity)).toBe(true);
    expect(res.body.data.recentActivity.length).toBeLessThanOrEqual(10);
  });

  it('should respect limit parameter', async () => {
    const res = await request(app)
      .get('/api/dashboard/recent?limit=3')
      .set('Authorization', `Bearer ${viewerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.recentActivity.length).toBeLessThanOrEqual(3);
  });

  it('should return recent activity for analyst', async () => {
    const res = await request(app)
      .get('/api/dashboard/recent')
      .set('Authorization', `Bearer ${analystToken}`);

    expect(res.status).toBe(200);
  });

  it('should return recent activity for admin', async () => {
    const res = await request(app)
      .get('/api/dashboard/recent')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
  });
});
