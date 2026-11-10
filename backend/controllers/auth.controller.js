/**
 * @module auth.controller
 * @description Controller per le route di autenticazione.
 *   Delega tutta la logica ad {@link module:auth.service};
 *   si occupa solo di estrarre i dati validati da `req.valid` e formattare la risposta HTTP.
 */

const authService = require('../services/auth.service');

/**
 * Registra un nuovo utente.
 *
 * @type {import('express').RequestHandler}
 * @returns {201} `{ user, accessToken, refreshToken }`
 */
async function register(req, res, next) {
  try {
    const { username, email, password } = req.valid.body;
    const result = await authService.register(username, email, password);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * Autentica un utente con email e password.
 *
 * @type {import('express').RequestHandler}
 * @returns {200} `{ user, accessToken, refreshToken }`
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.valid.body;
    const result = await authService.login(email, password);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * Rinnova l'access token tramite un refresh token valido (rotation).
 *
 * @type {import('express').RequestHandler}
 * @returns {200} `{ accessToken, refreshToken }`
 */
async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.valid.body;
    const result = await authService.refresh(refreshToken);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * Revoca il refresh token (logout dal dispositivo corrente).
 *
 * @type {import('express').RequestHandler}
 * @returns {200} `{ message }`
 */
async function logout(req, res, next) {
  try {
    const { refreshToken } = req.valid.body || {};
    await authService.logout(refreshToken);
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
}

/**
 * Restituisce il profilo dell'utente autenticato (da `req.user` impostato da Passport).
 *
 * @type {import('express').RequestHandler}
 * @returns {200} `{ user }`
 */
async function me(req, res) {
  res.json({ user: req.user });
}

module.exports = { register, login, refresh, logout, me };
