const express = require('express');
const router = express.Router();
const RecordService = require('../services/record.service');
const authenticate = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const validate = require('../middleware/validate');
const {
  createRecordSchema,
  updateRecordSchema,
  listRecordsQuerySchema,
} = require('../validators/record.validator');
const ApiResponse = require('../utils/ApiResponse');
const { ROLES } = require('../utils/constants');

router.use(authenticate);

/**
 * @swagger
 * components:
 *   schemas:
 *     FinancialRecord:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         amount:
 *           type: number
 *         type:
 *           type: string
 *           enum: [income, expense]
 *         category:
 *           type: string
 *         date:
 *           type: string
 *           format: date
 *         description:
 *           type: string
 *         created_by:
 *           type: integer
 *         created_by_name:
 *           type: string
 *         is_deleted:
 *           type: integer
 *         created_at:
 *           type: string
 *         updated_at:
 *           type: string
 */

/**
 * @swagger
 * /api/records:
 *   post:
 *     summary: Create a financial record (Admin only)
 *     tags: [Financial Records]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount, type, category, date]
 *             properties:
 *               amount:
 *                 type: number
 *                 example: 5000
 *               type:
 *                 type: string
 *                 enum: [income, expense]
 *                 example: income
 *               category:
 *                 type: string
 *                 example: salary
 *               date:
 *                 type: string
 *                 format: date
 *                 example: "2025-03-15"
 *               description:
 *                 type: string
 *                 example: Monthly salary
 *     responses:
 *       201:
 *         description: Record created
 *       400:
 *         description: Validation error
 *       403:
 *         description: Forbidden — Admin only
 */
router.post(
  '/',
  authorize(ROLES.ADMIN),
  validate(createRecordSchema),
  (req, res, next) => {
    try {
      const record = RecordService.createRecord(req.body, req.user.id);
      ApiResponse.created(res, 'Financial record created successfully', { record });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/records:
 *   get:
 *     summary: List financial records with filtering (Analyst, Admin)
 *     tags: [Financial Records]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [income, expense]
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [date, amount, category, type, created_at]
 *           default: date
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *     responses:
 *       200:
 *         description: Records list retrieved
 *       403:
 *         description: Forbidden — Analyst or Admin only
 */
router.get(
  '/',
  authorize(ROLES.ANALYST, ROLES.ADMIN),
  validate(listRecordsQuerySchema, 'query'),
  (req, res, next) => {
    try {
      const { records, pagination } = RecordService.listRecords(req.query);
      ApiResponse.paginated(res, 'Financial records retrieved successfully', records, pagination);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/records/{id}:
 *   get:
 *     summary: Get a financial record by ID (Analyst, Admin)
 *     tags: [Financial Records]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Record retrieved
 *       404:
 *         description: Record not found
 */
router.get(
  '/:id',
  authorize(ROLES.ANALYST, ROLES.ADMIN),
  (req, res, next) => {
    try {
      const record = RecordService.getRecordById(parseInt(req.params.id, 10));
      ApiResponse.success(res, 200, 'Financial record retrieved successfully', { record });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/records/{id}:
 *   put:
 *     summary: Update a financial record (Admin only)
 *     tags: [Financial Records]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *               type:
 *                 type: string
 *                 enum: [income, expense]
 *               category:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Record updated
 *       400:
 *         description: Validation error
 *       404:
 *         description: Record not found
 */
router.put(
  '/:id',
  authorize(ROLES.ADMIN),
  validate(updateRecordSchema),
  (req, res, next) => {
    try {
      const record = RecordService.updateRecord(parseInt(req.params.id, 10), req.body);
      ApiResponse.success(res, 200, 'Financial record updated successfully', { record });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/records/{id}:
 *   delete:
 *     summary: Soft-delete a financial record (Admin only)
 *     tags: [Financial Records]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Record deleted (soft)
 *       404:
 *         description: Record not found
 */
router.delete(
  '/:id',
  authorize(ROLES.ADMIN),
  (req, res, next) => {
    try {
      RecordService.deleteRecord(parseInt(req.params.id, 10));
      ApiResponse.success(res, 200, 'Financial record deleted successfully');
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;

