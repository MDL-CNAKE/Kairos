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
 *  4. Il client emette `project:join` / `project:leave` per entrare/uscire dalle stanze progetto:
 *     si entra solo nei progetti di cui si è membri (o come admin).
 *  5. Gli eventi (messaggi, task, commenti) partono dai controller REST, che validano i dati
 *     e controllano i permessi; il socket serve solo a ricevere gli aggiornamenti.
 */

const jwt = require('jsonwebtoken');
const Project = require('../models/project.model');
const { jwtSecret } = require('../../config/env.config');

const OBJECT_ID = /^[0-9a-fA-F]{24}$/;

/**
 * Estrae l'id del progetto dal payload, che può essere una stringa o `{ projectId }`.
 * @param {string|{projectId: string}} payload
 * @returns {string|null} id valido oppure null
 */
function projectIdFrom(payload) {
  const id = typeof payload === 'string' ? payload : payload?.projectId;
  return typeof id === 'string' && OBJECT_ID.test(id) ? id : null;
}

/**
 * Verifica che l'utente possa seguire gli aggiornamenti di un progetto:
 * deve esserne membro, oppure essere amministratore.
 * @param {{ _id: string, role: string }} user
 * @param {string} projectId
 * @returns {Promise<boolean>}
 */
async function canJoinProject(user, projectId) {
  if (user.role === 'admin') return true;
  const project = await Project.findById(projectId).select('members').lean();
  if (!project) return false;
  return project.members.some((m) => String(m.user) === String(user._id));
}

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
     * Entra nella stanza solo se è membro del progetto.
     *
     * @event project:join
     * @param {string|{projectId: string}} payload - ID del progetto.
     * @param {Function} [callback] - Riceve `{ ok: boolean, error?: string }`.
     */
    socket.on('project:join', async (payload, callback) => {
      const reply = typeof callback === 'function' ? callback : () => {};
      const projectId = projectIdFrom(payload);
      if (!projectId) return reply({ ok: false, error: 'Invalid projectId' });
      try {
        if (!(await canJoinProject(socket.user, projectId))) {
          return reply({ ok: false, error: 'You are not a member of this project' });
        }
        socket.join(projectId);
        reply({ ok: true });
      } catch {
        reply({ ok: false, error: 'Unable to join project' });
      }
    });

    /**
     * Evento: il client smette di seguire un progetto.
     *
     * @event project:leave
     * @param {string|{projectId: string}} payload - ID del progetto.
     */
    socket.on('project:leave', (payload) => {
      const projectId = projectIdFrom(payload);
      if (projectId) socket.leave(projectId);
    });
  });
}

module.exports = { setupSocketHandlers, projectIdFrom, canJoinProject };
