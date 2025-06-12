const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const {
  register,
  login,
  verifyEmail,
  requestPasswordReset,
  resetPassword,
  updateProfile
} = require('../controllers/authController');

const requireAuth = require('../middleware/authmiddleware');


const storage = multer.memoryStorage();


const upload = multer({ storage });

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Troppe richieste di login. Riprova più tardi.',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * @swagger
 * /api/auth/register:
 * post:
 * summary: Registra un nuovo utente
 * tags: [Autenticazione]
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * required:
 * - username
 * - email
 * - password
 * properties:
 * username:
 * type: string
 * example: johndoe
 * email:
 * type: string
 * example: johndoe@example.com
 * password:
 * type: string
 * example: password123
 * responses:
 * 201:
 * description: Utente registrato con successo
 * 400:
 * description: Email o username già in uso
 * 500:
 * description: Errore durante la registrazione
 */
router.post('/register', register);

/**
 * @swagger
 * /api/auth/login:
 * post:
 * summary: Effettua il login utente
 * tags: [Autenticazione]
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * required:
 * - email
 * - password
 * properties:
 * email:
 * type: string
 * example: johndoe@example.com
 * password:
 * type: string
 * example: password123
 * responses:
 * 200:
 * description: Login effettuato con successo
 * 401:
 * description: Credenziali non valide
 * 403:
 * description: Email non verificata
 * 429:
 * description: Troppe richieste
 * 500:
 * description: Errore durante il login
 */
router.post('/login', loginLimiter, login);

/**
 * @swagger
 * /api/auth/verify-email:
 * get:
 * summary: Verifica l'email dell'utente
 * tags: [Autenticazione]
 * parameters:
 * - in: query
 * name: email
 * required: true
 * schema:
 * type: string
 * description: Email dell'utente da verificare
 * - in: query
 * name: token
 * required: true
 * schema:
 * type: string
 * description: Token di verifica ricevuto via email
 * responses:
 * 200:
 * description: Verifica riuscita
 * 400:
 * description: Token non valido o scaduto
 * 500:
 * description: Errore durante la verifica
 */
router.get('/verify-email', verifyEmail);

/**
 * @swagger
 * /api/auth/request-reset:
 * post:
 * summary: Invia email di reset password
 * tags: [Autenticazione]
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * required: [email]
 * properties:
 * email:
 * type: string
 * example: johndoe@example.com
 * responses:
 * 200:
 * description: Email inviata
 * 400:
 * description: Utente non trovato
 * 500:
 * description: Errore durante la richiesta reset
 */
router.post('/request-reset', requestPasswordReset);

/**
 * @swagger
 * /api/auth/reset-password:
 * post:
 * summary: Reimposta la password tramite token
 * tags: [Autenticazione]
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * required: [email, token, newPassword]
 * properties:
 * email:
 * type: string
 * example: johndoe@example.com
 * token:
 * type: string
 * example: string
 * newPassword:
 * type: string
 * example: nuovaPassword123
 * responses:
 * 200:
 * description: Password aggiornata
 * 400:
 * description: Token non valido o scaduto
 * 500:
 * description: Errore durante il reset
 */
router.post('/reset-password', resetPassword);

/**
 * @swagger
 * /api/auth/update-profile:
 * put:
 * summary: Aggiorna il nome utente e la foto del profilo
 * tags: [Autenticazione]
 * security:
 * - bearerAuth: []
 * requestBody: // Rimosso 'consumes' da qui
 * required: true
 * content:
 * multipart/form-data:
 * schema:
 * type: object
 * properties:
 * username:
 * type: string
 * profilePic:
 * type: string
 * format: binary
 * responses:
 * 200:
 * description: Profilo aggiornato con successo
 * 401:
 * description: Non autorizzato
 * 500:
 * description: Errore durante l'aggiornamento
 */
router.put(
  '/update-profile',
  requireAuth,
  upload.single('profilePic'),
  updateProfile
);

module.exports = router;




