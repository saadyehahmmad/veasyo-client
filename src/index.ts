/// <reference types="node" />
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import dotenv from 'dotenv';
import { printRouter } from './routes/print.routes';
import { healthRouter } from './routes/health.routes';
import { statusRouter } from './routes/status.routes';
import { logger } from './utils/logger';
import { setupWebSocket } from './websocket/websocket.server';
import { stateService } from './services/state.service';

// Load environment variables (optional - will use defaults if .env doesn't exist)
dotenv.config();

import { DEFAULT_CONFIG } from './constants';

const app = express();
const PORT: number = parseInt(process.env.PORT || String(DEFAULT_CONFIG.PORT), 10);
const DEFAULT_PRINTER_IP: string = process.env.PRINTER_IP || DEFAULT_CONFIG.PRINTER_IP;
const DEFAULT_PRINTER_PORT: number = parseInt(process.env.PRINTER_PORT || String(DEFAULT_CONFIG.PRINTER_PORT), 10);

// CORS configuration
// Allow specific origins if configured, otherwise allow all
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((origin: string) => origin.trim())
  : ['*'];

const corsOptions = {
  origin: allowedOrigins.includes('*') ? true : allowedOrigins,
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

// Request logging middleware
app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.debug(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  next();
});

// Routes
app.use('/print', printRouter);
app.use('/health', healthRouter);
app.use('/status', statusRouter);

// Root endpoint
app.get('/', (req: express.Request, res: express.Response) => {
  const state = stateService.getState();
  res.json({
    name: 'Waiter PC Agent',
    version: state.version,
    status: state.status,
    uptime: stateService.getFormattedUptime(),
    endpoints: {
      health: '/health',
      status: '/status',
      print: 'POST /print',
      websocket: 'ws://' + req.get('host'),
    },
    documentation: {
      installation: 'See INSTALLATION.md for setup instructions',
      api: 'See README.md for API documentation',
      architecture: 'See ARCHITECTURE.md for architecture details',
    },
  });
});

// Create HTTP server
const server = createServer(app);

// Setup WebSocket server
setupWebSocket(server);

// Start server
server.listen(PORT, () => {
  logger.info(`PC Agent server started on port ${PORT}`, {
    port: PORT,
    defaultPrinterIp: DEFAULT_PRINTER_IP,
    defaultPrinterPort: DEFAULT_PRINTER_PORT,
  });
  
  // Warn if using default printer IP (likely not configured)
  if (DEFAULT_PRINTER_IP === '192.168.1.100' && !process.env.PRINTER_IP) {
    logger.warn('⚠️  Using default printer IP. This is likely incorrect!');
    logger.warn('   Please configure PRINTER_IP in .env file or use the CLI: npm run cli');
  }
  
  // Log startup information
  logger.info('PC Agent is ready to receive print jobs', {
    endpoints: {
      health: `http://localhost:${PORT}/health`,
      status: `http://localhost:${PORT}/status`,
      print: `http://localhost:${PORT}/print`,
    },
    configuration: {
      port: PORT,
      defaultPrinter: `${DEFAULT_PRINTER_IP}:${DEFAULT_PRINTER_PORT}`,
      note: process.env.PRINTER_IP ? 'Using configured printer' : 'Using default printer (may need configuration)',
    },
  });
});

// Handle server errors
server.on('error', (error: Error & { code?: string }) => {
  if (error.code === 'EADDRINUSE') {
    logger.error(`Port ${PORT} is already in use. Please choose a different port.`);
  } else {
    logger.error('Server error:', error);
  }
  process.exit(1);
});

// Graceful shutdown
const gracefulShutdown = (signal: string) => {
  logger.info(`${signal} received, shutting down gracefully`);
  stateService.setStatus('stopping');
  
  server.close(() => {
    logger.info('Server closed');
    stateService.setStatus('stopped');
    process.exit(0);
  });
  
  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught exception:', error);
  stateService.recordError(error);
  stateService.setStatus('error');
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled rejection:', reason);
  const error = reason instanceof Error ? reason : new Error(String(reason));
  stateService.recordError(error);
});

