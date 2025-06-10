const Order = require('../models/Order');
const mongoose = require('mongoose');
const Game = require('../models/Game');


exports.createOrder = async (req, res) => {
  const { userId, games, total } = req.body;

  
  if (!userId || !games || games.length === 0 || typeof total !== 'number' || total < 0) {
    return res.status(400).json({ error: 'Dati ordine mancanti o non validi' });
  }

  try {
    const gameIds = games.map(g => g.gameId);
    const foundGames = await Game.find({ _id: { $in: gameIds } });

    const gamesWithPreorderFlag = [];

    for (const item of games) {
      const gameInfo = foundGames.find(g => g._id.toString() === item.gameId);
      if (!gameInfo) {
        return res.status(400).json({ error: `Gioco con ID ${item.gameId} non trovato` });
      }

      const requestedQty = item.quantity || 1;

      let stockValue = 0;
      if (typeof gameInfo.stock === 'string') {
        stockValue = gameInfo.stock.toLowerCase() === 'prossimamente' ? 0 : parseInt(gameInfo.stock, 10);
      } else if (typeof gameInfo.stock === 'number') {
        stockValue = gameInfo.stock;
      }

      if (requestedQty > stockValue) {
        return res.status(400).json({
          error: `Quantità richiesta (${requestedQty}) per "${gameInfo.title}" supera lo stock disponibile (${stockValue})`
        });
      }

      const isPreorder = gameInfo.preorder === true;

      gamesWithPreorderFlag.push({
        ...item,
        isPreorder
      });
    }

  
    const newOrder = await Order.create({
      _id: new mongoose.Types.ObjectId().toString(),
      userId,
      games: gamesWithPreorderFlag,
      total,
      status: 'in_attesa_verifica',
      date: new Date()
    });

    res.status(201).json(newOrder);
  } catch (err) {
    console.error('❌ Errore nella creazione ordine:', err);
    res.status(500).json({ error: 'Errore durante la creazione dell\'ordine' });
  }
};


exports.getUserOrders = async (req, res) => {
  const { userId } = req.params;

  try {
    const orders = await Order.find({ userId })
      .populate('games.gameId')
      .sort({ date: -1 }); 

    res.json(orders);
  } catch (err) {
    console.error('❌ Errore nel recupero ordini:', err.message);
    res.status(500).json({ error: 'Errore durante il recupero degli ordini' });
  }
};








