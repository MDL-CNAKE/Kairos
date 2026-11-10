const passport = require('passport');
const { Strategy, ExtractJwt } = require('passport-jwt');
const env = require('./env.config');
const User = require('../backend/models/user.model');

const opts = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: env.jwtSecret,
  algorithms: ['HS256'],
};

passport.use(
  new Strategy(opts, async (payload, done) => {
    try {
      // Carica utente dal DB per verificare che esista e non sia bloccato
      const user = await User.findById(payload.id);
      if (!user || user.isBlocked) return done(null, false);
      return done(null, user);
    } catch (err) {
      return done(err, false);
    }
  })
);

module.exports = passport;
