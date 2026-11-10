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

jest.mock('../models/user.model');
jest.mock('../services/project.service');
jest.mock('../services/token.service');
const User = require('../models/user.model');
const projectService = require('../services/project.service');
const tokenService = require('../services/token.service');
const app = require('../../app');

const adminToken = () => makeToken(userId, 'admin');

describe('Admin routes', () => {
  afterEach(() => jest.clearAllMocks());

  it('should return 403 for a non-admin user', async () => {
    const res = await request(app).get('/api/admin/users').set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(403);
  });

  it('should return 401 without auth', async () => {
    const res = await request(app).get('/api/admin/users');
    expect(res.status).toBe(401);
  });

  describe('GET /api/admin/users', () => {
    it('should return paginated users', async () => {
      const chain = { sort: jest.fn().mockReturnThis(), skip: jest.fn().mockReturnThis(), limit: jest.fn().mockResolvedValue([{ _id: otherUserId }]) };
      User.find.mockReturnValue(chain);
      User.countDocuments.mockResolvedValue(1);
      const res = await request(app).get('/api/admin/users?page=1&limit=10').set('Authorization', `Bearer ${adminToken()}`);
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ total: 1, page: 1, totalPages: 1 });
      expect(chain.limit).toHaveBeenCalledWith(10);
    });
  });

  describe('PATCH /api/admin/users/:userId/block', () => {
    it('should block a user', async () => {
      const user = { _id: otherUserId, role: 'user', isBlocked: false, save: jest.fn().mockResolvedValue() };
      User.findById.mockResolvedValue(user);
      const res = await request(app).patch(`/api/admin/users/${otherUserId}/block`).set('Authorization', `Bearer ${adminToken()}`);
      expect(res.status).toBe(200);
      expect(user.isBlocked).toBe(true);
      expect(user.save).toHaveBeenCalled();
      expect(tokenService.revokeAll).toHaveBeenCalledWith(otherUserId);
    });

    it('should not revoke sessions when the user cannot be blocked', async () => {
      User.findById.mockResolvedValue({ _id: otherUserId, role: 'admin', save: jest.fn() });
      await request(app).patch(`/api/admin/users/${otherUserId}/block`).set('Authorization', `Bearer ${adminToken()}`);
      expect(tokenService.revokeAll).not.toHaveBeenCalled();
    });

    it('should not block an admin', async () => {
      User.findById.mockResolvedValue({ _id: otherUserId, role: 'admin', save: jest.fn() });
      const res = await request(app).patch(`/api/admin/users/${otherUserId}/block`).set('Authorization', `Bearer ${adminToken()}`);
      expect(res.status).toBe(400);
    });

    it('should return 404 if the user does not exist', async () => {
      User.findById.mockResolvedValue(null);
      const res = await request(app).patch(`/api/admin/users/${otherUserId}/block`).set('Authorization', `Bearer ${adminToken()}`);
      expect(res.status).toBe(404);
    });

    it('should return 422 for an invalid userId', async () => {
      const res = await request(app).patch('/api/admin/users/123/block').set('Authorization', `Bearer ${adminToken()}`);
      expect(res.status).toBe(422);
      expect(User.findById).not.toHaveBeenCalled();
    });
  });

  describe('PATCH /api/admin/users/:userId/unblock', () => {
    it('should unblock a user', async () => {
      const user = { _id: otherUserId, role: 'user', isBlocked: true, save: jest.fn().mockResolvedValue() };
      User.findById.mockResolvedValue(user);
      const res = await request(app).patch(`/api/admin/users/${otherUserId}/unblock`).set('Authorization', `Bearer ${adminToken()}`);
      expect(res.status).toBe(200);
      expect(user.isBlocked).toBe(false);
    });
  });

  describe('Admin projects', () => {
    it('should list projects', async () => {
      projectService.adminList.mockResolvedValue({ projects: [], total: 0, page: 1, totalPages: 0 });
      const res = await request(app).get('/api/admin/projects').set('Authorization', `Bearer ${adminToken()}`);
      expect(res.status).toBe(200);
      expect(projectService.adminList).toHaveBeenCalledWith({ page: 1, limit: 20 });
    });

    it('should restore a hidden project', async () => {
      projectService.adminRestore.mockResolvedValue({ _id: projectId, isHidden: false });
      const res = await request(app).patch(`/api/admin/projects/${projectId}/restore`).set('Authorization', `Bearer ${adminToken()}`);
      expect(res.status).toBe(200);
      expect(res.body.project.isHidden).toBe(false);
    });
  });
});
