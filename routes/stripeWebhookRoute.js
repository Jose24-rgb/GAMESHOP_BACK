const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Order = require('../models/Order');
const Game = require('../models/Game');
const User = require('../models/User');
const sendOrderEmail = require('../utils/email'); // Assicurati che questo sia il percorso corretto per il tuo modulo email
const mongoose = require('mongoose');

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Recupera l'URL base del frontend dalla variabile d'ambiente
const frontendBaseUrl = process.env.CLIENT_ORIGIN || 'http://localhost:3000';

const successEmailHtml = ({ username, orderId, total, date, ordersUrl }) => `
  <div style="font-family: Arial, sans-serif; color: #333; padding: 20px;">
    <h2 style="color: #28a745;">✅ Ordine completato con successo!</h2>
    <p>Ciao <strong>${username}</strong>,</p>
    <p>Grazie per il tuo acquisto! Il tuo ordine è stato registrato correttamente.</p>

    <h3 style="color: #007bff;">📦 Dettagli ordine</h3>
    <ul>
      <li><strong>ID Ordine:</strong> ${orderId}</li>
      <li><strong>Totale:</strong> € ${total.toFixed(2)}</li>
      <li><strong>Data:</strong> ${new Date(date).toLocaleString('it-IT', {
        dateStyle: 'short',
        timeStyle: 'short'
      })}</li>
    </ul>

    <p>Puoi consultare i tuoi ordini <a href="${ordersUrl}" target="_blank">qui</a>.</p>
    <hr style="margin-top: 30px;">
    <p style="font-size: 12px; color: #888;">Questa è una mail automatica, non rispondere a questo messaggio.</p>
  </div>
`;

const errorEmailHtml = ({ username, orderId, date }) => `
  <div style="font-family: Arial, sans-serif; color: #333; padding: 20px;">
    <h2 style="color: #dc3545;">❌ Pagamento fallito</h2>
    <p>Ciao <strong>${username}</strong>,</p>
    <p>Il tuo ordine <strong>${orderId}</strong> non è stato completato a causa di fondi insufficienti sulla carta.</p>
    <p><strong>Data tentativo:</strong> ${new Date(date).toLocaleString('it-IT', {
      dateStyle: 'short',
      timeStyle: 'short'
    })}</p>
    <p>Ti invitiamo a riprovare con un metodo di pagamento valido.</p>
    <hr style="margin-top: 30px;">
    <p style="font-size: 12px; color: #888;">Questa è una mail automatica, non rispondere a questo messaggio.</p>
  </div>
`;

router.post('/', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('❌ Verifica firma fallita:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.metadata?.userId;
    const orderId = session.metadata?.orderId;
    let games = [];

    try {
      games = JSON.parse(session.metadata?.games || '[]');
    } catch (err) {
      console.error('❌ Errore parsing giochi:', err.message);
    }

    try {
      const exists = await Order.findById(orderId);
      if (exists) {
        console.log('⚠️ Ordine già esistente');
        return res.status(200).json({ received: true });
      }

      const newOrder = await Order.create({
        _id: orderId,
        userId: new mongoose.Types.ObjectId(userId),
        games: games.map(g => ({
          gameId: g._id,
          quantity: g.quantity
        })),
        total: session.amount_total / 100,
        date: new Date(),
        status: 'pagato'
      });

      console.log('✅ Ordine salvato con successo');

      for (const g of games) {
        const game = await Game.findById(g._id);
        if (game && typeof game.stock === 'number') {
          const newStock = Math.max(game.stock - g.quantity, 0);
          await Game.findByIdAndUpdate(g._id, { stock: newStock });
        }
      }

      console.log('📉 Stock aggiornato con successo');

      const user = await User.findById(userId);
      await sendOrderEmail(
        userId,
        'Conferma Ordine - Pagamento Riuscito',
        successEmailHtml({
          username: user.username,
          orderId,
          total: newOrder.total,
          date: newOrder.date,
          // MODIFICATO: Usa frontendBaseUrl per ordersUrl
          ordersUrl: `${frontendBaseUrl}/orders`
        })
      );

    } catch (err) {
      console.error('❌ Errore salvataggio ordine o aggiornamento stock:', err.message);

      const user = await User.findById(userId);
      if (user) {
        await sendOrderEmail(
          userId,
          'Errore Ordine - Pagamento Ricevuto ma non elaborato',
          errorEmailHtml({
            username: user.username,
            orderId,
            date: new Date()
          })
        );
      }
    }
  }

  if (event.type === 'payment_intent.payment_failed') {
    console.log('📩 Evento ricevuto: payment_intent.payment_failed');

    const intent = event.data.object;
    const { orderId, userId } = intent.metadata || {};
    const failureDate = new Date();

    try {
      const user = await User.findById(userId);
      if (user) {
        await sendOrderEmail(
          userId,
          '❌ Pagamento Fallito - Ordine non completato',
          errorEmailHtml({
            username: user.username,
            orderId,
            date: failureDate
          })
        );
        console.log(`📧 Email di fallimento inviata per ordine ${orderId}`);
      } else {
        console.warn(`⚠️ Nessun utente trovato con ID ${userId}`);
      }

      const exists = await Order.findById(orderId);
      if (!exists) {
        await Order.create({
          _id: orderId,
          userId: new mongoose.Types.Types.ObjectId(userId), // Corretto da new mongoose.Types.ObjectId(userId)
          games: [],
          total: 0,
          status: 'fallito',
          date: failureDate
        });
        console.log(`❌ Ordine fallito registrato: ${orderId}`);
      } else {
        console.log(`⚠️ Ordine fallito già presente: ${orderId}`);
      }

    } catch (err) {
      console.error('❌ Errore gestione fallimento:', err.message);
    }
  }

  res.status(200).json({ received: true });
});

module.exports = router;








