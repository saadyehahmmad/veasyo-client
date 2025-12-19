/// <reference types="node" />

/**
 * Validation utilities for PC Agent
 * Ensures data consistency with backend validation
 */

/**
 * Validate IP address format
 * Matches backend validation regex
 */
export function validateIpAddress(ip: string): boolean {
  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipRegex.test(ip)) {
    return false;
  }
  
  // Validate each octet is between 0-255
  const parts = ip.split('.');
  return parts.every((part) => {
    const num = parseInt(part, 10);
    return !isNaN(num) && num >= 0 && num <= 255;
  });
}

/**
 * Validate port number
 * Port must be between 1 and 65535
 */
export function validatePort(port: number | string): boolean {
  const portNum = typeof port === 'string' ? parseInt(port, 10) : port;
  return !isNaN(portNum) && portNum >= 1 && portNum <= 65535;
}

/**
 * Validate print job request
 * Ensures request matches expected format
 */
export function validatePrintJobRequest(data: unknown): {
  valid: boolean;
  error?: string;
  request?: {
    text: string;
    format: 'base64' | 'text';
    printerIp?: string;
    printerPort?: number;
  };
} {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid request: data must be an object' };
  }

  const req = data as Record<string, unknown>;

  // Validate text field
  if (!req.text || typeof req.text !== 'string') {
    return { valid: false, error: 'Missing or invalid required field: text' };
  }

  // Validate format
  const format = req.format || 'text';
  if (format !== 'base64' && format !== 'text') {
    return { valid: false, error: `Unsupported format: ${format}. Supported formats: base64, text` };
  }

  // Validate printer IP if provided
  if (req.printerIp && typeof req.printerIp === 'string') {
    if (!validateIpAddress(req.printerIp)) {
      return { valid: false, error: 'Invalid printer IP address format' };
    }
  }

  // Validate printer port if provided
  if (req.printerPort !== undefined && req.printerPort !== null) {
    const printerPort = req.printerPort;
    if (typeof printerPort !== 'string' && typeof printerPort !== 'number') {
      return { valid: false, error: 'Printer port must be a string or number' };
    }
    if (!validatePort(printerPort)) {
      return { valid: false, error: 'Printer port must be between 1 and 65535' };
    }
  }

  return {
    valid: true,
    request: {
      text: req.text,
      format: format as 'base64' | 'text',
      printerIp: req.printerIp as string | undefined,
      printerPort: req.printerPort as number | undefined,
    },
  };
}


