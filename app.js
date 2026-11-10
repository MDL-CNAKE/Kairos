/**
 * @module app
 * @description Configurazione dell'applicazione Express.
 *   Registra i middleware globali, le route dell'API e i gestori di errore.
 *   L'istanza Socket.io viene iniettata in `req.io` tramite `app.set('io', io)`
 *   (impostato da `server.js` dopo l'avvio dell'HTTP server).
 *
 * @example
 * // Uso tipico: l'app viene importata da server.js
 * const app = require('./app');
 * const server = http.createServer(app);
 */

const path = require('path');
const express = require('express');
require('./config/passport.config'); // registra la strategia JWT di Passport
const { notFoundHandler, errorHandler } = require('./backend/middleware/error.middleware');

const authRoutes = require('./backend/routes/auth.routes');
const projectRoutes = require('./backend/routes/project.routes');
const taskRoutes = require('./backend/routes/task.routes');
const chatRoutes = require('./backend/routes/chat.routes');
const notificationRoutes = require('./backend/routes/notification.routes');
const adminRoutes = require('./backend/routes/admin.routes');

const app = express();

// File statici (demo frontend)
app.use(express.static(path.join(__dirname, 'public')));

// Parser JSON
app.use(express.json());

// Middleware per iniettare l'istanza Socket.io in req (impostato da server.js)
app.use((req, _res, next) => {
  req.io = app.get('io');
  next();
});

// Route
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/projects/:projectId/tasks', taskRoutes);
app.use('/api/projects/:projectId/chat', chatRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);

// Gestione errori
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
