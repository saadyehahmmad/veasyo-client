/// <reference types="node" />
import { Socket } from 'net';
import { logger } from './logger';

/**
 * Pooled Connection Wrapper
 * Tracks connection usage and automatically returns to pool
 */
class PooledConnection {
  public connection: PrinterConnection;
  private poolKey: string;
  private inUse: boolean = false;
  public lastUsed: number = Date.now(); // Public for cleanup access
  private maxIdleTime: number;

  constructor(connection: PrinterConnection, poolKey: string, maxIdleTime: number) {
    this.connection = connection;
    this.poolKey = poolKey;
    this.maxIdleTime = maxIdleTime;
  }

  markInUse(): void {
    this.inUse = true;
    this.lastUsed = Date.now();
  }

  release(): void {
    this.inUse = false;
    this.lastUsed = Date.now();
  }

  isAvailable(): boolean {
    if (this.inUse) {
      return false;
    }

    // Check if connection is still valid
    if (!this.connection.isConnected()) {
      return false;
    }

    return true;
  }
}

/**
 * Enhanced Printer Connection with connection timeout
 */
class PrinterConnection {
  private socket: Socket | null = null;
  private printerIp: string;
  private printerPort: number;
  private connectionTimeout: number;

  constructor(printerIp: string, printerPort: number, connectionTimeout: number = 5000) {
    this.printerIp = printerIp;
    this.printerPort = printerPort;
    this.connectionTimeout = connectionTimeout;
  }

  async connect(): Promise<void> {
    if (this.socket && this.isConnected()) {
      return; // Already connected
    }

    return new Promise((resolve, reject) => {
      // Create new socket connection
      this.socket = new Socket();

      // Set connection timeout
      const timeout = setTimeout(() => {
        if (this.socket && !this.socket.destroyed) {
          this.socket.destroy();
        }
        reject(new Error(`Connection timeout: Could not connect to printer at ${this.printerIp}:${this.printerPort}`));
      }, this.connectionTimeout);

      // Handle successful connection
      this.socket.once('connect', () => {
        clearTimeout(timeout);
        logger.debug(`Connected to printer at ${this.printerIp}:${this.printerPort}`);
        resolve();
      });

      // Handle connection errors
      this.socket.once('error', (error) => {
        clearTimeout(timeout);
        logger.error(`Failed to connect to printer at ${this.printerIp}:${this.printerPort}`, { error: error.message });
        reject(new Error(`Printer connection error: ${error.message}`));
      });

      // Connect to printer
      this.socket.connect(this.printerPort, this.printerIp);
    });
  }

  async send(data: Buffer): Promise<void> {
    if (!this.socket || this.socket.destroyed) {
      throw new Error('Printer socket is not connected');
    }

    return new Promise((resolve, reject) => {
      // Handle write completion
      this.socket!.write(data, (error) => {
        if (error) {
          logger.error('Error writing to printer', { error: error.message });
          reject(error);
        } else {
          logger.debug(`Sent ${data.length} bytes to printer`);
          resolve();
        }
      });
    });
  }

  async close(): Promise<void> {
    return new Promise((resolve) => {
      if (this.socket && !this.socket.destroyed) {
        this.socket.end(() => {
          logger.debug('Printer connection closed');
          resolve();
        });
      } else {
        resolve();
      }
      this.socket = null;
    });
  }

  isConnected(): boolean {
    return this.socket !== null && !this.socket.destroyed && this.socket.writable;
  }
}

/**
 * Printer Connection Pool
 * Manages reusable TCP connections to printers for better scalability
 * Reduces connection overhead and improves performance under load
 */
export class PrinterConnectionPool {
  private pools: Map<string, PooledConnection[]> = new Map();
  private maxConnectionsPerPrinter: number;
  private connectionTimeout: number;
  private maxIdleTime: number = 30000; // 30 seconds default

  constructor(
    maxConnectionsPerPrinter: number = 5,
    connectionTimeout: number = 5000,
    idleTimeout: number = 30000,
  ) {
    this.maxConnectionsPerPrinter = maxConnectionsPerPrinter;
    this.connectionTimeout = connectionTimeout;
    this.maxIdleTime = idleTimeout;

    // Cleanup idle connections periodically
    setInterval(() => this.cleanupIdleConnections(), 10000); // Every 10 seconds
  }

