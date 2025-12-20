/// <reference types="node" />
/**
 * Check PC Agent Configuration Script
 * Shows current configuration and connection info
 */

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  console.error('❌ No .env file found. Please run setup wizard first: npm run cli');
  process.exit(1);
}

function checkStatus() {
  console.log('🔍 PC Agent Configuration\n');

  const backendUrl = process.env.BACKEND_URL || 'Not configured';
  const tenantId = process.env.TENANT_ID || 'Not configured';
  const printerIp = process.env.PRINTER_IP || 'Not configured';
  const printerPort = process.env.PRINTER_PORT || '9100';

  console.log('📋 Configuration:');
  console.log(`   Backend URL: ${backendUrl}`);
  console.log(`   Tenant ID: ${tenantId}`);
  console.log(`   Printer: ${printerIp}:${printerPort}`);
  console.log('');

  if (backendUrl === 'Not configured' || tenantId === 'Not configured') {
    console.error('❌ Configuration incomplete. Please run setup wizard: npm run cli');
    process.exit(1);
  }

  console.log('💡 Status Information:');
  console.log('   - PC Agent connects to backend automatically via Socket.IO');
  console.log('   - Check logs for connection status: logs/pc-agent.log');
  console.log('   - Backend tracks PC Agent connection status');
  console.log('');
  console.log('🔍 To verify connection:');
  console.log('   1. Check if PC Agent process is running');
  console.log('   2. Check logs for connection messages');
  console.log('   3. Try sending a test print from Admin Panel');
  console.log('');
}

// Run check
checkStatus();

