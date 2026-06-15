require('dotenv').config({ path: `${__dirname}/../.env`, quiet: true });

const path = require('path');
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const contentRoutes = require('./routes/content');
const historyRoutes = require('./routes/history');
const staticFiles = require('./middleware/staticFiles');

const app = express();
const PORT = process.env.PORT || 3001;
const ONE_WEEK = 1000 * 60 * 60 * 24 * 7;

app.use(express.json());
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

app.use(helmet.noSniff());

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

app.use(session({
  name: 'anime_session',
  secret: process.env.SESSION_SECRET || 'default_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: ONE_WEEK
  }
}));

app.use(cors({
  origin: true,
  credentials: true
}));

// api routes must stay before html pages so staticfiles cannot catch auth content or history
app.use('/auth', authLimiter, authRoutes);
app.use('/content', contentRoutes);
app.use('/history', historyRoutes);

app.use(express.static(path.join(__dirname, '..', 'public')));
staticFiles(app);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Server error' });
});

app.listen(PORT, () => {
  console.log(`Server started at http://localhost:${PORT}`);
});
