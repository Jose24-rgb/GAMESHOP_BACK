const express = require('express');
const router = express.Router();
const {
  getReviews,
  addReview,
  deleteReview,
  updateReview
} = require('../controllers/reviewController');

const verifyToken = require('../middleware/authmiddleware');

/* Swagger disattivato
/**
 * @swagger
 * tags:
 *   name: Recensioni
 *   description: API per la gestione delle recensioni dei giochi
 */

/* Swagger disattivato
/**
 * @swagger
 * /api/reviews/{gameId}:
 *   get:
 *     summary: Ottieni tutte le recensioni per un gioco
 *     tags: [Recensioni]
 *     parameters:
 *       - in: path
 *         name: gameId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del gioco
 *     responses:
 *       200:
 *         description: Lista delle recensioni
 */
router.get('/:gameId', getReviews);

/* Swagger disattivato
/**
 * @swagger
 * /api/reviews/{gameId}:
 *   post:
 *     summary: Aggiungi una nuova recensione
 *     tags: [Recensioni]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: gameId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rating
 *               - comment
 *             properties:
 *               rating:
 *                 type: number
 *                 example: 5
 *               comment:
 *                 type: string
 *                 example: Gioco spettacolare!
 *     responses:
 *       201:
 *         description: Recensione creata con successo
 *       400:
 *         description: Hai già recensito questo gioco
 *       401:
 *         description: Non autorizzato
 */
router.post('/:gameId', verifyToken, addReview);

/* Swagger disattivato
/**
 * @swagger
 * /api/reviews/{id}:
 *   put:
 *     summary: Modifica una recensione (solo autore)
 *     tags: [Recensioni]
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
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rating:
 *                 type: number
 *                 example: 4
 *               comment:
 *                 type: string
 *                 example: Modifico il mio commento
 *     responses:
 *       200:
 *         description: Recensione aggiornata
 *       403:
 *         description: Non autorizzato
 *       404:
 *         description: Recensione non trovata
 */
router.put('/:id', verifyToken, updateReview);

/* Swagger disattivato
/**
 * @swagger
 * /api/reviews/{id}:
 *   delete:
 *     summary: Elimina una recensione (autore o admin)
 *     tags: [Recensioni]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID recensione
 *     responses:
 *       204:
 *         description: Recensione eliminata
 *       403:
 *         description: Non autorizzato
 *       404:
 *         description: Recensione non trovata
 */
router.delete('/:id', verifyToken, deleteReview);

module.exports = router;




