const Joi = require('joi');
const { ROLE_VALUES, USER_STATUS_VALUES } = require('../utils/constants');

const updateUserSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .optional()
    .messages({
      'string.min': 'Name must be at least 2 characters',
      'string.max': 'Name must not exceed 100 characters',
    }),

  email: Joi.string()
    .trim()
    .lowercase()
    .email()
    .optional()
    .messages({
      'string.email': 'Please provide a valid email address',
    }),

  role: Joi.string()
    .valid(...ROLE_VALUES)
    .optional()
    .messages({
      'any.only': `Role must be one of: ${ROLE_VALUES.join(', ')}`,
    }),

  status: Joi.string()
    .valid(...USER_STATUS_VALUES)
    .optional()
    .messages({
      'any.only': `Status must be one of: ${USER_STATUS_VALUES.join(', ')}`,
    }),
}).min(1).messages({
  'object.min': 'At least one field must be provided for update',
});

const listUsersQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  status: Joi.string().valid(...USER_STATUS_VALUES).optional(),
  role: Joi.string().valid(...ROLE_VALUES).optional(),
});

module.exports = { updateUserSchema, listUsersQuerySchema };

