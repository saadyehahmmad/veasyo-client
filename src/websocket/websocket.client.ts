/// <reference types="node" />
import { io, Socket } from 'socket.io-client';
import { logger } from '../utils/logger';
import { printToPrinter } from '../utils/printer';
import { printerPool } from '../utils/printer-pool';
import { stateService } from '../services/state.service';
import { DEFAULT_CONFIG } from '../constants';

/**
 * PC Agent Socket.IO Client
 * Connects to backend server via Socket.IO (reverse connection)
 * No port forwarding needed - PC Agent initiates connection
 */
export class PcAgentClient {
  private socket: Socket | null = null;
  private backendUrl: string;
  private tenantId: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000; // Start with 1 second
  private reconnectTimer: NodeJS.Timeout | null = null;

  constructor(backendUrl: string, tenantId: string) {
    this.backendUrl = backendUrl;
    this.tenantId = tenantId;
  }

  /**
   * Parse backend URL to extract base URL and path
   */
  private parseBackendUrl(): { baseUrl: string; path: string } {
    try {
      const url = new URL(this.backendUrl);
      const path = url.pathname.endsWith('/') ? url.pathname.slice(0, -1) : url.pathname;
      const baseUrl = `${url.protocol}//${url.host}`;
      return {
        baseUrl,
        path: path || '',
      };
    } catch (error) {
      // Fallback for invalid URLs
      return {
        baseUrl: this.backendUrl,
        path: '',
      };
    }
  }

  /**
   * Connect to backend Socket.IO server
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const { baseUrl, path } = this.parseBackendUrl();
      const socketPath = path ? `${path}/socket.io` : '/socket.io';
      
      logger.info(`Connecting to backend at ${baseUrl}${path}/pc-agent`, {
        tenantId: this.tenantId,
        socketPath,
      });

      // Connect to PC Agent namespace
      this.socket = io(`${baseUrl}/pc-agent`, {
        path: socketPath,
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: this.reconnectDelay,
        reconnectionDelayMax: 30000, // Max 30 seconds
        reconnectionAttempts: this.maxReconnectAttempts,
        timeout: 20000,
        auth: {
          tenantId: this.tenantId,
        },
        query: {
          tenant: this.tenantId,
        },
      });

      // Handle connection
      this.socket.on('connect', () => {
        logger.info('Connected to backend Socket.IO server', {
          socketId: this.socket?.id,
          tenantId: this.tenantId,
        });

        // Register PC Agent with backend
        this.socket?.emit('pc-agent:register', {
          tenantId: this.tenantId,
        });

        this.reconnectAttempts = 0;
        stateService.setStatus('running');
        resolve();
      });

      // Handle registration confirmation
      this.socket.on('pc-agent:connected', (data: { message: string }) => {
        logger.info('PC Agent registered successfully', {
          message: data.message,
          tenantId: this.tenantId,
        });
      });

      // Handle print job requests from backend
      this.socket.on('pc-agent:print-job', async (data: {
        jobId: string;
        text: string;
        format: 'base64';
        printerIp?: string;
        printerPort?: number;
      }) => {
        await this.handlePrintJob(data);
      });

      // Handle errors
      this.socket.on('pc-agent:error', (data: { message: string }) => {
        logger.error('PC Agent error from backend', {
          message: data.message,
          tenantId: this.tenantId,
        });
      });

      // Handle disconnection
      this.socket.on('disconnect', (reason: string) => {
        logger.warn('Disconnected from backend', {
          reason,
          tenantId: this.tenantId,
        });
        stateService.setStatus('stopped');

        // Attempt to reconnect if not manually disconnected
        if (reason !== 'io client disconnect') {
          this.scheduleReconnect();
        }
      });

      // Handle connection errors
      this.socket.on('connect_error', (error: Error) => {
        logger.error('Failed to connect to backend', {
          error: error.message,
          tenantId: this.tenantId,
        });
        reject(error);
      });

      // Handle reconnection attempts
      this.socket.on('reconnect_attempt', (attemptNumber: number) => {
        logger.info(`Reconnection attempt ${attemptNumber}`, {
          tenantId: this.tenantId,
        });
        this.reconnectAttempts = attemptNumber;
      });

      // Handle successful reconnection
      this.socket.on('reconnect', (attemptNumber: number) => {
        logger.info(`Reconnected to backend after ${attemptNumber} attempts`, {
          tenantId: this.tenantId,
        });
        this.reconnectAttempts = 0;
        stateService.setStatus('running');

        // Re-register after reconnection
        this.socket?.emit('pc-agent:register', {
          tenantId: this.tenantId,
        });
      });
    });
  }

  /**
   * Handle print job from backend
   * Uses default printer configured in PC Agent's .env file
   */
  private async handlePrintJob(data: {
    jobId: string;
    text: string;
    format: 'base64';
  }): Promise<void> {
    const { jobId, text, format } = data;

    logger.info('Received print job from backend', {
      jobId,
      format,
    });

    try {
      // Decode base64 data
      let printData: Buffer;
      if (format === 'base64') {
        printData = Buffer.from(text, 'base64');
      } else {
        throw new Error(`Unsupported format: ${format}`);
      }

      // Use default printer from .env configuration
      const targetPrinterIp = process.env.PRINTER_IP || DEFAULT_CONFIG.PRINTER_IP;
      const targetPrinterPort = parseInt(process.env.PRINTER_PORT || String(DEFAULT_CONFIG.PRINTER_PORT), 10);

      // Record print job attempt
      stateService.recordPrintJob(true);

      // Print using connection pool
      await printToPrinter(targetPrinterIp, targetPrinterPort, printData);

      // Record successful print
      stateService.recordPrintJob(true); 

      // Send success response
      this.socket?.emit('pc-agent:print-result', {
        jobId,
        success: true,
        message: 'Print job sent successfully',
      });

      logger.info('Print job completed successfully', {
        jobId,
        printerIp: targetPrinterIp,
        printerPort: targetPrinterPort,
      });
    } catch (error) {
      // Record failed print
      stateService.recordPrintJob(false);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Print job failed', {
        jobId,
        error: errorMessage,
      });

      // Send error response
      this.socket?.emit('pc-agent:print-result', {
        jobId,
        success: false,
        message: `Print job failed: ${errorMessage}`,
      });
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('Max reconnection attempts reached', {
        tenantId: this.tenantId,
      });
      stateService.setStatus('error');
      return;
    }

    this.reconnectTimer = setTimeout(() => {
      logger.info('Attempting to reconnect to backend', {
        tenantId: this.tenantId,
        attempt: this.reconnectAttempts + 1,
      });
      this.connect().catch((error) => {
        logger.error('Reconnection failed', {
          error: error.message,
          tenantId: this.tenantId,
        });
      });
    }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts));
  }

  /**
   * Disconnect from backend
   */
  disconnect(): void {
    if (this.socket) {
      logger.info('Disconnecting from backend', {
        tenantId: this.tenantId,
      });
      this.socket.disconnect();
      this.socket = null;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    stateService.setStatus('stopped');
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Send health update to backend
   */
  sendHealthUpdate(): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('pc-agent:health', {
        status: stateService.getState().status,
        timestamp: new Date().toISOString(),
      });
    }
  }
}

