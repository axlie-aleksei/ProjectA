const authService = require('../services/authService');

module.exports = {
  // 1. РЕГИСТРАЦИЯ
  async register(req, res) {
    try {
      const user = await authService.register(req.body);
      res.status(201).json({ message: 'User created', user });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },

  // 2. ВХОД (ЛОГИН)
  async login(req, res) {
    console.log("\n============================================");
    console.log("=== [БЭКЕНД] КТО-ТО ПЫТАЕТСЯ ВОЙТИ ===");
    console.log("Данные из формы (req.body):", req.body);
    console.log("============================================");

    const { identity, password } = req.body;

    // Проверка на пустые поля
    if (!identity || !password) {
      console.log("❌ Ошибка: Фронтенд прислал пустые поля!");
      return res.status(400).json({ error: "Заполните все поля" });
    }

    try {
      console.log(`[КОНТРОЛЛЕР]: Передаем данные в authService для: "${identity}"`);

      // Вызываем исправленный метод login из authService
      // Он сам сходит в БД через db.query, проверит bcrypt и создаст JWT-токен
      const result = await authService.login(identity, password);

      // result содержит { token, username }, которые вернул сервис
      console.log(`✅ УСПЕХ: Пользователь ${result.username} успешно авторизован!`);

      // Отправляем токен и юзернейм обратно на фронтенд
      return res.status(200).json({
        message: "Вход выполнен успешно",
        token: result.token,
        username: result.username
      });

    } catch (error) {
      console.log("❌ Ошибка при авторизации:", error.message);

      // Если сервис выбросил понятную ошибку, отдаем её клиенту
      if (error.message === 'Пользователь не найден' || error.message === 'Неверный пароль') {
        return res.status(400).json({ error: "Неверный логин/email или пароль" });
      }

      // На случай непредвиденных падений (например, если БД отключилась)
      console.error("💥 КРИТИЧЕСКАЯ ОШИБКА НА БЭКЕНДЕ:", error);
      return res.status(500).json({ error: "Ошибка сервера при авторизации" });
    }
  },

  // 3. ПРОВЕРКА ТОКЕНА
  async checkToken(req, res) {
    try {
      const user = await authService.verifyToken(req.headers.authorization);
      res.json({ user });
    } catch (err) {
      res.status(401).json({ error: 'Invalid token' });
    }
  }
};
