// jest.config.cjs
module.exports = {
  testEnvironment: "node",
  transform: {},
  testMatch: ["**/tests/**/*.test.js"],
  setupFiles: ["./tests/setup/env.js"],
  coverageProvider: "v8",
  collectCoverageFrom: [
    "helpers/**/*.js",
    "services/**/*.js",
    "middlewares/**/*.js",
    "controllers/**/*.js",
  ],
  coverageDirectory: "coverage",
  testTimeout: 30000,
};
