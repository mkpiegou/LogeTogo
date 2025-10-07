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
    it('devrait vérifier la connexion à la base de données', async () => {
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
      expect(payload.statistics.healthChecks).toBeGreaterThanOrEqual(0);
      expect(payload.performance).toBeDefined();
      expect(payload.performance.queryTime).toBeGreaterThanOrEqual(0);
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
      expect(payload.error).toBeDefined();
    });
  });

  describe('POST /api/test/properties', () => {
    it('devrait créer une propriété de test', async () => {
      const propertyData = {
        title: 'Villa Test',
        description: 'Une belle villa de test',
        price: 500000,
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
      expect(payload.property.city).toBe(propertyData.city);
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

  describe('Routes système', () => {
    describe('GET /health', () => {
      it('devrait retourner le statut de santé du serveur', async () => {
        const response = await server.inject({
          method: 'GET',
          url: '/health'
        });

        expect(response.statusCode).toBe(200);
        const payload = JSON.parse(response.payload);
        
        expect(payload.status).toBe('healthy');
        expect(payload.timestamp).toBeDefined();
        expect(payload.uptime).toBeGreaterThanOrEqual(0);
        expect(payload.version).toBeDefined();
        expect(payload.memory).toBeDefined();
        expect(payload.memory.used).toBeGreaterThan(0);
        expect(payload.memory.total).toBeGreaterThan(0);
      });
    });

    describe('GET /', () => {
      it('devrait retourner les informations de bienvenue', async () => {
        const response = await server.inject({
          method: 'GET',
          url: '/'
        });

        expect(response.statusCode).toBe(200);
        const payload = JSON.parse(response.payload);
        
        expect(payload.message).toContain('LogeTogo');
        expect(payload.description).toBeDefined();
        expect(payload.version).toBeDefined();
        expect(payload.status).toBe('running');
        expect(payload.endpoints).toBeDefined();
        expect(payload.endpoints.health).toBeDefined();
      });
    });

    describe('GET /api/system/info', () => {
      it('devrait retourner les informations système', async () => {
        const response = await server.inject({
          method: 'GET',
          url: '/api/system/info'
        });

        expect(response.statusCode).toBe(200);
        const payload = JSON.parse(response.payload);
        
        expect(payload.application).toBeDefined();
        expect(payload.application.name).toBe('LogeTogo API');
        expect(payload.application.version).toBeDefined();
        expect(payload.system).toBeDefined();
        expect(payload.system.nodeVersion).toBeDefined();
        expect(payload.database).toBeDefined();
      });
    });
  });

  describe('Erreurs et routes inexistantes', () => {
    it('devrait retourner 404 pour une route inexistante', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/route/inexistante'
      });

      expect(response.statusCode).toBe(404);
      const payload = JSON.parse(response.payload);
      
      expect(payload.error).toBe('Not Found');
      expect(payload.message).toContain('non trouvée');
    });
  });
});
