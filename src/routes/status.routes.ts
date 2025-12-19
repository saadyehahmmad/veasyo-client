/// <reference types="node" />
import { Router, Request, Response } from 'express';
import { stateService } from '../services/state.service';
import { logger } from '../utils/logger';

export const statusRouter = Router();

/**
 * GET /status
 * Get comprehensive status information about the PC Agent
 * Includes state, statistics, health, and configuration
 */
statusRouter.get('/', (req: Request, res: Response) => {
  try {
    const state = stateService.getState();
    const formattedUptime = stateService.getFormattedUptime();
    const successRate = stateService.getSuccessRate();

    res.json({
      ...state,
      formattedUptime,
      successRate: successRate.toFixed(2) + '%',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error getting status:', error);
    res.status(500).json({
      error: 'Failed to get status',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /status/health
 * Get health status only (lightweight check)
 */
statusRouter.get('/health', (req: Request, res: Response) => {
  try {
    const state = stateService.getState();
    res.json({
      status: state.health.overall,
      server: state.health.server,
      printerPool: state.health.printerPool,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error getting health status:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: 'Failed to get health status',
    });
  }
});

/**
 * GET /status/statistics
 * Get statistics only
 */
statusRouter.get('/statistics', (req: Request, res: Response) => {
  try {
    const state = stateService.getState();
    const successRate = stateService.getSuccessRate();

    res.json({
      ...state.statistics,
      successRate: successRate.toFixed(2) + '%',
      formattedUptime: stateService.getFormattedUptime(),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error getting statistics:', error);
    res.status(500).json({
      error: 'Failed to get statistics',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /status/configuration
 * Get configuration information
 */
statusRouter.get('/configuration', (req: Request, res: Response) => {
  try {
    const state = stateService.getState();
    res.json({
      ...state.configuration,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error getting configuration:', error);
    res.status(500).json({
      error: 'Failed to get configuration',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

