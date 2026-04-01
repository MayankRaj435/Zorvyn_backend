const UserModel = require('../models/User');
const ApiError = require('../utils/ApiError');
const { DEFAULT_PAGE, DEFAULT_LIMIT } = require('../utils/constants');

class UserService {
  static listUsers(query = {}) {
    const page = query.page || DEFAULT_PAGE;
    const limit = query.limit || DEFAULT_LIMIT;

    const { users, total } = UserModel.findAll({
      page,
      limit,
      status: query.status,
      role: query.role,
    });

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static getUserById(id) {
    const user = UserModel.findById(id);
    if (!user) {
      throw ApiError.notFound(`User with ID ${id} not found`);
    }
    return user;
  }

  static updateUser(id, updates, requestingUserId) {
    const user = UserModel.findById(id);
    if (!user) {
      throw ApiError.notFound(`User with ID ${id} not found`);
    }

    if (id === requestingUserId && updates.status === 'inactive') {
      throw ApiError.badRequest('You cannot deactivate your own account');
    }

    if (id === requestingUserId && updates.role && updates.role !== 'admin') {
      throw ApiError.badRequest('You cannot change your own role');
    }

    if (updates.email && updates.email !== user.email) {
      const existingUser = UserModel.findByEmail(updates.email);
      if (existingUser) {
        throw ApiError.conflict('A user with this email already exists');
      }
    }

    return UserModel.update(id, updates);
  }

  static deleteUser(id, requestingUserId) {
    if (id === requestingUserId) {
      throw ApiError.badRequest('You cannot delete your own account');
    }

    const user = UserModel.findById(id);
    if (!user) {
      throw ApiError.notFound(`User with ID ${id} not found`);
    }

    return UserModel.delete(id);
  }
}

module.exports = UserService;

