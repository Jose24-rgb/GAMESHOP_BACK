const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username:          { type: String, required: true, unique: true },
  email:             { type: String, required: true, unique: true },
  password:          { type: String, required: true },
  isAdmin:           { type: Boolean, default: false },
  isVerified:        { type: Boolean, default: false },
  verificationToken: { type: String },
  resetToken:        { type: String },
  resetExpires:      { type: Date },
  profilePic:        { type: String }, // ✅ aggiunto campo per URL immagine profilo
});

module.exports = mongoose.model('User', userSchema);


