/**
 * @module auth.service
 * @description Logica di business per autenticazione e gestione sessioni.
 *   Gestisce registrazione, login, refresh token (con rotation) e logout.
 */

const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const tokenService = require('./token.service');
const AppError = require('../utils/app-error.util');
const { jwtSecret, jwtExpire } = require('../../config/env.config');

/**
 * @typedef {Object} PublicUser
 * @property {string} _id
 * @property {string} username
 * @property {string} email
 * @property {string} role
 * @property {Date}   createdAt
 */

/**
 * @typedef {Object} AuthResult
 * @property {PublicUser} user
 * @property {string}     accessToken   JWT di accesso (breve durata).
 * @property {string}     refreshToken  Token opaco a lunga durata.
 */

/**
 * Converte un documento Mongoose utente in un oggetto pubblico
 * (esclude il campo `password` e altri campi interni).
 *
 * @param {import('../models/user.model').default} user
 * @returns {PublicUser}
 */
function toPublicUser(user) {
  return {
    _id: user._id,
    username: user.username,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  };
}

/**
 * Firma un access token JWT con i dati minimi dell'utente.
 *
 * @param {import('../models/user.model').default} user
 * @returns {string} Token JWT firmato.
 */
function signAccessToken(user) {
  return jwt.sign(
    { id: user._id, role: user.role },
    jwtSecret,
    { expiresIn: jwtExpire }
  );
}

/**
 * Registra un nuovo utente e restituisce i token.
 *
 * @param {string} username
 * @param {string} email
 * @param {string} password - Password in chiaro; verrà hashata dal model.
 * @returns {Promise<AuthResult>}
 * @throws {AppError} 409 se email o username già in uso.
 */
async function register(username, email, password) {
  const existing = await User.findOne({ $or: [{ email }, { username }] });
  if (existing) {
    const field = existing.email === email ? 'email' : 'username';
    throw new AppError(409, `${field} already in use`);
  }

  const user = await User.create({ username, email, password });
  const accessToken = signAccessToken(user);
  const refreshToken = await tokenService.create(user._id);

  return { user: toPublicUser(user), accessToken, refreshToken };
}

/**
 * Autentica un utente con email e password.
 *
 * @param {string} email
 * @param {string} password - Password in chiaro da confrontare con l'hash.
 * @returns {Promise<AuthResult>}
 * @throws {AppError} 401 se le credenziali non sono valide.
 * @throws {AppError} 403 se l'account è bloccato.
 */
async function login(email, password) {
  const user = await User.findOne({ email }).select('+password');
  if (!user) throw new AppError(401, 'Invalid credentials');
  if (user.isBlocked) throw new AppError(403, 'Account is blocked');

  const ok = await user.comparePassword(password);
  if (!ok) throw new AppError(401, 'Invalid credentials');

  const accessToken = signAccessToken(user);
  const refreshToken = await tokenService.create(user._id);

  return { user: toPublicUser(user), accessToken, refreshToken };
}

/**
 * Rinnova l'access token usando un refresh token valido (rotation).
 * Il vecchio refresh token viene invalidato e ne viene emesso uno nuovo.
 *
 * @param {string} rawRefreshToken - Token opaco ricevuto dal client.
 * @returns {Promise<{accessToken: string, refreshToken: string}>}
 * @throws {AppError} 401 se il token non è valido o è scaduto.
 */
async function refresh(rawRefreshToken) {
  const { newRaw, userId } = await tokenService.rotate(rawRefreshToken).catch(() => {
    throw new AppError(401, 'Invalid or expired refresh token');
  });

  const user = await User.findById(userId);
  if (!user || user.isBlocked) throw new AppError(401, 'User not found or blocked');

  const accessToken = signAccessToken(user);
  return { accessToken, refreshToken: newRaw };
}

/**
 * Revoca il refresh token (logout da un dispositivo).
 *
 * @param {string} [rawRefreshToken] - Token da revocare; ignorato se assente.
 * @returns {Promise<void>}
 */
async function logout(rawRefreshToken) {
  if (rawRefreshToken) {
    await tokenService.revoke(rawRefreshToken);
  }
}

module.exports = { register, login, refresh, logout, toPublicUser, signAccessToken };
