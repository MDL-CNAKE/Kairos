/**
 * @module server
 * @description Entry point dell'applicazione TaskFlow.
 *   Avvia la connessione MongoDB, crea l'HTTP server, inizializza Socket.io
 *   e mette in ascolto sulla porta configurata.
 *
 * Flusso di avvio:
 * 1. `mongoose.connect()` → connessione al database
 * 2. `http.createServer(app)` → HTTP server wrappa l'app Express
 * 3. `new Server(server)` → Socket.io si attacca all'HTTP server (non all'app Express)
 * 4. `app.set('io', io)` → rende `io` disponibile ai controller via `req.io`
 * 5. `setupSocketHandlers(io)` → registra gli event handler Socket.io
 * 6. `server.listen(port)` → avvia l'ascolto
 *
 * @example
 * # Avvio in sviluppo
 * node server.js
 *
 * # Avvio con nodemon
 * nodemon server.js
 */

const http = require('http');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const app = require('./app');
const { port, mongoUri } = require('./config/env.config');
const { setupSocketHandlers } = require('./backend/sockets/handlers');

/**
 * Avvia il server: connette MongoDB, crea HTTP + Socket.io, avvia l'ascolto.
 * @async
 * @returns {Promise<void>}
 */
async function start() {
  // Connessione MongoDB
  await mongoose.connect(mongoUri);
  console.log('[DB] Connected to MongoDB');

  // HTTP server
  const server = http.createServer(app);

  // Socket.io attaccato all'HTTP server
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  // Rende io disponibile a tutti i controller tramite app.set
  app.set('io', io);

  // Handler Socket.io
  setupSocketHandlers(io);

  server.listen(port, () => {
    console.log(`[SERVER] TaskFlow running on port ${port}`);
  });
}

start().catch((err) => {
  console.error('[FATAL]', err);
  process.exit(1);
});
