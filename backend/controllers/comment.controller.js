/**
 * @module comment.controller
 * @description Gestione HTTP dei commenti di un task.
 *   Ogni route verifica prima che il task appartenga al progetto (404 altrimenti).
 */

const taskService = require('../services/task.service');
const commentService = require('../services/comment.service');
const notificationService = require('../services/notification.service');

async function list(req, res, next) {
  try {
    const { taskId, projectId } = req.valid.params;
    await taskService.getOne(taskId, projectId);
    const comments = await commentService.listByTask(taskId);
    res.json({ comments });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { taskId, projectId } = req.valid.params;
    const task = await taskService.getOne(taskId, projectId);
    const comment = await commentService.create(taskId, projectId, req.user._id, req.valid.body.text);
    req.io?.to(projectId).emit('comment:created', { taskId, comment });

    // Avvisa l'assegnatario, se a commentare è qualcun altro
    const assigneeId = task.assigneeId?._id?.toString() || task.assigneeId?.toString();
    if (assigneeId && assigneeId !== String(req.user._id)) {
      const notif = await notificationService.create(
        assigneeId,
        'task_commented',
        `New comment on task "${task.title}"`,
        { taskId, projectId }
      );
      req.io?.to(`user:${assigneeId}`).emit('notification:new', { notification: notif });
    }

    res.status(201).json({ comment });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const { taskId, projectId, commentId } = req.valid.params;
    await taskService.getOne(taskId, projectId);
    await commentService.remove(commentId, taskId, req.user);
    req.io?.to(projectId).emit('comment:deleted', { taskId, commentId });
    res.json({ message: 'Comment deleted' });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, remove };
