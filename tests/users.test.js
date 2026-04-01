/**
 * User Management API Tests
 *
 * Tests cover:
 * - Listing users with pagination and filtering
 * - Getting user by ID
 * - Updating users (role, status)
 * - Deleting users
 * - Access control enforcement
 */

const request = require('supertest');
const path = require('path');
const fs = require('fs');

const TEST_DB_PATH = path.resolve(__dirname, '..', 'data', 'test_users.db');

process.env.DB_PATH = TEST_DB_PATH;
process.env.JWT_SECRET = 'test-secret-key';
process.env.NODE_ENV = 'test';

const { getDatabase, closeDatabase, resetDatabase } = require('../src/config/database');

let app;
let adminToken;
let analystToken;
let viewerToken;
let viewerUserId;

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
  viewerUserId = viewerRes.body.data.user.id;
});

afterAll(() => {
  closeDatabase();
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }
});

describe('GET /api/users', () => {
  it('should list all users for admin', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination.total).toBeGreaterThanOrEqual(3);
  });

  it('should support pagination', async () => {
    const res = await request(app)
      .get('/api/users?page=1&limit=2')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeLessThanOrEqual(2);
    expect(res.body.pagination.limit).toBe(2);
  });

  it('should filter by role', async () => {
    const res = await request(app)
      .get('/api/users?role=admin')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    res.body.data.forEach(user => {
      expect(user.role).toBe('admin');
    });
  });

  it('should deny access for analyst', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${analystToken}`);

    expect(res.status).toBe(403);
  });

  it('should deny access for viewer', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${viewerToken}`);

    expect(res.status).toBe(403);
  });
});

describe('GET /api/users/:id', () => {
  it('should get a user by ID for admin', async () => {
    const res = await request(app)
      .get(`/api/users/${viewerUserId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.user.id).toBe(viewerUserId);
  });

  it('should return 404 for non-existent user', async () => {
    const res = await request(app)
      .get('/api/users/99999')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });
});

describe('PUT /api/users/:id', () => {
  it('should update user role', async () => {
    const res = await request(app)
      .put(`/api/users/${viewerUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'analyst' });

    expect(res.status).toBe(200);
    expect(res.body.data.user.role).toBe('analyst');

    // Reset back
    await request(app)
      .put(`/api/users/${viewerUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'viewer' });
  });

  it('should update user status', async () => {
    // Create a test user to deactivate
    const newUser = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Temp', email: 'temp@test.com', password: 'password123' });

    const res = await request(app)
      .put(`/api/users/${newUser.body.data.user.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'inactive' });

    expect(res.status).toBe(200);
    expect(res.body.data.user.status).toBe('inactive');
  });

  it('should prevent admin from deactivating themselves', async () => {
    // Get admin's own ID
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${adminToken}`);

    const res = await request(app)
      .put(`/api/users/${meRes.body.data.user.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'inactive' });

    expect(res.status).toBe(400);
  });

  it('should reject invalid role', async () => {
    const res = await request(app)
      .put(`/api/users/${viewerUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'superadmin' });

    expect(res.status).toBe(400);
  });

  it('should reject empty update', async () => {
    const res = await request(app)
      .put(`/api/users/${viewerUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});

    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/users/:id', () => {
  it('should delete a user', async () => {
    const newUser = await request(app)
      .post('/api/auth/register')
      .send({ name: 'ToDelete', email: 'delete@test.com', password: 'password123' });

    const res = await request(app)
      .delete(`/api/users/${newUser.body.data.user.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should prevent admin from deleting themselves', async () => {
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${adminToken}`);

    const res = await request(app)
      .delete(`/api/users/${meRes.body.data.user.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
  });

  it('should return 404 for non-existent user', async () => {
    const res = await request(app)
      .delete('/api/users/99999')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });
});
