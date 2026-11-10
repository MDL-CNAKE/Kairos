const { errorHandler } = require('../middleware/error.middleware');
const AppError = require('../utils/app-error.util');

function run(err) {
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  errorHandler(err, {}, res, () => {});
  return { status: res.status.mock.calls[0][0], body: res.json.mock.calls[0][0] };
}

describe('Error handler', () => {
  beforeAll(() => jest.spyOn(console, 'error').mockImplementation(() => {}));
  afterAll(() => console.error.mockRestore());

  it('should use the status of an AppError', () => {
    expect(run(new AppError(404, 'Task not found'))).toEqual({ status: 404, body: { message: 'Task not found' } });
  });

  it('should map a duplicate key error to 409', () => {
    const err = Object.assign(new Error('E11000'), { code: 11000, keyValue: { email: 'a@b.it' } });
    expect(run(err)).toEqual({ status: 409, body: { message: 'email already in use' } });
  });

  it('should map a CastError to 400', () => {
    const err = Object.assign(new Error('cast'), { name: 'CastError', path: '_id' });
    expect(run(err)).toEqual({ status: 400, body: { message: 'Invalid _id' } });
  });

  it('should map a Mongoose ValidationError to 422', () => {
    const err = Object.assign(new Error('val'), { name: 'ValidationError', errors: { title: { message: 'title is required' } } });
    expect(run(err)).toEqual({ status: 422, body: { message: 'title is required' } });
  });

  it('should hide internal details on 500', () => {
    expect(run(new Error('db password leaked'))).toEqual({ status: 500, body: { message: 'Internal server error' } });
  });
});
