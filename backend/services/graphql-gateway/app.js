const express = require('express');
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const { ApolloServerPluginDrainHttpServer } = require('@apollo/server/plugin/drainHttpServer');
const { ApolloGateway, IntrospectAndCompose, RemoteGraphQLDataSource } = require('@apollo/gateway');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

/**
 * GraphQL API Gateway
 * Unified API layer for all microservices
 *
 * Features:
 * - Schema federation across all services
 * - Request batching and caching
 * - Authentication and authorization
 * - Rate limiting
 * - GraphQL Playground
 */

const PORT = process.env.GRAPHQL_GATEWAY_PORT || 4000;

// Subgraph endpoints
const subgraphs = [
  {
    name: 'business-intelligence',
    url: process.env.BI_GRAPHQL_URL || 'http://localhost:3010/graphql'
  },
  {
    name: 'ai-analytics',
    url: process.env.AI_ANALYTICS_GRAPHQL_URL || 'http://localhost:3012/graphql'
  },
  {
    name: 'alerts',
    url: process.env.ALERTS_GRAPHQL_URL || 'http://localhost:3013/graphql'
  },
  {
    name: 'crm',
    url: process.env.CRM_GRAPHQL_URL || 'http://localhost:3014/graphql'
  },
  {
    name: 'alumni',
    url: process.env.ALUMNI_GRAPHQL_URL || 'http://localhost:3015/graphql'
  }
];

// Custom data source class to handle authentication
class AuthenticatedDataSource extends RemoteGraphQLDataSource {
  willSendRequest({ request, context }) {
    // Forward authentication token to subgraphs
    if (context.token) {
      request.http.headers.set('authorization', `Bearer ${context.token}`);
    }

    // Forward user info
    if (context.user) {
      request.http.headers.set('x-user-id', context.user.userId);
      request.http.headers.set('x-user-role', context.user.role);
      request.http.headers.set('x-school-id', context.user.schoolId);
    }
  }
}

// Initialize Apollo Gateway
const gateway = new ApolloGateway({
  supergraphSdl: new IntrospectAndCompose({
    subgraphs: subgraphs.map(({ name, url }) => ({ name, url }))
  }),
  buildService({ url }) {
    return new AuthenticatedDataSource({ url });
  }
});

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);

  // Middleware
  app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
    crossOriginEmbedderPolicy: false
  }));

  app.use(morgan('combined'));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per window
    message: 'Too many requests from this IP, please try again later.'
  });
  app.use('/graphql', limiter);

  // Initialize Apollo Server
  const server = new ApolloServer({
    gateway,
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      {
        async requestDidStart() {
          return {
            async didEncounterErrors(requestContext) {
              console.error('GraphQL Errors:', requestContext.errors);
            }
          };
        }
      }
    ],
    introspection: process.env.NODE_ENV !== 'production',
    formatError: (error) => {
      console.error('GraphQL Error:', error);

      // Don't expose internal errors in production
      if (process.env.NODE_ENV === 'production') {
        return {
          message: error.message,
          extensions: {
            code: error.extensions?.code || 'INTERNAL_SERVER_ERROR'
          }
        };
      }

      return error;
    }
  });

  await server.start();

  // Apply GraphQL middleware
  app.use(
    '/graphql',
    cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
      credentials: true
    }),
    express.json(),
    expressMiddleware(server, {
      context: async ({ req }) => {
        // Extract JWT token
        const token = req.headers.authorization?.replace('Bearer ', '');

        // Extract user info from headers (set by auth middleware)
        const user = {
          userId: req.headers['x-user-id'],
          role: req.headers['x-user-role'],
          schoolId: req.headers['x-school-id']
        };

        return {
          token,
          user: user.userId ? user : null
        };
      }
    })
  );

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({
      service: 'GraphQL API Gateway',
      status: 'Active',
      version: '1.0.0',
      subgraphs: subgraphs.map(s => s.name),
      timestamp: new Date().toISOString()
    });
  });

  // GraphQL Playground (development only)
  if (process.env.NODE_ENV !== 'production') {
    const expressPlayground = require('graphql-playground-middleware-express').default;
    app.get('/playground', expressPlayground({
      endpoint: '/graphql',
      settings: {
        'request.credentials': 'include'
      }
    }));
  }

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      message: 'Route not found',
      path: req.path
    });
  });

  // Error handler
  app.use((err, req, res, next) => {
    console.error('Express Error:', err);
    res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err.message
    });
  });

  // Start server
  await new Promise((resolve) => httpServer.listen({ port: PORT }, resolve));

  console.log('=============================================');
  console.log('🚀 GraphQL API Gateway Started');
  console.log('=============================================');
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 GraphQL Endpoint: http://localhost:${PORT}/graphql`);

  if (process.env.NODE_ENV !== 'production') {
    console.log(`🎮 GraphQL Playground: http://localhost:${PORT}/playground`);
  }

  console.log(`💚 Health Check: http://localhost:${PORT}/health`);
  console.log(`\n📦 Connected Subgraphs:`);
  subgraphs.forEach(({ name, url }) => {
    console.log(`   - ${name}: ${url}`);
  });
  console.log('=============================================');
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  process.exit(0);
});

// Start server
startServer().catch((error) => {
  console.error('Failed to start GraphQL Gateway:', error);
  process.exit(1);
});

module.exports = { startServer };
