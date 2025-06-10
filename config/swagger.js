const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'GameDev Shop API',
      version: '1.0.0',
      description: 'Documentazione API per il progetto GameDev',
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            username: { type: 'string' },
            email: { type: 'string' },
            isAdmin: { type: 'boolean' }
          }
        },
        Game: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            genre: { type: 'string' },
            price: { type: 'number' },
            imageUrl: { type: 'string' }
          }
        },
        Order: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            userId: { type: 'string' },
            games: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  gameId: { type: 'string' },
                  quantity: { type: 'number' }
                }
              }
            },
            total: { type: 'number' },
            date: { type: 'string', format: 'date-time' }
          }
        }
      }
    },
    tags: [
      { name: 'Autenticazione', description: 'API per la registrazione e il login' },
      { name: 'Giochi', description: 'API per la gestione dei videogiochi' },
      { name: 'Ordini', description: 'API per la gestione degli ordini' },
      { name: 'Pagamento', description: 'API per pagamenti con Stripe' },
      { name: 'Recensioni', description: 'API per la gestione delle recensioni dei giochi' }
    ],
    security: [{ bearerAuth: [] }]
  },
  apis: ['./routes/*.js']
};

const specs = swaggerJsdoc(options);

const setupSwagger = (app) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
};

module.exports = setupSwagger;

