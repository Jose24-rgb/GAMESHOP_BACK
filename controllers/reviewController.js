const Review = require('../models/Review');

// Recupera recensioni
exports.getReviews = async (req, res) => {
  const { gameId } = req.params;
  const reviews = await Review.find({ gameId }).populate('userId', 'username');
  res.json(reviews);
};

// Aggiunge una recensione
exports.addReview = async (req, res) => {
  const { gameId } = req.params;
  const { rating, comment } = req.body;

  try {
    const review = await Review.create({
      gameId,
      userId: req.user.id,
      rating,
      comment
    });
    res.status(201).json(review);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Hai già recensito questo gioco' });
    }
    console.error(err);
    res.status(500).json({ error: 'Errore nella creazione della recensione' });
  }
};

// Elimina una recensione
exports.deleteReview = async (req, res) => {
  const { id } = req.params;
  const review = await Review.findById(id);

  if (!review) return res.status(404).json({ error: 'Recensione non trovata' });

  if (req.user.isAdmin || req.user.id === review.userId.toString()) {
    await review.deleteOne();
    return res.status(204).end();
  }

  return res.status(403).json({ error: 'Non autorizzato a eliminare questa recensione' });
};

// Modifica una recensione (solo autore può farlo)
exports.updateReview = async (req, res) => {
  const { id } = req.params;
  const { rating, comment } = req.body;

  const review = await Review.findById(id);
  if (!review) return res.status(404).json({ error: 'Recensione non trovata' });

  if (req.user.id !== review.userId.toString()) {
    return res.status(403).json({ error: 'Non autorizzato a modificare questa recensione' });
  }

  review.rating = rating;
  review.comment = comment;
  review.date = new Date(); // 🔁 aggiorna la data
  await review.save();

  res.json(review);
};


