// LogeTogo/apps/api/src/plugins/swagger.ts
// 📚 Plugin de documentation API avec Swagger/OpenAPI

import { FastifyInstance, FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { SwaggerOptions } from '@fastify/swagger';
import { FastifySwaggerUiOptions } from '@fastify/swagger-ui';

/**
 * 📚 Plugin Swagger pour documentation API automatique
 * 
 * Ce plugin configure :
 * - Documentation OpenAPI 3.0 complète
 * - Interface Swagger UI interactive
 * - Schémas de validation automatiques
 * - Exemples de requêtes/réponses
 * - Authentification JWT documentée
 */
const swaggerPlugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  
  const isDev = process.env.NODE_ENV === 'development';
  const baseUrl = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 3001}`;

  // 📚 Configuration Swagger/OpenAPI
  await fastify.register((await import('@fastify/swagger')).default, {
    swagger: {
      info: {
        title: 'LogeTogo API',
        description: `
# 🏠 API LogeTogo - Plateforme Immobilière Intelligente

Cette API permet de gérer une plateforme immobilière complète pour le Togo avec :

## 🌟 Fonctionnalités principales
- **Authentification JWT** sécurisée avec rôles utilisateurs
- **Gestion des propriétés** (CRUD complet avec filtres avancés)
- **Système de favoris** et de réservations
- **Chat en temps réel** entre propriétaires et locataires
- **Paiements Mobile Money** (Mix by Yas, Flooz)
- **Géolocalisation** des propriétés
- **Upload d'images** optimisées
- **Système de reviews** bidirectionnel

