// Env prima di qualsiasi require
process.env.JWT_SECRET = 'test-secret';
process.env.MONGODB_URI = 'mongodb://localhost:27017/kairos_test';

jest.mock('../models/project.model');
const Project = require('../models/project.model');
const { projectIdFrom, canJoinProject } = require('../sockets/handlers');

const userId = '507f1f77bcf86cd799439011';
const projectId = '507f1f77bcf86cd799439012';

function mockProject(project) {
  Project.findById.mockReturnValue({ select: () => ({ lean: () => Promise.resolve(project) }) });
}

describe('Socket: stanze di progetto', () => {
  afterEach(() => jest.clearAllMocks());

  describe('projectIdFrom', () => {
    it('should accept a plain id', () => {
      expect(projectIdFrom(projectId)).toBe(projectId);
    });
    it('should accept an object with projectId', () => {
      expect(projectIdFrom({ projectId })).toBe(projectId);
    });
    it('should reject invalid ids', () => {
      expect(projectIdFrom('abc')).toBeNull();
      expect(projectIdFrom({ projectId: 42 })).toBeNull();
      expect(projectIdFrom(undefined)).toBeNull();
    });
  });

  describe('canJoinProject', () => {
    it('should let a member join', async () => {
      mockProject({ members: [{ user: userId, role: 'member' }] });
      await expect(canJoinProject({ _id: userId, role: 'user' }, projectId)).resolves.toBe(true);
    });

    it('should block a user who is not a member', async () => {
      mockProject({ members: [{ user: '507f1f77bcf86cd799439099', role: 'owner' }] });
      await expect(canJoinProject({ _id: userId, role: 'user' }, projectId)).resolves.toBe(false);
    });

    it('should block when the project does not exist', async () => {
      mockProject(null);
      await expect(canJoinProject({ _id: userId, role: 'user' }, projectId)).resolves.toBe(false);
    });

    it('should let an admin join without querying the database', async () => {
      await expect(canJoinProject({ _id: userId, role: 'admin' }, projectId)).resolves.toBe(true);
      expect(Project.findById).not.toHaveBeenCalled();
    });
  });
});
