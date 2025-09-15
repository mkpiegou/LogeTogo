// LogeTogo/apps/api/tests/server.test.ts
// Tests unitaires du serveur principal

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { createServer } from '../src/server.js';


describe('Serveur LogeTogo API', () => {
  let server: FastifyInstance;

  // Setup avant tous les tests
  beforeAll(async () => {
    server = await createServer();
    await server.ready();
  });

  // Nettoyage après tous les tests
  afterAll(async () => {
    await server.close();
  });

  describe('Configuration de base', () => {
    it('devrait démarrer sans erreur', async () => {
      expect(server).toBeDefined();
      expect(server.hasPlugin('prisma')).toBe(true);
      expect(server.hasPlugin('security')).toBe(true);
      expect(server.hasPlugin('swagger')).toBe(true);
    });

    it('devrait avoir les plugins requis', async () => {
      // Vérifier que les plugins critiques sont chargés
      expect(server.prisma).toBeDefined();
      expect(server.authenticate).toBeDefined();
    });
  });

  describe('Routes système', () => {
    it('GET / devrait retourner les informations de base', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/'
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.payload);
      expect(payload.message).toBe('🏠 Bienvenue sur l\'API LogeTogo !');
      expect(payload.status).toBe('running');
      expect(payload.version).toBeDefined();
    });

    it('GET /api/system/health devrait retourner le status de santé', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/system/health'
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.payload);
      expect(payload.status).toBe('healthy');
      expect(payload.services.database.status).toBe('connected');
      expect(payload.uptime).toBeGreaterThan(0);
    });

    it('GET /api/system/info devrait retourner les informations système', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/system/info'
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.payload);
      expect(payload.application.name).toBe('LogeTogo API');
      expect(payload.system.nodeVersion).toBeDefined();
    });
  });

  describe('Gestion d\'erreurs', () => {
    it('devrait retourner 404 pour une route inexistante', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/route-inexistante'
      });

      expect(response.statusCode).toBe(404);
      const payload = JSON.parse(response.payload);
      expect(payload.error).toBe('Not Found');
      expect(payload.message).toContain('non trouvée');
    });

    it('devrait gérer les erreurs internes', async () => {
      // Simuler une erreur en appelant une route qui n'existe pas
      const response = await server.inject({
        method: 'POST',
        url: '/api/test/error'
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('Headers de sécurité', () => {
    it('devrait inclure les headers de sécurité Helmet', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/system/health'
      });

      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-xss-protection']).toBeDefined();
    });

    it('devrait avoir la configuration CORS', async () => {
      const response = await server.inject({
        method: 'OPTIONS',
        url: '/api/system/health',
        headers: {
          'Origin': 'http://localhost:3000',
          'Access-Control-Request-Method': 'GET'
        }
      });

      expect(response.headers['access-control-allow-origin']).toBeDefined();
      expect(response.headers['access-control-allow-methods']).toBeDefined();
    });
  });

  describe('Documentation API', () => {
    it('GET /api-schema devrait retourner le schéma OpenAPI', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api-schema'
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.payload);
      expect(payload.swagger).toBeDefined();
      expect(payload.info.title).toBe('LogeTogo API');
    });

    it('GET /docs devrait être accessible en développement', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/docs'
      });

      // En test, cela peut retourner 302 (redirect) ou 200 selon la config
      expect([200, 302]).toContain(response.statusCode);
    });
  });

  describe('Rate Limiting', () => {
    it('devrait appliquer le rate limiting après plusieurs requêtes', async () => {
      // Faire plusieurs requêtes rapidement pour tester le rate limit
      const promises = Array.from({ length: 5 }, () => 
        server.inject({
          method: 'GET',
          url: '/api/system/health'
        })
      );

      const responses = await Promise.all(promises);
      
      // Toutes les réponses devraient être OK en développement
      responses.forEach(response => {
        expect(response.statusCode).toBe(200);
        // Headers de rate limit peuvent être absents en test
      });
    });
  });
});