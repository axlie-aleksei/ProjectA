const authService = require('../services/authService');
const historyService = require('../services/historyService');

module.exports = {
  async getProgress(req, res) {
    try {
      // token decides who owns saved time
      // query only chooses anime and episode
      const user = await authService.verifyToken(req.headers.authorization);
      const item = await historyService.getWatchProgress(user.id, req.query);

      res.json({ item });
    } catch (error) {
      if (
        error.message === 'No token' ||
        error.message === 'Invalid token format' ||
        error.name === 'JsonWebTokenError' ||
        error.name === 'TokenExpiredError'
      ) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      if (
        error.message === 'Invalid content' ||
        error.message === 'Invalid episode' ||
        error.message === 'Episode not found'
      ) {
        return res.status(400).json({ error: error.message });
      }

      console.error('Error loading watch progress:', error);
      return res.status(500).json({ error: 'Could not load progress' });
    }
  },

  async saveProgress(req, res) {
    try {
      // never trust user id from body
      // token is the only source of current user
      const user = await authService.verifyToken(req.headers.authorization);
      const item = await historyService.saveWatchProgress(user.id, req.body);

      res.status(201).json({ item });
    } catch (error) {
      if (
        error.message === 'No token' ||
        error.message === 'Invalid token format' ||
        error.name === 'JsonWebTokenError' ||
        error.name === 'TokenExpiredError'
      ) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      if (
        error.message === 'Invalid content' ||
        error.message === 'Invalid episode' ||
        error.message === 'Episode not found'
      ) {
        return res.status(400).json({ error: error.message });
      }

      console.error('Error saving watch history:', error);
      return res.status(500).json({ error: 'Could not save history' });
    }
  },

  async continueWatching(req, res) {
    try {
      // continue list is based on this user only
      // db filters empty progress rows
      const user = await authService.verifyToken(req.headers.authorization);
      const ids = await historyService.getContinueContentIds(user.id);

      res.json({ ids });
    } catch (error) {
      if (
        error.message === 'No token' ||
        error.message === 'Invalid token format' ||
        error.name === 'JsonWebTokenError' ||
        error.name === 'TokenExpiredError'
      ) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      console.error('Error loading watch history:', error);
      return res.status(500).json({ error: 'Could not load history' });
    }
  }
};
