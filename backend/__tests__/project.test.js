// Env prima di qualsiasi require
process.env.JWT_SECRET = 'test-secret';
process.env.MONGODB_URI = 'mongodb://localhost:27017/kairos_test';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../app');

jest.mock('../services/project.service');
const projectService = require('../services/project.service');

// Mock auth middleware: verifica il token ma non tocca il DB
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

// Mock middleware progetto
jest.mock('../middleware/project.middleware', () => ({
  loadProject: (req, res, next) => {
    req.project = {
      _id: '507f1f77bcf86cd799439012',
      title: 'Test Project',
      owner: req.user?._id || '507f1f77bcf86cd799439011',
      members: [{ user: req.user?._id || '507f1f77bcf86cd799439011', role: 'owner' }],
      status: 'active',
      isHidden: false,
      toObject: () => ({
        _id: '507f1f77bcf86cd799439012',
        title: 'Test Project',
      }),
    };
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

function makeToken(id = userId, role = 'user') {
  return jwt.sign({ id, role }, 'test-secret', { expiresIn: '15m' });
}

const mockProject = {
  _id: projectId,
  title: 'Test Project',
  description: 'A test project',
  category: 'web',
  owner: userId,
  members: [{ user: userId, role: 'owner' }],
  visibility: 'public',
  status: 'active',
};

describe('Project routes', () => {
  beforeEach(() => jest.clearAllMocks());

  // POST /api/projects
  describe('POST /api/projects', () => {
    it('should create a project', async () => {
      projectService.create.mockResolvedValue(mockProject);

      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ title: 'Test Project', category: 'web' });

      expect(res.status).toBe(201);
      expect(res.body.project).toBeDefined();
      expect(projectService.create).toHaveBeenCalled();
    });

    it('should return 422 if category is missing', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ title: 'Test Project' });

      expect(res.status).toBe(422);
    });

    it('should return 401 without auth', async () => {
      const res = await request(app)
        .post('/api/projects')
        .send({ title: 'Test', category: 'web' });

      expect(res.status).toBe(401);
    });
  });

  // GET /api/projects/catalog
  describe('GET /api/projects/catalog', () => {
    it('should return public projects', async () => {
      projectService.catalog.mockResolvedValue({
        projects: [mockProject],
        total: 1,
        page: 1,
        totalPages: 1,
      });

      const res = await request(app).get('/api/projects/catalog');

      expect(res.status).toBe(200);
      expect(res.body.projects).toHaveLength(1);
    });

    it('should filter by category', async () => {
      projectService.catalog.mockResolvedValue({ projects: [], total: 0, page: 1, totalPages: 0 });

      const res = await request(app).get('/api/projects/catalog?category=ai');

      expect(res.status).toBe(200);
      expect(projectService.catalog).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'ai' })
      );
    });

    it('should return 422 for invalid category', async () => {
      const res = await request(app).get('/api/projects/catalog?category=invalid');
      expect(res.status).toBe(422);
    });
  });

  // GET /api/projects/dashboard
  describe('GET /api/projects/dashboard', () => {
    it('should return dashboard data', async () => {
      projectService.dashboard.mockResolvedValue({
        created: [mockProject],
        member: [],
        assignedTasks: [],
      });

      const res = await request(app)
        .get('/api/projects/dashboard')
        .set('Authorization', `Bearer ${makeToken()}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('created');
      expect(res.body).toHaveProperty('assignedTasks');
    });

    it('should return 401 without auth', async () => {
      const res = await request(app).get('/api/projects/dashboard');
      expect(res.status).toBe(401);
    });
  });

  // GET /api/projects/:projectId
  describe('GET /api/projects/:projectId', () => {
    it('should return a project', async () => {
      const res = await request(app)
        .get(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${makeToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.project).toBeDefined();
    });
  });

  // PUT /api/projects/:projectId
  describe('PUT /api/projects/:projectId', () => {
    it('should update a project', async () => {
      projectService.update.mockResolvedValue({ ...mockProject, title: 'Updated' });

      const res = await request(app)
        .put(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ title: 'Updated' });

      expect(res.status).toBe(200);
      expect(projectService.update).toHaveBeenCalled();
    });
  });

  // POST /api/projects/:projectId/members
  describe('POST /api/projects/:projectId/members', () => {
    it('should add a member', async () => {
      const newMemberId = '507f1f77bcf86cd799439099';
      projectService.addMember.mockResolvedValue({
        ...mockProject,
        members: [...mockProject.members, { user: newMemberId, role: 'member' }],
      });

      const res = await request(app)
        .post(`/api/projects/${projectId}/members`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ userId: newMemberId });

      expect(res.status).toBe(200);
      expect(projectService.addMember).toHaveBeenCalled();
    });

    it('should return 422 if userId is not a valid mongo id', async () => {
      const res = await request(app)
        .post(`/api/projects/${projectId}/members`)
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ userId: 'not-an-id' });

      expect(res.status).toBe(422);
    });
  });
});
