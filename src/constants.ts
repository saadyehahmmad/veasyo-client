/// <reference types="node" />

/**
 * Constants shared across PC Agent
 * These values should match backend expectations
 */

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG = {
  PRINTER_IP: '192.168.1.100',
  PRINTER_PORT: 9100,
  CONNECTION_TIMEOUT: 5000, // 5 seconds
} as const;

/**
 * Response status values
 * Must match what backend expects
 */
export const RESPONSE_STATUS = {
  DONE: 'DONE',
  ERROR: 'ERROR',
  OK: 'ok',
} as const;

/**
 * Supported print formats
 */
export const PRINT_FORMATS = {
  BASE64: 'base64',
  TEXT: 'text',
} as const;

/**
 * Error messages
 * Should be consistent with backend error messages
 */
export const ERROR_MESSAGES = {
  INVALID_REQUEST: 'Invalid request',
  MISSING_TEXT: 'Missing required field: text',
  INVALID_IP: 'Invalid IP address format',
  INVALID_PORT: 'Port must be between 1 and 65535',
  INVALID_FORMAT: 'Unsupported format',
  EMPTY_DATA: 'Print data is empty',
  PRINTER_CONNECTION_FAILED: 'Failed to connect to printer',
  PRINTER_TIMEOUT: 'Printer connection timeout',
} as const;


