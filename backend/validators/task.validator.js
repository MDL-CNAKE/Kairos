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
 * Voce della checklist. `_id` è presente quando si modifica una voce esistente.
 * @type {import('zod').ZodObject}
 */
const checklistItem = z.object({
  _id: mongoId.optional(),
  text: z.string({ error: () => 'checklist text is required' })
    .trim()
    .min(1, 'checklist text cannot be empty')
    .max(200, 'checklist item must be at most 200 characters'),
  done: z.boolean().optional(),
});

/** @type {import('zod').ZodArray} Checklist completa del task (sostituisce quella esistente). */
const checklist = z.array(checklistItem).max(50, 'checklist can have at most 50 items');

/** @type {import('zod').ZodObject} Etichetta colorata. */
const tag = z.object({
  name: z.string({ error: () => 'tag name is required' })
    .trim()
    .min(1, 'tag name cannot be empty')
    .max(30, 'tag name must be at most 30 characters'),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'tag color must be a hex color like #ff8800').optional(),
});

/** @type {import('zod').ZodArray} Elenco tag del task, senza nomi duplicati. */
const tags = z.array(tag)
  .max(10, 'a task can have at most 10 tags')
  .refine(
    (list) => new Set(list.map((t) => t.name.toLowerCase())).size === list.length,
    'tag names must be unique'
  );

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
  checklist: checklist.optional(),
  tags: tags.optional(),
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
  checklist: checklist.optional(),
  tags: tags.optional(),
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
