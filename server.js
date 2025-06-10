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

// 📦 Connessione al database
connectDB();

// 🛡 Sicurezza base con Helmet
app.use(helmet());

// 🌍 CORS (completo)
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 🚫 Limita richieste eccessive
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Troppe richieste dal tuo IP, riprova più tardi.'
});
app.use(limiter);

// ⚠️ Stripe webhook deve venire PRIMA del parser JSON
app.use('/api/checkout/webhook', require('./routes/stripeWebhookRoute'));

// ✅ Middleware per parse JSON
app.use(express.json());

// ✅ Servire le immagini caricate dal client con header CORS FIX
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res, path) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'); // ⬅️ NECESSARIO
  }
}));

// 📚 Swagger API docs
setupSwagger(app);

// 📦 Rotte API
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/games', require('./routes/gameRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/checkout', require('./routes/stripeRoutes'));
app.use('/api/reviews', require('./routes/reviewRoutes'));

// 📤 Rotta Stripe Webhook (duplicata ma lasciata)
app.use('/api/checkout/webhook', require('./routes/stripeWebhookRoute'));

module.exports = app;

// 🚀 Avvio server (solo se eseguito direttamente)
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}                                                













