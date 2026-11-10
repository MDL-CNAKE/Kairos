/**
 * @module app-error.util
 * @description Errore applicativo con status HTTP. Consente al middleware
 *   centralizzato di distinguere errori gestiti (AppError) da errori
 *   imprevisti (stack trace loggato, 500 restituito).
 */

/**
 * Errore con codice di stato HTTP.
 * @extends Error
 *
 * @example
 * throw new AppError(404, 'User not found');
 * throw new AppError(409, 'email already in use');
 */
class AppError extends Error {
  /**
   * @param {number} status  Codice HTTP (es. 400, 401, 403, 404, 409, 422).
   * @param {string} message Messaggio leggibile dal client.
   */
  constructor(status, message) {
    super(message);
    /** @type {number} */
    this.status = status;
    this.name = 'AppError';
  }
}

module.exports = AppError;