## 🔐 Authentification
Utilisez un token JWT dans le header \`Authorization: Bearer <token>\`

## 🌍 Environnement
- **Base URL**: ${baseUrl}
- **Version**: 1.0.0
- **Environnement**: ${process.env.NODE_ENV || 'development'}

## 📱 Support
- Email: dev@logetogo.tg
- Documentation: https://docs.logetogo.tg
        `,
        version: process.env.npm_package_version || '1.0.0',
        contact: {
          name: 'Équipe LogeTogo',
          email: 'dev@logetogo.tg',
          url: 'https://logetogo.tg/contact'
        },
        license: {
          name: 'MIT',
          url: 'https://opensource.org/licenses/MIT'
        },
        termsOfService: 'https://logetogo.tg/terms'
      },

      // 🌐 Configuration du serveur
      host: isDev ? 'localhost:3001' : 'api.logetogo.tg',
      schemes: isDev ? ['http'] : ['https'],
      consumes: ['application/json'],
      produces: ['application/json'],

      // 🏷️ Tags pour organiser les endpoints
      tags: [
        {
          name: 'System',
          description: 'Endpoints système (health check, info)',
          externalDocs: {
            description: 'Guide monitoring',
            url: 'https://docs.logetogo.tg/monitoring'
          }
        },
        {
          name: 'Auth',
          description: 'Authentification et gestion des utilisateurs',
          externalDocs: {
            description: 'Guide authentification',
            url: 'https://docs.logetogo.tg/auth'
          }
        },
        {
          name: 'Properties',
          description: 'Gestion des propriétés immobilières',
          externalDocs: {
            description: 'Guide propriétés',
            url: 'https://docs.logetogo.tg/properties'
          }
        },
        {
          name: 'Users',
          description: 'Gestion des profils utilisateurs'
        },
        {
          name: 'Bookings',
          description: 'Réservations et disponibilités'
        },
        {
          name: 'Payments',
          description: 'Paiements Mobile Money et facturation'
        },
        {
          name: 'Chat',
          description: 'Messagerie temps réel'
        },
        {
          name: 'Test',
          description: 'Endpoints de test (développement uniquement)'
        }
      ],

      // 🔐 Schémas de sécurité
      securityDefinitions: {
        Bearer: {
          type: 'apiKey',
          name: 'Authorization',
          in: 'header',
          description: 'Token JWT au format: Bearer <token>',
          example: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
        },
        ApiKey: {
          type: 'apiKey',
          name: 'X-API-Key',
          in: 'header',
          description: 'Clé API pour accès programmatique'
        }
      },

      // 🏗️ Définitions de modèles réutilisables
      definitions: {
        // 📊 Réponses standard
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Opération réussie' },
            data: { type: 'object' }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string', example: 'Erreur de validation' },
            message: { type: 'string', example: 'Les données fournies sont invalides' },
            details: { type: 'object' }
          }
        },

        // 👤 Modèle utilisateur
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'clp123xyz789' },
            email: { type: 'string', format: 'email', example: 'user@logetogo.tg' },
            firstName: { type: 'string', example: 'Kofi' },
            lastName: { type: 'string', example: 'Mensah' },
            phone: { type: 'string', example: '+22890123456' },
            role: { type: 'string', enum: ['USER', 'OWNER', 'ADMIN'], example: 'USER' },
            avatar: { type: 'string', format: 'uri', example: 'https://example.com/avatar.jpg' },
            isVerified: { type: 'boolean', example: false },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },

        // 🏠 Modèle propriété
        Property: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'clp123xyz789' },
            title: { type: 'string', example: 'Villa moderne à Adidogomé' },
            description: { type: 'string', example: 'Belle villa 4 chambres avec jardin' },
            price: { type: 'number', example: 150000, description: 'Prix en FCFA' },
            type: { type: 'string', enum: ['APARTMENT', 'HOUSE', 'VILLA', 'STUDIO', 'ROOM'] },
            bedrooms: { type: 'integer', example: 4 },
            bathrooms: { type: 'integer', example: 3 },
            area: { type: 'number', example: 200.5, description: 'Superficie en m²' },
            address: { type: 'string', example: 'Rue de la Paix, Adidogomé' },
            city: { type: 'string', example: 'Lomé' },
            latitude: { type: 'number', example: 6.1629 },
            longitude: { type: 'number', example: 1.2255 },
            images: { 
              type: 'array', 
              items: { type: 'string', format: 'uri' },
              example: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg']
            },
            isActive: { type: 'boolean', example: true },
            createdAt: { type: 'string', format: 'date-time' },
            owner: { $ref: '#/definitions/User' }
          }
        },

        // 🔐 Token d'authentification
        AuthTokens: {
          type: 'object',
          properties: {
            accessToken: { 
              type: 'string', 
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
              description: 'Token d\'accès (24h)' 
            },
            refreshToken: { 
              type: 'string', 
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
              description: 'Token de rafraîchissement (7j)' 
            },
            expiresIn: { type: 'number', example: 86400, description: 'Durée en secondes' }
          }
        }
      },

      // 🌍 Configuration des réponses globales
      responses: {
        UnauthorizedError: {
          description: 'Token manquant ou invalide',
          schema: {
            type: 'object',
            properties: {
              error: { type: 'string', example: 'Non autorisé' },
              message: { type: 'string', example: 'Token manquant ou invalide' },
              statusCode: { type: 'number', example: 401 }
            }
          }
        },
        NotFoundError: {
          description: 'Ressource non trouvée',
          schema: {
            type: 'object',
            properties: {
              error: { type: 'string', example: 'Not Found' },
              message: { type: 'string', example: 'Ressource non trouvée' },
              statusCode: { type: 'number', example: 404 }
            }
          }
        },
        ValidationError: {
          description: 'Erreur de validation des données',
          schema: {
            type: 'object',
            properties: {
              error: { type: 'string', example: 'Validation Error' },
              message: { type: 'string', example: 'Données invalides' },
              details: { type: 'array', items: { type: 'object' } },
              statusCode: { type: 'number', example: 400 }
            }
          }
        }
      }
    }
  } as SwaggerOptions);

  fastify.log.info('✅ Configuration Swagger terminée');

  // 🎨 Configuration Swagger UI (interface graphique)
  if (isDev) {
    await fastify.register((await import('@fastify/swagger-ui')).default, {
      routePrefix: '/docs',
      
      // 🎯 Configuration de l'interface
      uiConfig: {
        docExpansion: 'list',        // Sections développées par défaut
        deepLinking: true,           // URLs directes vers les endpoints
        defaultModelRendering: 'model',
        defaultModelsExpandDepth: 2,
        defaultModelExpandDepth: 2,
        displayOperationId: false,
        displayRequestDuration: true,
        filter: true,                // Barre de recherche
        showExtensions: true,
        tryItOutEnabled: true,       // Boutons "Try it out"
        supportedSubmitMethods: ['get', 'post', 'put', 'delete', 'patch']
      },
      
      // 🔧 Configuration avancée
      uiHooks: {
        onRequest: async (request: FastifyRequest, _reply: FastifyReply) => {
          // Log des accès à la documentation
          fastify.log.info({
            ip: request.ip,
            userAgent: request.headers['user-agent']
          }, '📚 Accès documentation API');
        }
      },
      
      // 🎨 CSS personnalisé
      staticCSP: true,
      transformStaticCSP: (header: string) => header,
    } as FastifySwaggerUiOptions);

    fastify.log.info('✅ Interface Swagger UI configurée sur /docs');
  } else {
    fastify.log.info('ℹ️  Documentation Swagger désactivée en production');
  }

  // 📋 Endpoint pour récupérer le schéma OpenAPI (toujours disponible)
  fastify.get('/api-schema', {
    schema: {
      description: 'Récupérer le schéma OpenAPI complet',
      tags: ['System'],
      response: {
        200: {
          type: 'object',
          description: 'Schéma OpenAPI 3.0'
        }
      }
    }
  }, async () => {
    return fastify.swagger();
  });

  // 📊 Log final
  fastify.log.info({
    documentation: isDev ? `${baseUrl}/docs` : 'Désactivée en production',
    schema: `${baseUrl}/api-schema`,
    openapi: '3.0.x'
  }, '📚 Documentation API configurée avec succès');
};

// Export du plugin
export default fp(swaggerPlugin, {
  name: 'swagger',
  dependencies: ['security'], // Après la sécurité pour documenter l'auth
});