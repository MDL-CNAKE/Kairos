/**
 * @module comment.model
 * @description Commento all'interno del dettaglio di un task.
 *   Collezione separata dai task per non appesantire la board.
 */

const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      required: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    text: {
      type: String,
      required: [true, 'text is required'],
      trim: true,
      maxlength: [1000, 'text must be at most 1000 characters'],
    },
  },
  { timestamps: true }
);

commentSchema.index({ taskId: 1, createdAt: 1 });

module.exports = mongoose.model('Comment', commentSchema);
