/**
 * Financial Records API Tests
 *
 * Tests cover:
 * - CRUD operations
 * - Filtering, search, sorting, pagination
 * - Soft delete
 * - Access control for different roles
 */

const request = require('supertest');
const path = require('path');
const fs = require('fs');

const TEST_DB_PATH = path.resolve(__dirname, '..', 'data', 'test_records.db');

process.env.DB_PATH = TEST_DB_PATH;
process.env.JWT_SECRET = 'test-secret-key';
process.env.NODE_ENV = 'test';

const { getDatabase, closeDatabase, resetDatabase } = require('../src/config/database');

let app;
let adminToken;
let analystToken;
let viewerToken;
let createdRecordId;

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
});

afterAll(() => {
  closeDatabase();
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }
});

describe('POST /api/records', () => {
  it('should create a record as admin', async () => {
    const res = await request(app)
      .post('/api/records')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        amount: 5000,
        type: 'income',
        category: 'salary',
        date: '2025-03-15',
        description: 'Test salary',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.record.amount).toBe(5000);
    expect(res.body.data.record.type).toBe('income');
    createdRecordId = res.body.data.record.id;
  });

  it('should create a record without description', async () => {
    const res = await request(app)
      .post('/api/records')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        amount: 2000,
        type: 'expense',
        category: 'food',
        date: '2025-03-10',
      });

    expect(res.status).toBe(201);
  });

  it('should deny record creation for analyst', async () => {
    const res = await request(app)
      .post('/api/records')
      .set('Authorization', `Bearer ${analystToken}`)
      .send({
        amount: 1000,
        type: 'income',
        category: 'salary',
        date: '2025-03-15',
      });

    expect(res.status).toBe(403);
  });

  it('should deny record creation for viewer', async () => {
    const res = await request(app)
      .post('/api/records')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        amount: 1000,
        type: 'income',
        category: 'salary',
        date: '2025-03-15',
      });

    expect(res.status).toBe(403);
  });

  it('should reject record with missing required fields', async () => {
    const res = await request(app)
      .post('/api/records')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        amount: 1000,
      });

    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });

  it('should reject record with negative amount', async () => {
    const res = await request(app)
      .post('/api/records')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        amount: -100,
        type: 'income',
        category: 'salary',
        date: '2025-03-15',
      });

    expect(res.status).toBe(400);
  });

  it('should reject record with invalid type', async () => {
    const res = await request(app)
      .post('/api/records')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        amount: 1000,
        type: 'transfer',
        category: 'salary',
        date: '2025-03-15',
      });

    expect(res.status).toBe(400);
  });

  it('should reject record with invalid date format', async () => {
    const res = await request(app)
      .post('/api/records')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        amount: 1000,
        type: 'income',
        category: 'salary',
        date: '15-03-2025',
      });

    expect(res.status).toBe(400);
  });
});

describe('GET /api/records', () => {
  // Create more records for testing
  beforeAll(async () => {
    const records = [
      { amount: 3000, type: 'expense', category: 'transport', date: '2025-01-15', description: 'Fuel' },
      { amount: 8000, type: 'income', category: 'freelance', date: '2025-02-20', description: 'Consulting' },
      { amount: 1500, type: 'expense', category: 'entertainment', date: '2025-03-05', description: 'Movie' },
    ];

    for (const record of records) {
      await request(app)
        .post('/api/records')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(record);
    }
  });

  it('should list records for analyst', async () => {
    const res = await request(app)
      .get('/api/records')
      .set('Authorization', `Bearer ${analystToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toBeDefined();
  });

  it('should list records for admin', async () => {
    const res = await request(app)
      .get('/api/records')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(5);
  });

  it('should deny listing for viewer', async () => {
    const res = await request(app)
      .get('/api/records')
      .set('Authorization', `Bearer ${viewerToken}`);

    expect(res.status).toBe(403);
  });

  it('should filter by type', async () => {
    const res = await request(app)
      .get('/api/records?type=income')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    res.body.data.forEach(record => {
      expect(record.type).toBe('income');
    });
  });

  it('should filter by category', async () => {
    const res = await request(app)
      .get('/api/records?category=salary')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    res.body.data.forEach(record => {
      expect(record.category).toBe('salary');
    });
  });

  it('should filter by date range', async () => {
    const res = await request(app)
      .get('/api/records?startDate=2025-02-01&endDate=2025-02-28')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    res.body.data.forEach(record => {
      expect(record.date >= '2025-02-01').toBe(true);
      expect(record.date <= '2025-02-28').toBe(true);
    });
  });

  it('should search by description', async () => {
    const res = await request(app)
      .get('/api/records?search=Consulting')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('should support pagination', async () => {
    const res = await request(app)
      .get('/api/records?page=1&limit=2')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeLessThanOrEqual(2);
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.limit).toBe(2);
  });

  it('should sort by amount ascending', async () => {
    const res = await request(app)
      .get('/api/records?sortBy=amount&order=asc')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    for (let i = 1; i < res.body.data.length; i++) {
      expect(res.body.data[i].amount).toBeGreaterThanOrEqual(res.body.data[i - 1].amount);
    }
  });
});

describe('GET /api/records/:id', () => {
  it('should get a record by ID', async () => {
    const res = await request(app)
      .get(`/api/records/${createdRecordId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.record.id).toBe(createdRecordId);
  });

  it('should return 404 for non-existent record', async () => {
    const res = await request(app)
      .get('/api/records/99999')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });
});

describe('PUT /api/records/:id', () => {
  it('should update a record as admin', async () => {
    const res = await request(app)
      .put(`/api/records/${createdRecordId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        amount: 6000,
        description: 'Updated salary',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.record.amount).toBe(6000);
    expect(res.body.data.record.description).toBe('Updated salary');
  });

  it('should deny update for analyst', async () => {
    const res = await request(app)
      .put(`/api/records/${createdRecordId}`)
      .set('Authorization', `Bearer ${analystToken}`)
      .send({ amount: 7000 });

    expect(res.status).toBe(403);
  });

  it('should reject empty update', async () => {
    const res = await request(app)
      .put(`/api/records/${createdRecordId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});

    expect(res.status).toBe(400);
  });

  it('should return 404 for non-existent record', async () => {
    const res = await request(app)
      .put('/api/records/99999')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ amount: 1000 });

    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/records/:id', () => {
  it('should soft-delete a record as admin', async () => {
    // Create a record to delete
    const createRes = await request(app)
      .post('/api/records')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        amount: 999,
        type: 'expense',
        category: 'other',
        date: '2025-03-20',
        description: 'To be deleted',
      });

    const id = createRes.body.data.record.id;

    const res = await request(app)
      .delete(`/api/records/${id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify it's no longer accessible
    const getRes = await request(app)
      .get(`/api/records/${id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(getRes.status).toBe(404);
  });

  it('should deny delete for analyst', async () => {
    const res = await request(app)
      .delete(`/api/records/${createdRecordId}`)
      .set('Authorization', `Bearer ${analystToken}`);

    expect(res.status).toBe(403);
  });

  it('should return 404 for non-existent record', async () => {
    const res = await request(app)
      .delete('/api/records/99999')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });
});
