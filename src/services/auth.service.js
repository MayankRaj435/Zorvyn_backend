const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const UserModel = require('../models/User');
const ApiError = require('../utils/ApiError');

class AuthService {
  static async register({ name, email, password, role }) {
    const existingUser = UserModel.findByEmail(email);
    if (existingUser) {
      throw ApiError.conflict('A user with this email already exists');
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = UserModel.create({
      name,
      email,
      password: hashedPassword,
      role: role || 'viewer',
    });

    const token = AuthService.generateToken(user);

    return { user, token };
  }

  static async login({ email, password }) {
    const user = UserModel.findByEmail(email);
    if (!user) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    if (user.status !== 'active') {
      throw ApiError.forbidden('Account is deactivated. Contact an administrator.');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    const token = AuthService.generateToken(user);

    const { password: _, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, token };
  }

  static generateToken(user) {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      env.jwt.secret,
      { expiresIn: env.jwt.expiresIn }
    );
  }

  static getProfile(userId) {
    const user = UserModel.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }
    return user;
  }
}

module.exports = AuthService;

