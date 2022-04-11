module.exports = {
  testEnvironment: "node",
  verbose: true,
  coveragePathIgnorePatterns: ["/node_modules/"],
  "setupFiles": [
    "<rootDir>/test/setup.ts"
  ],
  transform: {
    "^.+\\.ts?$": "ts-jest",
  },
};
