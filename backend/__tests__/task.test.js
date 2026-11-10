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
jest.mock('../services/notification.service');
const taskService = require('../services/task.service');
const notificationService = require('../services/notification.service');
const app = require('../../app');

const base = `/api/projects/${projectId}/tasks`;
const mockTask = { _id: taskId, title: 'Scrivere i test', status: 'todo', priority: 'medium', projectId };

describe('Task routes', () => {
  afterEach(() => jest.clearAllMocks());

  describe('GET /tasks/board', () => {
    it('should return tasks grouped by column', async () => {
      taskService.board.mockResolvedValue({ todo: [mockTask], in_progress: [], done: [] });
      const res = await request(app).get(`${base}/board`).set('Authorization', `Bearer ${makeToken()}`);
      expect(res.status).toBe(200);
      expect(res.body.board.todo).toHaveLength(1);
      expect(taskService.board).toHaveBeenCalledWith(projectId);
    });

    it('should return 401 without auth', async () => {
      const res = await request(app).get(`${base}/board`);
      expect(res.status).toBe(401);
    });

    it('should return 422 for an invalid projectId', async () => {
      const res = await request(app).get('/api/projects/not-an-id/tasks/board').set('Authorization', `Bearer ${makeToken()}`);
      expect(res.status).toBe(422);
    });
  });

  describe('POST /tasks', () => {
    it('should create a task', async () => {
      taskService.create.mockResolvedValue(mockTask);
      const res = await request(app)
        .post(base)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ title: 'Scrivere i test', priority: 'medium', deadline: '2026-11-10' });
      expect(res.status).toBe(201);
      expect(res.body.task.title).toBe('Scrivere i test');
      expect(notificationService.create).not.toHaveBeenCalled();
    });

    it('should notify the assignee', async () => {
      taskService.create.mockResolvedValue({ ...mockTask, assigneeId: otherUserId });
      notificationService.create.mockResolvedValue({ _id: 'n1' });
      const res = await request(app)
        .post(base)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ title: 'Scrivere i test', assigneeId: otherUserId });
      expect(res.status).toBe(201);
      expect(notificationService.create).toHaveBeenCalledWith(
        otherUserId, 'task_assigned', expect.any(String), expect.objectContaining({ projectId })
      );
    });

    it('should return 422 if title is missing', async () => {
      const res = await request(app).post(base).set('Authorization', `Bearer ${makeToken()}`).send({ priority: 'high' });
      expect(res.status).toBe(422);
      expect(taskService.create).not.toHaveBeenCalled();
    });

    it('should return 422 for an invalid priority', async () => {
      const res = await request(app).post(base).set('Authorization', `Bearer ${makeToken()}`).send({ title: 'X', priority: 'urgent' });
      expect(res.status).toBe(422);
    });

    it('should return 422 for an invalid deadline', async () => {
      const res = await request(app).post(base).set('Authorization', `Bearer ${makeToken()}`).send({ title: 'X', deadline: '10/11/2026' });
      expect(res.status).toBe(422);
    });
  });

  describe('PUT /tasks/:taskId with checklist and tags', () => {
    const put = (body) => request(app)
      .put(`${base}/${taskId}`)
      .set('Authorization', `Bearer ${makeToken()}`)
      .send(body);

    beforeEach(() => {
      taskService.getOne.mockResolvedValue(mockTask);
      taskService.update.mockImplementation(async (task, data) => ({ task: { ...task, ...data }, previousAssignee: undefined }));
    });

    it('should save a checklist', async () => {
      const checklist = [{ text: 'Schema', done: true }, { text: 'Route', done: false }];
      const res = await put({ checklist });
      expect(res.status).toBe(200);
      expect(taskService.update).toHaveBeenCalledWith(mockTask, { checklist });
      expect(res.body.task.checklist).toHaveLength(2);
    });

    it('should trim checklist items and reject empty ones', async () => {
      const res = await put({ checklist: [{ text: '   ' }] });
      expect(res.status).toBe(422);
    });

    it('should reject more than 50 checklist items', async () => {
      const res = await put({ checklist: Array.from({ length: 51 }, (_, i) => ({ text: `step ${i}` })) });
      expect(res.status).toBe(422);
    });

    it('should save colored tags', async () => {
      const tags = [{ name: 'Bug', color: '#ef4444' }, { name: 'Design', color: '#a855f7' }];
      const res = await put({ tags });
      expect(res.status).toBe(200);
      expect(res.body.task.tags).toEqual(tags);
    });

    it('should reject an invalid tag color', async () => {
      const res = await put({ tags: [{ name: 'Bug', color: 'red' }] });
      expect(res.status).toBe(422);
    });

    it('should reject duplicate tag names', async () => {
      const res = await put({ tags: [{ name: 'Bug', color: '#ef4444' }, { name: 'bug', color: '#000000' }] });
      expect(res.status).toBe(422);
    });

    it('should reject more than 10 tags', async () => {
      const res = await put({ tags: Array.from({ length: 11 }, (_, i) => ({ name: `t${i}`, color: '#123456' })) });
      expect(res.status).toBe(422);
    });
  });

  describe('PATCH /tasks/:taskId/status', () => {
    it('should change the status', async () => {
      taskService.getOne.mockResolvedValue(mockTask);
      taskService.changeStatus.mockResolvedValue({ task: { ...mockTask, status: 'done' } });
      const res = await request(app)
        .patch(`${base}/${taskId}/status`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ status: 'done' });
      expect(res.status).toBe(200);
      expect(res.body.task.status).toBe('done');
      expect(taskService.changeStatus).toHaveBeenCalledWith(mockTask, 'done');
    });

    it('should return 422 for an invalid status', async () => {
      const res = await request(app)
        .patch(`${base}/${taskId}/status`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ status: 'archived' });
      expect(res.status).toBe(422);
    });

    it('should return 422 for an invalid taskId', async () => {
      const res = await request(app)
        .patch(`${base}/123/status`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ status: 'done' });
      expect(res.status).toBe(422);
    });
  });

  describe('DELETE /tasks/:taskId', () => {
    it('should delete a task', async () => {
      taskService.remove.mockResolvedValue();
      const res = await request(app).delete(`${base}/${taskId}`).set('Authorization', `Bearer ${makeToken()}`);
      expect(res.status).toBe(200);
      expect(taskService.remove).toHaveBeenCalledWith(taskId, projectId);
    });
  });
});
