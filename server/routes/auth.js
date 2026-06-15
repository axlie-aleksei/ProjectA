const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const authValidator = require("../validator/authValidator");
// Для регистрации оставляем валидатор (там нужна строгая проверка почты)
router.post('/register', authValidator, authController.register);
// Для логина УБИРАЕМ authValidator, так как туда можно вводить и логин, и email
router.post('/login', authController.login);
// Проверка токена/сессии
router.get('/check', authController.checkToken);

module.exports = router;
