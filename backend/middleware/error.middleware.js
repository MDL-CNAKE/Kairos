/**
 * @module error.middleware
 * @description Gestione centralizzata degli errori Express.
 *   Tutti gli errori non gestiti nei controller passano per questi handler.
 */

/**
 * Handler per le route non trovate (404).
 * Va registrato dopo tutte le route.
 *
 * @type {import('express').RequestHandler}
 */
function notFoundHandler(req, res, next) {
  const AppError = require('../utils/app-error.util');
  next(new AppError(404, `Route ${req.method} ${req.path} not found`));
}

/**
 * Handler centralizzato degli errori.
 * - Se `err.status` è < 500, restituisce il messaggio originale.
 * - Se è >= 500, logga lo stack e restituisce un messaggio generico.
 *
 * @type {import('express').ErrorRequestHandler}
 */
function errorHandler(err, req, res, _next) {
  const status = err.status || 500;
  const message = status < 500 ? err.message : 'Internal server error';

  if (status >= 500) {
    console.error('[ERROR]', err);
  }

  res.status(status).json({ message });
}

module.exports = { notFoundHandler, errorHandler };
