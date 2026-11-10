/**
 * @module models/message
 * @description Schema Mongoose per i messaggi della chat interna ai progetti.
 *   I messaggi viaggiano in real-time via Socket.io e vengono persistiti qui
 *   per consentire il caricamento della cronologia.
 */

const mongoose = require('mongoose');

/**
 * @typedef {Object} MessageDocument
 * @property {mongoose.Types.ObjectId} projectId - Progetto di appartenenza.
 * @property {mongoose.Types.ObjectId} userId    - Mittente del messaggio.
 * @property {string}  text      - Testo (max 2000 caratteri).
 * @property {Date}    createdAt
 * @property {Date}    updatedAt
 */

/** Messaggio della chat interna di un progetto. */
const messageSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    text: {
      type: String,
      required: [true, 'text is required'],
      maxlength: [2000, 'message must be at most 2000 characters'],
    },
  },
  { timestamps: true }
);

// Indice per recuperare la cronologia in ordine inverso (più recente prima)
messageSchema.index({ projectId: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
