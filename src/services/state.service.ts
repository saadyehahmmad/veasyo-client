/// <reference types="node" />
import { EventEmitter } from 'events';
import { printerPool } from '../utils/printer-pool';
import { logger } from '../utils/logger';

/**
 * PC Agent State Service
 * Manages and tracks the state of the PC Agent service
 * Provides real-time status information for monitoring and diagnostics
 */
export interface AgentState {
  status: 'running' | 'stopping' | 'stopped' | 'error';
  uptime: number; // milliseconds
  startTime: Date;
  version: string;
  configuration: {
    backendUrl: string;
    tenantId: string;
    defaultPrinterIp: string;
    defaultPrinterPort: number;
    maxConnectionsPerPrinter: number;
    connectionTimeout: number;
    idleTimeout: number;
  };
  statistics: {
    totalPrintJobs: number;
    successfulPrintJobs: number;
    failedPrintJobs: number;
    activeConnections: number;
    poolStatistics: {
      totalPools: number;
      totalConnections: number;
      pools: Array<{
        printer: string;
        connections: number;
        available: number;
        inUse: number;
      }>;
    };
  };
  lastError?: {
    message: string;
    timestamp: Date;
    stack?: string;
  };
  health: {
    server: 'healthy' | 'degraded' | 'unhealthy';
    printerPool: 'healthy' | 'degraded' | 'unhealthy';
    overall: 'healthy' | 'degraded' | 'unhealthy';
  };
}

export class StateService extends EventEmitter {
  private state: AgentState;
  private startTime: Date;
  private printJobCounters = {
    total: 0,
    successful: 0,
    failed: 0,
  };

  constructor() {
    super();
    this.startTime = new Date();
    this.state = this.initializeState();
    this.startHealthMonitoring();
  }

  /**
   * Initialize the agent state
   */
  private initializeState(): AgentState {
    return {
      status: 'running',
      uptime: 0,
      startTime: this.startTime,
      version: '1.0.0',
      configuration: {
        backendUrl: process.env.BACKEND_URL || 'Not configured',
        tenantId: process.env.TENANT_ID || 'Not configured',
        defaultPrinterIp: process.env.PRINTER_IP || '192.168.1.100',
        defaultPrinterPort: parseInt(process.env.PRINTER_PORT || '9100', 10),
        maxConnectionsPerPrinter: parseInt(process.env.MAX_PRINTER_CONNECTIONS || '5', 10),
        connectionTimeout: parseInt(process.env.PRINTER_CONNECTION_TIMEOUT || '5000', 10),
        idleTimeout: parseInt(process.env.PRINTER_IDLE_TIMEOUT || '30000', 10),
      },
      statistics: {
        totalPrintJobs: 0,
        successfulPrintJobs: 0,
        failedPrintJobs: 0,
        activeConnections: 0,
        poolStatistics: {
          totalPools: 0,
          totalConnections: 0,
          pools: [],
        },
      },
      health: {
        server: 'healthy',
        printerPool: 'healthy',
        overall: 'healthy',
      },
    };
  }

  /**
   * Get current state
   */
  getState(): AgentState {
    this.updateState();
    return { ...this.state };
  }

  /**
   * Update state with current information
   */
  private updateState(): void {
    const now = Date.now();
    this.state.uptime = now - this.startTime.getTime();
    this.state.statistics.totalPrintJobs = this.printJobCounters.total;
    this.state.statistics.successfulPrintJobs = this.printJobCounters.successful;
    this.state.statistics.failedPrintJobs = this.printJobCounters.failed;

    // Update pool statistics
    try {
      const poolStats = printerPool.getStats();
      this.state.statistics.poolStatistics = poolStats;
      this.state.statistics.activeConnections = poolStats.totalConnections;
    } catch (error) {
      logger.error('Error getting pool statistics:', error);
    }

    // Update health status
    this.updateHealthStatus();
  }

  /**
   * Update health status based on current state
   */
  private updateHealthStatus(): void {
    // Server health: always healthy if running
    this.state.health.server = this.state.status === 'running' ? 'healthy' : 'unhealthy';

    // Printer pool health
    const poolStats = this.state.statistics.poolStatistics;
    if (poolStats.totalConnections === 0) {
      this.state.health.printerPool = 'healthy'; // No connections yet is fine
    } else {
      const utilization = poolStats.pools.reduce((sum, pool) => {
        const poolUtilization = pool.connections > 0 ? (pool.inUse / pool.connections) * 100 : 0;
        return sum + poolUtilization;
      }, 0) / poolStats.pools.length;

      if (utilization >= 95) {
        this.state.health.printerPool = 'unhealthy';
      } else if (utilization >= 80) {
        this.state.health.printerPool = 'degraded';
      } else {
        this.state.health.printerPool = 'healthy';
      }
    }

    // Overall health
    // Note: serverHealth can only be 'healthy' or 'unhealthy' (never 'degraded')
    // poolHealth can be 'healthy', 'degraded', or 'unhealthy'
    const serverHealth = this.state.health.server;
    const poolHealth = this.state.health.printerPool;
    
    if (serverHealth === 'unhealthy' || poolHealth === 'unhealthy') {
      this.state.health.overall = 'unhealthy';
    } else if (poolHealth === 'degraded') {
      // Only poolHealth can be 'degraded', serverHealth is always 'healthy' or 'unhealthy'
      this.state.health.overall = 'degraded';
    } else {
      this.state.health.overall = 'healthy';
    }
  }

  /**
   * Record a print job
   */
  recordPrintJob(success: boolean): void {
    this.printJobCounters.total++;
    if (success) {
      this.printJobCounters.successful++;
    } else {
      this.printJobCounters.failed++;
    }
    this.emit('printJob', { success, total: this.printJobCounters.total });
  }

  /**
   * Record an error
   */
  recordError(error: Error): void {
    this.state.lastError = {
      message: error.message,
      timestamp: new Date(),
      stack: error.stack,
    };
    this.emit('error', error);
  }

  /**
   * Set service status
   */
  setStatus(status: AgentState['status']): void {
    this.state.status = status;
    this.emit('statusChange', status);
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    // Update state every 5 seconds
    setInterval(() => {
      this.updateState();
      this.emit('stateUpdate', this.getState());
    }, 5000);
  }

  /**
   * Get formatted uptime
   */
  getFormattedUptime(): string {
    const uptime = this.state.uptime;
    const seconds = Math.floor(uptime / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Get success rate
   */
  getSuccessRate(): number {
    if (this.printJobCounters.total === 0) {
      return 100;
    }
    return (this.printJobCounters.successful / this.printJobCounters.total) * 100;
  }
}

// Singleton instance
export const stateService = new StateService();

