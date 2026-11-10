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

jest.mock('../services/chat.service');
const chatService = require('../services/chat.service');
const app = require('../../app');

const base = `/api/projects/${projectId}/chat/messages`;

describe('Chat routes', () => {
  afterEach(() => jest.clearAllMocks());

  describe('GET /chat/messages', () => {
    it('should return the message history', async () => {
      chatService.getHistory.mockResolvedValue([{ _id: 'm1', text: 'Ciao' }]);
      const res = await request(app).get(base).set('Authorization', `Bearer ${makeToken()}`);
      expect(res.status).toBe(200);
      expect(res.body.messages).toHaveLength(1);
    });

    it('should return 401 without auth', async () => {
      const res = await request(app).get(base);
      expect(res.status).toBe(401);
    });
  });

  describe('POST /chat/messages', () => {
    it('should send a message with trimmed text', async () => {
      chatService.save.mockResolvedValue({ _id: 'm2', text: 'Ciao team' });
      const res = await request(app).post(base).set('Authorization', `Bearer ${makeToken()}`).send({ text: '  Ciao team  ' });
      expect(res.status).toBe(201);
      expect(chatService.save).toHaveBeenCalledWith(projectId, userId, 'Ciao team');
    });

    it('should return 422 if text is missing', async () => {
      const res = await request(app).post(base).set('Authorization', `Bearer ${makeToken()}`).send({});
      expect(res.status).toBe(422);
      expect(chatService.save).not.toHaveBeenCalled();
    });

    it('should return 422 if text is only spaces', async () => {
      const res = await request(app).post(base).set('Authorization', `Bearer ${makeToken()}`).send({ text: '   ' });
      expect(res.status).toBe(422);
      expect(chatService.save).not.toHaveBeenCalled();
    });

    it('should return 422 if text is too long', async () => {
      const res = await request(app).post(base).set('Authorization', `Bearer ${makeToken()}`).send({ text: 'a'.repeat(2001) });
      expect(res.status).toBe(422);
    });
  });
});
