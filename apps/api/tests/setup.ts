// LogeTogo/apps/api/tests/setup.ts
// Configuration globale pour tous les tests

import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';

// Configuration des variables d'environnement pour les tests
beforeAll(() => {
  // Forcer l'environnement de test
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = 'postgresql://logetogo_user:logetogo_password@localhost:5432/logetogo_test';
  process.env.JWT_SECRET = 'test-secret-32-chars-minimum-for-testing';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-32-chars-minimum';
  
  console.log('Setup tests: Variables d\'environnement configurées');
});

// Nettoyage après tous les tests
afterAll(() => {
  console.log('Teardown tests: Nettoyage terminé');
});

// Setup avant chaque test
beforeEach(() => {
  // Reset des mocks si nécessaire
});

// Nettoyage après chaque test
afterEach(() => {
  // Nettoyage si nécessaire
});