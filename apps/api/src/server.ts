// LogeTogo/apps/api/src/server.ts
// 🚀 Serveur Fastify Ultra-Optimisé - Version TypeScript Strict Finale

import Fastify, { 
  FastifyInstance, 
  FastifyServerOptions, 
  FastifyRequest, 
  FastifyReply 
} from 'fastify';
import prismaPlugin from './plugins/prisma.js';

/**
 * 🔧 Variables d'environnement avec valeurs par défaut sécurisées
 */
const PORT = parseInt(process.env.PORT ?? '3001', 10);
const HOST = process.env.HOST ?? 'localhost';
const NODE_ENV = process.env.NODE_ENV ?? 'development';
const IS_DEV = NODE_ENV === 'development';

/**
 * ⚙️ Configuration du serveur en fonction de l'environnement
 * 
 * Cette approche résout le problème TypeScript strict en créant
 * des configurations séparées pour dev/prod sans `undefined` explicite
 */
const createServerOptions = (): FastifyServerOptions => {
  // 🛠️ Configuration de base commune
  const baseOptions: Partial<FastifyServerOptions> = {
    disableRequestLogging: !IS_DEV,
    trustProxy: true,
    ignoreTrailingSlash: true,
    caseSensitive: false,
    keepAliveTimeout: 72000,
    maxParamLength: 100,
    bodyLimit: 1048576,
    genReqId: () => `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    requestIdLogLabel: 'reqId',
    requestIdHeader: 'x-request-id',
  };

  // 🎨 Configuration développement avec logs colorés
  if (IS_DEV) {
    return {
      ...baseOptions,
      logger: {
        level: 'info',
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss.l Z',
            ignore: 'pid,hostname,reqId',
            singleLine: true,
            levelFirst: true,
          },
        },
      },
    } as FastifyServerOptions;
  }

  // 🏭 Configuration production sans transport
  return {
    ...baseOptions,
    logger: {
      level: 'warn',
      // Pas de transport en production (logs JSON vers stdout)
    },
  } as FastifyServerOptions;
};

/**
 * 🏗️ Fonction de création du serveur Fastify
 */
export async function createServer(): Promise<FastifyInstance> {
  // ⚙️ Création avec la configuration appropriée
  const server = Fastify(createServerOptions());

  try {
    // 📊 Log informatif du démarrage
    server.log.info({
      msg: '🏠 Initialisation du serveur LogeTogo API',
      version: process.env.npm_package_version ?? '1.0.0',
      nodeVersion: process.version,
      environment: NODE_ENV,
      port: PORT,
      host: HOST,
    });

    // 🔌 Enregistrement du plugin Prisma
    await server.register(prismaPlugin);

    // 🏥 Route de health check optimisée
    server.get('/health', {
      schema: {
        description: 'Health check endpoint pour monitoring',
        tags: ['System'],
        response: {
          200: {
            type: 'object',
            properties: {
              status: { 
                type: 'string', 
                enum: ['healthy'],
                description: 'Statut du serveur'
              },
              timestamp: { 
                type: 'string', 
                format: 'date-time',
                description: 'Timestamp de la réponse'
              },
              uptime: { 
                type: 'number',
                description: 'Temps de fonctionnement en secondes'
              },
              version: { 
                type: 'string',
                description: 'Version de l\'API'
              },
              environment: { 
                type: 'string',
                description: 'Environnement (dev/prod)'
              },
              memory: {
                type: 'object',
                properties: {
                  used: { type: 'number', description: 'Mémoire utilisée (MB)' },
                  total: { type: 'number', description: 'Mémoire totale (MB)' }
                },
                required: ['used', 'total']
              }
            },
            required: ['status', 'timestamp', 'uptime', 'version']
          }
        }
      }
    }, async (_request: FastifyRequest, _reply: FastifyReply) => {
      // 💾 Informations mémoire pour monitoring
      const memUsage = process.memoryUsage();
      const memoryInfo = {
        used: Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100,
        total: Math.round(memUsage.heapTotal / 1024 / 1024 * 100) / 100,
      };

      return {
        status: 'healthy' as const,
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        version: process.env.npm_package_version ?? '1.0.0',
        environment: NODE_ENV,
        memory: memoryInfo,
      };
    });

    // 🎯 Route d'accueil avec informations système
    server.get('/', {
      schema: {
        description: 'Point d\'entrée principal de l\'API LogeTogo',
        tags: ['System'],
        response: {
          200: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              description: { type: 'string' },
              version: { type: 'string' },
              status: { type: 'string' },
              timestamp: { type: 'string', format: 'date-time' },
              endpoints: {
                type: 'object',
                properties: {
                  health: { type: 'string', description: 'URL health check' },
                  docs: { 
                    type: 'string', 
                    description: 'URL documentation (dev uniquement)' 
                  }
                },
                required: ['health']
              }
            },
            required: ['message', 'description', 'version', 'status', 'timestamp', 'endpoints']
          }
        }
      }
    }, async (_request: FastifyRequest, _reply: FastifyReply) => {
      const baseUrl = `http://${HOST}:${PORT}`;
      
      return {
        message: '🏠 Bienvenue sur l\'API LogeTogo !',
        description: 'Plateforme immobilière intelligente pour le Togo',
        version: process.env.npm_package_version ?? '1.0.0',
        status: 'running',
        timestamp: new Date().toISOString(),
        endpoints: {
          health: `${baseUrl}/health`,
          ...(IS_DEV && { docs: `${baseUrl}/docs` }),
        },
      };
    });

    // 🚫 Gestionnaire 404 personnalisé avec logging
    server.setNotFoundHandler({
      preValidation: async (request: FastifyRequest, _reply: FastifyReply) => {
        // 📊 Log des 404 pour analyser les erreurs d'API
        request.log.warn({
          method: request.method,
          url: request.url,
          userAgent: request.headers['user-agent'],
          referer: request.headers.referer,
          ip: request.ip,
        }, 'Route non trouvée');
      }
    }, async (request: FastifyRequest, reply: FastifyReply) => {
      const responseBody = {
        error: 'Not Found',
        message: `Route ${request.method} ${request.url} non trouvée`,
        statusCode: 404,
        timestamp: new Date().toISOString(),
        // 🛠️ Aide au développement uniquement en mode dev
        ...(IS_DEV && {
          suggestion: 'Vérifiez les routes disponibles sur la documentation API',
          availableRoutes: ['GET /', 'GET /health']
        }),
      };

      return reply.code(404).send(responseBody);
    });

    // 💥 Gestionnaire d'erreurs global typé strictement
    server.setErrorHandler(async (
      error: Error & { statusCode?: number; validation?: unknown[] }, 
      request: FastifyRequest, 
      reply: FastifyReply
    ) => {
      const statusCode = error.statusCode ?? 500;
      
      // 📊 Logging différencié selon la gravité
      const logData = {
        error: error.message,
        statusCode,
        method: request.method,
        url: request.url,
        userAgent: request.headers['user-agent'],
        ip: request.ip,
        reqId: request.id,
        // Ajouter les erreurs de validation si présentes
        ...(error.validation && { validation: error.validation }),
      };

      if (statusCode >= 500) {
        // 🚨 Erreurs serveur critiques avec stack trace
        request.log.error({
          ...logData,
          stack: error.stack,
        }, '💥 Erreur serveur critique');
      } else {
        // ⚠️ Erreurs client (400-499) sans stack trace
        request.log.warn(logData, '⚠️ Erreur client');
      }

      // 🔒 Réponse sécurisée (ne pas exposer les détails internes en prod)
      const safeMessage = IS_DEV || statusCode < 500 
        ? error.message 
        : 'Une erreur interne est survenue';

      const errorResponse = {
        error: error.name ?? 'Error',
        message: safeMessage,
        statusCode,
        timestamp: new Date().toISOString(),
        reqId: request.id,
        // 🛠️ Informations supplémentaires en développement
        ...(IS_DEV && {
          ...(statusCode >= 500 && error.stack && {
            stack: error.stack.split('\n').slice(0, 10)
          }),
          ...(error.validation && {
            validation: error.validation
          })
        }),
      };

      return reply.code(statusCode).send(errorResponse);
    });

    // ✅ Configuration terminée
    server.log.info('✅ Configuration du serveur terminée avec succès');
    return server;

  } catch (configError) {
    // 💥 Erreur critique lors de la configuration
    const errorMessage = configError instanceof Error 
      ? configError.message 
      : 'Erreur inconnue de configuration';
    
    server.log.fatal({
      error: errorMessage,
      stack: configError instanceof Error ? configError.stack : undefined,
    }, '💥 Erreur fatale lors de la configuration du serveur');
    
    throw configError;
  }
}

