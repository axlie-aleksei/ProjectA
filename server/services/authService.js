const db = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const jwtSecret = process.env.JWT_SECRET;

module.exports = {
  async register(data) {
    // service cleans fields again because frontend can be skipped
    const username = typeof data.username === 'string' ? data.username.trim() : '';
    const email = typeof data.email === 'string' ? data.email.trim().toLowerCase() : '';
    const password = typeof data.password === 'string' ? data.password : '';

    if (!username || !email || !password) {
      throw new Error('Fill all fields');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    try {
      const [result] = await db.query(
        'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
        [username, email, hashedPassword]
      );

      return { id: result.insertId, username, email };
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
        // mysql duplicate error is ugly
        // user should get normal account message
        throw new Error('User already exists');
      }

      if (error.code === 'ECONNREFUSED') {
        throw new Error('Database is unavailable');
      }

      throw new Error(error.message || 'Could not create user');
    }
  },
  async login(identity, password) {
    // keep bad input small before db and bcrypt
    if (
      typeof identity !== 'string' ||
      typeof password !== 'string' ||
      identity.length > 255 ||
      password.length > 128
    ) {
      throw new Error('Incorrect password');
    }

    const loginValue = identity.trim();

    const [rows] = await db.query(
      'SELECT * FROM users WHERE email = ? OR username = ?',
      [loginValue, loginValue]
    );

    if (!rows || rows.length === 0) {
      throw new Error('User not found');
    }

    const user = rows[0];

    // old broken rows can have password like zero
    // bcrypt needs a real hash string
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

    // token keeps only public user data
    // algorithm is fixed so token header cannot choose it
    const token = jwt.sign(
      { id: user.id, username: user.username },
      jwtSecret,
      { expiresIn: '7d', algorithm: 'HS256' }
    );

    return { token, username: user.username };
  },

  async verifyToken(authHeader) {
    if (!authHeader) throw new Error('No token');

    // bearer must be exact because loose split can hide bad headers
    const parts = authHeader.split(' ');
    if (parts.length !== 2) {
      throw new Error('Invalid token format');
    }

    const [type, token] = parts;
    if (type !== 'Bearer' || !token) {
      throw new Error('Invalid token format');
    }

    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not set');
    }

    return jwt.verify(token, jwtSecret, { algorithms: ['HS256'] });
  }
};
