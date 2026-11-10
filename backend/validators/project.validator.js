/**
 * @module validators/project
 * @description Schema Zod v4 per la validazione delle route dei progetti.
 *   Tutti i campi enum sono validati rispetto alle costanti centralizzate in `constants.util`.
 */

const { z } = require('zod');
const { text, mongoId } = require('./common.validator');
const {
  PROJECT_CATEGORIES,
  PROJECT_VISIBILITIES,
} = require('../utils/constants.util');

/**
 * Corpo per la creazione di un progetto.
 * `category` è obbligatoria; gli altri campi sono opzionali.
 * @type {import('zod').ZodObject}
 */
const createProjectBody = z.object({
  title: text('title').trim().max(100, 'title must be at most 100 characters'),
  description: text('description').max(2000, 'description must be at most 2000 characters').optional(),
  category: z.enum(PROJECT_CATEGORIES, { error: () => 'Invalid category' }),
  technologies: z.array(z.string()).max(20, 'too many technologies').optional(),
  visibility: z.enum(PROJECT_VISIBILITIES).optional(),
  coverImage: z.url('coverImage must be a valid URL').optional(),
});

/**
 * Corpo per l'aggiornamento di un progetto.
 * Tutti i campi sono opzionali (PATCH semantics).
 * @type {import('zod').ZodObject}
 */
const updateProjectBody = z.object({
  title: text('title').trim().max(100).optional(),
  description: text('description').max(2000).optional(),
  category: z.enum(PROJECT_CATEGORIES).optional(),
  technologies: z.array(z.string()).max(20).optional(),
  visibility: z.enum(PROJECT_VISIBILITIES).optional(),
  coverImage: z.url().optional(),
});

/**
 * Query string per il catalogo pubblico (filtri + paginazione + ordinamento).
 * @type {import('zod').ZodObject}
 */
const catalogQuery = z.object({
  category: z.enum(PROJECT_CATEGORIES).optional(),
  technology: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(50).optional(),
  sortBy: z.enum(['createdAt', 'title']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
});

/**
 * Corpo per l'invito di un membro al progetto.
 * @type {import('zod').ZodObject}
 */
const inviteMemberBody = z.object({
  userId: mongoId,
});

/**
 * Corpo per la segnalazione di un progetto.
 * @type {import('zod').ZodObject}
 */
const reportProjectBody = z.object({
  reason: text('reason').max(500, 'reason must be at most 500 characters'),
});

module.exports = {
  createProjectBody,
  updateProjectBody,
  catalogQuery,
  inviteMemberBody,
  reportProjectBody,
};
