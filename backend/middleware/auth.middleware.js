/**
 * @module auth.middleware
 * @description Middleware di autenticazione basato su Passport-JWT.
 *   Legge il Bearer token dall'header Authorization e popola `req.user`.
 */

const passport = require('passport');

/**
 * Middleware che autentica la richiesta tramite JWT.
 * Se il token manca o non è valido risponde con 401.
 * Se l'utente non esiste più o è bloccato (`isBlocked`) risponde con 401:
 * la strategia Passport ricarica l'utente dal database a ogni richiesta.
 * In caso di successo popola `req.user` con il documento utente.
 *
 * @type {import('express').RequestHandler}
 *
 * @example
 * router.get('/me', authenticate, controller.me);
 */
function authenticate(req, res, next) {
  passport.authenticate('jwt', { session: false }, (err, user, info) => {
    if (err) return next(err);
    if (!user) {
      const message = info?.message || 'Unauthorized';
      return res.status(401).json({ message });
    }
    req.user = user;
    next();
  })(req, res, next);
}

module.exports = { authenticate };
