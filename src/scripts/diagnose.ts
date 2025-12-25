#!/usr/bin/env node
/// <reference types="node" />
/**
 * PC Agent Connection Diagnostics
 * Helps diagnose connection issues with the backend
 */

import dotenv from 'dotenv';
import { createConnection } from 'net';
import http from 'http';
import https from 'https';

// Load .env
dotenv.config();

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const TENANT_ID = process.env.TENANT_ID || '';
const PRINTER_IP = process.env.PRINTER_IP || '';
const PRINTER_PORT = parseInt(process.env.PRINTER_PORT || '9100', 10);

async function runDiagnostics() {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║       🔍 PC Agent Connection Diagnostics               ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');``

  // Check .env file
  console.log('📋 Configuration Check:');
  console.log('─'.repeat(60));
  if (!TENANT_ID) {
    console.log('❌ TENANT_ID is not configured');
  } else {
    console.log(`✅ TENANT_ID: ${TENANT_ID}`);
  }

  console.log(`📡 BACKEND_URL: ${BACKEND_URL}`);
  if (BACKEND_URL === 'http://localhost:3000') {
    console.log('⚠️  Using localhost - ensure backend is running locally!');
  }

  console.log(`🖨️  PRINTER_IP: ${PRINTER_IP}:${PRINTER_PORT}`);
  if (!PRINTER_IP || PRINTER_IP === '192.168.1.100') {
    console.log('⚠️  Printer IP not configured or using default');
  }
  console.log('');

  // Test backend connectivity
  console.log('🔌 Backend Connectivity Test:');
  console.log('─'.repeat(60));

  // Parse backend URL
  let backendHost: string;
  let backendPort: number;
  let isHttps = false;

  try {
    const url = new URL(BACKEND_URL);
    backendHost = url.hostname;
    backendPort = parseInt(url.port) || (url.protocol === 'https:' ? 443 : 80);
    isHttps = url.protocol === 'https:';
    
    console.log(`Testing connection to: ${backendHost}:${backendPort}`);
    
    // Test TCP connection
    await testTcpConnection(backendHost, backendPort);
    
    // Test HTTP/HTTPS endpoint
    await testHttpEndpoint(BACKEND_URL);
    
  } catch (error: any) {
    console.log(`❌ Invalid BACKEND_URL format: ${error.message}`);
  }

  console.log('');

  // Test printer connectivity
  if (PRINTER_IP && PRINTER_IP !== '192.168.1.100') {
    console.log('🖨️  Printer Connectivity Test:');
    console.log('─'.repeat(60));
    console.log(`Testing connection to printer: ${PRINTER_IP}:${PRINTER_PORT}`);
    await testPrinterConnection(PRINTER_IP, PRINTER_PORT);
    console.log('');
  }

  // Summary
  console.log('📝 Summary & Recommendations:');
  console.log('─'.repeat(60));

  if (!TENANT_ID) {
    console.log('❌ Configure TENANT_ID in .env file');
    console.log('   Run: npm run cli (option 1)');
  }

  if (BACKEND_URL === 'http://localhost:3000') {
    console.log('⚠️  If backend is on remote server, update BACKEND_URL');
    console.log('   Example: BACKEND_URL=http://194.195.87.213:3000');
  }

  console.log('\n💡 Next Steps:');
  console.log('   1. Fix any ❌ errors shown above');
  console.log('   2. Update .env file with correct values');
  console.log('   3. Run: npm run cli (option 1) for guided setup');
  console.log('   4. Start PC Agent: npm start\n');
}

// Run diagnostics
runDiagnostics().catch(console.error);

// Helper Functions

async function testTcpConnection(host: string, port: number): Promise<void> {
  return new Promise((resolve) => {
    const socket = createConnection({ host, port, timeout: 5000 });
    
    socket.on('connect', () => {
      console.log(`✅ TCP connection successful to ${host}:${port}`);
      socket.destroy();
      resolve();
    });
    
    socket.on('error', (error: any) => {
      console.log(`❌ TCP connection failed: ${error.code || error.message}`);
      if (error.code === 'ECONNREFUSED') {
        console.log('   → Backend server is not running or not accessible');
        console.log('   → Check firewall settings');
        console.log('   → Verify backend is listening on this port');
      } else if (error.code === 'ETIMEDOUT') {
        console.log('   → Connection timeout - host may be unreachable');
        console.log('   → Check network connectivity');
      } else if (error.code === 'ENOTFOUND') {
        console.log('   → Host not found - check hostname/IP address');
      }
      resolve();
    });
    
    socket.on('timeout', () => {
      console.log('❌ TCP connection timeout');
      socket.destroy();
      resolve();
    });
  });
}

async function testHttpEndpoint(url: string): Promise<void> {
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;
    
    const req = client.get(`${url}/health`, { timeout: 5000 }, (res) => {
      console.log(`✅ HTTP endpoint accessible (status: ${res.statusCode})`);
      resolve();
    });
    
    req.on('error', (error: any) => {
      console.log(`❌ HTTP request failed: ${error.code || error.message}`);
      resolve();
    });
    
    req.on('timeout', () => {
      console.log('❌ HTTP request timeout');
      req.destroy();
      resolve();
    });
  });
}

async function testPrinterConnection(ip: string, port: number): Promise<void> {
  return new Promise((resolve) => {
    const socket = createConnection({ host: ip, port, timeout: 5000 });
    
    socket.on('connect', () => {
      console.log(`✅ Printer connection successful`);
      socket.destroy();
      resolve();
    });
    
    socket.on('error', (error: any) => {
      console.log(`❌ Printer connection failed: ${error.code || error.message}`);
      if (error.code === 'ECONNREFUSED') {
        console.log('   → Printer is not responding on this IP:Port');
        console.log('   → Check printer IP address from printer settings');
        console.log('   → Verify printer is powered on');
      } else if (error.code === 'ETIMEDOUT') {
        console.log('   → Connection timeout');
        console.log('   → Ensure PC and printer are on same network');
      } else if (error.code === 'EHOSTUNREACH') {
        console.log('   → Host unreachable');
        console.log('   → Check network connectivity');
      }
      resolve();
    });
    
    socket.on('timeout', () => {
      console.log('❌ Printer connection timeout');
      socket.destroy();
      resolve();
    });
  });
}

