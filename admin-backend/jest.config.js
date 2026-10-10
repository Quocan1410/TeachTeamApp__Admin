/** @type {import("jest").Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  coverageProvider: "v8",
  setupFiles: ["<rootDir>/jest.setup.ts"],
  roots: ["<rootDir>/src"],
  testMatch: ["**/*.test.ts"],
  clearMocks: true,
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        diagnostics: { ignoreCodes: [151002] },
        tsconfig: { isolatedModules: true },
      },
    ],
  },
  collectCoverageFrom: [
    "src/utils/paginationHelpers.ts",
    "src/utils/sort.ts",
    "src/utils/adminConfig.ts",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "json-summary"],
};
