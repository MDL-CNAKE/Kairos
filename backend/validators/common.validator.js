/**
 * @module validators/common
 * @description Validator Zod v4 condivisi tra tutti i moduli dell'applicazione.
 *   Espone helper per stringhe obbligatorie e oggetti `params` riutilizzabili.
 */

const { z } = require('zod');

/**
 * Factory per il messaggio di errore "campo obbligatorio".
 * Compatibile con la sintassi Zod v4 (`{ error: fn }`).
 *
 * @param {string} label - Nome del campo da mostrare nel messaggio di errore.
 * @returns {() => string} Funzione che restituisce il messaggio di errore.
 *
 * @example
 * z.string({ error: requiredMessage('username') })
 */
const requiredMessage = (label) => () => `${label} is required`;

/**
 * Crea uno schema `z.string()` con messaggio di errore personalizzato per il campo obbligatorio.
 *
 * @param {string} label - Nome del campo.
 * @returns {import('zod').ZodString}
 *
 * @example
 * const usernameSchema = text('username').min(3);
 */
const text = (label) => z.string({ error: requiredMessage(label) });

/**
 * Validator per un ObjectId MongoDB (stringa esadecimale da 24 caratteri).
 * @type {import('zod').ZodString}
 */
const mongoId = text('id').regex(/^[0-9a-fA-F]{24}$/, 'Invalid id format');

/**
 * Schema params con `projectId`.
 * @type {import('zod').ZodObject}
 */
const projectIdParams = z.object({ projectId: mongoId });

/**
 * Schema params con `projectId` e `taskId`.
 * @type {import('zod').ZodObject}
 */
const taskIdParams = z.object({ projectId: mongoId, taskId: mongoId });

/**
 * Schema params con `userId`.
 * @type {import('zod').ZodObject}
 */
const userIdParams = z.object({ userId: mongoId });

/**
 * Schema params con `notificationId`.
 * @type {import('zod').ZodObject}
 */
const notificationIdParams = z.object({ notificationId: mongoId });

module.exports = {
  text,
  requiredMessage,
  mongoId,
  projectIdParams,
  taskIdParams,
  userIdParams,
  notificationIdParams,
};
