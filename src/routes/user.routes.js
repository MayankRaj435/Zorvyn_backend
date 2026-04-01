const express = require('express');
const router = express.Router();
const UserService = require('../services/user.service');
const authenticate = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { updateUserSchema, listUsersQuerySchema } = require('../validators/user.validator');
const ApiResponse = require('../utils/ApiResponse');
const { ROLES } = require('../utils/constants');

router.use(authenticate, authorize(ROLES.ADMIN));

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: List all users (paginated)
 *     tags: [User Management]
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
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive]
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [viewer, analyst, admin]
 *     responses:
 *       200:
 *         description: Users list retrieved
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — Admin only
 */
router.get('/', validate(listUsersQuerySchema, 'query'), (req, res, next) => {
  try {
    const { users, pagination } = UserService.listUsers(req.query);
    ApiResponse.paginated(res, 'Users retrieved successfully', users, pagination);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [User Management]
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
 *         description: User retrieved
 *       404:
 *         description: User not found
 */
router.get('/:id', (req, res, next) => {
  try {
    const user = UserService.getUserById(parseInt(req.params.id, 10));
    ApiResponse.success(res, 200, 'User retrieved successfully', { user });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Update user (role, status, name, email)
 *     tags: [User Management]
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
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [viewer, analyst, admin]
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *     responses:
 *       200:
 *         description: User updated
 *       400:
 *         description: Validation error
 *       404:
 *         description: User not found
 */
router.put('/:id', validate(updateUserSchema), (req, res, next) => {
  try {
    const user = UserService.updateUser(
      parseInt(req.params.id, 10),
      req.body,
      req.user.id
    );
    ApiResponse.success(res, 200, 'User updated successfully', { user });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Delete a user
 *     tags: [User Management]
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
 *         description: User deleted
 *       400:
 *         description: Cannot delete own account
 *       404:
 *         description: User not found
 */
router.delete('/:id', (req, res, next) => {
  try {
    UserService.deleteUser(parseInt(req.params.id, 10), req.user.id);
    ApiResponse.success(res, 200, 'User deleted successfully');
  } catch (error) {
    next(error);
  }
});

module.exports = router;

