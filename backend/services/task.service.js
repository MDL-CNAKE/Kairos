/**
 * @module task.service
 * @description Logica di business per la gestione dei task all'interno dei progetti.
 *   Espone operazioni CRUD, cambio status e raggruppamento per la board.
 */

const Task = require('../models/task.model');
const AppError = require('../utils/app-error.util');

/**
 * @typedef {Object} TaskUpdateResult
 * @property {import('../models/task.model').default} task             Task aggiornato (con populate).
 * @property {string|undefined}                       previousAssignee ID del vecchio assegnatario, utile per le notifiche.
 */

/**
 * @typedef {Object} BoardColumns
 * @property {Array} todo        Task con status `todo`.
 * @property {Array} in_progress Task con status `in_progress`.
 * @property {Array} done        Task con status `done`.
 */

/**
 * Crea un nuovo task nel progetto specificato.
 *
 * @param {string} projectId  - ID MongoDB del progetto.
 * @param {string} creatorId  - ID dell'utente che crea il task.
 * @param {Object} data       - Campi del task (title, description, priority, assigneeId, deadline).
 * @returns {Promise<import('../models/task.model').default>} Task creato con populate dell'assegnatario.
 */
async function create(projectId, creatorId, data) {
  const task = await Task.create({
    projectId,
    createdBy: creatorId,
    ...data,
  });
  return task.populate('assigneeId', 'username email');
}

/**
 * Restituisce tutti i task di un progetto, in ordine cronologico di creazione.
 *
 * @param {string} projectId - ID MongoDB del progetto.
 * @returns {Promise<Array>}
 */
async function listByProject(projectId) {
  return Task.find({ projectId })
    .sort({ createdAt: 1 })
    .populate('assigneeId', 'username email')
    .populate('createdBy', 'username');
}

/**
 * Recupera un singolo task verificando l'appartenenza al progetto.
 *
 * @param {string} taskId    - ID MongoDB del task.
 * @param {string} projectId - ID MongoDB del progetto di appartenenza.
 * @returns {Promise<import('../models/task.model').default>}
 * @throws {AppError} 404 se il task non esiste o non appartiene al progetto.
 */
async function getOne(taskId, projectId) {
  const task = await Task.findOne({ _id: taskId, projectId })
    .populate('assigneeId', 'username email')
    .populate('createdBy', 'username');
  if (!task) throw new AppError(404, 'Task not found');
  return task;
}

/**
 * Modifica parzialmente un task (merge con Object.assign).
 * Restituisce anche il vecchio assegnatario per la logica di notifica.
 *
 * @param {import('../models/task.model').default} task - Task da aggiornare (già caricato).
 * @param {Object} data - Campi da sovrascrivere.
 * @returns {Promise<TaskUpdateResult>}
 */
async function update(task, data) {
  const previousAssignee = task.assigneeId?.toString();
  Object.assign(task, data);
  const updated = await task.save();
  await updated.populate('assigneeId', 'username email');
  return { task: updated, previousAssignee };
}

/**
 * Cambia lo status di un task (es. drag & drop sulla board).
 *
 * @param {import('../models/task.model').default} task      - Task da aggiornare.
 * @param {'todo'|'in_progress'|'done'}            newStatus - Nuovo status.
 * @returns {Promise<{task: import('../models/task.model').default, previousStatus: string}>}
 */
async function changeStatus(task, newStatus) {
  const previousStatus = task.status;
  task.status = newStatus;
  await task.save();
  return { task, previousStatus };
}

/**
 * Elimina un task verificando l'appartenenza al progetto.
 *
 * @param {string} taskId    - ID MongoDB del task.
 * @param {string} projectId - ID MongoDB del progetto.
 * @returns {Promise<import('../models/task.model').default>} Task eliminato.
 * @throws {AppError} 404 se il task non esiste.
 */
async function remove(taskId, projectId) {
  const task = await Task.findOneAndDelete({ _id: taskId, projectId });
  if (!task) throw new AppError(404, 'Task not found');
  return task;
}

/**
 * Raggruppa i task di un progetto per status (vista board Kanban).
 *
 * @param {string} projectId - ID MongoDB del progetto.
 * @returns {Promise<BoardColumns>}
 */
async function board(projectId) {
  const tasks = await Task.find({ projectId })
    .populate('assigneeId', 'username email')
    .populate('createdBy', 'username')
    .lean();

  return {
    todo: tasks.filter((t) => t.status === 'todo'),
    in_progress: tasks.filter((t) => t.status === 'in_progress'),
    done: tasks.filter((t) => t.status === 'done'),
  };
}

module.exports = { create, listByProject, getOne, update, changeStatus, remove, board };
