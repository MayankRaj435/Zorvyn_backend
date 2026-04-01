const ApiError = require('../utils/ApiError');
const { ROLE_HIERARCHY } = require('../utils/constants');

function authorize(...allowedRoles) {
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw ApiError.unauthorized('Authentication required');
      }

      const userRole = req.user.role;

      if (!allowedRoles.includes(userRole)) {
        throw ApiError.forbidden(
          `Role '${userRole}' does not have permission to perform this action. Required: ${allowedRoles.join(', ')}`
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

function authorizeMinRole(minRole) {
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw ApiError.unauthorized('Authentication required');
      }

      const userLevel = ROLE_HIERARCHY[req.user.role];
      const requiredLevel = ROLE_HIERARCHY[minRole];

      if (userLevel === undefined || requiredLevel === undefined) {
        throw ApiError.internal('Invalid role configuration');
      }

      if (userLevel < requiredLevel) {
        throw ApiError.forbidden(
          `Minimum role '${minRole}' required. Your role: '${req.user.role}'`
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

module.exports = { authorize, authorizeMinRole };

