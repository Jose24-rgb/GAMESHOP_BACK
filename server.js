const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const setupSwagger = require('./config/swagger');
const path = require('path');

// Carica le variabili d'ambiente.
// Usa '.env.test' per l'ambiente di test, altrimenti '.env'.
dotenv.config({
  path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env'
});

const app = express();
// Abilita 'trust proxy' se l'applicazione è dietro un proxy/load balancer (come Render).
// Questo è necessario per ottenere l'IP corretto dell'utente per il rate limiting.
app.set('trust proxy', 1);

// Connette l'applicazione al database MongoDB.
connectDB();

// Middleware per la sicurezza dell'applicazione.
// Aggiunge vari header HTTP per proteggere l'app da vulnerabilità comuni.
app.use(helmet());

// --- Configurazione CORS (Cross-Origin Resource Sharing) ---
// Questa configurazione permette al tuo frontend di comunicare con il tuo backend.
// È cruciale per la sicurezza e il funzionamento dell'applicazione distribuita.

// Definisce le origini (URL) consentite.
// 1. 'http://localhost:3000': Permette al tuo frontend locale di connettersi durante lo sviluppo.
// 2. process.env.CLIENT_ORIGIN: Recupera l'URL del tuo frontend di produzione
//    dalla variabile d'ambiente impostata su Render.
//    (Esempio: https://gameshop-front.vercel.app)
// .filter(Boolean) rimuove eventuali valori undefined/null se la variabile non è impostata.
const allowedOrigins = [
  'http://localhost:3000',
  process.env.CLIENT_ORIGIN
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Permetti richieste senza origine (es. applicazioni mobili, richieste curl).
    // Questo è spesso utile ma può essere limitato per maggiore sicurezza se necessario.
    if (!origin) return callback(null, true);

    // Permetti origini esplicitamente elencate nell'array allowedOrigins.
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Permetti qualsiasi sottodominio .vercel.app.
    // Questo è FONDAMENTALE per Vercel, poiché genera URL unici per ogni deploy di preview,
    // garantendo che anche le preview del frontend possano comunicare con il backend.
    if (/\.vercel\.app$/.test(origin)) {
      return callback(null, true);
    }

    // Se l'origine non è consentita da nessuna delle regole precedenti,
    // blocca la richiesta con un errore CORS.
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true, // Permette l'invio di cookie e header di autorizzazione.
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Definisce i metodi HTTP consentiti.
  allowedHeaders: ['Content-Type', 'Authorization'] // Definisce gli header consentiti nelle richieste.
}));

// --- Fine configurazione CORS ---


// 🚫 Limitatore di richieste (Rate Limiting)
// Limita il numero di richieste per IP per prevenire abusi.
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // Finestra di tempo: 15 minuti
  max: 100, // Massimo 100 richieste per IP in 15 minuti
  message: 'Troppe richieste dal tuo IP, riprova più tardi.' // Messaggio di errore quando il limite viene superato
});
app.use(limiter);

// ⚠️ Webhook Stripe: Questa route DEVE essere posizionata PRIMA di express.json().
// I webhook di Stripe richiedono l'accesso al 'raw body' della richiesta
// per la verifica della firma, e express.json() parserebbe il body rendendolo non più raw.
app.use('/api/checkout/webhook', require('./routes/stripeWebhookRoute'));

// 🧠 Middleware per il parsing del corpo JSON
// Parsa il corpo delle richieste in entrata come JSON.
app.use(express.json());

// 📂 Accesso ai file statici caricati
// Rende disponibili i file nella cartella 'uploads' via URL.
// Es. Se carichi 'immagine.jpg', sarà accessibile via /uploads/immagine.jpg
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  // Imposta l'header Cross-Origin-Resource-Policy per la sicurezza.
  // 'cross-origin' permette che le risorse siano caricate da diverse origini.
  setHeaders: (res, path) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  }
}));

// 📊 Documentazione Swagger
// Configura e abilita la documentazione Swagger per le API.
setupSwagger(app);

// --- Aggiungi questa route per la root / ---
// Questa è la route che hai visto quando hai visitato l'URL del backend su Render.
// Serve come semplice health check per verificare che il server sia attivo.
app.get('/', (req, res) => {
  res.send('Backend attivo e funzionante!');
});

// 🌐 API Routes
// Collega i file delle route per le diverse sezioni dell'API.
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/games', require('./routes/gameRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/checkout', require('./routes/stripeRoutes'));
app.use('/api/reviews', require('./routes/reviewRoutes'));

// ✅ Server in ascolto solo se avviato direttamente
// Avvia il server solo se lo script viene eseguito direttamente (non importato come modulo).
if (require.main === module) {
  // Usa la porta dall'ambiente (impostata da Render) o la porta 5000 di default.
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}

// Esporta l'istanza dell'app Express, utile per i test.
module.exports = app;














