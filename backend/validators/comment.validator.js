/**
 * @module comment.validator
 * @description Schemi Zod per i commenti dei task.
 */

const { z } = require('zod');
const { mongoId, taskIdParams } = require('./common.validator');

/** @type {import('zod').ZodObject} Corpo per un nuovo commento. */
const commentBody = z.object({
  text: z
    .string({ error: () => 'text is required' })
    .trim()
    .min(1, 'text cannot be empty')
    .max(1000, 'text must be at most 1000 characters'),
});

/** @type {import('zod').ZodObject} Params con progetto, task e commento. */
const commentIdParams = taskIdParams.extend({ commentId: mongoId });

module.exports = { commentBody, commentIdParams };
