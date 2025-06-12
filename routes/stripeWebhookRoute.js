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

  // --- NUOVA LOGICA DI RECUPERO METADATI PIÙ ROBUSTA ---
  let userIdFromEvent, orderIdFromEvent, gamesFromEvent = [], gameTitlesString = 'N/A';
  let sessionObject; // Per tenere traccia della sessione se disponibile

  // Logica per recuperare i metadati dall'evento in base al tipo
  // L'orderId e userId sono spesso direttamente sul metadata dell'oggetto principale dell'evento
  userIdFromEvent = event.data.object.metadata?.userId;
  orderIdFromEvent = event.data.object.metadata?.orderId;

  // Tentativo 1: Recupera games dalla sessione di checkout se disponibile nell'evento
  if (event.data.object.object === 'checkout.session') {
      sessionObject = event.data.object;
      try {
          gamesFromEvent = JSON.parse(sessionObject.metadata?.games || '[]');
      } catch (err) {
          console.error('❌ Errore parsing games da metadata della sessione (Tentativo 1):', err.message);
      }
  } 
  // Tentativo 2: Se è un payment_intent, prova a recuperare la sessione di checkout associata
  // e da lì i metadati originali. Questo è più affidabile per i fallimenti.
  else if (event.data.object.object === 'payment_intent') {
      const paymentIntent = event.data.object;
      if (paymentIntent.charges && paymentIntent.charges.data.length > 0) {
          const charge = paymentIntent.charges.data[0];
          if (charge.payment_intent && !charge.payment_intent.metadata?.games) {
              // Se i games non sono direttamente sull'intent, prova a recuperare la sessione
              // In un caso di fallimento, l'ID della sessione potrebbe non essere sempre sull'intent.
              // Cerchiamo l'ID della sessione nelle proprietà dell'intent o della carica.
              // La proprietà 'checkout_session' su payment_intent è deprezzata.
              // L'ID della sessione può essere trovato sul 'latest_charge.checkout_session'.
              // Per semplicità, possiamo cercare la sessione se l'orderId è disponibile.
              // Dato che l'orderId deriva da metadata della sessione, possiamo usarlo.
              
              // Se l'ID dell'ordine è presente, potremmo provare a recuperare la sessione di checkout
              // che ha generato quell'ordine per ottenere i metadati originali.
              // Tuttavia, Stripe non espone un modo diretto per trovare una sessione dal solo orderId
              // (che è un tuo ID custom, non l'ID della sessione di Stripe).
              // La strategia più sicura è assicurarci che 'games' venga passato nei metadati del payment_intent
              // quando la sessione di checkout viene creata.
              // Se Stripe non passa automaticamente 'games' ai metadati del payment_intent,
              // dovrai implementare una logica nel `createCheckoutSession` per farlo.

              // Per ora, ci basiamo sul fatto che i metadati originali siano stati passati.
              // La logica di base all'inizio del webhook (event.data.object.metadata) dovrebbe catturarli.
          }
      }
  }

  // Fallback: se i gamesFromEvent non sono stati popolati dal metadata dell'evento stesso,
  // e se abbiamo un orderId, prova a recuperare l'ordine dal database per i gameTitles.
  // Questo copre i casi in cui i metadati di 'games' potrebbero non essere inclusi
  // direttamente nell'evento payment_intent.payment_failed
  if (gamesFromEvent.length === 0 && orderIdFromEvent) {
      try {
          const existingOrder = await Order.findById(orderIdFromEvent);
          if (existingOrder && existingOrder.gameTitles && existingOrder.gameTitles.length > 0) {
              gamesFromEvent = existingOrder.gameTitles.map(title => ({ title: title })); // Mappa a un formato compatibile
          } else if (existingOrder && existingOrder.games && existingOrder.games.length > 0) {
              // Se gameTitles non è popolato ma games.gameId è, prova a popolare da lì
              await existingOrder.populate({
                  path: 'games.gameId',
                  select: 'title'
              });
              gamesFromEvent = existingOrder.games.map(g => ({ title: g.gameId?.title || 'Nome sconosciuto' }));
          }
      } catch (dbErr) {
          console.error('❌ Errore recupero ordine dal DB per gameTitles (fallback):', dbErr.message);
      }
  }
  
  gameTitlesString = gamesFromEvent.map(g => g.title).filter(Boolean).join(', ') || 'N/A';
  // --- FINE LOGICA DI RECUPERO METADATI PIÙ ROBUSTA ---


  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = userIdFromEvent; 
    const orderId = orderIdFromEvent;
    const games = gamesFromEvent; // Usa l'array già parsato
    const gameTitles = games.map(g => g.title); // Prepara i titoli per il campo del DB

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
    const orderId = orderIdFromEvent;
    const userId = userIdFromEvent;
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
          games: gamesFromEvent.map(g => ({
            gameId: g._id,
            quantity: g.quantity
          })),
          total: intent.amount / 100,
          status: 'fallito',
          date: failureDate,
          gameTitles: gamesFromEvent.map(g => g.title)
        });
        console.log(`❌ Ordine fallito registrato: ${orderId}`);
      } else if (existingOrder.status !== 'pagato') {
          existingOrder.status = 'fallito';
          existingOrder.date = failureDate;
          existingOrder.total = intent.amount / 100;
          existingOrder.gameTitles = gamesFromEvent.map(g => g.title);
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









