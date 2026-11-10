/**
 * @module models/notification
 * @description Schema Mongoose per le notifiche persistenti degli utenti.
 *   Le notifiche vengono create lato server e distribuite in real-time via Socket.io;
 *   questo schema garantisce che siano accessibili anche dopo la disconnessione.
 */

const mongoose = require('mongoose');
const { NOTIFICATION_TYPES } = require('../utils/constants.util');

/**
 * @typedef {Object} NotificationDocument
 * @property {mongoose.Types.ObjectId} userId  - Destinatario della notifica.
 * @property {string}  type     - Tipo di evento (es. `task_assigned`, `member_joined`).
 * @property {string}  message  - Testo leggibile della notifica.
 * @property {Object}  data     - Payload extra (es. `{ taskId, projectId }`) per la navigazione client.
 * @property {boolean} read     - `false` finché l'utente non la segna come letta.
 * @property {Date}    createdAt
 * @property {Date}    updatedAt
 */

/** Notifica persistente per un utente; le notifiche live viaggiano anche via Socket.io. */
const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: NOTIFICATION_TYPES,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    // Dati extra (es. projectId, taskId) utili al client per navigare
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    read: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Indice per recuperare le notifiche non lette di un utente in ordine cronologico inverso
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
