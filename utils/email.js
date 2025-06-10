const transporter = require('./mailer');
const User = require('../models/User');

/**
 * Invia una mail HTML all'utente
 * @param {string} userId - ID MongoDB dell'utente
 * @param {string} subject - Oggetto della mail
 * @param {string} html - Contenuto HTML della mail
 */
const sendOrderEmail = async (userId, subject, html) => {
  try {
    const user = await User.findById(userId);
    if (!user || !user.email) {
      console.warn(`📭 Nessuna email trovata per l'utente con ID ${userId}`);
      return;
    }

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject,
      html
    };

    await transporter.sendMail(mailOptions);
    console.log(`📧 Email HTML inviata con successo a: ${user.email}`);
  } catch (err) {
    console.error('❌ Errore nell\'invio email:', err.message);
  }
};

module.exports = sendOrderEmail;

