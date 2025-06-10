const Game = require('../models/Game');
const { cloudinary } = require('../config/cloudinary');
const mongoose = require('mongoose');

exports.getAllGames = async (req, res) => {
  try {
    const {
      genre,
      platform,
      system,
      type,
      sort,
      priceMin,
      priceMax,
      inStock,
      page = 1,  // Imposta la pagina di default a 1
      limit = 9  // Imposta il limite per pagina a 9
    } = req.query;

    const filter = {};
    if (genre) filter.genre = { $regex: new RegExp(genre, 'i') };
    if (platform) filter.platform = platform;
    if (system) filter.system = system;

    if (type && type !== 'Tutto') {
      if (type === 'Preordine') {
        filter.$or = [
          { type: 'Preordine' },
          { preorder: true }
        ];
      } else if (type === 'Prossimamente') {
        filter.upcoming = true;
      } else {
        filter.type = type;
      }
    }

    if (priceMin || priceMax) {
      filter.price = {};
      if (priceMin) filter.price.$gte = parseFloat(priceMin);
      if (priceMax) filter.price.$lte = parseFloat(priceMax);
    }

    if (inStock === 'true') {
      filter.stock = { $gt: 0 };
    }

    let sortOption = {};
    switch (sort) {
      case 'Prezzo: da basso ad alto':
        sortOption.price = 1;
        break;
      case 'Prezzo: da alto a basso':
        sortOption.price = -1;
        break;
      case 'Sconto: migliore':
        sortOption.discount = -1;
        break;
      case 'Recensioni: migliore':
        sortOption.reviewsAvg = -1;
        break;
      case 'Uscita: nuovo':
        sortOption.createdAt = -1;
        break;
      case 'Uscita: vecchio':
        sortOption.createdAt = 1;
        break;
      default:
        sortOption.createdAt = -1;
        break;
    }

    // Pagina e limiti
    const skip = (page - 1) * limit;
    const games = await Game.find(filter).sort(sortOption).skip(skip).limit(limit);
    const totalGames = await Game.countDocuments(filter);  // Contiamo il totale per determinare il numero di pagine

    res.json({
      games,
      totalGames,
      totalPages: Math.ceil(totalGames / limit),
      currentPage: page
    });
  } catch (err) {
    console.error('❌ Errore filtro giochi:', err.message);
    res.status(500).json({ error: 'Errore nel recupero dei giochi' });
  }
};

exports.getGameById = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'ID non valido' });
  }

  const game = await Game.findById(id);
  if (!game) return res.status(404).json({ error: 'Gioco non trovato' });

  res.json(game);
};

exports.createGame = async (req, res) => {
  try {
    const {
      title,
      genre,
      price,
      discount,
      stock,
      platform,
      system,
      type,
      preorder,
      description,
      trailerUrl,
      dlcLink,
      baseGameLink,
      upcoming
    } = req.body;

    let imageUrl = '';
    if (req.file) {
      const base64 = req.file.buffer.toString('base64');
      const dataUri = `data:${req.file.mimetype};base64,${base64}`;
      const result = await cloudinary.uploader.upload(dataUri);
      imageUrl = result.secure_url;
    }

    const isPreorder = preorder === 'true' || preorder === true;
    const isUpcoming = upcoming === 'true' || upcoming === true;

    const finalType = isPreorder && type !== 'Free to Play' ? 'Demo' : type;

    const newGame = await Game.create({
      title,
      genre,
      price: parseFloat(price) || 0,
      discount: parseFloat(discount) || 0,
      stock: isUpcoming ? 0 : parseInt(stock, 10) || 0,
      upcoming: isUpcoming,
      platform,
      system,
      type: finalType,
      preorder: isPreorder,
      description,
      trailerUrl,
      dlcLink,
      baseGameLink,
      imageUrl
    });

    res.status(201).json(newGame);
  } catch (err) {
    console.error('❌ Errore creazione gioco:', err.message);
    res.status(500).json({ error: 'Errore nel creare il gioco' });
  }
};

exports.updateGame = async (req, res) => {
  try {
    const updateData = { ...req.body };

    updateData.preorder = updateData.preorder === 'true' || updateData.preorder === true;
    updateData.upcoming = updateData.upcoming === 'true' || updateData.upcoming === true;
    updateData.stock = updateData.upcoming ? 0 : parseInt(updateData.stock, 10) || 0;
    updateData.price = parseFloat(updateData.price) || 0;
    updateData.discount = parseFloat(updateData.discount) || 0;

    if (updateData.preorder && updateData.type !== 'Free to Play') {
      updateData.type = 'Demo';
    }

    if (req.file) {
      const base64 = req.file.buffer.toString('base64');
      const dataUri = `data:${req.file.mimetype};base64,${base64}`;
      const result = await cloudinary.uploader.upload(dataUri);
      updateData.imageUrl = result.secure_url;
    }

    const updated = await Game.findByIdAndUpdate(req.params.id, updateData, { new: true });
    res.json(updated);
  } catch (err) {
    console.error('❌ Errore aggiornamento gioco:', err.message);
    res.status(500).json({ error: "Errore nell'aggiornare il gioco" });
  }
};

exports.deleteGame = async (req, res) => {
  await Game.findByIdAndDelete(req.params.id);
  res.status(204).end();
};


















