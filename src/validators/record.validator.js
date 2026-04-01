const Joi = require('joi');
const { RECORD_TYPE_VALUES, CATEGORIES, SORT_ORDERS, SORTABLE_FIELDS } = require('../utils/constants');

const createRecordSchema = Joi.object({
  amount: Joi.number()
    .positive()
    .precision(2)
    .required()
    .messages({
      'number.positive': 'Amount must be a positive number',
      'any.required': 'Amount is required',
    }),

  type: Joi.string()
    .valid(...RECORD_TYPE_VALUES)
    .required()
    .messages({
      'any.only': `Type must be one of: ${RECORD_TYPE_VALUES.join(', ')}`,
      'any.required': 'Type is required',
    }),

  category: Joi.string()
    .valid(...CATEGORIES)
    .required()
    .messages({
      'any.only': `Category must be one of: ${CATEGORIES.join(', ')}`,
      'any.required': 'Category is required',
    }),

  date: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .required()
    .messages({
      'string.pattern.base': 'Date must be in YYYY-MM-DD format',
      'any.required': 'Date is required',
    }),

  description: Joi.string()
    .trim()
    .max(500)
    .allow('', null)
    .optional()
    .messages({
      'string.max': 'Description must not exceed 500 characters',
    }),
});

const updateRecordSchema = Joi.object({
  amount: Joi.number()
    .positive()
    .precision(2)
    .optional()
    .messages({
      'number.positive': 'Amount must be a positive number',
    }),

  type: Joi.string()
    .valid(...RECORD_TYPE_VALUES)
    .optional()
    .messages({
      'any.only': `Type must be one of: ${RECORD_TYPE_VALUES.join(', ')}`,
    }),

  category: Joi.string()
    .valid(...CATEGORIES)
    .optional()
    .messages({
      'any.only': `Category must be one of: ${CATEGORIES.join(', ')}`,
    }),

  date: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Date must be in YYYY-MM-DD format',
    }),

  description: Joi.string()
    .trim()
    .max(500)
    .allow('', null)
    .optional()
    .messages({
      'string.max': 'Description must not exceed 500 characters',
    }),
}).min(1).messages({
  'object.min': 'At least one field must be provided for update',
});

const listRecordsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  type: Joi.string().valid(...RECORD_TYPE_VALUES).optional(),
  category: Joi.string().valid(...CATEGORIES).optional(),
  startDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional().messages({
    'string.pattern.base': 'startDate must be in YYYY-MM-DD format',
  }),
  endDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional().messages({
    'string.pattern.base': 'endDate must be in YYYY-MM-DD format',
  }),
  search: Joi.string().trim().max(100).optional(),
  sortBy: Joi.string().valid(...SORTABLE_FIELDS).default('date'),
  order: Joi.string().valid(...SORT_ORDERS).default('desc'),
});

module.exports = { createRecordSchema, updateRecordSchema, listRecordsQuerySchema };

