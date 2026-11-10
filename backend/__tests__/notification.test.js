// Env prima di qualsiasi require
process.env.JWT_SECRET = 'test-secret';
process.env.MONGODB_URI = 'mongodb://localhost:27017/taskflow_test';

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

jest.mock('../services/notification.service');
const notificationService = require('../services/notification.service');
const app = require('../../app');

const notificationId = '507f1f77bcf86cd799439015';

describe('Notification routes', () => {
  afterEach(() => jest.clearAllMocks());

  describe('GET /api/notifications', () => {
    it('should return notifications and unread count', async () => {
      notificationService.list.mockResolvedValue([{ _id: notificationId, type: 'task_assigned', read: false }]);
      notificationService.countUnread.mockResolvedValue(1);
      const res = await request(app).get('/api/notifications').set('Authorization', `Bearer ${makeToken()}`);
      expect(res.status).toBe(200);
      expect(res.body.unreadCount).toBe(1);
      expect(notificationService.list).toHaveBeenCalledWith(userId, { unreadOnly: false });
    });

    it('should filter unread notifications', async () => {
      notificationService.list.mockResolvedValue([]);
      notificationService.countUnread.mockResolvedValue(0);
      await request(app).get('/api/notifications?unread=true').set('Authorization', `Bearer ${makeToken()}`);
      expect(notificationService.list).toHaveBeenCalledWith(userId, { unreadOnly: true });
    });

    it('should return 401 without auth', async () => {
      const res = await request(app).get('/api/notifications');
      expect(res.status).toBe(401);
    });
  });

  describe('PATCH /api/notifications/:notificationId/read', () => {
    it('should mark a notification as read', async () => {
      notificationService.markRead.mockResolvedValue({ _id: notificationId, read: true });
      const res = await request(app)
        .patch(`/api/notifications/${notificationId}/read`)
        .set('Authorization', `Bearer ${makeToken()}`);
      expect(res.status).toBe(200);
      expect(res.body.notification.read).toBe(true);
      expect(notificationService.markRead).toHaveBeenCalledWith(notificationId, userId);
    });

    it('should return 404 if the notification does not exist', async () => {
      notificationService.markRead.mockResolvedValue(null);
      const res = await request(app)
        .patch(`/api/notifications/${notificationId}/read`)
        .set('Authorization', `Bearer ${makeToken()}`);
      expect(res.status).toBe(404);
    });

    it('should return 422 for an invalid id', async () => {
      const res = await request(app).patch('/api/notifications/abc/read').set('Authorization', `Bearer ${makeToken()}`);
      expect(res.status).toBe(422);
    });
  });

  describe('PATCH /api/notifications/read-all', () => {
    it('should mark all notifications as read', async () => {
      notificationService.markAllRead.mockResolvedValue();
      const res = await request(app).patch('/api/notifications/read-all').set('Authorization', `Bearer ${makeToken()}`);
      expect(res.status).toBe(200);
      expect(notificationService.markAllRead).toHaveBeenCalledWith(userId);
    });
  });
});
