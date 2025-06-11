const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const User = require('../models/User');
const Game = require('../models/Game');


const { cloudinary } = require('../config/cloudinary'); 


jest.mock('../config/cloudinary', () => ({
  cloudinary: {
    uploader: {
     
      upload: jest.fn(() => Promise.resolve({ secure_url: 'http://mock.cloudinary.com/image.jpg' })),
      destroy: jest.fn(() => Promise.resolve({ result: 'ok' })), 
    },
  },
}));


let adminToken = '';
let adminUserId = '';
let normalUserToken = '';
let normalUserId = '';
let testGameId = '';


beforeAll(async () => {
 
  await mongoose.connect(process.env.MONGO_URI);


  await User.deleteMany({ email: { $in: ['admin@test.com', 'normal@test.com'] } });
  await Game.deleteMany({ title: 'Admin Test Game' });
  await Game.deleteMany({ title: 'Admin Test Game Updated' }); 
  await Game.deleteMany({ title: 'Game for Normal User Deletion Test' });
  await Game.deleteMany({ title: 'Game for No Auth Deletion Test' });



  const adminRegisterRes = await request(app).post('/api/auth/register').send({
    username: 'adminuser',
    email: 'admin@test.com',
    password: 'adminpassword'
  });
  adminUserId = adminRegisterRes.body.userId;

  
  await User.findByIdAndUpdate(adminUserId, { isAdmin: true, isVerified: true });

  const adminLoginRes = await request(app).post('/api/auth/login').send({
    email: 'admin@test.com',
    password: 'adminpassword'
  });
  adminToken = adminLoginRes.body.token;


  const normalRegisterRes = await request(app).post('/api/auth/register').send({
    username: 'normaluser',
    email: 'normal@test.com',
    password: 'normalpassword'
  });
  normalUserId = normalRegisterRes.body.userId;
  await User.findByIdAndUpdate(normalUserId, { isVerified: true });

  const normalLoginRes = await request(app).post('/api/auth/login').send({
    email: 'normal@test.com',
    password: 'normalpassword'
  });
  normalToken = normalLoginRes.body.token;
}, 30000); 

afterAll(async () => {
  
  await User.deleteMany({ email: { $in: ['admin@test.com', 'normal@test.com'] } });
  await Game.deleteMany({ title: 'Admin Test Game' });
  await Game.deleteMany({ title: 'Admin Test Game Updated' });
  await Game.deleteMany({ title: 'Game for Normal User Deletion Test' });
  await Game.deleteMany({ title: 'Game for No Auth Deletion Test' });
  await mongoose.disconnect();
}, 30000); 

