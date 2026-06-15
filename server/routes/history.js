const express = require('express');
const router = express.Router();

const historyController = require('../controllers/historyController');

router.get('/progress', historyController.getProgress);
router.post('/progress', historyController.saveProgress);
router.get('/continue', historyController.continueWatching);

module.exports = router;
