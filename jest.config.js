module.exports = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testEnvironment: 'node',
  verbose: true,
  coveragePathIgnorePatterns: ['/node_modules/'],
  roots: ['<rootDir>/test'],
  transform: {
    '^.+\\.ts?$': 'ts-jest',
  },
};
