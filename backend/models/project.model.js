/**
 * @module models/project
 * @description Schema Mongoose per i progetti di TaskFlow.
 *   Include lo schema embedded per i membri (`memberSchema`) e
 *   indici per le query del catalogo pubblico.
 */

const mongoose = require('mongoose');
const {
  PROJECT_STATUSES,
  PROJECT_VISIBILITIES,
  PROJECT_CATEGORIES,
  PROJECT_MEMBER_ROLES,
} = require('../utils/constants.util');

/**
 * @typedef {Object} ProjectMember
 * @property {mongoose.Types.ObjectId} user - Riferimento al documento User.
 * @property {'member'|'owner'}        role - Ruolo del membro nel progetto.
 */

/**
 * Schema embedded per i membri del progetto.
 * Non genera un `_id` separato per ogni subdocument.
 *
 * @type {mongoose.Schema<ProjectMember>}
 */
const memberSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: PROJECT_MEMBER_ROLES, default: 'member' },
  },
  { _id: false }
);

/**
 * @typedef {Object} ProjectDocument
 * @property {string}   title        - Titolo (max 100 caratteri).
 * @property {string}   description  - Descrizione (max 2000 caratteri).
 * @property {string}   category     - Categoria del progetto (enum `PROJECT_CATEGORIES`).
 * @property {string[]} technologies - Stack tecnologico.
 * @property {string}   visibility   - `public` o `private`.
 * @property {string}   coverImage   - URL dell'immagine di copertina.
 * @property {string}   status       - `active` o `archived`.
 * @property {mongoose.Types.ObjectId} owner   - Owner (shortcut per query rapide).
 * @property {ProjectMember[]}         members - Membri del progetto con ruolo.
 * @property {boolean}  isHidden     - Nascosto da segnalazioni (gestito dagli admin).
 * @property {number}   reportCount  - Numero di segnalazioni ricevute.
 * @property {Date}     createdAt
 * @property {Date}     updatedAt
 */

const projectSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'title is required'],
      trim: true,
      maxlength: [100, 'title must be at most 100 characters'],
    },
    description: {
      type: String,
      default: '',
      maxlength: [2000, 'description must be at most 2000 characters'],
    },
    category: {
      type: String,
      enum: PROJECT_CATEGORIES,
      required: [true, 'category is required'],
    },
    technologies: {
      type: [String],
      default: [],
    },
    visibility: {
      type: String,
      enum: PROJECT_VISIBILITIES,
      default: 'public',
    },
    coverImage: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: PROJECT_STATUSES,
      default: 'active',
    },
    // owner è il primo membro con ruolo "owner", ma lo teniamo anche qui per query rapide
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    members: {
      type: [memberSchema],
      default: [],
    },
    // Gestione moderazione admin
    isHidden: { type: Boolean, default: false },
    reportCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Indici per le query del catalogo pubblico
projectSchema.index({ visibility: 1, status: 1, isHidden: 1 });
projectSchema.index({ category: 1 });
projectSchema.index({ technologies: 1 });
projectSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Project', projectSchema);
