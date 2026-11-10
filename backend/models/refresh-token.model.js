/**
 * @module models/refresh-token
 * @description Schema Mongoose per i refresh token.
 *   Nel DB viene salvato solo l'hash SHA-256 del token; il token grezzo
 *   viene trasmesso esclusivamente al client via HTTPS.
 *   Il TTL index (`expireAfterSeconds: 0`) delega a MongoDB la pulizia automatica
 *   dei token scaduti in base al campo `expiresAt`.
 */

const mongoose = require('mongoose');

/**
 * @typedef {Object} RefreshTokenDocument
 * @property {mongoose.Types.ObjectId} userId     - Utente proprietario del token.
 * @property {string}  tokenHash  - SHA-256 hex del token grezzo (96 caratteri).
 * @property {Date}    expiresAt  - Data di scadenza; usata dal TTL index MongoDB.
 */

/** Schema con TTL index per la scadenza automatica dei refresh token. */
const refreshTokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  tokenHash: {
    type: String,
    required: true,
    unique: true,
  },
  // TTL index: MongoDB elimina il documento automaticamente dopo la scadenza.
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 },
  },
});

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);
