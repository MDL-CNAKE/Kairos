/**
 * @module constants.util
 * @description Costanti condivise tra models, validators e services.
 *   Fonte unica di verità per tutti gli enum dell'applicazione.
 */

/** @type {string[]} Ruoli di sistema dell'utente. */
const USER_ROLES = ['user', 'admin'];

/** @type {string[]} Ruoli dell'utente all'interno di un progetto. */
const PROJECT_MEMBER_ROLES = ['member', 'owner'];

/** @type {string[]} Stati possibili di un progetto. */
const PROJECT_STATUSES = ['active', 'archived'];

/** @type {string[]} Visibilità di un progetto. */
const PROJECT_VISIBILITIES = ['public', 'private'];

/** @type {string[]} Stati possibili di un task (colonne board). */
const TASK_STATUSES = ['todo', 'in_progress', 'done'];

/** @type {string[]} Priorità possibili di un task. */
const TASK_PRIORITIES = ['low', 'medium', 'high'];

/** @type {string[]} Categorie disponibili per i progetti. */
const PROJECT_CATEGORIES = [
  'web',
  'mobile',
  'backend',
  'data',
  'ai',
  'devops',
  'design',
  'other',
];

/** @type {string[]} Tipi di notifica generabili dal sistema. */
const NOTIFICATION_TYPES = [
  'task_assigned',
  'task_status_changed',
  'member_joined',
  'project_reported',
  'task_commented',
];

module.exports = {
  USER_ROLES,
  PROJECT_MEMBER_ROLES,
  PROJECT_STATUSES,
  PROJECT_VISIBILITIES,
  TASK_STATUSES,
  TASK_PRIORITIES,
  PROJECT_CATEGORIES,
  NOTIFICATION_TYPES,
};
