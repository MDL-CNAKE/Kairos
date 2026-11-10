/**
 * @module chat.validator
 * @description Schemi Zod per le route della chat di progetto.
 */

const { z } = require('zod');

/**
 * Corpo per l'invio di un messaggio in chat.
 * Il testo viene ripulito dagli spazi e non può essere vuoto.
 * @type {import('zod').ZodObject}
 */
const sendMessageBody = z.object({
  text: z
    .string({ error: () => 'text is required' })
    .trim()
    .min(1, 'text cannot be empty')
    .max(2000, 'text must be at most 2000 characters'),
});

module.exports = { sendMessageBody };
