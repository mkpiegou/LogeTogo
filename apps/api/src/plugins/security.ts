// LogeTogo/apps/api/src/plugins/security.ts
// 🛡️ Plugin centralisé de sécurité pour Fastify

import { FastifyInstance, FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { RateLimitPluginOptions, errorResponseBuilderContext } from '@fastify/rate-limit';
import { FastifyHelmetOptions } from '@fastify/helmet';
import { FastifyJWTOptions } from '@fastify/jwt';

/**
 * 🛡️ Plugin de sécurité centralisé
 * 
 * Ce plugin configure tous les aspects de sécurité de l'API :
 * - CORS (Cross-Origin Resource Sharing)
 * - Headers de sécurité HTTP (Helmet)
 * - Rate limiting (protection anti-DDoS)
 * - JWT (JSON Web Tokens) pour l'authentification
 * 
 * Pourquoi centraliser la sécurité ?
 * - Configuration cohérente sur toute l'API
 * - Facilité de maintenance et mise à jour
 * - Éviter l'oubli de mesures de sécurité
 * - Tests centralisés des politiques de sécurité
 */
const securityPlugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  
  const isDev = process.env.NODE_ENV === 'development';
  const isProd = process.env.NODE_ENV === 'production';

  // 📊 Log du démarrage de la configuration sécurité
  fastify.log.info('🛡️ Configuration des middlewares de sécurité...');

  // 🌐 Configuration CORS (Cross-Origin Resource Sharing)
  await fastify.register(import('@fastify/cors'), {
    /**
     * 🎯 Politique CORS adaptée à l'environnement
     * 
     * En développement : Permissive pour faciliter les tests
     * En production : Restrictive pour la sécurité
     */
    origin: isDev 
      ? true  // Accepte toutes les origines en dev
      : [
          'https://logetogo.tg',           // Site principal
          'https://www.logetogo.tg',       // Avec www
          'https://admin.logetogo.tg',     // Panel admin
          'https://app.logetogo.tg',       // App mobile web
        ],
    
    // 🍪 Autoriser les cookies et headers d'auth
    credentials: true,
    
    // 📋 Headers autorisés pour les requêtes
    allowedHeaders: [
      'Origin',
      'X-Requested-With', 
      'Content-Type',
      'Accept',
      'Authorization',
      'X-API-Key',
      'X-Request-ID',
    ],
    
    // 🛠️ Méthodes HTTP autorisées
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    
    // ⏱️ Temps de cache pour les requêtes preflight
    maxAge: isDev ? 300 : 86400, // 5min en dev, 24h en prod
  });

  fastify.log.info('✅ CORS configuré avec succès');

  // 🛡️ Configuration Helmet (Headers de sécurité HTTP)
  await fastify.register((await import('@fastify/helmet')).default, {
    /**
     * 🔒 Headers de sécurité essentiels
     * 
     * Helmet ajoute automatiquement des headers qui protègent contre :
     * - XSS (Cross-Site Scripting)
     * - CSRF (Cross-Site Request Forgery)
     * - Clickjacking
     * - MIME type sniffing
     * - Et bien d'autres attaques...
     */
    
    // 🎯 Content Security Policy (CSP)
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],                          // Par défaut : même origine
        scriptSrc: ["'self'", "'unsafe-inline'"],        // Scripts autorisés
        styleSrc: [                                      // Styles autorisés
          "'self'", 
          "'unsafe-inline'",
          'https://fonts.googleapis.com'
        ],
        fontSrc: [                                       // Polices autorisées
          "'self'", 
          'https://fonts.gstatic.com'
        ],
        imgSrc: [                                        // Images autorisées
          "'self'", 
          'data:',                                       // Images base64
          'https://*.cloudflare.com',                    // CDN Cloudflare
          'https://*.cloudinary.com',                    // Stockage images
        ],
        connectSrc: [                                    // Connexions AJAX autorisées
          "'self'",
          isDev ? 'http://localhost:*' : ''              // Localhost en dev uniquement
        ].filter(Boolean),
        objectSrc: ["'none'"],                           // Pas d'objects/embed
      },
      upgradeInsecureRequests: isProd
    },

    // 🔒 Protection contre le clickjacking
    frameguard: {
      action: 'deny',  // Interdire l'intégration dans des frames
    },

    // 🛡️ Protection XSS
    xssFilter: true,

    // 🔍 Empêcher le MIME type sniffing
    noSniff: true,

    // 🔐 Forcer HTTPS en production
    hsts: isProd ? {
      maxAge: 31536000,      // 1 an
      includeSubDomains: true,
      preload: true
    } : false,

    // 🚫 Masquer les informations du serveur
    hidePoweredBy: true,
  } as FastifyHelmetOptions);

  fastify.log.info('✅ Helmet (headers sécurité) configuré avec succès');

  // ⚡ Configuration Rate Limiting (Protection anti-DDoS)
  await fastify.register((await import('@fastify/rate-limit')).default, {
    /**
     * 🚦 Limitation du taux de requêtes
     * 
     * Protège contre :
     * - Attaques par déni de service (DDoS)
     * - Brute force sur les logins
     * - Abus d'API
     * - Scraping excessif
     */
    
    // 📊 Limites par fenêtre de temps
    max: isDev ? 1000 : 100,        // 1000 req/min en dev, 100 en prod
    timeWindow: '1 minute',         // Fenêtre glissante de 1 minute
    
    // 🔑 Identification des clients
    keyGenerator: (request: FastifyRequest) => {
      // Prioriser l'IP réelle derrière les proxies
      return request.headers['x-forwarded-for'] as string || 
             request.headers['x-real-ip'] as string ||
             request.ip;
    },
    
    // 📝 Message d'erreur personnalisé
    errorResponseBuilder: (request: FastifyRequest, context: errorResponseBuilderContext & { remaining?: number }) => {
      // Log de l'IP du client pour le rate limiting
      fastify.log.warn({
        ip: request.ip,
        method: request.method,
        url: request.url,
        message: 'Rate limit dépassé'
      });

      return {
        code: 429,
        error: 'Too Many Requests',
        message: 'Trop de requêtes. Veuillez patienter avant de réessayer.',
        retryAfter: Math.round(context.ttl / 1000), // en secondes
        limit: context.max,
        remaining: context.remaining ?? 0,
        resetTime: new Date(Date.now() + context.ttl).toISOString(),
      };
    },
    
    // 🎯 Rate limiting différencié par route
    enableDraftSpec: true,  // Support des headers standard
    
    // 🔧 Configuration avancée
    addHeaders: {           // Ajouter headers informatifs
      'x-ratelimit-limit': true,
      'x-ratelimit-remaining': true,
      'x-ratelimit-reset': true,
      'retry-after': true,
    },
    
    // 🚫 Bypass pour certaines routes (si nécessaire)
    skip: (request: FastifyRequest) => {
      // Exemple : bypass pour les health checks
      return request.url === '/health' || request.url === '/api/system/health';
    },
  } as RateLimitPluginOptions);

  fastify.log.info('✅ Rate limiting configuré avec succès');

  // 🔐 Configuration JWT (JSON Web Tokens)
  await fastify.register((await import('@fastify/jwt')).default, {
    /**
     * 🎫 Configuration des tokens JWT
     * 
     * JWT permet :
     * - Authentification stateless (sans session serveur)
     * - Tokens sécurisés et vérifiables
     * - Information utilisateur dans le token
     * - Expiration automatique
     */
    
    // 🔑 Clé secrète pour signer les tokens
    secret: process.env.JWT_SECRET || (() => {
      if (isProd) {
        throw new Error('JWT_SECRET est obligatoire en production !');
      }
      fastify.log.warn('⚠️  Utilisation de la clé JWT par défaut (dev uniquement)');
      return 'dev-jwt-secret-32-chars-minimum-change';
    })(),
    
    // ⚙️ Options de signature
    sign: {
      expiresIn: '24h',           // Durée de vie du token
      issuer: 'logetogo-api',     // Émetteur du token
      audience: 'logetogo-app',   // Destinataire du token
    },
    
    // 🔍 Options de vérification
    verify: {
      issuer: 'logetogo-api',
      audience: 'logetogo-app',
      
      // 🎯 Fonction d'extraction personnalisée du token
      extractToken: (request: FastifyRequest) => {
        // 1. Header Authorization (Bearer token)
        const authHeader = request.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          return authHeader.substring(7);
        }
        
        // 2. Cookie (pour les apps web)
        const cookies = (request as any).cookies as Record<string, string> | undefined;
        if (cookies?.authToken) {
          return cookies.authToken;
        }
        
        // 3. Query parameter (fallback, moins sécurisé)
        if (isDev && request.query && typeof request.query === 'object') {
          const query = request.query as Record<string, unknown>;
          if (typeof query.token === 'string') {
            fastify.log.warn('⚠️  Token envoyé via query param (dev uniquement)');
            return query.token;
          }
        }
        
        return null;
      },
    },
    
    // 🍪 Support des cookies JWT
    cookie: {
      cookieName: 'authToken',
      signed: false,              // Pas de signature cookie (JWT déjà signé)
      secure: isProd,             // HTTPS uniquement en production
      httpOnly: true,             // Pas d'accès JavaScript (sécurité XSS)
      sameSite: isProd ? 'strict' : 'lax',  // Protection CSRF
      maxAge: 24 * 60 * 60 * 1000,         // 24h en millisecondes
    },
  } as FastifyJWTOptions);

  fastify.log.info('✅ JWT configuré avec succès');

  // 🔧 Décorateur pour faciliter l'usage des tokens
  fastify.decorate('authenticate', async function(request: FastifyRequest, reply: FastifyReply) {
    try {
      await request.jwtVerify();
    } catch (err) {
      const error = err as Error;
      fastify.log.warn({ 
        error: error.message, 
        url: request.url,
        method: request.method,
        ip: request.ip 
      }, 'Tentative d\'authentification échouée');
      
      reply.code(401).send({ 
        error: 'Non autorisé',
        message: 'Token manquant ou invalide',
        code: 'UNAUTHORIZED'
      });
    }
  });

  // 📊 Log final de succès
  fastify.log.info({
    cors: '✅ Configuré',
    helmet: '✅ Headers sécurité actifs',
    rateLimit: `✅ ${isDev ? '1000' : '100'} req/min`,
    jwt: '✅ Authentification JWT prête'
  }, '🛡️ Configuration sécurité terminée avec succès');

  // 🧪 Route de test de sécurité (dev uniquement)
  if (isDev) {
    fastify.get('/api/security/test', {
      schema: {
        description: 'Test des middlewares de sécurité (dev uniquement)',
        tags: ['Security'],
        response: {
          200: {
            type: 'object',
            properties: {
              cors: { type: 'boolean' },
              helmet: { type: 'boolean' },
              rateLimit: { type: 'boolean' },
              jwt: { type: 'boolean' },
              headers: { type: 'object' },
              ip: { type: 'string' }
            }
          }
        }
      }
    }, async (request, reply) => {
      return {
        cors: true,
        helmet: true,
        rateLimit: true,
        jwt: true,
        headers: {
          'x-frame-options': reply.getHeader('x-frame-options'),
          'x-xss-protection': reply.getHeader('x-xss-protection'),
          'x-content-type-options': reply.getHeader('x-content-type-options'),
        },
        ip: request.ip,
        userAgent: request.headers['user-agent'],
        timestamp: new Date().toISOString()
      };
    });
  }
};

// 🚀 Export du plugin avec fastify-plugin
export default fp(securityPlugin, {
  name: 'security',
  dependencies: [], // Pas de dépendances, ce plugin doit être chargé en premier
});

// 🏷️ Types pour TypeScript
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: any, reply: any) => Promise<void>;
  }
}