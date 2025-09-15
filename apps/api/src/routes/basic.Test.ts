// LogeTogo/apps/api/tests/basic.test.ts
// Tests de base ultra-simplifiés pour valider l'infrastructure

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { createServer } from '../server.js';

describe('Tests de base LogeTogo API', () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    server = await createServer();
    await server.ready();
  });

  afterAll(async () => {
    await server.close();
  });

  it('devrait démarrer le serveur sans erreur', async () => {
    expect(server).toBeDefined();
  });

  it('devrait répondre à la route racine', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/'
    });

    expect(response.statusCode).toBe(200);
    const payload = JSON.parse(response.payload);
    expect(payload.message).toContain('LogeTogo');
  });

  it('devrait retourner 404 pour une route inexistante', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/route-qui-nexiste-pas'
    });

    expect(response.statusCode).toBe(404);
  });

  it('devrait avoir des headers de sécurité de base', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/'
    });

    expect(response.headers['x-frame-options']).toBeDefined();
  });
});