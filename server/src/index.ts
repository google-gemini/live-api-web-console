/**
 * Gemini Live API Proxy Server
 *
 * A Fastify-based WebSocket server that proxies connections
 * from frontend clients to the Gemini Live API using Vertex AI authentication.
 */

import Fastify from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import fastifyCors from '@fastify/cors';
import { loadGeminiConfig, loadServerConfig, validateKeyFile } from './config.js';
import { handleProxyConnection } from './gemini-proxy.js';

async function main(): Promise<void> {
  // Load configuration
  const geminiConfig = loadGeminiConfig();
  const serverConfig = loadServerConfig();

  console.log('Gemini Proxy Server starting...');
  console.log('Configuration:');
  console.log(`  Project ID: ${geminiConfig.projectId}`);
  console.log(`  Location: ${geminiConfig.location}`);
  console.log(`  Model: ${geminiConfig.modelId}`);
  console.log(`  Key File: ${geminiConfig.keyFilePath}`);

  // Validate key file exists
  await validateKeyFile(geminiConfig.keyFilePath);
  console.log('  Key file validated');

  // Create Fastify instance
  const fastify = Fastify({
    logger: {
      level: 'info',
      transport: {
        target: 'pino-pretty',
        options: {
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      },
    },
  });

  // Register CORS
  await fastify.register(fastifyCors, {
    origin: true, // Allow all origins in development
    credentials: true,
  });

  // Register WebSocket plugin
  await fastify.register(fastifyWebsocket);

  // Health check endpoint
  fastify.get('/api/health', async () => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      config: {
        projectId: geminiConfig.projectId,
        location: geminiConfig.location,
        modelId: geminiConfig.modelId,
      },
    };
  });

  // WebSocket endpoint
  fastify.register(async function (fastify) {
    fastify.get('/api/ws', { websocket: true }, (socket, _req) => {
      handleProxyConnection(socket, geminiConfig);
    });
  });

  // Start server
  try {
    await fastify.listen({
      port: serverConfig.port,
      host: serverConfig.host,
    });
    console.log(`Server listening on http://${serverConfig.host}:${serverConfig.port}`);
    console.log(`WebSocket endpoint: ws://${serverConfig.host}:${serverConfig.port}/api/ws`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
