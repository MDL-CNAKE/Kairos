/**
 * @module validators/task
 * @description Schema Zod v4 per la validazione delle route dei task.
 *   Il campo `deadline` accetta sia ISO 8601 con offset (`2025-11-08T10:00:00+01:00`)
 *   sia date nel formato `YYYY-MM-DD`.
 */

const { z } = require('zod');
const { text, mongoId } = require('./common.validator');
const { TASK_STATUSES, TASK_PRIORITIES } = require('../utils/constants.util');

/**
 * Corpo per la creazione di un task all'interno di un progetto.
 * `title` è obbligatorio; `assigneeId` deve essere un ObjectId MongoDB valido.
 * @type {import('zod').ZodObject}
 */
const createTaskBody = z.object({
  title: text('title').trim().max(150, 'title must be at most 150 characters'),
  description: text('description').max(2000).optional(),
  // Accetta sia datetime ISO 8601 con offset, sia data semplice YYYY-MM-DD
  deadline: z.iso.datetime({ offset: true }).optional().or(
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'deadline must be a date YYYY-MM-DD').optional()
  ),
  priority: z.enum(TASK_PRIORITIES, { error: () => 'Invalid priority' }).optional(),
  assigneeId: mongoId.optional(),
});

/**
 * Corpo per l'aggiornamento di un task (PATCH semantics).
 * Tutti i campi sono opzionali. `assigneeId` può essere `null` per rimuovere l'assegnatario.
 * @type {import('zod').ZodObject}
 */
const updateTaskBody = z.object({
  title: text('title').trim().max(150).optional(),
  description: text('description').max(2000).optional(),
  deadline: z.iso.datetime({ offset: true }).optional().or(
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
  ),
  priority: z.enum(TASK_PRIORITIES).optional(),
  // `null` → rimuove l'assegnatario; assente → non modifica l'assegnatario
  assigneeId: mongoId.optional().nullable(),
});

/**
 * Corpo per il cambio di stato di un task (es. `todo` → `in_progress`).
 * `status` è obbligatorio e deve essere uno dei valori di `TASK_STATUSES`.
 * @type {import('zod').ZodObject}
 */
const taskStatusBody = z.object({
  status: z.enum(TASK_STATUSES, { error: () => 'Invalid status' }),
});

module.exports = { createTaskBody, updateTaskBody, taskStatusBody };
