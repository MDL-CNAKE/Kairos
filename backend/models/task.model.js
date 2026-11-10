/**
 * @module models/task
 * @description Schema Mongoose per i task dei progetti.
 *   I task appartengono a un progetto e possono essere assegnati a un membro.
 *   Gli indici ottimizzano le query della board e della dashboard personale.
 */

const mongoose = require('mongoose');
const { TASK_STATUSES, TASK_PRIORITIES } = require('../utils/constants.util');

/**
 * @typedef {Object} TaskDocument
 * @property {mongoose.Types.ObjectId} projectId   - Progetto di appartenenza.
 * @property {string}  title        - Titolo (max 200 caratteri).
 * @property {string}  description  - Descrizione (max 2000 caratteri).
 * @property {Date}    deadline     - Scadenza opzionale.
 * @property {string}  priority     - `low`, `medium` o `high`.
 * @property {string}  status       - `todo`, `in_progress` o `done`.
 * @property {mongoose.Types.ObjectId} assigneeId  - Utente assegnato (opzionale).
 * @property {mongoose.Types.ObjectId} createdBy   - Utente che ha creato il task.
 * @property {Date}    createdAt
 * @property {Date}    updatedAt
 */

const taskSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'title is required'],
      trim: true,
      maxlength: [200, 'title must be at most 200 characters'],
    },
    description: {
      type: String,
      default: '',
      maxlength: [2000, 'description must be at most 2000 characters'],
    },
    deadline: {
      type: Date,
      default: null,
    },
    priority: {
      type: String,
      enum: TASK_PRIORITIES,
      default: 'medium',
    },
    status: {
      type: String,
      enum: TASK_STATUSES,
      default: 'todo',
    },
    assigneeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

// Indice per recuperare rapidamente i task di un progetto raggruppati per status (board)
taskSchema.index({ projectId: 1, status: 1 });
// Indice per la dashboard: task assegnati all'utente ordinati per deadline
taskSchema.index({ assigneeId: 1, deadline: 1 });

module.exports = mongoose.model('Task', taskSchema);
