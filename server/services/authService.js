const db = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

module.exports = {
  async register(data) {
    const hashedPassword = await bcrypt.hash(data.password, 10);

    const [result] = await db.query(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [data.username, data.email, hashedPassword]
    );
    return { id: result.insertId, username: data.username, email: data.email };
  },
  async login(identity, password) {
    console.log(`[СЕРВИС]: Ищем в БД по запросу: "${identity}"`);

    const [rows] = await db.query(
      'SELECT * FROM users WHERE email = ? OR username = ?',
      [identity, identity]
    );

    if (!rows || rows.length === 0) {
      throw new Error('Пользователь не найден');
    }

    const user = rows[0];

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new Error('Неверный пароль');
    }

    // Генерируем токен
    const token = jwt.sign(
      { id: user.id, username: user.username },
      'SECRET_KEY',
      { expiresIn: '7d' }
    );

    // === КРИТИЧЕСКИ ВАЖНО: ЭТОТ RETURN ДОЛЖЕН БЫТЬ ТУТ! ===
    return { token, username: user.username };
  },

  async verifyToken(authHeader) {
    if (!authHeader) throw new Error('No token');

    const token = authHeader.split(' ')[1];
    return jwt.verify(token, 'SECRET_KEY');
  }
};
