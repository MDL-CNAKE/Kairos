/**
 * @module admin.controller
 * @description Controller per le route di amministrazione.
 *   Tutte le route richiedono ruolo `admin` (middleware `requireAdmin` a livello di router).
 */

const User = require('../models/user.model');
const projectService = require('../services/project.service');
const AppError = require('../utils/app-error.util');

/**
 * Lista tutti gli utenti con paginazione.
 *
 * @type {import('express').RequestHandler}
 * @returns {200} `{ users, total, page, totalPages }`
 */
async function listUsers(req, res, next) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(),
    ]);

    res.json({ users, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
}

/**
 * Blocca un utente impedendogli di effettuare il login.
 * Non è possibile bloccare un admin.
 *
 * @type {import('express').RequestHandler}
 * @returns {200} `{ message, user }`
 * @throws {AppError} 404 se l'utente non esiste.
 * @throws {AppError} 400 se si tenta di bloccare un admin.
 */
async function blockUser(req, res, next) {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) throw new AppError(404, 'User not found');
    if (user.role === 'admin') throw new AppError(400, 'Cannot block an admin');

    user.isBlocked = true;
    await user.save();
    res.json({ message: 'User blocked', user });
  } catch (err) {
    next(err);
  }
}

/**
 * Sblocca un utente precedentemente bloccato.
 *
 * @type {import('express').RequestHandler}
 * @returns {200} `{ message, user }`
 * @throws {AppError} 404 se l'utente non esiste.
 */
async function unblockUser(req, res, next) {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) throw new AppError(404, 'User not found');

    user.isBlocked = false;
    await user.save();
    res.json({ message: 'User unblocked', user });
  } catch (err) {
    next(err);
  }
}

/**
 * Lista tutti i progetti (inclusi quelli nascosti e archiviati) con paginazione.
 *
 * @type {import('express').RequestHandler}
 * @returns {200} `{ projects, total, page, totalPages }`
 */
async function listProjects(req, res, next) {
  try {
    const result = await projectService.adminList({
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * Ripristina la visibilità di un progetto nascosto per segnalazioni.
 * Azzera anche il contatore `reportCount`.
 *
 * @type {import('express').RequestHandler}
 * @returns {200} `{ project }`
 */
async function restoreProject(req, res, next) {
  try {
    const project = await projectService.adminRestore(req.project);
    res.json({ project });
  } catch (err) {
    next(err);
  }
}

module.exports = { listUsers, blockUser, unblockUser, listProjects, restoreProject };
