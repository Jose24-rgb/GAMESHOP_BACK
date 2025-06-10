const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const User = require('../models/User');
const Game = require('../models/Game');
const Review = require('../models/Review');

let token = '';
let userId = '';
let gameId = '';
let reviewId = '';

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  await User.deleteMany({ email: 'review@example.com' });
  await Review.deleteMany({});
  await Game.deleteMany({ title: 'Review Game' });

  const registerRes = await request(app).post('/api/auth/register').send({
    username: 'reviewuser',
    email: 'review@example.com',
    password: 'review123'
  });

  userId = registerRes.body.userId;

  await User.updateOne({ email: 'review@example.com' }, { isVerified: true });

  const loginRes = await request(app).post('/api/auth/login').send({
    email: 'review@example.com',
    password: 'review123'
  });

  token = loginRes.body.token;

  const game = await Game.create({
    title: 'Review Game',
    genre: 'RPG',
    price: 49.99,
    imageUrl: 'http://image.url'
  });

  gameId = game._id.toString();
});

afterAll(async () => {
  await User.deleteMany({ email: 'review@example.com' });
  await Game.deleteMany({ title: 'Review Game' });
  await Review.deleteMany({});
  await mongoose.disconnect();
});

describe('Review API', () => {
  it('should add a review', async () => {
    const res = await request(app)
      .post(`/api/reviews/${gameId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        rating: 5,
        comment: 'Fantastico!'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('_id');
    expect(res.body.rating).toBe(5);
    reviewId = res.body._id;
  });

  it('should not allow duplicate review', async () => {
    const res = await request(app)
      .post(`/api/reviews/${gameId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        rating: 4,
        comment: 'Seconda recensione'
      });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('should get reviews for a game', async () => {
    const res = await request(app).get(`/api/reviews/${gameId}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });

  it('should update the review', async () => {
    const res = await request(app)
      .put(`/api/reviews/${reviewId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        rating: 3,
        comment: 'Modificato'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.rating).toBe(3);
  });

  it('should delete the review', async () => {
    const res = await request(app)
      .delete(`/api/reviews/${reviewId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(204);
  });
});
