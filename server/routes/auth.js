const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const authValidator = require('../validator/authValidator');

// register needs strict fields
router.post('/register', authValidator, authController.register);

// login can use username or email
// because of this we do not use register validator here
router.post('/login', authController.login);

// check token for navbar and protected pages
router.get('/check', authController.checkToken);

module.exports = router;
