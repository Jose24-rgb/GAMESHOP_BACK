const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  gameId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Game', required: true },
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rating:   { type: Number, min: 1, max: 5, required: true },
  comment:  { type: String, required: true },
  date:     { type: Date, default: Date.now }
});

reviewSchema.index({ gameId: 1, userId: 1 }, { unique: true }); 

module.exports = mongoose.model('Review', reviewSchema);
