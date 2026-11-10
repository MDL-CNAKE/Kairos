module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  collectCoverage: false,
  // Timeout più alto per operazioni async
  testTimeout: 10000,
};
