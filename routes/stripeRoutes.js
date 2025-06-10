const express = require('express');
const router = express.Router();
const { createCheckoutSession } = require('../controllers/stripeController');

/**
 * @swagger
 * /api/checkout/create-checkout-session:
 *   post:
 *     summary: Crea una sessione di pagamento con Stripe
 *     tags: [Pagamento]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, games]
 *             properties:
 *               userId:
 *                 type: string
 *               games:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     title:
 *                       type: string
 *                     price:
 *                       type: number
 *                     quantity:
 *                       type: number
 *     responses:
 *       200:
 *         description: URL di checkout creato
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url:
 *                   type: string
 */
router.post('/create-checkout-session', createCheckoutSession);

module.exports = router;










