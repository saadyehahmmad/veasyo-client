/// <reference types="node" />
import { Socket } from 'net';
import { logger } from './logger';

/**
 * Printer connection interface
 * Handles TCP socket connections to ESC/POS printers
 */
export class PrinterConnection {
  private socket: Socket | null = null;
  private printerIp: string;
  private printerPort: number;
  private connectionTimeout: number = 5000; // 5 seconds

  constructor(printerIp: string, printerPort: number = 9100) {
    this.printerIp = printerIp;
    this.printerPort = printerPort;
  }

  /**
   * Connect to the printer via TCP socket
   * Returns a promise that resolves when connected
   */
  async connect(): Promise<void> {
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

  /**
   * Send data to the printer
   * Data should be ESC/POS commands as a Buffer
   */
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

  /**
   * Close the printer connection
   */
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

  /**
   * Check if the socket is connected
   */
  isConnected(): boolean {
    return this.socket !== null && !this.socket.destroyed && this.socket.writable;
  }
}

/**
 * Print ESC/POS commands to a printer
 * This is the main function used by the API endpoints
 * Uses connection pooling for better scalability
 */
export async function printToPrinter(
  printerIp: string,
  printerPort: number,
  data: Buffer,
): Promise<void> {
  // Import pool here to avoid circular dependencies
  const { printerPool } = await import('./printer-pool');

  let pooledConnection;
  try {
    // Acquire connection from pool
    pooledConnection = await printerPool.acquireConnection(printerIp, printerPort);

    // Send print data
    await pooledConnection.connection.send(data);

    // Release connection back to pool (don't close it)
    pooledConnection.release();

    logger.info(`Successfully printed to ${printerIp}:${printerPort}`, {
      dataLength: data.length,
    });
  } catch (error) {
    // Release connection on error (pool will handle cleanup if needed)
    if (pooledConnection) {
      pooledConnection.release();
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Failed to print to ${printerIp}:${printerPort}`, {
      error: errorMessage,
    });

    throw error;
  }
}

