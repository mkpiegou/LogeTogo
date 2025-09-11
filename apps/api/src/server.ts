// LogeTogo API Server
import Fastify from 'fastify';

const PORT = parseInt(process.env.PORT || '3001');
const HOST = process.env.HOST || 'localhost';
const IS_DEV = process.env.NODE_ENV !== 'production';

const server = Fastify({
  logger: {
    level: IS_DEV ? 'info' : 'warn',
    transport: IS_DEV ? {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname'
      }
    } : undefined
  }
});

// Plugins de sécurité de base
await server.register(import('@fastify/cors'), {
  origin: IS_DEV ? true : ['https://logetogo.tg']
});

await server.register(import('@fastify/helmet'));

// Routes de base
server.get('/', async () => ({
  message: '🏠 LogeTogo API',
  version: '1.0.0',
  status: 'running',
  timestamp: new Date().toISOString()
}));

server.get('/health', async () => ({
  status: 'healthy',
  uptime: process.uptime(),
  timestamp: new Date().toISOString()
}));

// Démarrage
async function start() {
  try {
    await server.listen({ port: PORT, host: HOST });
    server.log.info(`🚀 LogeTogo API sur http://${HOST}:${PORT}`);
  } catch (error) {
    server.log.error(error);
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  await server.close();
  process.exit(0);
});

start();
