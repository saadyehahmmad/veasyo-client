/// <reference types="node" />
import dotenv from 'dotenv';
import { logger } from './utils/logger';
import { stateService } from './services/state.service';
import { PcAgentClient } from './websocket/websocket.client';
import { DEFAULT_CONFIG } from './constants';

// Load environment variables (optional - will use defaults if .env doesn't exist)
dotenv.config();

// Get configuration from environment
const BACKEND_URL: string = process.env.BACKEND_URL || 'http://localhost:3000';
const TENANT_ID: string = process.env.TENANT_ID || '';
const DEFAULT_PRINTER_IP: string = process.env.PRINTER_IP || DEFAULT_CONFIG.PRINTER_IP;
const DEFAULT_PRINTER_PORT: number = parseInt(process.env.PRINTER_PORT || String(DEFAULT_CONFIG.PRINTER_PORT), 10);

// Validate required configuration
if (!TENANT_ID) {
  logger.error('TENANT_ID is required. Please set it in .env file or use the CLI: npm run cli');
  process.exit(1);
}

// Initialize PC Agent client
const pcAgentClient = new PcAgentClient(BACKEND_URL, TENANT_ID);

// Connect to backend
logger.info('Starting PC Agent...', {
  backendUrl: BACKEND_URL,
  tenantId: TENANT_ID,
  defaultPrinter: `${DEFAULT_PRINTER_IP}:${DEFAULT_PRINTER_PORT}`,
});

// Warn if using default printer IP (likely not configured)
if (DEFAULT_PRINTER_IP === '192.168.1.100' && !process.env.PRINTER_IP) {
  logger.warn('⚠️  Using default printer IP. This is likely incorrect!');
  logger.warn('   Please configure PRINTER_IP in .env file or use the CLI: npm run cli');
}

// Connect to backend
pcAgentClient.connect()
  .then(() => {
    logger.info('✅ PC Agent connected to backend successfully', {
      backendUrl: BACKEND_URL,
      tenantId: TENANT_ID,
    });
    stateService.setStatus('running');

    // Send periodic health updates (every 30 seconds)
    setInterval(() => {
      pcAgentClient.sendHealthUpdate();
    }, 30000);
  })
  .catch((error) => {
    logger.error('❌ Failed to connect to backend', {
      error: error.message,
      backendUrl: BACKEND_URL,
      tenantId: TENANT_ID,
    });
    stateService.setStatus('error');
    stateService.recordError(error);
    process.exit(1);
  });

// Graceful shutdown
const gracefulShutdown = (signal: string) => {
  logger.info(`${signal} received, shutting down gracefully`);
  stateService.setStatus('stopping');
  
  // Disconnect from backend
  pcAgentClient.disconnect();
  
  logger.info('PC Agent stopped');
  stateService.setStatus('stopped');
  process.exit(0);
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

