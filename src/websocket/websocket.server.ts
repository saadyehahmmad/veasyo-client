/// <reference types="node" />
import { Server } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { printToPrinter } from '../utils/printer';
import { logger } from '../utils/logger';
import { validatePrintJobRequest } from '../utils/validation';
import { DEFAULT_CONFIG } from '../constants';
import type { WebSocketPrintMessage, WebSocketResponse } from '../types/common';

let wss: WebSocketServer | null = null;

/**
 * Setup WebSocket server for real-time communication
 * Allows cloud app to send print jobs via WebSocket
 */
export function setupWebSocket(server: Server): void {
  wss = new WebSocketServer({ server });

  wss.on('connection', (ws: WebSocket, req: { socket?: { remoteAddress?: string } }) => {
    // Get client IP address from WebSocket connection
    // Try to get from request first, then fallback to socket
    const clientIp = req?.socket?.remoteAddress || 
                     (ws as any)._socket?.remoteAddress || 
                     'unknown';
    logger.info('WebSocket client connected', { clientIp });

    // Handle incoming messages
    ws.on('message', async (message: Buffer) => {
      try {
        // Parse JSON message
        let data: WebSocketPrintMessage;
        try {
          data = JSON.parse(message.toString()) as WebSocketPrintMessage;
        } catch (parseError) {
          const errorResponse: WebSocketResponse = {
            type: 'error',
            message: 'Invalid JSON message format',
          };
          if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify(errorResponse));
          }
          return;
        }

        // Validate message structure
        if (data.type !== 'print') {
          const errorResponse: WebSocketResponse = {
            type: 'error',
            message: `Unknown message type: ${data.type}. Expected 'print'`,
          };
          if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify(errorResponse));
          }
          return;
        }

        if (!data.data) {
          const errorResponse: WebSocketResponse = {
            type: 'error',
            message: 'Missing data field',
          };
          if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify(errorResponse));
          }
          return;
        }

        // Validate print job request using shared validation utility
        const validation = validatePrintJobRequest(data.data);
        if (!validation.valid || !validation.request) {
          const errorResponse: WebSocketResponse = {
            type: 'error',
            message: validation.error || 'Invalid request data',
          };
          if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify(errorResponse));
          }
          return;
        }

        const { text, format, printerIp, printerPort } = validation.request;

        // Get printer configuration
        // Use provided values or fall back to environment defaults
        const targetPrinterIp: string = printerIp || process.env.PRINTER_IP || DEFAULT_CONFIG.PRINTER_IP;
        const targetPrinterPort: number = printerPort || parseInt(process.env.PRINTER_PORT || String(DEFAULT_CONFIG.PRINTER_PORT), 10);

        // Decode base64 data if format is base64
        let printData: Buffer;
        if (format === 'base64') {
          try {
            printData = Buffer.from(text, 'base64');
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Invalid base64 data';
            logger.error('Failed to decode base64 data', { error: errorMsg });
            const errorResponse: WebSocketResponse = {
              type: 'error',
              message: `Invalid base64 data: ${errorMsg}`,
            };
            if (ws.readyState === ws.OPEN) {
              ws.send(JSON.stringify(errorResponse));
            }
            return;
          }
        } else {
          // Format is 'text' (validated by validation utility)
          printData = Buffer.from(text, 'utf-8');
        }

        logger.info('Received WebSocket print job', {
          printerIp: targetPrinterIp,
          printerPort: targetPrinterPort,
          dataLength: printData.length,
        });

        // Validate print data is not empty
        if (printData.length === 0) {
          const errorResponse: WebSocketResponse = {
            type: 'error',
            message: 'Print data is empty',
          };
          if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify(errorResponse));
          }
          return;
        }

        logger.info('Received WebSocket print job', {
          printerIp: targetPrinterIp,
          printerPort: targetPrinterPort,
          dataLength: printData.length,
          format: format,
        });

        // Send to printer
        await printToPrinter(targetPrinterIp, targetPrinterPort, printData);

        // Send success response in standard format
        const successResponse: WebSocketResponse = {
          type: 'success',
          message: 'Print job sent successfully',
          printerIp: targetPrinterIp,
          printerPort: targetPrinterPort,
        };
        if (ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify(successResponse));
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('WebSocket print job failed', { 
          error: errorMessage,
          stack: error instanceof Error ? error.stack : undefined,
        });

        // Check if WebSocket is still open before sending error
        if (ws.readyState === ws.OPEN) {
          ws.send(
            JSON.stringify({
              type: 'error',
              message: `Failed to print: ${errorMessage}`,
            }),
          );
        } else {
          logger.warn('WebSocket closed before error could be sent', { clientIp });
        }
      }
    });

    // Handle client disconnect
    ws.on('close', () => {
      logger.info('WebSocket client disconnected', { clientIp });
    });

    // Handle errors
    ws.on('error', (error: Error) => {
      logger.error('WebSocket error', { error: error.message, clientIp });
    });

    // Send welcome message in standard format
    // Check if WebSocket is open before sending
    if (ws.readyState === ws.OPEN) {
      const welcomeResponse: WebSocketResponse = {
        type: 'connected',
        message: 'Connected to Waiter PC Agent',
        timestamp: new Date().toISOString(),
      };
      ws.send(JSON.stringify(welcomeResponse));
    }
  });

  wss.on('error', (error: Error) => {
    logger.error('WebSocket server error', { error: error.message });
  });

  logger.info('WebSocket server initialized');
}

/**
 * Get WebSocket server instance
 */
export function getWebSocketServer(): WebSocketServer | null {
  return wss;
}

