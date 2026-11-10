/**
 * @module notification.service
 * @description Gestione delle notifiche persistenti per gli utenti.
 *   Le notifiche vengono create dal server e distribuite in real-time via Socket.io;
 *   questo servizio si occupa della parte di persistenza su MongoDB.
 */

const Notification = require('../models/notification.model');

/**
 * Crea e persiste una nuova notifica per un utente.
 *
 * @param {string} userId  - ID MongoDB dell'utente destinatario.
 * @param {string} type    - Tipo di notifica (es. `task_assigned`, `member_joined`, `project_reported`).
 * @param {string} message - Testo leggibile della notifica.
 * @param {Object} [data]  - Dati extra (es. `{ taskId, projectId }`) utili al client per la navigazione.
 * @returns {Promise<import('../models/notification.model').default>}
 */
async function create(userId, type, message, data = {}) {
  return Notification.create({ userId, type, message, data });
}

/**
 * Recupera le notifiche di un utente, dalla più recente alla meno recente.
 *
 * @param {string} userId           - ID MongoDB dell'utente.
 * @param {Object} [options]
 * @param {boolean} [options.unreadOnly=false] - Se `true`, restituisce solo le non lette.
 * @param {number}  [options.limit=30]         - Numero massimo di notifiche.
 * @returns {Promise<Array>}
 */
async function list(userId, { unreadOnly = false, limit = 30 } = {}) {
  const query = { userId };
  if (unreadOnly) query.read = false;

  return Notification.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
}

/**
 * Segna una notifica come letta. Verifica che la notifica appartenga all'utente.
 *
 * @param {string} notificationId - ID MongoDB della notifica.
 * @param {string} userId         - ID MongoDB dell'utente proprietario.
 * @returns {Promise<import('../models/notification.model').default|null>} Notifica aggiornata, o `null` se non trovata.
 */
async function markRead(notificationId, userId) {
  return Notification.findOneAndUpdate(
    { _id: notificationId, userId },
    { read: true },
    { new: true }
  );
}

/**
 * Segna tutte le notifiche non lette di un utente come lette.
 *
 * @param {string} userId - ID MongoDB dell'utente.
 * @returns {Promise<void>}
 */
async function markAllRead(userId) {
  await Notification.updateMany({ userId, read: false }, { read: true });
}

/**
 * Conta le notifiche non lette di un utente.
 *
 * @param {string} userId - ID MongoDB dell'utente.
 * @returns {Promise<number>}
 */
async function countUnread(userId) {
  return Notification.countDocuments({ userId, read: false });
}

module.exports = { create, list, markRead, markAllRead, countUnread };
