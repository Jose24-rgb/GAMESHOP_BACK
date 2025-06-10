const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
  title:     { type: String, required: true },
  genre:     { type: String },
  price:     { type: Number, required: true },
  discount:  { type: Number, default: 0 },
  imageUrl:  { type: String },

  platform: {
    type: String,
    enum: [
      'Steam',
      'Epic Games',
      'EA App',
      'Rockstar',
      'Ubisoft Connect',
      'Nintendo eShop',
      'PlayStation Store',
      'Xbox Store',
      'Microsoft Store',
      'Blizzard',
      'NetEase'
    ]
  },

  system: {
    type: String,
    enum: [
      'PC',
      'PlayStation 5',
      'Xbox Series X/S',
      'Switch',
      'Switch 2'
    ]
  },

  type: {
    type: String,
    enum: [
      'Gioco',
      'DLC',
      'Preordine',
      'Carte regalo',
      'Gioco + DLC',
      'Demo',
      'Free to Play'
    ],
    default: 'Gioco'
  },

  description:   { type: String },
  trailerUrl:    { type: String },
  dlcLink:       { type: String, default: '' },
  baseGameLink:  { type: String, default: '' },

  stock:         { type: Number, default: 1 },
  upcoming:      { type: Boolean, default: false },
  preorder:      { type: Boolean, default: false },
  reviewsAvg:    { type: Number, default: 0 },
  createdAt:     { type: Date, default: Date.now }
});

// ✅ Campo virtuale: disponibile se stock > 0
gameSchema.virtual('isAvailable').get(function () {
  return typeof this.stock === 'number' && this.stock > 0;
});

// ✅ Middleware: forza Demo solo se è preordine e NON è Free to Play
gameSchema.pre('validate', function (next) {
  if (this.preorder && this.type !== 'Free to Play') {
    this.type = 'Demo';
  }
  next();
});

gameSchema.set('toJSON', { virtuals: true });
gameSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Game', gameSchema);

