/**
 * 🚀 Fonction de démarrage du serveur avec gestion complète du cycle de vie
 */
export async function startServer(): Promise<FastifyInstance> {
  let server: FastifyInstance | undefined;

  try {
    // 🏗️ Création du serveur
    server = await createServer();
    
    // 🔄 Configuration de l'arrêt gracieux (graceful shutdown)
    const shutdownSignals = ['SIGINT', 'SIGTERM', 'SIGHUP'] as const;
    
    shutdownSignals.forEach((signal) => {
      process.on(signal, async () => {
        if (!server) return;
        
        server.log.info(`📡 Signal ${signal} reçu, arrêt gracieux en cours...`);
        
        try {
          // ⏰ Timeout de 10 secondes pour l'arrêt gracieux
          const shutdownTimeout = setTimeout(() => {
            server?.log.error('❌ Timeout de l\'arrêt gracieux, arrêt forcé');
            process.exit(1);
          }, 10000);

          await server.close();
          clearTimeout(shutdownTimeout);
          server.log.info('✅ Serveur arrêté proprement');
          process.exit(0);
        } catch (shutdownError) {
          server.log.error(shutdownError, '💥 Erreur lors de l\'arrêt gracieux');
          process.exit(1);
        }
      });
    });

    // 🚀 Démarrage de l'écoute
    const address = await server.listen({
      port: PORT,
      host: HOST,
    });

    // 🎉 Message de succès avec informations utiles
    server.log.info(`
    
    🚀 ===== LogeTogo API Démarrée avec Succès ! =====
    
    🌐 URL Serveur     : ${address}
    🏥 Health Check    : http://${HOST}:${PORT}/health
    🏠 Page d'accueil  : http://${HOST}:${PORT}/
    
    🛠️ Mode            : ${NODE_ENV}
    📊 Logs niveau     : ${IS_DEV ? 'info (colorés)' : 'warn (JSON)'}
    ⚡ Performance     : Fastify optimisé
    
    🏠 Prêt à servir la plateforme LogeTogo !
    🇹🇬 Révolutionner l'immobilier togolais
    
    =================================================
    `);

    return server;

  } catch (startupError) {
    // 💥 Gestion d'erreur de démarrage
    const errorMessage = startupError instanceof Error 
      ? startupError.message 
      : 'Erreur de démarrage inconnue';
    
    console.error(`
    💥 ===== ÉCHEC DU DÉMARRAGE DU SERVEUR =====
    
    ❌ Erreur: ${errorMessage}
    
    🔍 Vérifications suggérées:
    - Le port ${PORT} est-il disponible ?
      → Tester avec: lsof -i :${PORT}
      → Ou changer le port: export PORT=3002
    - Node.js version compatible ?
      → Version actuelle: ${process.version}
      → Minimum requis: 18.17.0
    - Dépendances installées ?
      → Lancer: npm install
    - TypeScript compilé ?
      → Vérifier: npm run type-check
    
    ============================================
    `);
    
    // 🧹 Nettoyage si nécessaire
    if (server) {
      try {
        await server.close();
      } catch (cleanupError) {
        console.error('Erreur lors du nettoyage:', cleanupError);
      }
    }
    
    process.exit(1);
  }
}

/**
 * 🎯 Démarrage automatique si ce fichier est exécuté directement
 * 
 * Cette condition permet d'importer ce module sans démarrer le serveur
 * Utile pour les tests et autres utilisations
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer().catch((fatalError) => {
    console.error('💥 Erreur fatale non gérée:', fatalError);
    process.exit(1);
  });
}