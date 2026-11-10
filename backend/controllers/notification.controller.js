/**
 * @module notification.controller
 * @description Controller per le route delle notifiche dell'utente corrente.
 *   Tutte le route richiedono autenticazione; `req.user` è sempre disponibile.
 */

const notificationService = require('../services/notification.service');

/**
 * Lista le notifiche dell'utente corrente con il contatore delle non lette.
 * Accetta il query param `unread=true` per filtrare solo le non lette.
 *
 * @type {import('express').RequestHandler}
 * @returns {200} `{ notifications, unreadCount }`
 */
async function list(req, res, next) {
  try {
    const unreadOnly = req.query.unread === 'true';
    const notifications = await notificationService.list(req.user._id, { unreadOnly });
    const unreadCount = await notificationService.countUnread(req.user._id);
    res.json({ notifications, unreadCount });
  } catch (err) {
    next(err);
  }
}

/**
 * Segna una singola notifica come letta.
 * Verifica che la notifica appartenga all'utente corrente.
 *
 * @type {import('express').RequestHandler}
 * @returns {200} `{ notification }`
 * @returns {404} Se la notifica non esiste o non appartiene all'utente.
 */
async function markRead(req, res, next) {
  try {
    const { notificationId } = req.valid.params;
    const notification = await notificationService.markRead(notificationId, req.user._id);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    res.json({ notification });
  } catch (err) {
    next(err);
  }
}

/**
 * Segna tutte le notifiche non lette dell'utente corrente come lette.
 *
 * @type {import('express').RequestHandler}
 * @returns {200} `{ message }`
 */
async function markAllRead(req, res, next) {
  try {
    await notificationService.markAllRead(req.user._id);
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, markRead, markAllRead };
