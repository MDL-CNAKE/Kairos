/**
 * @module token.service
 * @description Gestione dei refresh token: generazione, hashing SHA-256,
 *   rotazione (findOneAndDelete → crea nuovo) e revoca.
 *   Nel DB viene salvato solo l'hash; il token grezzo è trasmesso solo al client.
 */

const crypto = require('crypto');
const RefreshToken = require('../models/refresh-token.model');
const { refreshTokenDays } = require('../../config/env.config');

/**
 * Genera un token grezzo casuale a 48 byte (hex: 96 caratteri).
 * @returns {string}
 */
function generateRaw() {
  return crypto.randomBytes(48).toString('hex');
}

/**
 * Calcola l'hash SHA-256 di un token grezzo.
 * @param {string} raw - Token grezzo.
 * @returns {string} Hash esadecimale a 64 caratteri.
 */
function hash(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

/**
 * Crea e persiste un nuovo refresh token per l'utente.
 *
 * @param {string} userId - ID MongoDB dell'utente.
 * @returns {Promise<string>} Token grezzo da restituire al client.
 */
async function create(userId) {
  const raw = generateRaw();
  const tokenHash = hash(raw);
  const expiresAt = new Date(Date.now() + refreshTokenDays * 24 * 60 * 60 * 1000);

  await RefreshToken.create({ userId, tokenHash, expiresAt });
  return raw;
}

/**
 * Rotazione del refresh token: elimina il vecchio hash e ne crea uno nuovo.
 * Pattern sicuro: il vecchio token è usabile una sola volta.
 *
 * @param {string} raw - Token grezzo ricevuto dal client.
 * @returns {Promise<{newRaw: string, userId: string}>}
 * @throws {Error} Se il token non esiste o è già scaduto (gestito da TTL index).
 */
async function rotate(raw) {
  const tokenHash = hash(raw);
  const doc = await RefreshToken.findOneAndDelete({ tokenHash });
  if (!doc) throw new Error('Invalid or expired refresh token');

  const newRaw = generateRaw();
  const newHash = hash(newRaw);
  const expiresAt = new Date(Date.now() + refreshTokenDays * 24 * 60 * 60 * 1000);
  await RefreshToken.create({ userId: doc.userId, tokenHash: newHash, expiresAt });

  return { newRaw, userId: doc.userId };
}

/**
 * Revoca un singolo refresh token (logout da un dispositivo).
 *
 * @param {string} raw - Token grezzo da revocare.
 * @returns {Promise<void>}
 */
async function revoke(raw) {
  const tokenHash = hash(raw);
  await RefreshToken.deleteOne({ tokenHash });
}

/**
 * Revoca tutti i refresh token di un utente (logout da tutti i dispositivi).
 *
 * @param {string} userId - ID MongoDB dell'utente.
 * @returns {Promise<void>}
 */
async function revokeAll(userId) {
  await RefreshToken.deleteMany({ userId });
}

module.exports = { create, rotate, revoke, revokeAll };
