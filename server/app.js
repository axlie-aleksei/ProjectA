require('dotenv').config({ path: `${__dirname}/../.env`, quiet: true });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const contentRoutes = require('./routes/content');
const historyRoutes = require('./routes/history');
const profileRoutes = require('./routes/profile');
const videoRoutes = require('./routes/video');
const staticFiles = require('./middleware/staticFiles');

const app = express();
const PORT = process.env.PORT || 3001;

// browser should talk only with this local server
const allowedOrigins = new Set([
  `http://localhost:${PORT}`,
  `http://127.0.0.1:${PORT}`
]);

app.disable('x-powered-by');
app.use(express.json({ limit: '10kb', strict: true }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// helmet adds basic browser security headers
// csp says what this site is allowed to load
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'", 'https:', 'data:'],
      mediaSrc: ["'self'", 'http://localhost:8080', 'http://127.0.0.1:8080'],
      frameSrc: ['https://www.youtube.com'],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"]
    }
  }
}));

// login and register are easier to spam so they get smaller limit
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false
});

// normal api routes can be called more often by the page
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false
});

// video makes many range requests while user watches
// this limit is higher so player does not stop too early
const videoLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2000,
  standardHeaders: true,
  legacyHeaders: false
});

app.use(cors({
  origin(origin, callback) {
    // same origin requests have no origin header
    // this is normal for pages from our own server
    if (!origin || allowedOrigins.has(origin)) {
      return callback(null, true);
    }

    return callback(null, false);
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// api routes must stay before html pages so staticfiles cannot catch them
app.use('/auth', authLimiter, authRoutes);
app.use('/content', apiLimiter, contentRoutes);
app.use('/history', apiLimiter, historyRoutes);
app.use('/profile', apiLimiter, profileRoutes);
app.use('/video', videoLimiter, videoRoutes);

staticFiles(app);

app.use((err, req, res, next) => {
  // real error stays in terminal
  // browser gets only simple safe text
  console.error(err);
  res.status(500).json({ error: 'Server error' });
});

app.listen(PORT, () => {
  console.log(`Server started at http://localhost:${PORT}`);
});
