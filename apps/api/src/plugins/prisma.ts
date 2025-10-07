// LogeTogo/apps/api/src/plugins/prisma.ts
// 🔌 Plugin Fastify pour Prisma ORM - Version TypeScript Strict Corrigée

import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { PrismaClient } from '@prisma/client';
import fp from 'fastify-plugin';

// 🏗️ Déclaration du type pour TypeScript
declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

/**
 * 🗄️ Configuration optimisée du client Prisma avec types corrects
 */
const createPrismaClient = (): PrismaClient => {
  const isDev = process.env.NODE_ENV === 'development';
  
  // 📊 Configuration des logs selon l'environnement
  const logConfig = isDev 
    ? [
        { level: 'query', emit: 'event' },   
        { level: 'info', emit: 'stdout' },   
        { level: 'warn', emit: 'stdout' },   
        { level: 'error', emit: 'stdout' },  
      ]
    : [
        { level: 'error', emit: 'stdout' },  
      ];

  return new PrismaClient({
    log: logConfig as any,
    
    // ⚡ Configuration de la datasource sans undefined
    ...(process.env.DATABASE_URL && {
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    }),
    
    // 🔧 Configuration avancée
    errorFormat: isDev ? 'pretty' : 'minimal',
  });
};

/**
 * 🔌 Plugin Prisma pour Fastify - Version TypeScript Strict
 */
const prismaPlugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // 🏗️ Création du client Prisma avec configuration optimisée
  const prisma = createPrismaClient();
  
  // 📊 Logger les requêtes SQL en développement (très utile pour debug)
  if (process.env.NODE_ENV === 'development') {
    // @ts-ignore
    prisma.$on('query', (e: any) => {
      fastify.log.debug({
        query: e.query,
        params: e.params,
        duration: `${e.duration}ms`,
        target: e.target,
      }, '🗄️ Requête SQL exécutée');
    });
  }

  // 🔗 Test de connexion au démarrage du serveur
  try {
    fastify.log.info('🔌 Tentative de connexion à la base de données...');
    
    // Test de connexion basique
    await prisma.$connect();
    fastify.log.info('✅ Connexion base de données établie avec succès');
    
    // 🧪 Test avec une requête simple pour valider la DB (compatible tous providers)
    await prisma.$queryRaw`SELECT 1 as test`;
    
    fastify.log.info({ 
      provider: process.env.DATABASE_URL?.startsWith('file:') ? 'SQLite' : 
                process.env.DATABASE_URL?.startsWith('postgres') ? 'PostgreSQL' : 'Unknown'
    }, '🗄️ Base de données connectée');
    
    // 📊 Test de performance de la connexion
    const startTime = Date.now();
    await prisma.$queryRaw`SELECT 1 as test`;
    const responseTime = Date.now() - startTime;
    
    fastify.log.info({ 
      responseTime: `${responseTime}ms` 
    }, '⚡ Temps de réponse base de données');
    
  } catch (error) {
    // 💥 Erreur de connexion critique
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    
    fastify.log.error({
      error: errorMessage,
      databaseUrl: process.env.DATABASE_URL?.replace(/:\/\/[^@]*@/, '://***@') ?? 'Non configurée',
    }, '💥 Erreur de connexion base de données');
    
    // 🛠️ Messages d'aide pour debug
    fastify.log.error(`
    🔍 Vérifications suggérées pour la base de données:
    
    1. La base de données est-elle accessible ?
       → Vérifier DATABASE_URL dans .env
    
    2. Les credentials sont-ils corrects ?
       → PostgreSQL: postgresql://user:pass@host:5432/db
       → SQLite: file:./test.db
    
    3. Le provider Prisma correspond-il à la DATABASE_URL ?
       → Vérifier prisma/schema.prisma
    `);
    
    throw new Error(`Impossible de se connecter à la base de données: ${errorMessage}`);
  }

  // 🔌 Décoration de l'instance Fastify
  fastify.decorate('prisma', prisma);

  // 🏥 Hook de health check pour la base de données
  fastify.addHook('onReady', async () => {
    try {
      // Test périodique de la connexion
      await prisma.$queryRaw`SELECT 1 as health_check`;
      fastify.log.info('✅ Health check base de données: OK');
    } catch (healthError) {
      const errorMessage = healthError instanceof Error ? healthError.message : 'Erreur inconnue';
      fastify.log.error({ error: errorMessage }, '💥 Health check base de données: ÉCHEC');
      throw new Error(`Health check base de données échoué: ${errorMessage}`);
    }
  });

  // 🔄 Fermeture propre des connexions lors de l'arrêt du serveur
  fastify.addHook('onClose', async (server) => {
    server.log.info('🔒 Fermeture des connexions Prisma...');
    
    try {
      await server.prisma.$disconnect();
      server.log.info('✅ Connexions Prisma fermées proprement');
    } catch (disconnectError) {
      const errorMessage = disconnectError instanceof Error 
        ? disconnectError.message 
        : 'Erreur inconnue';
      
      server.log.error({ 
        error: errorMessage 
      }, '⚠️ Erreur lors de la fermeture des connexions Prisma');
    }
  });

  // 🎯 Log de succès du plugin
  fastify.log.info('🔌 Plugin Prisma enregistré avec succès');
};

// 🚀 Export du plugin avec fastify-plugin
export default fp(prismaPlugin, {
  name: 'prisma',
  dependencies: [], // Pas de dépendances pour ce plugin de base
});