/**
 * @module routes/admin
 * @description Route riservate agli amministratori.
 *   Tutte le route richiedono autenticazione + ruolo `admin`.
 *
 * | Metodo | Path                              | Descrizione                              |
 * |--------|-----------------------------------|------------------------------------------|
 * | GET    | /users                            | Lista tutti gli utenti                   |
 * | PATCH  | /users/:userId/block              | Blocca un utente (non-admin)             |
 * | PATCH  | /users/:userId/unblock            | Sblocca un utente                        |
 * | GET    | /projects                         | Lista tutti i progetti (inclusi nascosti)|
 * | PATCH  | /projects/:projectId/restore      | Ripristina un progetto nascosto          |
 */

const { Router } = require('express');
const controller = require('../controllers/admin.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireAdmin, loadProject } = require('../middleware/project.middleware');
const validate = require('../middleware/validate.middleware');
const { projectIdParams, userIdParams } = require('../validators/common.validator');

const router = Router();

// Tutte le route richiedono autenticazione + ruolo admin
router.use(authenticate, requireAdmin);

// Gestione utenti
router.get('/users', controller.listUsers);
router.patch('/users/:userId/block', validate({ params: userIdParams }), controller.blockUser);
router.patch('/users/:userId/unblock', validate({ params: userIdParams }), controller.unblockUser);

// Gestione progetti
router.get('/projects', controller.listProjects);

// Ripristina progetto nascosto
router.patch(
  '/projects/:projectId/restore',
  validate({ params: projectIdParams }),
  loadProject,
  controller.restoreProject
);

module.exports = router;
