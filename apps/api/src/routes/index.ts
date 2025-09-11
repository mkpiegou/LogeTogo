// LogeTogo/apps/api/src/routes/index.ts
// 🛣️ Organisation centralisée des routes pour Issue #1

import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

// Import des routes par domaine (sera étendu dans les prochaines issues)
import systemRoutes from './system.ts';
import testRoutes from './test.ts';

/**
 * 🛣️ Plugin principal d'enregistrement des routes
 * 
 * Cette approche modulaire permet :
 * - Organisation claire par domaine métier
 * - Préfixes d'URL cohérents
 * - Facilité d'ajout de nouvelles routes
 * - Tests isolés par module
 */
const routesPlugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  
  // 📊 Log d'enregistrement des routes
  fastify.log.info('🛣️ Enregistrement des routes API...');

  // 🏥 Routes système (health, info, etc.)
  await fastify.register(systemRoutes, { prefix: '/api/system' });

  // 🧪 Routes de test (pour développement seulement)
  if (process.env.NODE_ENV === 'development') {
    await fastify.register(testRoutes, { prefix: '/api/test' });
  }

  // 📋 Liste des routes enregistrées (log informatif)
  fastify.log.info({
    routes: [
      'GET /api/system/health',
      'GET /api/system/info', 
      ...(process.env.NODE_ENV === 'development' ? [
        'GET /api/test/database',
        'POST /api/test/users'
      ] : [])
    ]
  }, '✅ Routes enregistrées avec succès');
};

export default fp(routesPlugin, {
  name: 'routes',
  dependencies: ['prisma'], // Dépend du plugin Prisma
});