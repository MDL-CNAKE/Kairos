/**
 * @module routes/chat
 * @description Route per la chat in tempo reale di un progetto.
 *   Il router usa `mergeParams: true` per ereditare `:projectId` dal router padre.
 *   Tutti gli endpoint richiedono autenticazione e membership al progetto.
 *   I messaggi inviati via HTTP vengono anche emessi via Socket.io nella room del progetto.
 *
 * | Metodo | Path       | Descrizione                                           |
 * |--------|------------|-------------------------------------------------------|
 * | GET    | /messages  | Storico messaggi (paginazione con cursore)            |
 * | POST   | /messages  | Invia un messaggio (salva in DB + emette Socket.io)   |
 */

const { Router } = require('express');
const controller = require('../controllers/chat.controller');
const validate = require('../middleware/validate.middleware');
const { authenticate } = require('../middleware/auth.middleware');
const { loadProject, requireMember } = require('../middleware/project.middleware');
const { projectIdParams } = require('../validators/common.validator');
const { sendMessageBody } = require('../validators/chat.validator');

const router = Router({ mergeParams: true });

// Tutti gli endpoint chat richiedono autenticazione e membership
router.use(authenticate, validate({ params: projectIdParams }), loadProject, requireMember);

// GET storico messaggi
router.get('/messages', controller.getHistory);

// POST nuovo messaggio
router.post('/messages', validate({ body: sendMessageBody }), controller.sendMessage);

module.exports = router;
