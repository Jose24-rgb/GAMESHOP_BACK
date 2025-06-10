const express = require('express');
const router = express.Router();
const { createOrder, getUserOrders } = require('../controllers/orderController');
const verifyToken = require('../middleware/authmiddleware');

/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Crea un nuovo ordine
 *     tags: [Ordini]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *               games:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     gameId:
 *                       type: string
 *                     quantity:
 *                       type: number
 *               total:
 *                 type: number
 *             example:
 *               userId: "60b6c0c1f1c2b530cc98e6d1"
 *               games:
 *                 - gameId: "60b6c0c1f1c2b530cc98e6d2"
 *                   quantity: 2
 *               total: 119.98
 *     responses:
 *       201:
 *         description: Ordine creato con successo
 */
router.post('/', createOrder);

/**
 * @swagger
 * /api/orders/{userId}:
 *   get:
 *     summary: Ottieni gli ordini dell'utente
 *     tags: [Ordini]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: userId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista degli ordini
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Order'
 *       403:
 *         description: Accesso negato
 */
router.get('/:userId', verifyToken, async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (req.user.id !== userId && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Accesso negato: non autorizzato' });
    }

    return getUserOrders(req, res, next);
  } catch (err) {
    console.error('Errore nella route GET /orders/:userId:', err);
    return res.status(500).json({ error: 'Errore interno del server' });
  }
});

module.exports = router;



