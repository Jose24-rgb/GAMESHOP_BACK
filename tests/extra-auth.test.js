const request = require('supertest');
const app = require('../server');
const mongoose = require('mongoose');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

let token = '';
let verificationToken = '';
let resetToken = '';

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  await User.deleteMany({ email: 'extra@example.com' });

  const hashedPassword = await bcrypt.hash('extra123', 10);
  const newUser = await User.create({
    username: 'extrauser',
    email: 'extra@example.com',
    password: hashedPassword,
    verificationToken: 'validtoken',
    isVerified: false
  });

  verificationToken = newUser.verificationToken;
});

afterAll(async () => {
  await User.deleteMany({ email: 'extra@example.com' });
  await mongoose.disconnect();
});

describe('Email verification', () => {
  test('✅ should verify email with valid token', async () => {
    const res = await request(app)
      .get(`/api/auth/verify-email?token=${verificationToken}&email=extra@example.com`);
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toMatch(/verificata/);
  });

  test('❌ should fail with invalid token', async () => {
    const res = await request(app)
      .get(`/api/auth/verify-email?token=wrongtoken&email=extra@example.com`);
    expect(res.statusCode).toBe(400);
  });

  test('❌ should fail with non-existent user', async () => {
    const res = await request(app)
      .get(`/api/auth/verify-email?token=anything&email=nouser@example.com`);
    expect(res.statusCode).toBe(400);
  });
});

describe('Password reset flow', () => {
  test('✅ request password reset sends email', async () => {
    const res = await request(app)
      .post('/api/auth/request-reset') // route corretta
      .send({ email: 'extra@example.com' });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('message');

    const user = await User.findOne({ email: 'extra@example.com' });
    resetToken = user.resetToken;
    expect(resetToken).toBeDefined();
  });

  test('✅ reset password with valid token', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({
        email: 'extra@example.com',
        token: resetToken,
        newPassword: 'newpass123'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('message');
  });
});

describe('Update profile', () => {
  beforeAll(async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'extra@example.com', password: 'newpass123' });

    token = res.body.token;
  });

  test('✅ update username', async () => {
    const res = await request(app)
      .put('/api/auth/update-profile') // route corretta
      .set('Authorization', `Bearer ${token}`)
      .send({ username: 'updateduser' });

    expect(res.statusCode).toBe(200);
    expect(res.body.user).toHaveProperty('username', 'updateduser');
  });
});





