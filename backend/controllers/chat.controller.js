/**
 * @module chat.controller
 * @description Controller per le route della chat interna ai progetti.
 *   I messaggi possono essere inviati sia via REST (questo controller)
 *   sia direttamente via Socket.io (see {@link module:sockets/handlers}).
 */

const chatService = require('../services/chat.service');

/**
 * Recupera la cronologia dei messaggi di un progetto.
 * Supporta paginazione via query `limit` e `before` (timestamp ISO).
 *
 * @type {import('express').RequestHandler}
 * @returns {200} `{ messages }` — array in ordine cronologico crescente.
 */
async function getHistory(req, res, next) {
  try {
    const { projectId } = req.valid.params;
    const { limit, before } = req.query;
    const messages = await chatService.getHistory(projectId, { limit, before });
    res.json({ messages });
  } catch (err) {
    next(err);
  }
}

/**
 * Invia un messaggio nella chat del progetto via REST.
 * Dopo il salvataggio su DB, il messaggio viene emesso via Socket.io
 * a tutti i membri della stanza del progetto.
 *
 * @type {import('express').RequestHandler}
 * @returns {201} `{ message }`
 */
async function sendMessage(req, res, next) {
  try {
    const { projectId } = req.valid.params;
    const message = await chatService.save(projectId, req.user._id, req.valid.body.text);
    // Emette il messaggio in real-time a tutti i membri del progetto
    req.io?.to(projectId).emit('message:received', { message });
    res.status(201).json({ message });
  } catch (err) {
    next(err);
  }
}

module.exports = { getHistory, sendMessage };