describe('Admin Game Management API', () => {

  
  describe('POST /api/games', () => {
    test('✅ dovrebbe permettere a un admin di creare un nuovo gioco', async () => {
      
      cloudinary.uploader.upload.mockClear(); 

      const res = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('title', 'Admin Test Game')
        .field('genre', 'Adventure')
        .field('price', '29.99')
        .field('description', 'A game created by admin for testing.')
        .attach('image', Buffer.from('fake image content'), 'fake_image.jpg'); 

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('_id');
      expect(res.body.title).toBe('Admin Test Game');
      expect(cloudinary.uploader.upload).toHaveBeenCalledTimes(1);
      testGameId = res.body._id; 
    });

    test('❌ dovrebbe negare la creazione del gioco a un utente normale', async () => {
      const res = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${normalToken}`)
        .field('title', 'Unauthorized Game')
        .field('genre', 'Puzzle')
        .field('price', '15.00')
        .attach('image', Buffer.from('fake image content'), 'another_fake.jpg');

      expect(res.statusCode).toBe(403);
      expect(res.body).toHaveProperty('error', 'Accesso negato: solo admin');
    });

    test('❌ dovrebbe negare la creazione del gioco senza autenticazione', async () => {
      const res = await request(app)
        .post('/api/games')
        .field('title', 'Unauthenticated Game')
        .field('price', '20.00')
        .attach('image', Buffer.from('fake image content'), 'no_auth.jpg');

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('error', 'Token mancante o malformato');
    });
  });

 
  describe('PUT /api/games/:id', () => {
    test('✅ dovrebbe permettere a un admin di aggiornare un gioco', async () => {
      expect(testGameId).toBeDefined();

      cloudinary.uploader.upload.mockClear();

      const res = await request(app)
        .put(`/api/games/${testGameId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .field('title', 'Admin Test Game Updated')
        .field('price', '35.50');

      expect(res.statusCode).toBe(200);
      expect(res.body.title).toBe('Admin Test Game Updated');
      expect(res.body.price).toBe(35.50);
    });

    test('❌ dovrebbe negare l\'aggiornamento a un utente normale', async () => {
      const res = await request(app)
        .put(`/api/games/${testGameId}`)
        .set('Authorization', `Bearer ${normalToken}`)
        .field('title', 'Attempted Update');

      expect(res.statusCode).toBe(403);
      expect(res.body).toHaveProperty('error', 'Accesso negato: solo admin');
    });

    test('❌ dovrebbe negare l\'aggiornamento senza autenticazione', async () => {
      const res = await request(app)
        .put(`/api/games/${testGameId}`)
        .field('title', 'Attempted Update No Auth');

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('error', 'Token mancante o malformato');
    });

   
    test('❌ dovrebbe gestire l\'aggiornamento di un ID gioco non esistente', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .put(`/api/games/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .field('title', 'Non Existent Update');

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('error', 'Gioco non trovato');
    });

   
    test('❌ dovrebbe gestire l\'aggiornamento con ID gioco con formato non valido', async () => {
      const invalidFormatId = 'invalid-id-format';
      const res = await request(app).put(`/api/games/${invalidFormatId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .field('title', 'Invalid Format Update');

      expect(res.statusCode).toBe(400); 
      expect(res.body).toHaveProperty('error', 'ID gioco non valido');
    });
  });

  describe('DELETE /api/games/:id', () => {
    test('✅ dovrebbe permettere a un admin di eliminare un gioco', async () => {
      expect(testGameId).toBeDefined();

      const res = await request(app)
        .delete(`/api/games/${testGameId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(204);
      const deletedGame = await Game.findById(testGameId);
      expect(deletedGame).toBeNull();
    });

    test('❌ dovrebbe negare l\'eliminazione a un utente normale', async () => {
      const gameToDeleteByNormal = await Game.create({
        title: 'Game for Normal User Deletion Test',
        genre: 'Action',
        price: 9.99,
        imageUrl: 'http://temp.url'
      });

      const res = await request(app)
        .delete(`/api/games/${gameToDeleteByNormal._id}`)
        .set('Authorization', `Bearer ${normalToken}`);

      expect(res.statusCode).toBe(403);
      expect(res.body).toHaveProperty('error', 'Accesso negato: solo admin');
      
      const gameExists = await Game.findById(gameToDeleteByNormal._id);
      expect(gameExists).not.toBeNull();
    });

    test('❌ dovrebbe negare l\'eliminazione senza autenticazione', async () => {
      const gameToDeleteNoAuth = await Game.create({
        title: 'Game for No Auth Deletion Test',
        genre: 'Sports',
        price: 19.99,
        imageUrl: 'http://temp2.url'
      });

      const res = await request(app)
        .delete(`/api/games/${gameToDeleteNoAuth._id}`);

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('error', 'Token mancante o malformato');

      const gameExists = await Game.findById(gameToDeleteNoAuth._id);
      expect(gameExists).not.toBeNull();
    });

   
    test('❌ dovrebbe gestire l\'eliminazione di un ID gioco non esistente (restituire 404)', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .delete(`/api/games/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(404); 
      expect(res.body).toHaveProperty('error', 'Gioco non trovato');
    });

  
    test('❌ dovrebbe gestire l\'eliminazione con ID gioco con formato non valido', async () => {
      const invalidFormatId = 'invalid-id-format';
      const res = await request(app).delete(`/api/games/${invalidFormatId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(400); 
      expect(res.body).toHaveProperty('error', 'ID gioco non valido');
    });
  });
});


