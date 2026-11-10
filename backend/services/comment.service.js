/**
 * @module comment.service
 * @description Logica dei commenti sui task: elenco, creazione, eliminazione e conteggi per la board.
 */

const mongoose = require('mongoose');
const Comment = require('../models/comment.model');
const AppError = require('../utils/app-error.util');

/**
 * Commenti di un task in ordine cronologico.
 * @param {string} taskId
 * @returns {Promise<Array>}
 */
async function listByTask(taskId) {
  return Comment.find({ taskId }).sort({ createdAt: 1 }).populate('userId', 'username');
}

/**
 * Crea un commento e restituisce il documento con l'autore popolato.
 * @param {string} taskId
 * @param {string} projectId
 * @param {string} userId
 * @param {string} text
 */
async function create(taskId, projectId, userId, text) {
  const comment = await Comment.create({ taskId, projectId, userId, text });
  await comment.populate('userId', 'username');
  return comment;
}

/**
 * Elimina un commento. Solo l'autore o un amministratore possono farlo.
 * @param {string} commentId
 * @param {string} taskId
 * @param {{ _id: string, role: string }} user
 */
async function remove(commentId, taskId, user) {
  const comment = await Comment.findOne({ _id: commentId, taskId });
  if (!comment) throw new AppError(404, 'Comment not found');
  const isAuthor = comment.userId.toString() === String(user._id);
  if (!isAuthor && user.role !== 'admin') {
    throw new AppError(403, 'You can only delete your own comments');
  }
  await comment.deleteOne();
  return comment;
}

/**
 * Numero di commenti per ciascun task, usato dalle card della board.
 * @param {Array<string>} taskIds
 * @returns {Promise<Object<string, number>>} mappa taskId → conteggio
 */
async function countByTasks(taskIds) {
  if (!taskIds.length) return {};
  const ids = taskIds.map((id) => new mongoose.Types.ObjectId(String(id)));
  const rows = await Comment.aggregate([
    { $match: { taskId: { $in: ids } } },
    { $group: { _id: '$taskId', count: { $sum: 1 } } },
  ]);
  return Object.fromEntries(rows.map((r) => [r._id.toString(), r.count]));
}

/**
 * Elimina tutti i commenti di un task (quando il task viene cancellato).
 * @param {string} taskId
 */
async function removeByTask(taskId) {
  await Comment.deleteMany({ taskId });
}

module.exports = { listByTask, create, remove, countByTasks, removeByTask };
