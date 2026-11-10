// Env prima di qualsiasi require
process.env.JWT_SECRET = 'test-secret';
process.env.MONGODB_URI = 'mongodb://localhost:27017/kairos_test';

const request = require('supertest');
const jwt = require('jsonwebtoken');

// Mock authenticate: verifica il JWT senza toccare il DB
jest.mock('../middleware/auth.middleware', () => ({
  authenticate: (req, res, next) => {
    const mockJwt = require('jsonwebtoken');
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ message: 'Unauthorized' });
    try {
      const payload = mockJwt.verify(auth.replace('Bearer ', ''), 'test-secret');
      req.user = { _id: payload.id, role: payload.role };
      next();
    } catch {
      return res.status(401).json({ message: 'Unauthorized' });
    }
  },
}));

// Mock middleware progetto: progetto fittizio, membership e admin controllati
jest.mock('../middleware/project.middleware', () => ({
  loadProject: (req, res, next) => {
    req.project = { _id: '507f1f77bcf86cd799439012', title: 'Test Project', isHidden: true };
    next();
  },
  requireMember: (req, res, next) => next(),
  requireOwner: (req, res, next) => next(),
  requireAdmin: (req, res, next) => {
    if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
    next();
  },
}));

const userId = '507f1f77bcf86cd799439011';
const projectId = '507f1f77bcf86cd799439012';
const taskId = '507f1f77bcf86cd799439013';
const otherUserId = '507f1f77bcf86cd799439014';

function makeToken(id = userId, role = 'user') {
  return jwt.sign({ id, role }, 'test-secret', { expiresIn: '15m' });
}

jest.mock('../services/task.service');
jest.mock('../services/comment.service');
jest.mock('../services/notification.service');
const taskService = require('../services/task.service');
const commentService = require('../services/comment.service');
const notificationService = require('../services/notification.service');
const app = require('../../app');

const commentId = '507f1f77bcf86cd799439016';
const base = `/api/projects/${projectId}/tasks/${taskId}/comments`;
const AppError = require('../utils/app-error.util');

describe('Comment routes', () => {
  beforeEach(() => {
    taskService.getOne.mockResolvedValue({ _id: taskId, title: 'Task', assigneeId: null });
  });
  afterEach(() => jest.clearAllMocks());

  describe('GET /comments', () => {
    it('should list the comments of a task', async () => {
      commentService.listByTask.mockResolvedValue([{ _id: commentId, text: 'Ottimo lavoro' }]);
      const res = await request(app).get(base).set('Authorization', `Bearer ${makeToken()}`);
      expect(res.status).toBe(200);
      expect(res.body.comments).toHaveLength(1);
      expect(taskService.getOne).toHaveBeenCalledWith(taskId, projectId);
    });

    it('should return 404 if the task is not in the project', async () => {
      taskService.getOne.mockRejectedValue(new AppError(404, 'Task not found'));
      const res = await request(app).get(base).set('Authorization', `Bearer ${makeToken()}`);
      expect(res.status).toBe(404);
      expect(commentService.listByTask).not.toHaveBeenCalled();
    });

    it('should return 401 without auth', async () => {
      const res = await request(app).get(base);
      expect(res.status).toBe(401);
    });
  });

  describe('POST /comments', () => {
    it('should create a comment with trimmed text', async () => {
      commentService.create.mockResolvedValue({ _id: commentId, text: 'Fatto' });
      const res = await request(app).post(base).set('Authorization', `Bearer ${makeToken()}`).send({ text: '  Fatto  ' });
      expect(res.status).toBe(201);
      expect(commentService.create).toHaveBeenCalledWith(taskId, projectId, userId, 'Fatto');
      expect(notificationService.create).not.toHaveBeenCalled();
    });

    it('should notify the assignee when someone else comments', async () => {
      taskService.getOne.mockResolvedValue({ _id: taskId, title: 'Task', assigneeId: { _id: otherUserId } });
      commentService.create.mockResolvedValue({ _id: commentId, text: 'Ci sei?' });
      notificationService.create.mockResolvedValue({ _id: 'n1' });
      const res = await request(app).post(base).set('Authorization', `Bearer ${makeToken()}`).send({ text: 'Ci sei?' });
      expect(res.status).toBe(201);
      expect(notificationService.create).toHaveBeenCalledWith(
        otherUserId, 'task_commented', expect.any(String), { taskId, projectId }
      );
    });

    it('should not notify the assignee about their own comment', async () => {
      taskService.getOne.mockResolvedValue({ _id: taskId, title: 'Task', assigneeId: userId });
      commentService.create.mockResolvedValue({ _id: commentId, text: 'Nota' });
      await request(app).post(base).set('Authorization', `Bearer ${makeToken()}`).send({ text: 'Nota' });
      expect(notificationService.create).not.toHaveBeenCalled();
    });

    it('should return 422 for empty text', async () => {
      const res = await request(app).post(base).set('Authorization', `Bearer ${makeToken()}`).send({ text: '   ' });
      expect(res.status).toBe(422);
      expect(commentService.create).not.toHaveBeenCalled();
    });

    it('should return 422 for text over 1000 characters', async () => {
      const res = await request(app).post(base).set('Authorization', `Bearer ${makeToken()}`).send({ text: 'a'.repeat(1001) });
      expect(res.status).toBe(422);
    });
  });

  describe('DELETE /comments/:commentId', () => {
    it('should delete a comment', async () => {
      commentService.remove.mockResolvedValue({});
      const res = await request(app).delete(`${base}/${commentId}`).set('Authorization', `Bearer ${makeToken()}`);
      expect(res.status).toBe(200);
      expect(commentService.remove).toHaveBeenCalledWith(commentId, taskId, { _id: userId, role: 'user' });
    });

    it('should return 403 when deleting someone else comment', async () => {
      commentService.remove.mockRejectedValue(new AppError(403, 'You can only delete your own comments'));
      const res = await request(app).delete(`${base}/${commentId}`).set('Authorization', `Bearer ${makeToken()}`);
      expect(res.status).toBe(403);
    });

    it('should return 422 for an invalid commentId', async () => {
      const res = await request(app).delete(`${base}/xyz`).set('Authorization', `Bearer ${makeToken()}`);
      expect(res.status).toBe(422);
    });
  });
});
