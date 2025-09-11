// LogeTogo/apps/api/src/routes/test.ts
// 🧪 Routes de test pour développement et validation

import { FastifyInstance, FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

// Schema de validation pour création d'utilisateur de test
const createTestUserSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1)
});

type CreateTestUserBody = z.infer<typeof createTestUserSchema>;

/**
 * 🧪 Routes de test pour valider le fonctionnement en développement
 * 
 * Ces routes permettent de :
 * - Tester la connexion base de données
 * - Valider les modèles Prisma
 * - Créer des données de test
 * - Déboguer l'API
 */
const testRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  
  // 🗄️ Test de connexion base de données avec requêtes réelles
  fastify.get('/database', {
    schema: {
      description: 'Test complet de la base de données avec statistiques',
      tags: ['Test'],
      response: {
        200: {
          type: 'object',
          properties: {
            connection: { type: 'string', enum: ['OK', 'ERROR'] },
            statistics: {
              type: 'object',
              properties: {
                users: { type: 'number' },
                properties: { type: 'number' },
                healthChecks: { type: 'number' }
              }
            },
            performance: {
              type: 'object',
              properties: {
                queryTime: { type: 'number', description: 'Temps en ms' }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    
    try {
      const startTime = Date.now();
      
      // Utiliser request.ip si nécessaire
      const clientIp = request.ip;
      
      // Test avec requêtes réelles sur nos modèles
      const [usersCount, propertiesCount, healthChecksCount] = await Promise.all([
        fastify.prisma.user.count(),
        fastify.prisma.property.count(),
        fastify.prisma.healthCheck.count()
      ]);
      
      const queryTime = Date.now() - startTime;
      
      return reply.send({
        connection: 'OK',
        statistics: {
          users: usersCount,
          properties: propertiesCount,
          healthChecks: healthChecksCount
        },
        performance: {
          queryTime
        },
        clientInfo: { ip: clientIp }
      });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      fastify.log.error(error, 'Erreur lors du test database');
      
      return reply.code(500).send({
        connection: 'ERROR',
        error: errorMessage
      });
    }
  });

  // 👤 Création d'utilisateur de test avec validation
  fastify.post('/users', {
    schema: {
      description: 'Créer un utilisateur de test pour valider le modèle',
      tags: ['Test'],
      body: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
          firstName: { type: 'string', minLength: 1 },
          lastName: { type: 'string', minLength: 1 }
        },
        required: ['email', 'firstName', 'lastName']
      },
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string' },
                firstName: { type: 'string' },
                lastName: { type: 'string' },
                createdAt: { type: 'string', format: 'date-time' }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ Body: CreateTestUserBody }>, reply: FastifyReply) => {
    
    try {
      // Validation avec Zod pour la sécurité
      const validatedData = createTestUserSchema.parse(request.body);
      
      // Création de l'utilisateur via Prisma
      const user = await fastify.prisma.user.create({
        data: {
          email: validatedData.email,
          firstName: validatedData.firstName,
          lastName: validatedData.lastName
        }
      });
      
      fastify.log.info({ userId: user.id, email: user.email }, 'Utilisateur de test créé');
      
      return reply.code(201).send({
        success: true,
        user
      });
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          success: false,
          error: 'Données de validation invalides',
          details: error.errors
        });
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      fastify.log.error(error, 'Erreur lors de la création utilisateur test');
      
      return reply.code(500).send({
        success: false,
        error: errorMessage
      });
    }
  });

  // 🏠 Création de propriété de test
  fastify.post('/properties', {
    schema: {
      description: 'Créer une propriété de test',
      tags: ['Test'],
      body: {
        type: 'object',
        properties: {
          title: { type: 'string', minLength: 1 },
          description: { type: 'string', minLength: 1 },
          price: { type: 'number', minimum: 0 },
          city: { type: 'string', minLength: 1 }
        },
        required: ['title', 'description', 'price', 'city']
      }
    }
  }, async (request: FastifyRequest<{ 
    Body: { 
      title: string; 
      description: string; 
      price: number; 
      city: string; 
    } 
  }>, reply: FastifyReply) => {
    
    try {
      const property = await fastify.prisma.property.create({
        data: {
          title: request.body.title,
          description: request.body.description,
          price: Math.round(request.body.price * 100), // Convertir en centimes
          city: request.body.city
        }
      });
      
      return reply.code(201).send({
        success: true,
        property: {
          ...property,
          price: property.price / 100 // Retourner en FCFA
        }
      });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      return reply.code(500).send({
        success: false,
        error: errorMessage
      });
    }
  });
  
  // 🧹 Nettoyage des données de test
  fastify.delete('/cleanup', {
    schema: {
      description: 'Nettoyer toutes les données de test (DANGEREUX)',
      tags: ['Test'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            deleted: {
              type: 'object',
              properties: {
                users: { type: 'number' },
                properties: { type: 'number' },
                healthChecks: { type: 'number' }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    
    try {
      // Utiliser request.ip si nécessaire
      const clientIp = request.ip;
      
      // Supprimer toutes les données (attention : destructeur !)
      const [deletedUsers, deletedProperties, deletedHealthChecks] = await Promise.all([
        fastify.prisma.user.deleteMany(),
        fastify.prisma.property.deleteMany(),
        fastify.prisma.healthCheck.deleteMany()
      ]);
      
      fastify.log.warn({
        deletedUsers: deletedUsers.count,
        deletedProperties: deletedProperties.count,
        deletedHealthChecks: deletedHealthChecks.count
      }, 'Nettoyage des données de test effectué');
      
      return reply.send({
        success: true,
        deleted: {
          users: deletedUsers.count,
          properties: deletedProperties.count,
          healthChecks: deletedHealthChecks.count
        },
        clientInfo: { ip: clientIp }
      });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      return reply.code(500).send({
        success: false,
        error: errorMessage
      });
    }
  });
};

export default testRoutes;