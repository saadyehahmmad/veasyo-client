/// <reference types="node" />
import { Router, Request, Response } from 'express';
import type { HealthCheckResponse } from '../types/common';
import { printerPool } from '../utils/printer-pool';
import { stateService } from '../services/state.service';

export const healthRouter = Router();

/**
 * GET /health
 * Health check endpoint
 * Returns server status, timestamp, and connection pool statistics
 * Response format matches what backend expects
 */
healthRouter.get('/', (req: Request, res: Response) => {
  try {
    const poolStats = printerPool.getStats();
    const state = stateService.getState();
    
    const healthResponse: HealthCheckResponse & {
      pool?: {
        totalPools: number;
        totalConnections: number;
        pools: Array<{
          printer: string;
          connections: number;
          available: number;
          inUse: number;
        }>;
      };
      health?: {
        overall: string;
        server: string;
        printerPool: string;
      };
      uptime?: number;
      formattedUptime?: string;
    } = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'waiter-pc-agent',
      version: state.version,
      pool: poolStats,
      health: state.health,
      uptime: state.uptime,
      formattedUptime: stateService.getFormattedUptime(),
    };
    res.json(healthResponse);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      service: 'waiter-pc-agent',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

