// LogeTogo/apps/api/tests/routes.test.ts
// Tests des routes de l'API

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { createServer } from '../src/server.js';

describe('Routes de test (développement)', () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    server = await createServer();
    await server.ready();
  });

  afterAll(async () => {
    await server.close();
  });

  // Nettoyage avant chaque test
  beforeEach(async () => {
    // Nettoyer la base de test si nécessaire
    try {
      await server.prisma.user.deleteMany();
      await server.prisma.property.deleteMany();
      await server.prisma.healthCheck.deleteMany();
    } catch (error) {
      // Ignore les erreurs de nettoyage
    }
  });

  describe('GET /api/test/database', () => {
    it('devrait retourner les statistiques de la base de données', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/test/database'
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.payload);
      
      expect(payload.connection).toBe('OK');
      expect(payload.statistics).toBeDefined();
      expect(payload.statistics.users).toBeGreaterThanOrEqual(0);
      expect(payload.statistics.properties).toBeGreaterThanOrEqual(0);
      expect(payload.performance.queryTime).toBeGreaterThan(0);
    });

    it('devrait mesurer le temps de réponse', async () => {
      const start = Date.now();
      const response = await server.inject({
        method: 'GET',
        url: '/api/test/database'
      });
      const duration = Date.now() - start;

      expect(response.statusCode).toBe(200);
      expect(duration).toBeLessThan(1000); // Moins de 1 seconde
    });
  });

  describe('POST /api/test/users', () => {
    it('devrait créer un utilisateur de test', async () => {
      const userData = {
        email: 'test@logetogo.tg',
        firstName: 'Test',
        lastName: 'User'
      };

      const response = await server.inject({
        method: 'POST',
        url: '/api/test/users',
        payload: userData
      });

      expect(response.statusCode).toBe(201);
      const payload = JSON.parse(response.payload);
      
      expect(payload.success).toBe(true);
      expect(payload.user.email).toBe(userData.email);
      expect(payload.user.firstName).toBe(userData.firstName);
      expect(payload.user.id).toBeDefined();
      expect(payload.user.createdAt).toBeDefined();
    });

    it('devrait rejeter les données invalides', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/test/users',
        payload: {
          email: 'email-invalide', // Email malformé
          firstName: '',            // Prénom vide
          lastName: 'User'
        }
      });

      expect(response.statusCode).toBe(400);
      const payload = JSON.parse(response.payload);
      
      expect(payload.success).toBe(false);
      expect(payload.error).toContain('validation');
    });

    it('devrait rejeter les emails dupliqués', async () => {
      const userData = {
        email: 'duplicate@logetogo.tg',
        firstName: 'Test',
        lastName: 'User'
      };

      // Créer le premier utilisateur
      await server.inject({
        method: 'POST',
        url: '/api/test/users',
        payload: userData
      });

      // Tenter de créer un deuxième avec le même email
      const response = await server.inject({
        method: 'POST',
        url: '/api/test/users',
        payload: userData
      });

      expect(response.statusCode).toBe(500);
      const payload = JSON.parse(response.payload);
      expect(payload.success).toBe(false);
    });
  });

  describe('POST /api/test/properties', () => {
    it('devrait créer une propriété de test', async () => {
      const propertyData = {
        title: 'Villa Test',
        description: 'Une belle villa pour les tests',
        price: 150000,
        city: 'Lomé'
      };

      const response = await server.inject({
        method: 'POST',
        url: '/api/test/properties',
        payload: propertyData
      });

      expect(response.statusCode).toBe(201);
      const payload = JSON.parse(response.payload);
      
      expect(payload.success).toBe(true);
      expect(payload.property.title).toBe(propertyData.title);
      expect(payload.property.price).toBe(propertyData.price);
      expect(payload.property.id).toBeDefined();
    });

    it('devrait rejeter les prix négatifs', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/test/properties',
        payload: {
          title: 'Villa Test',
          description: 'Test',
          price: -1000, // Prix négatif
          city: 'Lomé'
        }
      });

      expect(response.statusCode).toBe(500);
    });
  });

  describe('DELETE /api/test/cleanup', () => {
    beforeEach(async () => {
      // Créer des données de test à nettoyer
      await server.prisma.user.create({
        data: {
          email: 'cleanup@test.com',
          firstName: 'Cleanup',
          lastName: 'Test'
        }
      });

      await server.prisma.healthCheck.create({
        data: {
          status: 'test',
          message: 'Test cleanup'
        }
      });
    });

    it('devrait nettoyer toutes les données de test', async () => {
      const response = await server.inject({
        method: 'DELETE',
        url: '/api/test/cleanup'
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.payload);
      
      expect(payload.success).toBe(true);
      expect(payload.deleted.users).toBeGreaterThan(0);
      expect(payload.deleted.healthChecks).toBeGreaterThan(0);

      // Vérifier que les données ont bien été supprimées
      const userCount = await server.prisma.user.count();
      const healthCheckCount = await server.prisma.healthCheck.count();
      
      expect(userCount).toBe(0);
      expect(healthCheckCount).toBe(0);
    });
  });
});