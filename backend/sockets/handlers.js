/**
 * @module sockets/handlers
 * @description Configurazione degli handler Socket.io per TaskFlow.
 *   Gestisce l'autenticazione JWT sulla connessione, le stanze per progetto
 *   e la chat real-time con persistenza su MongoDB.
 *
 * Flusso della connessione:
 *  1. Il client passa il JWT nell'handshake (`socket.handshake.auth.token`).
 *  2. Il middleware verifica il token e popola `socket.user`.
 *  3. L'utente viene automaticamente aggiunto alla stanza `user:<userId>` per le notifiche personali.
 *  4. Il client emette `project:join` / `project:leave` per entrare/uscire dalle stanze progetto.
 *  5. I messaggi chat vengono salvati su DB e distribuiti via `message:received` a tutta la stanza.
 */

const jwt = require('jsonwebtoken');
const chatService = require('../services/chat.service');
const { jwtSecret } = require('../../config/env.config');

/**
 * Configura e registra tutti gli handler Socket.io sull'istanza `io`.
 *
 * @param {import('socket.io').Server} io - Istanza Socket.io già collegata all'HTTP server.
 * @returns {void}
 *
 * @example
 * const { Server } = require('socket.io');
 * const io = new Server(httpServer);
 * setupSocketHandlers(io);
 */
function setupSocketHandlers(io) {
  /**
   * Middleware di autenticazione: verifica il JWT sulla connessione.
   * Rifiuta la connessione se il token manca o non è valido.
   *
   * @param {import('socket.io').Socket} socket
   * @param {Function} next
   */
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
    if (!token) return next(new Error('Authentication required'));

    try {
      const payload = jwt.verify(token, jwtSecret);
      socket.user = { _id: payload.id, role: payload.role };
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user._id.toString();

    // L'utente entra nella propria stanza personale per le notifiche.
    socket.join(`user:${userId}`);

    /**
     * Evento: il client vuole ricevere aggiornamenti di un progetto.
     *
     * @event project:join
     * @param {string} projectId - ID MongoDB del progetto.
     */
    socket.on('project:join', (projectId) => {
      if (typeof projectId === 'string') {
        socket.join(projectId);
      }
    });

    /**
     * Evento: il client smette di seguire un progetto.
     *
     * @event project:leave
     * @param {string} projectId - ID MongoDB del progetto.
     */
    socket.on('project:leave', (projectId) => {
      if (typeof projectId === 'string') {
        socket.leave(projectId);
      }
    });

    /**
     * Evento: il client invia un messaggio nella chat del progetto.
     * Il messaggio viene salvato su DB e distribuito a tutti i membri della stanza.
     *
     * @event message:send
     * @param {{ projectId: string, text: string }} payload
     * @param {Function} [callback] - Callback opzionale `{ ok: boolean, error?: string }`.
     */
    socket.on('message:send', async ({ projectId, text }, callback) => {
      try {
        if (!projectId || !text) return;
        const message = await chatService.save(projectId, userId, text.toString().slice(0, 1000));
        // Emette a tutti i membri del progetto (incluso il mittente).
        io.to(projectId).emit('message:received', { message });
        if (typeof callback === 'function') callback({ ok: true });
      } catch (err) {
        if (typeof callback === 'function') callback({ ok: false, error: err.message });
      }
    });

    /**
     * Evento: il client si disconnette.
     * Socket.io rimuove automaticamente il socket da tutte le stanze.
     *
     * @event disconnect
     */
    socket.on('disconnect', () => {
      // Pulizia automatica: Socket.io rimuove il socket dalle room.
    });
  });
}

module.exports = { setupSocketHandlers };
