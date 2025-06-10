const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const User = require('../models/User');
const Game = require('../models/Game');
const Order = require('../models/Order');

let token = '';
let userId = '';
let gameId = '';

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI);

  await User.deleteMany({ email: 'apitest@example.com' });

  const res = await request(app).post('/api/auth/register').send({
    username: 'apitestuser',
    email: 'apitest@example.com',
    password: 'apitest123'
  });
  userId = res.body.userId;

  // ✅ Simula email verificata
  await User.updateOne({ email: 'apitest@example.com' }, { isVerified: true });

  const login = await request(app).post('/api/auth/login').send({
    email: 'apitest@example.com',
    password: 'apitest123'
  });
  token = login.body.token;

  const game = await Game.create({
    title: 'Test Game',
    genre: 'Test',
    price: 10.99,
    imageUrl: 'http://test.image.url'
  });
  gameId = game._id.toString();
});

afterAll(async () => {
  await User.deleteMany({ email: 'apitest@example.com' });
  await Game.deleteMany({ title: 'Test Game' });
  await Order.deleteMany({ userId });
  await mongoose.disconnect();
});

describe('API Integration Tests', () => {

  test('POST /auth/login', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'apitest@example.com',
      password: 'apitest123'
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
  });

  test('GET /games/:id', async () => {
    const res = await request(app).get(`/api/games/${gameId}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('title', 'Test Game');
  });

  test('POST /orders', async () => {
    const res = await request(app).post('/api/orders').send({
      userId,
      games: [{ gameId, quantity: 1 }],
      total: 10.99
    });
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('games');
  });

  test('GET /orders/:userId', async () => {
    const res = await request(app)
      .get(`/api/orders/${userId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('POST /checkout/create-checkout-session', async () => {
    const res = await request(app).post('/api/checkout/create-checkout-session').send({
      userId,
      games: [{
        _id: gameId,
        title: 'Test Game',
        price: 10.99,
        quantity: 1
      }],
      email: 'apitest@example.com'
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('url');
  });

  test('POST /auth/login with wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'apitest@example.com',
      password: 'wrongpass'
    });
    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  test('GET /games/:id with invalid ID', async () => {
    const res = await request(app).get('/api/games/invalid-id');
    expect([400, 404]).toContain(res.statusCode);
  });

  test('POST /orders without userId', async () => {
    const res = await request(app).post('/api/orders').send({
      games: [{ gameId, quantity: 1 }],
      total: 10.99
    });
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
    expect(res.body).toHaveProperty('error');
  });

  test('POST /checkout/create-checkout-session with empty games', async () => {
    const res = await request(app).post('/api/checkout/create-checkout-session').send({
      userId,
      games: [],
      email: 'apitest@example.com'
    });
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
    expect(res.body).toHaveProperty('error');
  });
});




