const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const setupSwagger = require('./config/swagger');
const path = require('path');

dotenv.config({
  path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env'
});

const app = express();

app.set('trust proxy', 1);

connectDB();

app.use(helmet());

const allowedOrigins = [
  'http://localhost:3000',
  process.env.CLIENT_ORIGIN
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    if (/\.vercel\.app$/.test(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Troppe richieste dal tuo IP, riprova più tardi.'
});
app.use(limiter);

// Webhook
app.use('/api/checkout/webhook', require('./routes/stripeWebhookRoute'));

app.use(express.json());

// Static for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res, path) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  }
}));

setupSwagger(app);

// API routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/games', require('./routes/gameRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/checkout', require('./routes/stripeRoutes'));
app.use('/api/reviews', require('./routes/reviewRoutes'));

// Route di test
app.get('/', (req, res) => {
  res.send('Backend attivo e funzionante!');
});

// Serve frontend React statico in produzione
if (process.env.NODE_ENV === 'production') {
  const clientPath = path.join(__dirname, 'client', 'dist'); // o 'build' per CRA
  app.use(express.static(clientPath));

  app.get('*', (req, res) => {
    res.sendFile(path.join(clientPath, 'index.html'));
  });
}

// Avvio server solo se eseguito direttamente
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}

module.exports = app;














