/**
 * @module project.controller
 * @description Controller per le route dei progetti.
 *   I middleware `loadProject`, `requireOwner` e `requireMember` vengono applicati
 *   a livello di router; qui si assume che `req.project` sia già disponibile dove necessario.
 */

const projectService = require('../services/project.service');

/**
 * Crea un nuovo progetto. L'utente autenticato diventa automaticamente owner.
 *
 * @type {import('express').RequestHandler}
 * @returns {201} `{ project }`
 */
async function create(req, res, next) {
  try {
    const project = await projectService.create(req.user._id, req.valid.body);
    res.status(201).json({ project });
  } catch (err) {
    next(err);
  }
}

/**
 * Restituisce il progetto caricato dal middleware `loadProject`.
 *
 * @type {import('express').RequestHandler}
 * @returns {200} `{ project }`
 */
function getOne(req, res) {
  res.json({ project: req.project });
}

/**
 * Aggiorna i campi del progetto (solo owner).
 *
 * @type {import('express').RequestHandler}
 * @returns {200} `{ project }`
 */
async function update(req, res, next) {
  try {
    const project = await projectService.update(req.project, req.valid.body);
    res.json({ project });
  } catch (err) {
    next(err);
  }
}

/**
 * Archivia il progetto (solo owner). Status → `archived`.
 *
 * @type {import('express').RequestHandler}
 * @returns {200} `{ project }`
 */
async function archive(req, res, next) {
  try {
    const project = await projectService.setArchived(req.project, true);
    res.json({ project });
  } catch (err) {
    next(err);
  }
}

/**
 * Ripristina il progetto dall'archivio (solo owner). Status → `active`.
 *
 * @type {import('express').RequestHandler}
 * @returns {200} `{ project }`
 */
async function unarchive(req, res, next) {
  try {
    const project = await projectService.setArchived(req.project, false);
    res.json({ project });
  } catch (err) {
    next(err);
  }
}

/**
 * Elimina il progetto e tutti i suoi task (solo owner).
 *
 * @type {import('express').RequestHandler}
 * @returns {200} `{ message }`
 */
async function remove(req, res, next) {
  try {
    await projectService.remove(req.project._id);
    res.json({ message: 'Project deleted' });
  } catch (err) {
    next(err);
  }
}

/**
 * Restituisce il catalogo pubblico dei progetti (paginato, filtrabile).
 *
 * @type {import('express').RequestHandler}
 * @returns {200} `{ projects, total, page, totalPages }`
 */
async function catalog(req, res, next) {
  try {
    const result = await projectService.catalog(req.valid.query);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * Restituisce la dashboard personale dell'utente:
 * progetti creati, progetti come membro, task assegnati.
 *
 * @type {import('express').RequestHandler}
 * @returns {200} `{ created, member, assignedTasks }`
 */
async function dashboard(req, res, next) {
  try {
    const data = await projectService.dashboard(req.user._id);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

/**
 * Aggiunge un membro al progetto (solo owner).
 *
 * @type {import('express').RequestHandler}
 * @returns {200} `{ project }`
 */
async function addMember(req, res, next) {
  try {
    const { userId } = req.valid.body;
    const project = await projectService.addMember(req.project, userId);
    res.json({ project });
  } catch (err) {
    next(err);
  }
}

/**
 * Rimuove un membro dal progetto (solo owner).
 * L'owner non può essere rimosso.
 *
 * @type {import('express').RequestHandler}
 * @returns {200} `{ project }`
 */
async function removeMember(req, res, next) {
  try {
    const { userId } = req.valid.params;
    const project = await projectService.removeMember(req.project, userId);
    res.json({ project });
  } catch (err) {
    next(err);
  }
}

/**
 * Segnala un progetto come inappropriato.
 * Se il contatore segnalazioni raggiunge 3, il progetto viene nascosto automaticamente.
 *
 * @type {import('express').RequestHandler}
 * @returns {200} `{ message }`
 */
async function report(req, res, next) {
  try {
    await projectService.report(req.project, req.valid.body?.reason);
    res.json({ message: 'Project reported' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  create,
  getOne,
  update,
  archive,
  unarchive,
  remove,
  catalog,
  dashboard,
  addMember,
  removeMember,
  report,
};
