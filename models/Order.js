const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  games: [
    {
      gameId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Game',
      },
      quantity: {
        type: Number,
        required: true,
        min: 1,
      },
      isPreorder: {
        type: Boolean,
        default: false,
      },
    },
  ],
  total: {
    type: Number,
    required: true,
    min: 0,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ['pagato', 'fallito', 'in_attesa_verifica'], // ✅ Aggiunti tutti gli stati possibili
    default: 'pagato',
  },
});

module.exports = mongoose.model('Order', orderSchema);







