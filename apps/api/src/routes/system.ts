// LogeTogo/apps/api/src/routes/system.ts
// 🏥 Routes système pour monitoring et information

import { FastifyInstance, FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';

/**
 * 🏥 Routes système pour monitoring, health checks et informations
 * 
 * Ces routes sont essentielles pour :
 * - Monitoring de production (health checks)
 * - Debugging en développement
 * - Load balancers et orchestrateurs
 */
const systemRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  
  // 🏥 Health check avancé avec vérification base de données
  fastify.get('/health', {
    schema: {
      description: 'Health check complet avec vérification des services',
      tags: ['System'],
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['healthy', 'degraded', 'unhealthy'] },
            timestamp: { type: 'string', format: 'date-time' },
            uptime: { type: 'number', description: 'Uptime en secondes' },
            version: { type: 'string' },
            environment: { type: 'string' },
            services: {
              type: 'object',
              properties: {
                database: {
                  type: 'object', 
                  properties: {
                    status: { type: 'string', enum: ['connected', 'disconnected'] },
                    responseTime: { type: 'number', description: 'Temps de réponse en ms' }
                  }
                },
                memory: {
                  type: 'object',
                  properties: {
                    used: { type: 'number', description: 'Mémoire utilisée (MB)' },
                    total: { type: 'number', description: 'Mémoire totale (MB)' },
                    percentage: { type: 'number', description: 'Pourcentage utilisé' }
                  }
                }
              }
            }
          }
        }
      }
    }
  }, async (_request: FastifyRequest, _reply: FastifyReply) => {
    
    let dbStatus = 'connected';
    let dbResponseTime = 0;
    
    try {
      // Test de la base de données avec mesure du temps
      const startTime = Date.now();
      await fastify.prisma.$queryRaw`SELECT 1 as health_test`;
      dbResponseTime = Date.now() - startTime;
      
      // Test de création d'un record de health check
      await fastify.prisma.healthCheck.create({
        data: {
          status: 'healthy',
          message: `Health check from ${_request.ip}`,
        }
      });
      
    } catch (error) {
      dbStatus = 'disconnected';
      fastify.log.error(error, 'Erreur lors du health check database');
    }
    
    // Informations mémoire
    const memUsage = process.memoryUsage();
    const memoryInfo = {
      used: Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100,
      total: Math.round(memUsage.heapTotal / 1024 / 1024 * 100) / 100,
      percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)
    };
    
    // Déterminer le statut global
    const overallStatus = dbStatus === 'connected' ? 'healthy' : 'degraded';
    
    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      version: process.env.npm_package_version ?? '1.0.0',
      environment: process.env.NODE_ENV ?? 'development',
      services: {
        database: {
          status: dbStatus,
          responseTime: dbResponseTime
        },
        memory: memoryInfo
      }
    };
  });

  // 📊 Informations système détaillées
  fastify.get('/info', {
    schema: {
      description: 'Informations détaillées du système (dev uniquement)',
      tags: ['System'],
      response: {
        200: {
          type: 'object',
          properties: {
            application: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                version: { type: 'string' },
                description: { type: 'string' },
                environment: { type: 'string' }
              }
            },
            system: {
              type: 'object',
              properties: {
                nodeVersion: { type: 'string' },
                platform: { type: 'string' },
                arch: { type: 'string' },
                uptime: { type: 'number' }
              }
            },
            database: {
              type: 'object',
              properties: {
                url: { type: 'string', description: 'URL masquée' },
                tablesCount: { type: 'number' }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    
    // Compter les tables de la base de données (database-agnostic)
    let tablesCount = 0;
    try {
      // Pour SQLite, utiliser sqlite_master, pour PostgreSQL information_schema
      const isSQLite = process.env.DATABASE_URL?.startsWith('file:');
      
      if (isSQLite) {
        const tables = await fastify.prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(*) as count 
          FROM sqlite_master 
          WHERE type = 'table' 
          AND name NOT LIKE 'sqlite_%'
        `;
        tablesCount = Number(tables[0]?.count ?? 0);
      } else {
        const tables = await fastify.prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(*) as count 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE'
        `;
        tablesCount = Number(tables[0]?.count ?? 0);
      }
    } catch (error) {
      fastify.log.warn('Impossible de compter les tables');
    }
    
    // Utiliser request.ip si nécessaire
    const clientIp = request.ip;
    
    // Utiliser reply.send si nécessaire
    return reply.send({
      application: {
        name: 'LogeTogo API',
        version: process.env.npm_package_version ?? '1.0.0',
        description: 'Plateforme immobilière intelligente pour le Togo',
        environment: process.env.NODE_ENV ?? 'development'
      },
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        uptime: Math.floor(process.uptime())
      },
      database: {
        url: process.env.DATABASE_URL?.replace(/:\/\/.*@/, '://***@') ?? 'Non configurée',
        tablesCount
      },
      // Ajouter l'IP du client pour log
      clientInfo: { ip: clientIp }
    });
  });
};

export default systemRoutes;