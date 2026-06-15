const express = require('express');
const router = express.Router();

const contentController = require('../controllers/contentController');

router.get('/', contentController.list);
router.get('/options', contentController.options);

module.exports = router;
