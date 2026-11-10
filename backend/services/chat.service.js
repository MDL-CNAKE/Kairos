/**
 * @module chat.service
 * @description Gestione della chat interna ai progetti:
 *   salvataggio messaggi su MongoDB e recupero della cronologia paginata.
 */

const Message = require('../models/message.model');

/**
 * Salva un messaggio nel database e restituisce il documento popolato.
 *
 * @param {string} projectId - ID MongoDB del progetto.
 * @param {string} userId    - ID MongoDB del mittente.
 * @param {string} text      - Testo del messaggio (max 1000 caratteri applicati dal chiamante).
 * @returns {Promise<import('../models/message.model').default>} Messaggio con `userId` popolato (username).
 */
async function save(projectId, userId, text) {
  const message = await Message.create({ projectId, userId, text });
  await message.populate('userId', 'username');
  return message;
}

/**
 * Recupera la cronologia dei messaggi di un progetto in ordine cronologico crescente.
 * Supporta paginazione con cursore timestamp (`before`).
 *
 * @param {string} projectId   - ID MongoDB del progetto.
 * @param {Object} [options]
 * @param {number} [options.limit=50]  - Numero massimo di messaggi da restituire.
 * @param {string} [options.before]    - ISO timestamp: restituisce solo messaggi anteriori a questa data.
 * @returns {Promise<Array>} Messaggi in ordine cronologico crescente.
 *
 * @example
 * // Prima pagina
 * const msgs = await getHistory('64a...', { limit: 20 });
 * // Pagina successiva (più vecchia)
 * const older = await getHistory('64a...', { limit: 20, before: msgs[0].createdAt });
 */
async function getHistory(projectId, { limit = 50, before } = {}) {
  const query = { projectId };
  if (before) query.createdAt = { $lt: new Date(before) };

  const messages = await Message.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('userId', 'username')
    .lean();

  // Restituiti in ordine cronologico (più vecchio prima)
  return messages.reverse();
}

module.exports = { save, getHistory };
