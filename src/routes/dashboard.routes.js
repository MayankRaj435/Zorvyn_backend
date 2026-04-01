const express = require('express');
const router = express.Router();
const DashboardService = require('../services/dashboard.service');
const authenticate = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const ApiResponse = require('../utils/ApiResponse');
const { ROLES } = require('../utils/constants');

router.use(authenticate);

/**
 * @swagger
 * /api/dashboard/summary:
 *   get:
 *     summary: Get financial summary (total income, expenses, balance)
 *     tags: [Dashboard Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Financial summary
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalIncome:
 *                       type: number
 *                     totalExpenses:
 *                       type: number
 *                     netBalance:
 *                       type: number
 *                     recordCount:
 *                       type: integer
 */
router.get(
  '/summary',
  authorize(ROLES.VIEWER, ROLES.ANALYST, ROLES.ADMIN),
  (req, res, next) => {
    try {
      const summary = DashboardService.getSummary();
      ApiResponse.success(res, 200, 'Financial summary retrieved successfully', { summary });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/dashboard/category-totals:
 *   get:
 *     summary: Get category-wise totals (Analyst, Admin)
 *     tags: [Dashboard Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [income, expense]
 *         description: Optional filter by record type
 *     responses:
 *       200:
 *         description: Category-wise totals
 */
router.get(
  '/category-totals',
  authorize(ROLES.ANALYST, ROLES.ADMIN),
  (req, res, next) => {
    try {
      const categoryTotals = DashboardService.getCategoryTotals(req.query.type);
      ApiResponse.success(res, 200, 'Category totals retrieved successfully', { categoryTotals });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/dashboard/trends:
 *   get:
 *     summary: Get monthly or weekly trends (Analyst, Admin)
 *     tags: [Dashboard Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [monthly, weekly]
 *           default: monthly
 *       - in: query
 *         name: count
 *         schema:
 *           type: integer
 *           default: 12
 *         description: Number of periods to look back
 *     responses:
 *       200:
 *         description: Trend data
 */
router.get(
  '/trends',
  authorize(ROLES.ANALYST, ROLES.ADMIN),
  (req, res, next) => {
    try {
      const period = req.query.period || 'monthly';
      const count = parseInt(req.query.count, 10) || 12;
      const trends = DashboardService.getTrends(period, count);
      ApiResponse.success(res, 200, 'Trends retrieved successfully', { trends, period });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/dashboard/recent:
 *   get:
 *     summary: Get recent activity (all roles)
 *     tags: [Dashboard Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of recent records to retrieve
 *     responses:
 *       200:
 *         description: Recent activity
 */
router.get(
  '/recent',
  authorize(ROLES.VIEWER, ROLES.ANALYST, ROLES.ADMIN),
  (req, res, next) => {
    try {
      const limit = parseInt(req.query.limit, 10) || 10;
      const recentActivity = DashboardService.getRecentActivity(limit);
      ApiResponse.success(res, 200, 'Recent activity retrieved successfully', { recentActivity });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;

