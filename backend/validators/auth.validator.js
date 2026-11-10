/**
 * @module validators/auth
 * @description Schema Zod v4 per la validazione delle route di autenticazione.
 *   Usa `z.email()` (sintassi Zod v4) per la validazione dell'email.
 */

const { z } = require('zod');
const { text } = require('./common.validator');

/**
 * Corpo della richiesta di registrazione.
 * @type {import('zod').ZodObject}
 */
const registerBody = z.object({
  username: text('username')
    .trim()
    .min(3, 'username must be at least 3 characters')
    .max(30, 'username must be at most 30 characters'),
  email: z.email('email is not valid'),
  password: text('password').min(8, 'password must be at least 8 characters'),
});

/**
 * Corpo della richiesta di login.
 * @type {import('zod').ZodObject}
 */
const loginBody = z.object({
  email: z.email('email is not valid'),
  password: text('password'),
});

/**
 * Corpo della richiesta di refresh token.
 * @type {import('zod').ZodObject}
 */
const refreshBody = z.object({
  refreshToken: text('refreshToken'),
});

/**
 * Corpo della richiesta di logout.
 * Il `refreshToken` è opzionale: se presente, il token viene revocato.
 * @type {import('zod').ZodObject}
 */
const logoutBody = z.object({
  refreshToken: text('refreshToken').optional(),
});

module.exports = { registerBody, loginBody, refreshBody, logoutBody };
