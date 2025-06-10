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
  'https://gameshop-front-q0c1cg1ig-jose24-rgbs-projects.vercel.app', // Vercel frontend
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 🚫 Limitatore di richieste
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Troppe richieste dal tuo IP, riprova più tardi.'
});
app.use(limiter);

// ⚠️ Webhook Stripe: PRIMA di express.json()
app.use('/api/checkout/webhook', require('./routes/stripeWebhookRoute'));

// 🧠 Middleware JSON
app.use(express.json());

// 📂 Accesso ai file statici caricati
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res, path) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  }
}));

// 📊 Documentazione Swagger
setupSwagger(app);

// 🌐 API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/games', require('./routes/gameRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/checkout', require('./routes/stripeRoutes'));
app.use('/api/reviews', require('./routes/reviewRoutes'));

// ✅ Server in ascolto solo se avviato direttamente
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}

module.exports = app;



  













