/**
 * @module routes/auth
 * @description Route di autenticazione.
 *
 * | Metodo | Path              | Auth | Descrizione                              |
 * |--------|-------------------|------|------------------------------------------|
 * | POST   | /register         | —    | Registra un nuovo utente                 |
 * | POST   | /login            | —    | Login, restituisce access + refresh token|
 * | POST   | /refresh          | —    | Rinnova l'access token via refresh token |
 * | POST   | /logout           | ✓    | Revoca il refresh token corrente         |
 * | GET    | /me               | ✓    | Profilo dell'utente autenticato          |
 */

const { Router } = require('express');
const controller = require('../controllers/auth.controller');
const validate = require('../middleware/validate.middleware');
const { authenticate } = require('../middleware/auth.middleware');
const { registerBody, loginBody, refreshBody, logoutBody } = require('../validators/auth.validator');

const router = Router();

// POST /api/auth/register
router.post('/register', validate({ body: registerBody }), controller.register);

// POST /api/auth/login
router.post('/login', validate({ body: loginBody }), controller.login);

// POST /api/auth/refresh
router.post('/refresh', validate({ body: refreshBody }), controller.refresh);

// POST /api/auth/logout  (opzionale: revoca il refresh token)
router.post('/logout', authenticate, validate({ body: logoutBody }), controller.logout);

// GET /api/auth/me
router.get('/me', authenticate, controller.me);

module.exports = router;
