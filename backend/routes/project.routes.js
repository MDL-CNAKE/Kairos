/**
 * @module routes/project
 * @description Route per la gestione dei progetti.
 *
 * | Metodo | Path                          | Auth | Ruolo    | Descrizione                            |
 * |--------|-------------------------------|------|----------|----------------------------------------|
 * | GET    | /catalog                      | —    | —        | Catalogo pubblico con filtri           |
 * | GET    | /dashboard                    | ✓    | membro   | Dashboard personale (propri progetti)  |
 * | POST   | /                             | ✓    | —        | Crea un nuovo progetto                 |
 * | GET    | /:projectId                   | —    | —        | Dettaglio progetto (pubblico o membro) |
 * | PUT    | /:projectId                   | ✓    | owner    | Aggiorna il progetto                   |
 * | DELETE | /:projectId                   | ✓    | owner    | Elimina il progetto                    |
 * | PATCH  | /:projectId/archive           | ✓    | owner    | Archivia il progetto                   |
 * | PATCH  | /:projectId/unarchive         | ✓    | owner    | Ripristina dall'archivio               |
 * | POST   | /:projectId/members           | ✓    | owner    | Invita un membro                       |
 * | DELETE | /:projectId/members/:userId   | ✓    | owner    | Rimuove un membro                      |
 * | POST   | /:projectId/report            | ✓    | —        | Segnala il progetto                    |
 */

const { Router } = require('express');
const controller = require('../controllers/project.controller');
const validate = require('../middleware/validate.middleware');
const { authenticate } = require('../middleware/auth.middleware');
const { loadProject, requireMember, requireOwner } = require('../middleware/project.middleware');
const {
  createProjectBody,
  updateProjectBody,
  catalogQuery,
  inviteMemberBody,
  reportProjectBody,
} = require('../validators/project.validator');
const { projectIdParams, userIdParams } = require('../validators/common.validator');

const router = Router();

// Catalogo pubblico (non richiede autenticazione)
router.get('/catalog', validate({ query: catalogQuery }), controller.catalog);

// Dashboard personale (richiede autenticazione)
router.get('/dashboard', authenticate, controller.dashboard);

// CRUD progetti
router.post('/', authenticate, validate({ body: createProjectBody }), controller.create);

router.get(
  '/:projectId',
  validate({ params: projectIdParams }),
  loadProject,
  controller.getOne
);

router.put(
  '/:projectId',
  authenticate,
  validate({ params: projectIdParams, body: updateProjectBody }),
  loadProject,
  requireOwner,
  controller.update
);

router.delete(
  '/:projectId',
  authenticate,
  validate({ params: projectIdParams }),
  loadProject,
  requireOwner,
  controller.remove
);

// Archiviazione
router.patch(
  '/:projectId/archive',
  authenticate,
  validate({ params: projectIdParams }),
  loadProject,
  requireOwner,
  controller.archive
);

router.patch(
  '/:projectId/unarchive',
  authenticate,
  validate({ params: projectIdParams }),
  loadProject,
  requireOwner,
  controller.unarchive
);

// Gestione membri
router.post(
  '/:projectId/members',
  authenticate,
  validate({ params: projectIdParams, body: inviteMemberBody }),
  loadProject,
  requireOwner,
  controller.addMember
);

router.delete(
  '/:projectId/members/:userId',
  authenticate,
  validate({ params: projectIdParams.merge(userIdParams) }),
  loadProject,
  requireOwner,
  controller.removeMember
);

// Segnalazione progetto (qualsiasi utente autenticato)
router.post(
  '/:projectId/report',
  authenticate,
  validate({ params: projectIdParams, body: reportProjectBody }),
  loadProject,
  controller.report
);

module.exports = router;
