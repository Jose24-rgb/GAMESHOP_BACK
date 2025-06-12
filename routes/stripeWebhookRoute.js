const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Order = require('../models/Order');
const Game = require('../models/Game');
const User = require('../models/User');
const sendOrderEmail = require('../utils/email');
const mongoose = require('mongoose');

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
const frontendBaseUrl = process.env.CLIENT_ORIGIN || 'http://localhost:3000';

const successEmailHtml = ({ username, orderId, total, date, ordersUrl, gameTitles }) => `
  <div style="font-family: Arial, sans-serif; color: #333; padding: 20px;">
    <h2 style="color: #28a745;">✅ Ordine completato con successo!</h2>
    <p>Ciao <strong>${username}</strong>,</p>
    <p>Grazie per il tuo acquisto! Il tuo ordine è stato registrato correttamente.</p>

    <h3 style="color: #007bff;">📦 Dettagli ordine</h3>
    <ul>
      <li><strong>Giochi:</strong> ${gameTitles || 'N/A'}</li>
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

const errorEmailHtml = ({ username, orderId, date, gameTitles }) => `
  <div style="font-family: Arial, sans-serif; color: #333; padding: 20px;">
    <h2 style="color: #dc3545;">❌ Pagamento fallito - Ordine non completato</h2>
    <p>Ciao <strong>${username}</strong>,</p>
    <p>Il tuo ordine <strong>${orderId}</strong> non è stato completato a causa di fondi insufficienti sulla carta.</p>
    <h3 style="color: #007bff;">📦 Dettagli ordine</h3>
    <ul>
      <li><strong>Giochi:</strong> ${gameTitles || 'N/A'}</li>
      <li><strong>ID Ordine:</strong> ${orderId}</li>
      <li><strong>Data tentativo:</strong> ${new Date(date).toLocaleString('it-IT', {
        dateStyle: 'short',
        timeStyle: 'short'
      })}</li>
    </ul>
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

  // --- Recupero universale dei metadati rilevanti ---
  // Ora ci affidiamo al fatto che Stripe.js nel frontend abbia passato
  // i metadati 'games' sia alla sessione che all'intent.
  const eventObject = event.data.object;
  const userId = eventObject.metadata?.userId;
  const orderId = eventObject.metadata?.orderId;
  let gamesFromMetadata = [];
  try {
    // Tenta di parsare 'games' dai metadati dell'oggetto evento corrente
    gamesFromMetadata = JSON.parse(eventObject.metadata?.games || '[]');
  } catch (err) {
    console.error('❌ Errore parsing games da metadata dell\'evento:', err.message);
    gamesFromMetadata = [];
  }
  const gameTitlesString = gamesFromMetadata.map(g => g.title).filter(Boolean).join(', ') || 'N/A';
  // --- Fine Recupero universale dei metadati rilevanti ---

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const games = gamesFromMetadata; // Usa i giochi già parsati
    const gameTitles = games.map(g => g.title).filter(Boolean); // Prepara i titoli per il campo del DB

    try {
      const exists = await Order.findById(orderId);
      if (exists) {
        console.log('⚠️ Ordine già esistente (webhook ricevuto più volte)');
        return res.status(200).json({ received: true });
      }

      const newOrder = await Order.create({
        _id: orderId,
        userId: new mongoose.Types.ObjectId(userId),
        games: games.map(g => ({
          gameId: g._id,
          quantity: g.quantity,
        })),
        total: session.amount_total / 100,
        date: new Date(),
        status: 'pagato',
        gameTitles: gameTitles // Salva l'array di titoli
      });

      console.log('✅ Ordine salvato con successo:', newOrder._id);

      for (const g of games) {
        const game = await Game.findById(g._id);
        if (game && typeof game.stock === 'number') {
          const newStock = Math.max(game.stock - g.quantity, 0);
          await Game.findByIdAndUpdate(g._id, { stock: newStock });
        }
      }
      console.log('📉 Stock aggiornato con successo');

      const user = await User.findById(userId);
      if (user) {
        await sendOrderEmail(
          userId,
          'Conferma Ordine - Pagamento Riuscito',
          successEmailHtml({
            username: user.username,
            orderId: newOrder._id,
            total: newOrder.total,
            date: newOrder.date,
            ordersUrl: `${frontendBaseUrl}/orders`,
            gameTitles: gameTitlesString
          })
        );
        console.log(`📧 Email di successo inviata a: ${user.email}`);
      } else {
        console.warn(`⚠️ Nessun utente trovato con ID ${userId} per l'invio email di successo.`);
      }

    } catch (err) {
      console.error('❌ Errore salvataggio ordine, aggiornamento stock o invio email (checkout.session.completed):', err.message);
      const user = await User.findById(userId);
      if (user) {
        await sendOrderEmail(
          userId,
          'Errore Ordine - Contatta il Supporto',
          errorEmailHtml({
            username: user.username,
            orderId: orderId || 'N/A',
            date: new Date(),
            gameTitles: gameTitlesString
          })
        );
        console.log(`📧 Email di errore per gestione ordine inviata a: ${user.email}`);
      }
    }
  }

  else if (event.type === 'payment_intent.payment_failed') {
    console.log('📩 Evento ricevuto: payment_intent.payment_failed');

    const intent = event.data.object;
    const failureDate = new Date();

    try {
      const user = await User.findById(userId);
      if (user) {
        await sendOrderEmail(
          userId,
          '❌ Pagamento Fallito - Ordine non completato',
          errorEmailHtml({
            username: user.username,
            orderId: orderId || 'N/A',
            date: failureDate,
            gameTitles: gameTitlesString
          })
        );
        console.log(`📧 Email di fallimento inviata per ordine ${orderId}`);
      } else {
        console.warn(`⚠️ Nessun utente trovato con ID ${userId} per l'invio email di fallimento.`);
      }

      const existingOrder = await Order.findById(orderId);
      if (!existingOrder) {
        await Order.create({
          _id: orderId,
          userId: new mongoose.Types.ObjectId(userId),
          games: gamesFromMetadata.map(g => ({ // Usa gamesFromMetadata (recuperato universalmente)
            gameId: g._id,
            quantity: g.quantity
          })),
          total: intent.amount / 100,
          status: 'fallito',
          date: failureDate,
          gameTitles: gamesFromMetadata.map(g => g.title).filter(Boolean) // *** QUI SI SALVANO I TITOLI ***
        });
        console.log(`❌ Ordine fallito registrato: ${orderId}`);
      } else if (existingOrder.status !== 'pagato') {
          existingOrder.status = 'fallito';
          existingOrder.date = failureDate;
          existingOrder.total = intent.amount / 100;
          existingOrder.gameTitles = gamesFromMetadata.map(g => g.title).filter(Boolean); // *** E QUI SI AGGIORNANO ***
          await existingOrder.save();
          console.log(`⚠️ Stato ordine ${orderId} aggiornato a fallito.`);
      }

    } catch (err) {
      console.error('❌ Errore gestione fallimento webhook:', err.message);
    }
  }

  res.status(200).json({ received: true });
});

module.exports = router;











