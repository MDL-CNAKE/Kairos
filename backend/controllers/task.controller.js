/**
 * @module task.controller
 * @description Controller per le route dei task.
 *   Oltre alle operazioni CRUD standard, gestisce la distribuzione di eventi
 *   Socket.io e la creazione di notifiche persistenti per le assegnazioni.
 */

const taskService = require('../services/task.service');
const notificationService = require('../services/notification.service');

/**
 * Crea un task nel progetto. Emette `task:created` via Socket.io e,
 * se il task ha un assegnatario, crea una notifica persistente e la invia
 * alla stanza personale dell'utente (`user:<userId>`).
 *
 * @type {import('express').RequestHandler}
 * @returns {201} `{ task }`
 */
async function create(req, res, next) {
  try {
    const { projectId } = req.valid.params;
    const task = await taskService.create(projectId, req.user._id, req.valid.body);

    // Notifica real-time tramite io (iniettato in req dall'app)
    req.io?.to(projectId).emit('task:created', { task });

    // Notifica utente assegnato
    if (task.assigneeId) {
      const notif = await notificationService.create(
        task.assigneeId._id || task.assigneeId,
        'task_assigned',
        `You have been assigned to task "${task.title}"`,
        { taskId: task._id, projectId }
      );
      req.io?.to(`user:${task.assigneeId._id || task.assigneeId}`).emit('notification:new', { notification: notif });
    }

    res.status(201).json({ task });
  } catch (err) {
    next(err);
  }
}

/**
 * Restituisce tutti i task del progetto in ordine cronologico.
 *
 * @type {import('express').RequestHandler}
 * @returns {200} `{ tasks }`
 */
async function list(req, res, next) {
  try {
    const { projectId } = req.valid.params;
    const tasks = await taskService.listByProject(projectId);
    res.json({ tasks });
  } catch (err) {
    next(err);
  }
}

/**
 * Restituisce i task del progetto raggruppati per status (vista board Kanban).
 *
 * @type {import('express').RequestHandler}
 * @returns {200} `{ board: { todo, in_progress, done } }`
 */
async function board(req, res, next) {
  try {
    const { projectId } = req.valid.params;
    const columns = await taskService.board(projectId);
    res.json({ board: columns });
  } catch (err) {
    next(err);
  }
}

/**
 * Restituisce un singolo task con i suoi dettagli.
 *
 * @type {import('express').RequestHandler}
 * @returns {200} `{ task }`
 */
async function getOne(req, res, next) {
  try {
    const { taskId, projectId } = req.valid.params;
    const task = await taskService.getOne(taskId, projectId);
    res.json({ task });
  } catch (err) {
    next(err);
  }
}

/**
 * Aggiorna un task. Emette `task:updated` via Socket.io e,
 * se l'assegnatario è cambiato, crea una notifica per il nuovo assegnatario.
 *
 * @type {import('express').RequestHandler}
 * @returns {200} `{ task }`
 */
async function update(req, res, next) {
  try {
    const { taskId, projectId } = req.valid.params;
    const existing = await taskService.getOne(taskId, projectId);
    const { task, previousAssignee } = await taskService.update(existing, req.valid.body);

    req.io?.to(projectId).emit('task:updated', { task });

    // Notifica nuovo assegnatario se cambiato
    const newAssigneeId = task.assigneeId?._id?.toString() || task.assigneeId?.toString();
    if (newAssigneeId && newAssigneeId !== previousAssignee) {
      const notif = await notificationService.create(
        newAssigneeId,
        'task_assigned',
        `You have been assigned to task "${task.title}"`,
        { taskId: task._id, projectId }
      );
      req.io?.to(`user:${newAssigneeId}`).emit('notification:new', { notification: notif });
    }

    res.json({ task });
  } catch (err) {
    next(err);
  }
}

/**
 * Cambia lo status di un task (es. drag & drop sulla board).
 * Emette `task:status_changed` via Socket.io.
 *
 * @type {import('express').RequestHandler}
 * @returns {200} `{ task }`
 */
async function changeStatus(req, res, next) {
  try {
    const { taskId, projectId } = req.valid.params;
    const existing = await taskService.getOne(taskId, projectId);
    const { task } = await taskService.changeStatus(existing, req.valid.body.status);

    req.io?.to(projectId).emit('task:status_changed', { task });

    res.json({ task });
  } catch (err) {
    next(err);
  }
}

/**
 * Elimina un task. Emette `task:deleted` via Socket.io.
 *
 * @type {import('express').RequestHandler}
 * @returns {200} `{ message }`
 */
async function remove(req, res, next) {
  try {
    const { taskId, projectId } = req.valid.params;
    await taskService.remove(taskId, projectId);
    req.io?.to(projectId).emit('task:deleted', { taskId });
    res.json({ message: 'Task deleted' });
  } catch (err) {
    next(err);
  }
}

module.exports = { create, list, board, getOne, update, changeStatus, remove };
