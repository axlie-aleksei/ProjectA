const db = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const jwtSecret = process.env.JWT_SECRET;

module.exports = {
  async register(data) {
    if (!data.username || !data.email || !data.password) {
      throw new Error('Fill all fields');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    try {
      const [result] = await db.query(
        'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
        [data.username, data.email, hashedPassword]
      );

      return { id: result.insertId, username: data.username, email: data.email };
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
        throw new Error('User already exists');
      }

      if (error.code === 'ECONNREFUSED') {
        throw new Error('Database is unavailable');
      }

      throw new Error(error.message || 'Could not create user');
    }
  },
  async login(identity, password) {
    const [rows] = await db.query(
      'SELECT * FROM users WHERE email = ? OR username = ?',
      [identity, identity]
    );

    if (!rows || rows.length === 0) {
      throw new Error('User not found');
    }

    const user = rows[0];

    const savedPassword = user.password;
    if (typeof savedPassword !== 'string' || !savedPassword.startsWith('$2')) {
      throw new Error('Incorrect password');
    }

    const isMatch = await bcrypt.compare(password, savedPassword);
    if (!isMatch) {
      throw new Error('Incorrect password');
    }

    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not set');
    }

    const token = jwt.sign(
      { id: user.id, username: user.username },
      jwtSecret,
      { expiresIn: '7d' }
    );

    return { token, username: user.username };
  },

  async verifyToken(authHeader) {
    if (!authHeader) throw new Error('No token');

    const [type, token] = authHeader.split(' ');
    if (type !== 'Bearer' || !token) {
      throw new Error('Invalid token format');
    }

    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not set');
    }

    return jwt.verify(token, jwtSecret);
  }
};
