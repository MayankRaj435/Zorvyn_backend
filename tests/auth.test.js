/**
 * Authentication API Tests
 *
 * Tests cover:
 * - User registration (success + validation + duplicates)
 * - User login (success + wrong credentials + inactive)
 * - Profile retrieval
 */

const request = require('supertest');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

// Use a test database
const TEST_DB_PATH = path.resolve(__dirname, '..', 'data', 'test.db');

// Set env before importing app
process.env.DB_PATH = TEST_DB_PATH;
process.env.JWT_SECRET = 'test-secret-key';
process.env.NODE_ENV = 'test';

const { getDatabase, closeDatabase, resetDatabase } = require('../src/config/database');

let app;

beforeAll(() => {
  // Clean up any existing test DB
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }
  resetDatabase();
  getDatabase(TEST_DB_PATH);
  app = require('../src/app');
});

afterAll(() => {
  closeDatabase();
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }
});

describe('POST /api/auth/register', () => {
  it('should register a new user successfully', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toBeDefined();
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe('test@example.com');
    expect(res.body.data.user.role).toBe('viewer');
    expect(res.body.data.user.password).toBeUndefined();
  });

  it('should register a user with a specific role', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Admin Test',
        email: 'admintest@example.com',
        password: 'password123',
        role: 'admin',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe('admin');
  });

  it('should reject registration with duplicate email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Duplicate User',
        email: 'test@example.com',
        password: 'password123',
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('should reject registration with missing fields', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Incomplete',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors).toBeDefined();
  });

  it('should reject registration with invalid email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Bad Email',
        email: 'not-an-email',
        password: 'password123',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should reject registration with short password', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Short Pass',
        email: 'short@example.com',
        password: '12',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should reject registration with invalid role', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Bad Role',
        email: 'badrole@example.com',
        password: 'password123',
        role: 'superadmin',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe('POST /api/auth/login', () => {
  it('should login successfully with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe('test@example.com');
  });

  it('should reject login with wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'wrongpassword',
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should reject login with non-existent email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'nonexistent@example.com',
        password: 'password123',
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should reject login for inactive user', async () => {
    // Create inactive user
    const db = getDatabase();
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('inactive123', salt);
    db.prepare(
      "INSERT INTO users (name, email, password, role, status) VALUES (?, ?, ?, 'viewer', 'inactive')"
    ).run('Inactive', 'inactive@test.com', hash);

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'inactive@test.com',
        password: 'inactive123',
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});

describe('GET /api/auth/me', () => {
  let token;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password123' });
    token = res.body.data.token;
  });

  it('should return current user profile', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe('test@example.com');
  });

  it('should reject request without token', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.status).toBe(401);
  });

  it('should reject request with invalid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalidtoken');

    expect(res.status).toBe(401);
  });
});
