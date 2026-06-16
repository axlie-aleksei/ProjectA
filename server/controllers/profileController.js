const authService = require('../services/authService');
const profileService = require('../services/profileService');

module.exports = {
  async getProfile(req, res) {
    try {
      // profile must use token user only
      // no user id from browser is trusted
      const user = await authService.verifyToken(req.headers.authorization);
      const profile = await profileService.getProfile(user.id);

      res.json(profile);
    } catch (error) {
      if (
        error.message === 'No token' ||
        error.message === 'Invalid token format' ||
        error.name === 'JsonWebTokenError' ||
        error.name === 'TokenExpiredError'
      ) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      if (error.message === 'User not found') {
        return res.status(404).json({ error: 'User not found' });
      }

      console.error('Error loading profile:', error);
      return res.status(500).json({ error: 'Could not load profile' });
    }
  }
};
