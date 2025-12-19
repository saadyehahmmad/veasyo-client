/// <reference types="node" />

/**
 * Common types and interfaces shared between PC Agent, Backend, and Frontend
 * This ensures compatibility across all components
 */

/**
 * Standard response format for PC Agent API endpoints
 */
export interface PcAgentResponse {
  status: 'DONE' | 'ERROR';
  message: string;
  printerIp?: string;
  printerPort?: number;
  data?: unknown;
}

/**
 * Print job request format
 * Matches what backend sends to PC Agent
 */
export interface PrintJobRequest {
  text: string; // Base64-encoded ESC/POS commands or plain text
  format: 'base64' | 'text';
  printerIp?: string; // Optional: override default printer IP
  printerPort?: number; // Optional: override default printer port
}

/**
 * Health check response format
 * Used by backend to verify PC Agent connectivity
 */
export interface HealthCheckResponse {
  status: 'ok';
  timestamp: string;
  service: string;
  version: string;
}

/**
 * WebSocket message types
 */
export interface WebSocketPrintMessage {
  type: 'print';
  data: PrintJobRequest;
}

export interface WebSocketResponse {
  type: 'connected' | 'success' | 'error';
  message: string;
  printerIp?: string;
  printerPort?: number;
  timestamp?: string;
}

/**
 * Error codes for consistent error handling
 */
export enum ErrorCode {
  // Connection errors
  CONNECTION_REFUSED = 'ECONNREFUSED',
  CONNECTION_TIMEOUT = 'ETIMEDOUT',
  DNS_ERROR = 'ENOTFOUND',
  
  // Validation errors
  INVALID_IP = 'INVALID_IP',
  INVALID_PORT = 'INVALID_PORT',
  INVALID_DATA = 'INVALID_DATA',
  MISSING_FIELD = 'MISSING_FIELD',
  
  // Printer errors
  PRINTER_CONNECTION_FAILED = 'PRINTER_CONNECTION_FAILED',
  PRINTER_TIMEOUT = 'PRINTER_TIMEOUT',
  
  // General errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Standard error response format
 */
export interface ErrorResponse {
  error: string;
  code?: ErrorCode;
  message: string;
  details?: unknown;
}


