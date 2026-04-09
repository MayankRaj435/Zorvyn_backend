# Zorvyn Finance API

> A comprehensive Finance Data Processing and Access Control Backend built with Node.js, Express, and SQLite.

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Setup & Installation](#setup--installation)
- [API Documentation](#api-documentation)
- [Authentication](#authentication)
- [Access Control](#access-control)
- [API Endpoints](#api-endpoints)
- [Testing](#testing)
- [Design Decisions & Assumptions](#design-decisions--assumptions)
- [Project Structure](#project-structure)

---

## Overview

This backend system powers a finance dashboard where users interact with financial records based on their role. It provides:

- **User & Role Management** — Create, update, and manage users with role-based access (Viewer, Analyst, Admin)
- **Financial Records CRUD** — Create, read, update, and soft-delete financial entries with filtering, search, sorting, and pagination
- **Dashboard Analytics** — Summary totals, category breakdowns, monthly/weekly trends, and recent activity
- **Access Control** — Middleware-enforced role-based permissions on every endpoint
- **Input Validation** — Joi schema validation with descriptive error messages
- **API Documentation** — Interactive Swagger UI at `/api-docs`

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Request                       │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  Middleware Pipeline                                         │
│  ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌──────────────┐  │
│  │  Helmet   │→│Rate Limit│→│ JWT Auth  │→│ Role Authz   │  │
│  └──────────┘ └──────────┘ └───────────┘ └──────────────┘  │
│                                              │               │
│  ┌──────────────────┐                        ▼               │
│  │  Joi Validation   │──────────────────────►│               │
│  └──────────────────┘                        │               │
└──────────────────────────────────────────────┼───────────────┘
                                               │
                      ▼                        ▼
┌─────────────────────────────────────────────────────────────┐
│  Routes Layer (auth, users, records, dashboard)              │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  Services Layer (business logic, validations, aggregation)   │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  Models Layer (SQL queries, data access)                     │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  SQLite Database (better-sqlite3 with WAL mode)              │
└─────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Component       | Technology                                |
|----------------|-------------------------------------------|
| Runtime        | Node.js                                   |
| Framework      | Express.js                                |
| Database       | SQLite via `better-sqlite3`               |
| Authentication | JWT (`jsonwebtoken`) + `bcryptjs`         |
| Validation     | Joi                                       |
| Documentation  | Swagger (OpenAPI 3.0)                     |
| Security       | Helmet, CORS, express-rate-limit          |
| Testing        | Jest + Supertest                          |
| Logging        | Morgan                                    |

---

## Setup & Installation

### Prerequisites

- **Node.js** v18+ recommended
- **npm** v9+

### Quick Start

```bash
# 1. Clone the repository
git clone <repository-url>
cd zorvyn

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env if needed (defaults work for local development)

# 4. Seed the database with sample data
npm run seed

# 5. Start the development server
npm run dev

# 6. Open API documentation
# Visit http://localhost:3000/api-docs
```

### Environment Variables

| Variable                 | Default                | Description                 |
|-------------------------|------------------------|-----------------------------|
| `PORT`                  | `3000`                 | Server port                 |
| `NODE_ENV`              | `development`          | Environment mode            |
| `JWT_SECRET`            | (set in .env)          | JWT signing secret          |
| `JWT_EXPIRES_IN`        | `24h`                  | Token expiration duration   |
| `DB_PATH`               | `./data/finance.db`    | SQLite database file path   |
| `RATE_LIMIT_WINDOW_MS`  | `900000`               | Rate limit window (15 min)  |
| `RATE_LIMIT_MAX_REQUESTS`| `100`                 | Max requests per window     |

---

## API Documentation

Interactive Swagger documentation is available at:

```
http://localhost:3000/api-docs
```

Health check endpoint:

```
GET http://localhost:3000/api/health
```

---

## Authentication

The API uses **JWT Bearer Token** authentication.

### Getting a Token

```bash
# Register a new user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name": "John", "email": "john@example.com", "password": "password123"}'

# Or login with existing credentials
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@zorvyn.com", "password": "admin123"}'
```

### Using the Token

Include the token in the `Authorization` header:

```
Authorization: Bearer <your-jwt-token>
```

### Test Credentials (after seeding)

| Role    | Email                  | Password    |
|---------|------------------------|-------------|
| Admin   | admin@zorvyn.com      | admin123    |
| Analyst | analyst@zorvyn.com    | analyst123  |
| Viewer  | viewer@zorvyn.com     | viewer123   |

---

## Access Control

### Role Permissions Matrix

| Action                    | Viewer | Analyst | Admin |
|--------------------------|--------|---------|-------|
| View dashboard summary   | ✅     | ✅      | ✅    |
| View recent activity     | ✅     | ✅      | ✅    |
| List/view records        | ❌     | ✅      | ✅    |
| View category totals     | ❌     | ✅      | ✅    |
| View trends              | ❌     | ✅      | ✅    |
| Create records           | ❌     | ❌      | ✅    |
| Update records           | ❌     | ❌      | ✅    |
| Delete records           | ❌     | ❌      | ✅    |
| Manage users             | ❌     | ❌      | ✅    |

Access control is enforced via `authorize()` middleware at the route level.

---

## API Endpoints

### Authentication

| Method | Endpoint              | Auth     | Description              |
|--------|----------------------|----------|--------------------------|
| POST   | `/api/auth/register` | Public   | Register a new user      |
| POST   | `/api/auth/login`    | Public   | Login and get JWT token  |
| GET    | `/api/auth/me`       | Required | Get current user profile |

### User Management (Admin Only)

| Method | Endpoint           | Description                       |
|--------|-------------------|-----------------------------------|
| GET    | `/api/users`      | List users (paginated, filterable)|
| GET    | `/api/users/:id`  | Get user by ID                    |
| PUT    | `/api/users/:id`  | Update user (role, status, etc.)  |
| DELETE | `/api/users/:id`  | Delete a user                     |

### Financial Records

| Method | Endpoint            | Access         | Description                          |
|--------|--------------------|----------------|--------------------------------------|
| POST   | `/api/records`     | Admin          | Create a financial record            |
| GET    | `/api/records`     | Analyst, Admin | List records (filtered, paginated)   |
| GET    | `/api/records/:id` | Analyst, Admin | Get record by ID                     |
| PUT    | `/api/records/:id` | Admin          | Update a record                      |
| DELETE | `/api/records/:id` | Admin          | Soft-delete a record                 |

**Query Parameters for `GET /api/records`:**

| Parameter   | Type   | Description                        |
|------------|--------|------------------------------------|
| `type`     | string | Filter by `income` or `expense`    |
| `category` | string | Filter by category                 |
| `startDate`| string | Filter from date (YYYY-MM-DD)      |
| `endDate`  | string | Filter to date (YYYY-MM-DD)        |
| `search`   | string | Search in description/category     |
| `sortBy`   | string | Sort field (date, amount, etc.)    |
| `order`    | string | Sort order (`asc` or `desc`)       |
| `page`     | number | Page number (default: 1)           |
| `limit`    | number | Items per page (default: 20, max: 100) |

### Dashboard Analytics

| Method | Endpoint                          | Access                 | Description              |
|--------|----------------------------------|------------------------|--------------------------|
| GET    | `/api/dashboard/summary`         | Viewer, Analyst, Admin | Income/expense/balance   |
| GET    | `/api/dashboard/category-totals` | Analyst, Admin         | Category-wise breakdown  |
| GET    | `/api/dashboard/trends`          | Analyst, Admin         | Monthly/weekly trends    |
| GET    | `/api/dashboard/recent`          | Viewer, Analyst, Admin | Recent activity          |

---

## Testing

### Run All Tests

```bash
npm test
```

### Run with Coverage

```bash
npm run test:coverage
```

### Test Suites

| Suite              | File                      | Tests |
|-------------------|---------------------------|-------|
| Authentication    | `tests/auth.test.js`      | 14    |
| User Management   | `tests/users.test.js`     | 13    |
| Financial Records | `tests/records.test.js`   | 20    |
| Dashboard         | `tests/dashboard.test.js` | 14    |

Tests use isolated in-memory SQLite databases, ensuring no interference between suites.

---

## Design Decisions & Assumptions

### Architecture

- **Layered Architecture**: Routes → Services → Models → Database. Each layer has a single responsibility, making the code testable and maintainable.
- **Synchronous SQLite**: `better-sqlite3` is chosen over async alternatives. For a single-server finance dashboard, synchronous operations are simpler and actually faster (no callback overhead). In production with high concurrency, a client-server database (PostgreSQL) would be preferred.

### Security

- **Password Hashing**: bcrypt with 12 salt rounds — industry standard for secure password storage.
- **JWT Tokens**: Stateless authentication. Tokens expire in 24 hours. In production, refresh tokens would be added.
- **Rate Limiting**: 100 requests per 15-minute window per IP to prevent abuse.
- **Helmet**: Sets security HTTP headers automatically.
- **Input Validation**: All inputs validated via Joi schemas before hitting business logic.

### Data Modeling

- **Soft Deletes**: Financial records use `is_deleted` flag rather than hard deletes. Financial data should be recoverable and auditable.
- **Predefined Categories**: Categories are enforced via validation. This prevents data inconsistency from typos or free-form input.
- **Timestamps**: `created_at` and `updated_at` on all records for audit trails.

### Access Control

- **Route-level Authorization**: Access control is enforced at the route/middleware level, not buried in business logic. This makes permissions explicit and auditable.
- **Self-protection Guards**: Admins cannot deactivate themselves, delete their own account, or remove their admin role — preventing accidental lockout.

### Assumptions

1. A single admin creates financial records on behalf of the organization (not per-user records)
2. The `viewer` role is designed for read-only dashboard access (summary + recent activity only)
3. Registration is open — in production, only admins should be able to create users
4. Categories are predefined and fixed; adding new categories requires a code change
5. All monetary amounts are stored as floating-point numbers (adequate for dashboard purposes; for accounting-grade precision, a decimal library or integer cents would be used)

---

## Project Structure

```
zorvyn/
├── src/
│   ├── config/
│   │   ├── database.js          # SQLite connection & schema
│   │   └── env.js               # Environment configuration
│   ├── middleware/
│   │   ├── auth.js              # JWT authentication
│   │   ├── authorize.js         # Role-based authorization
│   │   ├── validate.js          # Joi validation
│   │   ├── errorHandler.js      # Global error handler
│   │   └── rateLimiter.js       # Rate limiting
│   ├── models/
│   │   ├── User.js              # User data access
│   │   └── Record.js            # Financial record data access
│   ├── routes/
│   │   ├── auth.routes.js       # Auth endpoints
│   │   ├── user.routes.js       # User management
│   │   ├── record.routes.js     # Financial records
│   │   └── dashboard.routes.js  # Analytics
│   ├── services/
│   │   ├── auth.service.js      # Auth business logic
│   │   ├── user.service.js      # User management logic
│   │   ├── record.service.js    # Record business logic
│   │   └── dashboard.service.js # Analytics logic
│   ├── validators/
│   │   ├── auth.validator.js    # Auth schemas
│   │   ├── user.validator.js    # User schemas
│   │   └── record.validator.js  # Record schemas
│   ├── utils/
│   │   ├── ApiError.js          # Custom error class
│   │   ├── ApiResponse.js       # Response formatting
│   │   └── constants.js         # App constants
│   └── app.js                   # Express app setup
├── tests/                       # Integration test suites
├── seeds/
│   └── seed.js                  # Database seeder
├── server.js                    # Entry point
├── package.json
├── .env.example
├── .gitignore
└── README.md
```

## Features Implemented

- [x] **User and Role Management** — Full lifecycle management for users with assigned roles (Viewer, Analyst, Admin) and status tracking (active/inactive).
- [x] **Financial Records CRUD** — Complete Create, Read, Update, and Soft-Delete operations for financial entries.
- [x] **Record Filtering (by date, category, type)** — Advanced filtering capabilities via query parameters, including search and multi-field sorting.
- [x] **Dashboard Summary APIs (totals, trends)** — Aggregated analytics providing total income, expenses, category breakdowns, and weekly/monthly trends.
- [x] **Role Based Access Control** — Middleware-enforced permissions ensuring that only authorized users can access or modify specific data.
- [x] **Input Validation and Error Handling** — Strict Joi schema validation for all requests paired with a centralized error handling system.
- [x] **Data Persistence (Database)** — Reliable data storage using SQLite with `better-sqlite3`, featuring WAL mode for high-performance concurrent reads.

---

## License

MIT


