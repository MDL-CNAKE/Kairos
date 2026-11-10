/**
 * @module project.middleware
 * @description Middleware per il caricamento e la verifica dei permessi sui progetti.
 *   Tutti i middleware di questo modulo presuppongono che `req.user` sia già
 *   popolato da {@link module:auth.middleware~authenticate}.
 */

const Project = require('../models/project.model');
const AppError = require('../utils/app-error.util');

/**
 * Carica il progetto identificato da `req.params.projectId` e lo mette su `req.project`.
 * Risponde con 404 se il progetto non esiste o è nascosto (`isHidden`).
 *
 * @type {import('express').RequestHandler}
 */
async function loadProject(req, _res, next) {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project || project.isHidden) return next(new AppError(404, 'Project not found'));
    req.project = project;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Verifica che `req.user` sia membro del progetto (qualsiasi ruolo).
 * Presuppone che `loadProject` sia già stato eseguito.
 * Risponde con 403 se l'utente non è membro.
 *
 * @type {import('express').RequestHandler}
 */
function requireMember(req, _res, next) {
  const isMember = req.project.members.some(
    (m) => m.user.toString() === req.user._id.toString()
  );
  if (!isMember) return next(new AppError(403, 'You are not a member of this project'));
  next();
}

/**
 * Verifica che `req.user` sia il proprietario (`owner`) del progetto.
 * Presuppone che `loadProject` sia già stato eseguito.
 * Risponde con 403 se l'utente non è l'owner.
 *
 * @type {import('express').RequestHandler}
 */
function requireOwner(req, _res, next) {
  if (req.project.owner.toString() !== req.user._id.toString()) {
    return next(new AppError(403, 'Only the project owner can perform this action'));
  }
  next();
}

/**
 * Verifica che `req.user` abbia il ruolo di sistema `admin`.
 * Risponde con 403 se l'utente non è admin.
 *
 * @type {import('express').RequestHandler}
 */
function requireAdmin(req, _res, next) {
  if (req.user.role !== 'admin') {
    return next(new AppError(403, 'Admin access required'));
  }
  next();
}

module.exports = { loadProject, requireMember, requireOwner, requireAdmin };
