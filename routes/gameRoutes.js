const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');

const {
  getAllGames,
  getGameById,
  createGame,
  updateGame,
  deleteGame
} = require('../controllers/gameController');

const verifyToken = require('../middleware/authmiddleware');
const isAdmin = require('../middleware/isAdmin');

/* Swagger disattivato
/**
 * @swagger
 * /api/games:
 *   get:
 *     summary: Ottieni tutti i giochi
 *     tags: [Giochi]
 *     responses:
 *       200:
 *         description: Lista di giochi
 */
router.get('/', getAllGames);

/* Swagger disattivato
/**
 * @swagger
 * /api/games/{id}:
 *   get:
 *     summary: Ottieni un gioco specifico per ID
 *     tags: [Giochi]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Gioco trovato
 *       404:
 *         description: Gioco non trovato
 */
router.get('/:id', getGameById);

/* Swagger disattivato
/**
 * @swagger
 * /api/games:
 *   post:
 *     summary: Crea un nuovo gioco (solo admin)
 *     tags: [Giochi]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               genre:
 *                 type: string
 *               price:
 *                 type: number
 *               description:
 *                 type: string
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Gioco creato con successo
 */
router.post('/', verifyToken, isAdmin, upload.single('image'), createGame);

/* Swagger disattivato
/**
 * @swagger
 * /api/games/{id}:
 *   put:
 *     summary: Aggiorna un gioco esistente (solo admin)
 *     tags: [Giochi]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               genre:
 *                 type: string
 *               price:
 *                 type: number
 *               description:
 *                 type: string
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Gioco aggiornato
 *       404:
 *         description: Gioco non trovato
 */
router.put('/:id', verifyToken, isAdmin, upload.single('image'), updateGame);

/* Swagger disattivato
/**
 * @swagger
 * /api/games/{id}:
 *   delete:
 *     summary: Elimina un gioco (solo admin)
 *     tags: [Giochi]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Gioco eliminato
 *       404:
 *         description: Gioco non trovato
 */
router.delete('/:id', verifyToken, isAdmin, deleteGame);

module.exports = router;





