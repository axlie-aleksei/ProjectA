require("dotenv").config({ path: __dirname + "/../.env", quiet: true });

const path = require("path");
const express = require('express');
const session = require('express-session');
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const authRoutes = require('./routes/auth');
const staticFiles = require("./middleware/staticFiles");

const app = express();

// 1. ПАРСЕРЫ И СЕКЬЮРИТИ (Всегда идут первыми)
app.use(express.json());
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

app.use(helmet.noSniff({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: [
        "'self'",
        "http://localhost:3000",
        "https://cdn.jsdelivr.net"
      ],
      styleSrc: ["'self'", "https://cdn.jsdelivr.net"],
      scriptSrc: ["'self'", "https://cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
    },
  },
}));

app.use("/api", rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
}));

app.use(session({
  name: "rent_session",
  secret: process.env.SESSION_SECRET || "default_secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 1000 * 60 * 60 * 24 * 7
  }
}));

app.use(cors({
  origin: true,
  credentials: true
}));

// Логгер для дебага (пусть стоит повыше роутов, чтобы мы видели ВСЕ запросы)
app.use((req, res, next) => {
  console.log(`[Запрос отправлен]: Метод: ${req.method} | Путь: ${req.url}`);
  next();
});

// 2. НАСТОЯЩИЕ API РОУТЫ (Должны быть ВЫШЕ статических файлов!)
console.log("=== ЛОГ СТАРТА: Начинаем подключение роутов ===");
app.use("/auth", authRoutes);
console.log("2. Роуты app.use('/auth', authRoutes) успешно зарегистрированы!");
console.log("=== КОНЕЦ БЛОКА ПРОВЕРКИ РОУТОВ ===");

// 3. СТАТИКА И ФАЙЛЫ (Идут ниже роутов, чтобы не перехватывать API)
app.use(express.static(path.join(__dirname, "..", "public")));
staticFiles(app); // Тот самый "жадный" мидлвар теперь в самом низу!

// 4. ОБРАБОТКА ОШИБОК (Всегда в самом конце)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "server error" });
});

const PORT = process.env.PORT || 3001;
console.log("PORT from env:", process.env.PORT);

app.listen(PORT, () => {
  console.log(`Server started at http://localhost:${PORT}`);
});
