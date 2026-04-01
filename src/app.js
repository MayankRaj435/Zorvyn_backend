const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const env = require('./config/env');
const { getDatabase } = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const rateLimiter = require('./middleware/rateLimiter');

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const recordRoutes = require('./routes/record.routes');
const dashboardRoutes = require('./routes/dashboard.routes');

const app = express();

app.use(helmet());
app.use(cors());
app.use(rateLimiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

if (env.nodeEnv !== 'test') {
  app.use(morgan('dev'));
}

getDatabase();

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Zorvyn Finance API',
      version: '1.0.0',
      description: `
## Finance Data Processing & Access Control Backend

A comprehensive finance dashboard API with role-based access control, financial records management, and analytics.

### Authentication
All protected endpoints require a Bearer token in the Authorization header.
Use the \`/api/auth/login\` endpoint to obtain a token.

### Roles
- **Viewer**: Can view dashboard summary and recent activity
- **Analyst**: Can view records, category totals, and trends
- **Admin**: Full access — create, update, delete records and manage users

### Test Credentials
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@zorvyn.com | admin123 |
| Analyst | analyst@zorvyn.com | analyst123 |
| Viewer | viewer@zorvyn.com | viewer123 |
      `,
      contact: {
        name: 'Zorvyn API Support',
      },
    },
    servers: [
      {
        url: `http://localhost:${env.port}`,
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Zorvyn Finance API — Documentation',
}));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/records', recordRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Zorvyn Finance API is running',
    environment: env.nodeEnv,
    timestamp: new Date().toISOString(),
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

app.use(errorHandler);

module.exports = app;

