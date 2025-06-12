const Stripe = require('stripe');
const crypto = require('crypto');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

exports.createCheckoutSession = async (req, res) => {
  try {
    const { games, userId } = req.body;

    if (!games || !Array.isArray(games) || games.length === 0) {
      return res.status(400).json({ error: 'Nessun gioco fornito per il checkout' });
    }

    const orderId = crypto.randomUUID();

    const lineItems = games.map(game => {
      const discountedPrice = game.discount > 0
        ? game.price * (1 - game.discount / 100)
        : game.price;

      return {
        price_data: {
          currency: 'eur',
          product_data: { name: game.title },
          unit_amount: Math.round(discountedPrice * 100)
        },
        quantity: game.quantity
      };
    });

    const frontendBaseUrl = process.env.CLIENT_ORIGIN || 'http://localhost:3000';

    // Stringify games once here to pass to both metadata fields
    // È FONDAMENTALE che questo gamesString contenga i titoli, _id, etc.
    const gamesString = JSON.stringify(games.map(g => ({
      _id: g._id,
      title: g.title,
      price: g.price,
      discount: g.discount,
      quantity: g.quantity
    })));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_creation: 'always',
      line_items: lineItems,

      success_url: `${frontendBaseUrl}/success?orderId=${orderId}`,
      cancel_url: `${frontendBaseUrl}/cancel?orderId=${orderId}`,
      metadata: { // Metadati della sessione di checkout
        orderId,
        userId,
        games: gamesString // Questo viene passato all'evento checkout.session.completed
      },
      payment_intent_data: { // Metadati che verranno passati al PaymentIntent
        metadata: {
          orderId,
          userId,
          games: gamesString // *** AGGIUNTA CRUCIALE E TESTATA ***: Questo viene passato all'evento payment_intent.*
        }
      }
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('❌ Errore nella creazione della sessione:', error.message);
    res.status(500).json({ error: 'Errore durante la creazione della sessione di pagamento' });
  }
};











