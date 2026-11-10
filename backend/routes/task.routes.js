/**
 * @module routes/task
 * @description Route per la gestione dei task all'interno di un progetto.
 *   Il router usa `mergeParams: true` per ereditare `:projectId` dal router padre (`project.routes`).
 *   Tutti gli endpoint richiedono autenticazione e membership al progetto.
 *
 * | Metodo | Path              | Descrizione                                      |
 * |--------|-------------------|--------------------------------------------------|
 * | GET    | /board            | Colonne board (task raggruppati per status)       |
 * | GET    | /                 | Lista task del progetto                          |
 * | POST   | /                 | Crea un task (emette evento Socket.io se assignee)|
 * | GET    | /:taskId          | Dettaglio task                                   |
 * | PUT    | /:taskId          | Aggiorna task (emette evento se assignee cambia) |
 * | PATCH  | /:taskId/status   | Cambia lo status del task                        |
 * | DELETE | /:taskId          | Elimina il task                                  |
 */

const { Router } = require('express');
const controller = require('../controllers/task.controller');
const validate = require('../middleware/validate.middleware');
const { authenticate } = require('../middleware/auth.middleware');
const { loadProject, requireMember } = require('../middleware/project.middleware');
const { createTaskBody, updateTaskBody, taskStatusBody } = require('../validators/task.validator');
const { projectIdParams, taskIdParams } = require('../validators/common.validator');

// mergeParams: true per ereditare :projectId dal router padre
const router = Router({ mergeParams: true });

// Tutti i task endpoint richiedono autenticazione e membership
router.use(authenticate, validate({ params: projectIdParams }), loadProject, requireMember);

// Board del progetto
router.get('/board', controller.board);

// CRUD task
router.get('/', controller.list);

router.post('/', validate({ body: createTaskBody }), controller.create);

router.get(
  '/:taskId',
  validate({ params: taskIdParams }),
  controller.getOne
);

router.put(
  '/:taskId',
  validate({ params: taskIdParams, body: updateTaskBody }),
  controller.update
);

router.patch(
  '/:taskId/status',
  validate({ params: taskIdParams, body: taskStatusBody }),
  controller.changeStatus
);

router.delete(
  '/:taskId',
  validate({ params: taskIdParams }),
  controller.remove
);

module.exports = router;
