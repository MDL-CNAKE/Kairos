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
  // Errori Mongoose sfuggiti alla validazione Zod: non sono errori del server
  if (err && err.name === 'CastError') {
    return res.status(400).json({ message: `Invalid ${err.path}` });
  }
  // Indice unico violato (es. email registrata due volte in contemporanea)
  if (err && err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'value';
    return res.status(409).json({ message: `${field} already in use` });
  }
  if (err && err.name === 'ValidationError' && err.errors) {
    const message = Object.values(err.errors).map((e) => e.message).join(', ');
    return res.status(422).json({ message });
  }
  const status = err.status || 500;
  const message = status < 500 ? err.message : 'Internal server error';

  if (status >= 500) {
    console.error('[ERROR]', err);
  }

  res.status(status).json({ message });
}

module.exports = { notFoundHandler, errorHandler };
