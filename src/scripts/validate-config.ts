/// <reference types="node" />
/**
 * Configuration Validation Script
 * Validates PC Agent configuration before starting
 */

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { logger } from '../utils/logger';

// Load environment variables
const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  console.error('❌ .env file not found!');
  console.error('   Please create a .env file based on .env.example');
  process.exit(1);
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  config: {
    backendUrl: string;
    tenantId: string;
    printerIp: string;
    printerPort: number;
    maxConnections: number;
    connectionTimeout: number;
    idleTimeout: number;
    logLevel: string;
  };
}

function validateConfig(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let valid = true;

  // Validate BACKEND_URL (required)
  const backendUrl = process.env.BACKEND_URL || '';
  if (!backendUrl) {
    errors.push('BACKEND_URL is required but not set in .env file');
    valid = false;
  } else {
    if (!backendUrl.match(/^https?:\/\/.+/)) {
      errors.push(`Invalid BACKEND_URL format: ${backendUrl}. Must be a valid URL (http:// or https://)`);
      valid = false;
    }
  }

  // Validate TENANT_ID (required)
  const tenantId = process.env.TENANT_ID || '';
  if (!tenantId) {
    errors.push('TENANT_ID is required but not set in .env file');
    valid = false;
  }

  // Validate PRINTER_IP (optional, but warn if not set)
  const printerIp = process.env.PRINTER_IP || '';
  if (!printerIp) {
    warnings.push('PRINTER_IP is not set. Using default: 192.168.1.100');
  } else {
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(printerIp)) {
      errors.push(`Invalid PRINTER_IP format: ${printerIp}. Must be a valid IPv4 address.`);
      valid = false;
    } else {
      // Validate IP octets
      const octets = printerIp.split('.').map(Number);
      if (octets.some(octet => octet < 0 || octet > 255)) {
        errors.push(`Invalid PRINTER_IP: ${printerIp}. Each octet must be 0-255.`);
        valid = false;
      }
    }
  }

  // Validate PRINTER_PORT
  const printerPort = parseInt(process.env.PRINTER_PORT || '9100', 10);
  if (isNaN(printerPort) || printerPort < 1 || printerPort > 65535) {
    errors.push(`Invalid PRINTER_PORT: ${process.env.PRINTER_PORT}. Must be between 1 and 65535.`);
    valid = false;
  }

  // Validate MAX_PRINTER_CONNECTIONS (optional)
  const maxConnections = parseInt(process.env.MAX_PRINTER_CONNECTIONS || '5', 10);
  if (isNaN(maxConnections) || maxConnections < 1 || maxConnections > 100) {
    warnings.push(`MAX_PRINTER_CONNECTIONS (${process.env.MAX_PRINTER_CONNECTIONS}) is invalid. Using default: 5`);
  }

  // Validate PRINTER_CONNECTION_TIMEOUT (optional)
  const connectionTimeout = parseInt(process.env.PRINTER_CONNECTION_TIMEOUT || '5000', 10);
  if (isNaN(connectionTimeout) || connectionTimeout < 1000 || connectionTimeout > 60000) {
    warnings.push(`PRINTER_CONNECTION_TIMEOUT (${process.env.PRINTER_CONNECTION_TIMEOUT}) is invalid. Using default: 5000ms`);
  }

  // Validate PRINTER_IDLE_TIMEOUT (optional)
  const idleTimeout = parseInt(process.env.PRINTER_IDLE_TIMEOUT || '30000', 10);
  if (isNaN(idleTimeout) || idleTimeout < 5000 || idleTimeout > 300000) {
    warnings.push(`PRINTER_IDLE_TIMEOUT (${process.env.PRINTER_IDLE_TIMEOUT}) is invalid. Using default: 30000ms`);
  }

  // Validate LOG_LEVEL (optional)
  const logLevel = process.env.LOG_LEVEL || 'info';
  const validLogLevels = ['debug', 'info', 'warn', 'error'];
  if (!validLogLevels.includes(logLevel.toLowerCase())) {
    warnings.push(`LOG_LEVEL (${logLevel}) is invalid. Using default: info`);
  }

  return {
    valid,
    errors,
    warnings,
    config: {
      backendUrl: backendUrl || 'NOT SET',
      tenantId: tenantId || 'NOT SET',
      printerIp: printerIp || 'NOT SET',
      printerPort,
      maxConnections: isNaN(maxConnections) ? 5 : maxConnections,
      connectionTimeout: isNaN(connectionTimeout) ? 5000 : connectionTimeout,
      idleTimeout: isNaN(idleTimeout) ? 30000 : idleTimeout,
      logLevel: validLogLevels.includes(logLevel.toLowerCase()) ? logLevel.toLowerCase() : 'info',
    },
  };
}

function main() {
  console.log('🔍 Validating PC Agent configuration...\n');

  const result = validateConfig();

  if (result.warnings.length > 0) {
    console.log('⚠️  Warnings:');
    result.warnings.forEach(warning => {
      console.log(`   - ${warning}`);
    });
    console.log('');
  }

  if (result.errors.length > 0) {
    console.error('❌ Configuration Errors:');
    result.errors.forEach(error => {
      console.error(`   - ${error}`);
    });
    console.error('');
    console.error('Please fix the errors in your .env file and try again.');
    process.exit(1);
  }

  console.log('✅ Configuration is valid!\n');
  console.log('📋 Configuration Summary:');
  console.log(`   Backend URL: ${result.config.backendUrl}`);
  console.log(`   Tenant ID: ${result.config.tenantId}`);
  console.log(`   Printer IP: ${result.config.printerIp}`);
  console.log(`   Printer Port: ${result.config.printerPort}`);
  console.log(`   Max Connections: ${result.config.maxConnections}`);
  console.log(`   Connection Timeout: ${result.config.connectionTimeout}ms`);
  console.log(`   Idle Timeout: ${result.config.idleTimeout}ms`);
  console.log(`   Log Level: ${result.config.logLevel}`);
  console.log('');

  console.log('✅ Configuration validation passed!');
  console.log('   You can now start the PC Agent with: npm start');
}

main();

