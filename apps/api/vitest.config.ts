// LogeTogo/apps/api/vitest.config.ts
// Configuration Vitest pour les tests API

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: [],
    env: {
      NODE_ENV: 'development',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'prisma/',
        '**/*.config.*',
        '**/*.d.ts',
      ],
    },
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
