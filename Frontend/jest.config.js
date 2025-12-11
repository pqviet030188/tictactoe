export default {
  // preset: 'ts-jest',
  // testEnvironment: 'jsdom',
  // roots: ['<rootDir>/src'],
  // testMatch: ['**/__tests__/**/*.ts?(x)', '**/?(*.)+(spec|test).ts?(x)'],
  // moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  // modulePaths: ['<rootDir>/src'],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/appConfig$': '<rootDir>/src/__mocks__/config.ts',
    //'^.*/config$': '<rootDir>/src/__mocks__/config.ts',
    '^../../appConfig$': '<rootDir>/src/__mocks__/config.ts',
    '^../appConfig$': '<rootDir>/src/__mocks__/config.ts',
   '^uuid$': '<rootDir>/src/__mocks__/uuid.ts',
   '^@hyper-fetch/core$': '<rootDir>/src/__mocks__/hyperfetch.ts',
  },
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  // collectCoverageFrom: [
  //   'src/**/*.{ts,tsx}',
  //   '!src/**/*.d.ts',
  //   '!src/main.tsx',
  //   '!src/vite-env.d.ts',
  // ],
  // transform: {
  //   '^.+\\.tsx?$': ['ts-jest', {
  //     tsconfig: 'tsconfig.test.json',
  //   }],
  // },
  // transformIgnorePatterns: [
  //   'node_modules/(?!(@hyper-fetch|uuid))',
  // ],
  // silent: false,
  // verbose: true,

  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts?(x)', '**/?(*.)+(spec|test).ts?(x)'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  modulePaths: ['<rootDir>/src'],
  transform: {
    '^.+\\.(ts|tsx)?$': ['ts-jest', {
      tsconfig: 'tsconfig.test.json',
    }],
    '^.+\\.(js|jsx)$': 'babel-jest',
  }
};
