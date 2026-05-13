const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/tests/setup/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@/components/(.*)$': '<rootDir>/components/$1',
    '^@/lib/(.*)$': '<rootDir>/lib/$1',
    '^@/app/(.*)$': '<rootDir>/app/$1',
  },
  testMatch: [
    '**/tests/**/*.test.{ts,tsx,js,jsx}',
    '**/tests/**/*.spec.{ts,tsx,js,jsx}',
  ],
  collectCoverageFrom: [
    'app/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    'components/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
    '!**/coverage/**',
    '!**/*.config.{js,ts}',
  ],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60,
    },
  },
  testTimeout: 30000,
  // DB integration tests share a database; running with 1 worker avoids data races
  // from parallel suites deleting each other's records or hitting unique constraints
  maxWorkers: 1,
  // Ignore .next directory to prevent Haste module naming collisions
  modulePathIgnorePatterns: ['<rootDir>/.next/'],
}

// next/jest sets its own transformIgnorePatterns; we wrap it to also
// allow `jose` (ESM-only) and other ESM packages to be transformed.
const baseConfig = createJestConfig(customJestConfig)

module.exports = async () => {
  const config = await baseConfig()
  config.transformIgnorePatterns = [
    '/node_modules/(?!(jose|@panva|oidc-token-hash|socks-proxy-agent)/)',
  ]
  return config
}