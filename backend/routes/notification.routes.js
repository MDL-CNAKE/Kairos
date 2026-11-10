/**
 * @module routes/notification
 * @description Route per le notifiche dell'utente autenticato.
 *   Tutte le route richiedono autenticazione.
 *
 * | Metodo | Path                       | Descrizione                          |
 * |--------|----------------------------|--------------------------------------|
 * | GET    | /                          | Lista notifiche (con filtro unread)  |
 * | PATCH  | /:notificationId/read      | Segna una notifica come letta        |
 * | PATCH  | /read-all                  | Segna tutte le notifiche come lette  |
 */

const { Router } = require('express');
const controller = require('../controllers/notification.controller');
const validate = require('../middleware/validate.middleware');
const { authenticate } = require('../middleware/auth.middleware');
const { notificationIdParams } = require('../validators/common.validator');

const router = Router();

// Tutte le route richiedono autenticazione
router.use(authenticate);

// GET lista notifiche
router.get('/', controller.list);

// PATCH segna tutte come lette — deve stare PRIMA di /:notificationId/read
// altrimenti Express interpreta "read-all" come :notificationId
router.patch('/read-all', controller.markAllRead);

// PATCH segna come letta
router.patch(
  '/:notificationId/read',
  validate({ params: notificationIdParams }),
  controller.markRead
);

module.exports = router;
