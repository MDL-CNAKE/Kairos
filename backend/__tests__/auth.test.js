// Env prima di qualsiasi require
process.env.JWT_SECRET = 'test-secret';
process.env.MONGODB_URI = 'mongodb://localhost:27017/taskflow_test';

const request = require('supertest');
const app = require('../../app');

jest.mock('../services/auth.service');
const authService = require('../services/auth.service');

// Mock authenticate: verifica il JWT senza toccare il DB
jest.mock('../middleware/auth.middleware', () => ({
  authenticate: (req, res, next) => {
    const mockJwt = require('jsonwebtoken');
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ message: 'Unauthorized' });
    try {
      const payload = mockJwt.verify(auth.replace('Bearer ', ''), process.env.JWT_SECRET || 'test-secret');
      req.user = { _id: payload.id, role: payload.role };
      next();
    } catch {
      return res.status(401).json({ message: 'Unauthorized' });
    }
  },
}));

const mockUser = { _id: '507f1f77bcf86cd799439011', username: 'testuser', email: 'test@example.com', role: 'user' };
const mockTokens = { user: mockUser, accessToken: 'access.token.here', refreshToken: 'refresh-token-raw' };

describe('Auth routes', () => {
  beforeEach(() => jest.clearAllMocks());

  // POST /api/auth/register
  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      authService.register.mockResolvedValue(mockTokens);

      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'testuser', email: 'test@example.com', password: 'password123' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(authService.register).toHaveBeenCalledWith('testuser', 'test@example.com', 'password123');
    });

    it('should return 422 if email is missing', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'testuser', password: 'password123' });

      expect(res.status).toBe(422);
    });

    it('should return 422 if password is too short', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'testuser', email: 'test@example.com', password: 'short' });

      expect(res.status).toBe(422);
    });

    it('should return 409 if email already in use', async () => {
      const AppError = require('../../backend/utils/app-error.util');
      authService.register.mockRejectedValue(new AppError(409, 'email already in use'));

      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'testuser', email: 'test@example.com', password: 'password123' });

      expect(res.status).toBe(409);
    });
  });

  // POST /api/auth/login
  describe('POST /api/auth/login', () => {
    it('should login successfully', async () => {
      authService.login.mockResolvedValue(mockTokens);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body.user.email).toBe('test@example.com');
    });

    it('should return 401 for invalid credentials', async () => {
      const AppError = require('../../backend/utils/app-error.util');
      authService.login.mockRejectedValue(new AppError(401, 'Invalid credentials'));

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'wrongpassword' });

      expect(res.status).toBe(401);
    });

    it('should return 422 if email is missing', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ password: 'password123' });

      expect(res.status).toBe(422);
    });
  });

  // POST /api/auth/refresh
  describe('POST /api/auth/refresh', () => {
    it('should refresh access token', async () => {
      authService.refresh.mockResolvedValue({
        accessToken: 'new.access.token',
        refreshToken: 'new-refresh-token',
      });

      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'old-refresh-token' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
    });

    it('should return 401 for invalid refresh token', async () => {
      const AppError = require('../../backend/utils/app-error.util');
      authService.refresh.mockRejectedValue(new AppError(401, 'Invalid or expired refresh token'));

      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid' });

      expect(res.status).toBe(401);
    });
  });

  // GET /api/auth/me
  describe('GET /api/auth/me', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    it('should return user data with valid token', async () => {
      const jwt = require('jsonwebtoken');
      const token = jwt.sign({ id: mockUser._id, role: 'user' }, 'test-secret', { expiresIn: '15m' });

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('user');
    });
  });
});
