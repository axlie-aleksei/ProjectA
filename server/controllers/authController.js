const authService = require('../services/authService');

const loginErrors = new Set([
  'User not found',
  'Incorrect password'
]);

const registerErrors = new Set([
  'Fill all fields',
  'User already exists'
]);

module.exports = {
  async register(req, res) {
    try {
      const user = await authService.register(req.body);
      res.status(201).json({ user });
    } catch (error) {
      if (registerErrors.has(error.message)) {
        return res.status(400).json({ error: error.message });
      }

      if (error.message === 'Database is unavailable') {
        return res.status(503).json({ error: error.message });
      }

      console.error('Error server register:', error);
      return res.status(500).json({ error: 'Error server register' });
    }
  },

  async login(req, res) {
    const { identity, password } = req.body;

    if (!identity || !password) {
      return res.status(400).json({ error: 'Fill all fields' });
    }

    try {
      const { token, username } = await authService.login(identity, password);

      return res.status(200).json({
        token,
        username
      });
    } catch (error) {
      if (loginErrors.has(error.message)) {
        return res.status(400).json({ error: 'Incorrect login or password' });
      }

      console.error('Error server auth:', error);
      return res.status(500).json({ error: 'Error server auth' });
    }
  },

  async checkToken(req, res) {
    try {
      const user = await authService.verifyToken(req.headers.authorization);
      res.json({ user });
    } catch (err) {
      res.status(401).json({ error: 'Invalid token' });
    }
  }
};
