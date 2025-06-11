const User = require('../models/User'); 
    const bcrypt = require('bcryptjs');
    const jwt = require('jsonwebtoken');
    const crypto = require('crypto');
    const path = require('path');
    const fs = require('fs');
    const transporter = require('../utils/mailer');

    exports.register = async (req, res) => {
        const { username, email, password } = req.body;
        try {
          const hashed = await bcrypt.hash(password, 10);
          const verificationToken = crypto.randomBytes(32).toString('hex');
      
          const newUser = await User.create({
            username,
            email,
            password: hashed,
            verificationToken,
            isVerified: false
          });
      
          const frontendBaseUrl = process.env.CLIENT_ORIGIN || 'http://localhost:3000';
          const verifyLink = `${frontendBaseUrl}/verify-email?token=${verificationToken}&email=${email}`; 
      
          await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Verifica il tuo indirizzo email',
            html: `<p>Clicca il link per verificare il tuo account:</p><a href="${verifyLink}">${verifyLink}</a>`
          });
      
          res.status(201).json({
            message: 'Registrazione completata. Controlla la tua email per la verifica.',
            userId: newUser._id
          });
        } catch (err) {
          if (err.code === 11000) {
            return res.status(400).json({ error: 'Email o username già in uso' });
          }
          console.error('❌ Errore nella registrazione:', err);
          res.status(500).json({ error: 'Registration failed' });
        }
      };

    exports.login = async (req, res) => {
      const { email, password } = req.body;
      try {
        const user = await User.findOne({ email });
        if (!user || !(await bcrypt.compare(password, user.password)))
          return res.status(401).json({ error: 'Invalid credentials' });

        if (!user.isVerified) {
          return res.status(403).json({ error: 'Verifica prima la tua email.' });
        }

        const token = jwt.sign(
          { id: user._id, isAdmin: user.isAdmin },
          process.env.JWT_SECRET,
          { expiresIn: '1d' }
        );

        res.json({
          token,
          user: {
            id: user._id,
            username: user.username,
            isAdmin: user.isAdmin,
            profilePic: user.profilePic || null
          }
        });
      } catch (err) {
        res.status(500).json({ error: 'Login failed' });
      }
    };

    exports.verifyEmail = async (req, res) => {
      const { email, token } = req.query;
      try {
        const user = await User.findOne({ email });

        if (!user) {
          return res.status(400).json({ error: 'Utente non trovato' });
        }

        if (!user.verificationToken || user.verificationToken !== token) {
          return res.status(400).json({ error: 'Token non valido o scaduto' });
        }

        if (user.isVerified) {
          return res.json({ message: 'Email già verificata.' });
        }

        user.isVerified = true;
        user.verificationToken = undefined;
        await user.save();

        res.json({ message: 'Email verificata con successo. Ora puoi effettuare il login.' });
      } catch (err) {
        res.status(500).json({ error: 'Errore durante la verifica' });
      }
    };

    exports.requestPasswordReset = async (req, res) => {
        const { email } = req.body;
        try {
          const user = await User.findOne({ email });
          if (!user) return res.status(400).json({ error: 'Utente non trovato' });
      
          const token = crypto.randomBytes(32).toString('hex');
          user.resetToken = token;
          user.resetExpires = Date.now() + 3600000; // 1 ora
          await user.save();
      
          const frontendBaseUrl = process.env.CLIENT_ORIGIN || 'http://localhost:3000';
          const link = `${frontendBaseUrl}/reset-password?token=${token}&email=${email}`; 
      
          await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Reset password',
            html: `<p>Clicca il link per resettare la tua password:</p><a href="${link}">${link}</a>`
          });
      
          res.json({ message: 'Email per il reset inviata' });
        } catch (err) {
          console.error('❌ Errore richiesta reset:', err);
          res.status(500).json({ error: 'Errore durante la richiesta reset' });
        }
      };

    exports.resetPassword = async (req, res) => {
      const { email, token, newPassword } = req.body;
      try {
        const user = await User.findOne({
          email,
          resetToken: token,
          resetExpires: { $gt: Date.now() }
        });

        if (!user) return res.status(400).json({ error: 'Token non valido o scaduto' });

        user.password = await bcrypt.hash(newPassword, 10);
        user.resetToken = undefined;
        user.resetExpires = undefined;
        await user.save();

        res.json({ message: 'Password aggiornata con successo' });
      } catch (err) {
        console.error('❌ Errore reset password:', err);
        res.status(500).json({ error: 'Errore durante il reset della password' });
      }
    };

    exports.updateProfile = async (req, res) => {
      const { username } = req.body;
      const userId = req.user.id;

      try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: 'Utente non trovato' });

        if (username) user.username = username;

        if (req.file) {
          user.profilePic = `/uploads/${req.file.filename}`;
        }

        await user.save();

        res.status(200).json({
          message: 'Profilo aggiornato con successo',
          user: {
            id: user._id,
            username: user.username,
            email: user.email,
            profilePic: user.profilePic
          }
        });
      } catch (error) {
        console.error('❌ Errore aggiornamento profilo:', error);
        res.status(500).json({ error: 'Errore server durante aggiornamento profilo' });
      }
    };
    
