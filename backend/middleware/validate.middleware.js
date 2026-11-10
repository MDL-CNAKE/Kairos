/**
 * @module validate.middleware
 * @description Factory di middleware per la validazione delle richieste con Zod v4.
 *   I dati validati vengono esposti su {@link Express.Request.valid}.
 */

const AppError = require('../utils/app-error.util');

/**
 * @typedef {Object} ValidateSchemas
 * @property {import('zod').ZodTypeAny} [body]   Schema per `req.body`.
 * @property {import('zod').ZodTypeAny} [params] Schema per `req.params`.
 * @property {import('zod').ZodTypeAny} [query]  Schema per `req.query`.
 */

/**
 * Crea un middleware Express che valida body, params e/o query con schemi Zod.
 * In caso di errore restituisce 422 con il messaggio dei primi errori.
 * I dati validati e castati sono disponibili su `req.valid.{body,params,query}`.
 *
 * @param {ValidateSchemas} schemas - Schemi Zod da applicare.
 * @returns {import('express').RequestHandler}
 *
 * @example
 * router.post('/', validate({ body: createProjectBody }), controller.create);
 */
function validate({ body, params, query } = {}) {
  return (req, _res, next) => {
    req.valid = {};
    try {
      if (body)   req.valid.body   = body.parse(req.body);
      if (params) req.valid.params = params.parse(req.params);
      if (query)  req.valid.query  = query.parse(req.query);
      next();
    } catch (err) {
      // Zod v4: err.issues contiene l'array degli errori di validazione
      const issues = err.issues || [];
      const message = issues.map((i) => i.message).join('; ') || 'Validation error';
      next(new AppError(422, message));
    }
  };
}

module.exports = validate;