  /**
   * Get or create a connection from the pool
   */
  async acquireConnection(printerIp: string, printerPort: number): Promise<PooledConnection> {
    const poolKey = `${printerIp}:${printerPort}`;
    let pool = this.pools.get(poolKey);

    if (!pool) {
      pool = [];
      this.pools.set(poolKey, pool);
    }

    // Try to find an available connection
    const availableConnection = pool.find((conn) => conn.isAvailable());

    if (availableConnection) {
      availableConnection.markInUse();
      logger.debug(`Reusing connection from pool for ${poolKey}`);
      return availableConnection;
    }

    // Check if we can create a new connection
    if (pool.length >= this.maxConnectionsPerPrinter) {
      // Wait for a connection to become available (with timeout)
      return this.waitForAvailableConnection(poolKey, pool);
    }

    // Create new connection
    const connection = new PrinterConnection(printerIp, printerPort, this.connectionTimeout);
    const pooledConnection = new PooledConnection(connection, poolKey, this.maxIdleTime);
    pool.push(pooledConnection);

    try {
      await connection.connect();
      pooledConnection.markInUse();
      logger.debug(`Created new connection for ${poolKey} (pool size: ${pool.length})`);
      return pooledConnection;
    } catch (error) {
      // Remove failed connection from pool
      const index = pool.indexOf(pooledConnection);
      if (index > -1) {
        pool.splice(index, 1);
      }
      throw error;
    }
  }

  /**
   * Wait for an available connection (with timeout)
   */
  private async waitForAvailableConnection(
    poolKey: string,
    pool: PooledConnection[],
  ): Promise<PooledConnection> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Timeout waiting for available connection to ${poolKey}`));
      }, 10000); // 10 second timeout

      const checkInterval = setInterval(() => {
        const available = pool.find((conn) => conn.isAvailable());
        if (available) {
          clearTimeout(timeout);
          clearInterval(checkInterval);
          available.markInUse();
          resolve(available);
        }
      }, 100); // Check every 100ms
    });
  }

  /**
   * Cleanup idle connections
   */
  private cleanupIdleConnections(): void {
    for (const [poolKey, pool] of this.pools.entries()) {
      const now = Date.now();
      const activeConnections: PooledConnection[] = [];

      for (const conn of pool) {
        if (conn.isAvailable() && now - conn.lastUsed > this.maxIdleTime) {
          // Close idle connection
          conn.connection.close().catch(() => {
            // Ignore errors during cleanup
          });
          logger.debug(`Closed idle connection for ${poolKey}`);
        } else {
          activeConnections.push(conn);
        }
      }

      // Update pool
      if (activeConnections.length === 0) {
        this.pools.delete(poolKey);
      } else {
        this.pools.set(poolKey, activeConnections);
      }
    }
  }

  /**
   * Get pool statistics
   */
  getStats(): {
    totalPools: number;
    totalConnections: number;
    pools: Array<{
      printer: string;
      connections: number;
      available: number;
      inUse: number;
    }>;
  } {
    const pools: Array<{
      printer: string;
      connections: number;
      available: number;
      inUse: number;
    }> = [];

    let totalConnections = 0;

    for (const [poolKey, pool] of this.pools.entries()) {
      const available = pool.filter((conn) => conn.isAvailable()).length;
      const inUse = pool.length - available;
      totalConnections += pool.length;

      pools.push({
        printer: poolKey,
        connections: pool.length,
        available,
        inUse,
      });
    }

    return {
      totalPools: this.pools.size,
      totalConnections,
      pools,
    };
  }

  /**
   * Close all connections and clear pools
   */
  async closeAll(): Promise<void> {
    const closePromises: Promise<void>[] = [];

    for (const pool of this.pools.values()) {
      for (const conn of pool) {
        closePromises.push(conn.connection.close().catch(() => {
          // Ignore errors during cleanup
        }));
      }
    }

    await Promise.all(closePromises);
    this.pools.clear();
    logger.info('All printer connection pools closed');
  }
}

// Singleton instance
export const printerPool = new PrinterConnectionPool(
  parseInt(process.env.MAX_PRINTER_CONNECTIONS || '5', 10),
  parseInt(process.env.PRINTER_CONNECTION_TIMEOUT || '5000', 10),
  parseInt(process.env.PRINTER_IDLE_TIMEOUT || '30000', 10),
);

