/**
 * @module models/user
 * @description Schema Mongoose per gli utenti di Kairos.
 *   La password viene hashata automaticamente con bcrypt prima del salvataggio
 *   e non è inclusa nelle query normali (`select: false`).
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { USER_ROLES } = require('../utils/constants.util');

/**
 * @typedef {Object} UserDocument
 * @property {string}  username    - Username univoco (3-30 caratteri).
 * @property {string}  email       - Email univoca, normalizzata in minuscolo.
 * @property {string}  password    - Hash bcrypt (non selezionato di default).
 * @property {string}  role        - Ruolo di sistema: `user` o `admin`.
 * @property {boolean} isBlocked   - Flag di blocco impostato dagli admin.
 * @property {Date}    createdAt
 * @property {Date}    updatedAt
 */

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'username is required'],
      unique: true,
      trim: true,
      minlength: [3, 'username must be at least 3 characters'],
      maxlength: [30, 'username must be at most 30 characters'],
    },
    email: {
      type: String,
      required: [true, 'email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'password is required'],
      minlength: [8, 'password must be at least 8 characters'],
      select: false, // non inclusa nelle query normali
    },
    role: {
      type: String,
      enum: USER_ROLES,
      default: 'user',
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

/**
 * Hook pre-save: hash della password con bcrypt (factor 12) se il campo è stato modificato.
 */
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

/**
 * Confronta una password in chiaro con l'hash salvato.
 *
 * @param {string} plain - Password in chiaro da confrontare.
 * @returns {Promise<boolean>} `true` se la password corrisponde.
 */
userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

module.exports = mongoose.model('User', userSchema);
