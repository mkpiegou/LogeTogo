// LogeTogo/apps/api/vitest.config.ts
// Configuration des tests avec Vitest

import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    // Environnement de test
    environment: 'node',
    
    // Fichiers de test
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
    exclude: ['node_modules', 'dist', 'build'],
    
    // Configuration globale
    globals: true,
    clearMocks: true,
    restoreMocks: true,
    
    // Timeout des tests
    testTimeout: 10000,
    hookTimeout: 10000,
    
    // Coverage avec v8
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        'tests/',
        'dist/',
        '**/*.test.ts',
        '**/*.spec.ts',
        'vitest.config.ts'
      ],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70
        }
      }
    },
    
    // Setup et teardown
    setupFiles: ['./tests/setup.ts'],
    
    // Variables d'environnement pour les tests
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://logetogo_user:logetogo_password@localhost:5432/logetogo_test',
      JWT_SECRET: 'test-secret-32-chars-minimum-for-testing',
      JWT_REFRESH_SECRET: 'test-refresh-secret-32-chars-minimum'
    }
  },
  
  // Résolution des chemins
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  }
});