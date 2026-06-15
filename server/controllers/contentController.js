const contentService = require('../services/contentService');

module.exports = {
  async options(req, res) {
    try {
      const options = await contentService.getFilterOptions();
      res.json(options);
    } catch (error) {
      console.error('Error loading filter options:', error);
      res.status(500).json({ error: 'Could not load filters' });
    }
  },

  async list(req, res) {
    try {
      const ids = await contentService.getFilteredContentIds(req.query);
      res.json({ ids });
    } catch (error) {
      console.error('Error loading content:', error);
      res.status(500).json({ error: 'Could not load content' });
    }
  }
};
