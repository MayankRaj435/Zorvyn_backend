const ROLES = {
  VIEWER: 'viewer',
  ANALYST: 'analyst',
  ADMIN: 'admin',
};

const ROLE_VALUES = Object.values(ROLES);

const ROLE_HIERARCHY = {
  [ROLES.VIEWER]: 0,
  [ROLES.ANALYST]: 1,
  [ROLES.ADMIN]: 2,
};

const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
};

const USER_STATUS_VALUES = Object.values(USER_STATUS);

const RECORD_TYPES = {
  INCOME: 'income',
  EXPENSE: 'expense',
};

const RECORD_TYPE_VALUES = Object.values(RECORD_TYPES);

const CATEGORIES = [
  'salary',
  'freelance',
  'investments',
  'food',
  'transport',
  'utilities',
  'entertainment',
  'healthcare',
  'shopping',
  'education',
  'rent',
  'other',
];

const SORT_ORDERS = ['asc', 'desc'];

const SORTABLE_FIELDS = ['date', 'amount', 'category', 'type', 'created_at'];

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

module.exports = {
  ROLES,
  ROLE_VALUES,
  ROLE_HIERARCHY,
  USER_STATUS,
  USER_STATUS_VALUES,
  RECORD_TYPES,
  RECORD_TYPE_VALUES,
  CATEGORIES,
  SORT_ORDERS,
  SORTABLE_FIELDS,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  MAX_LIMIT,
};

