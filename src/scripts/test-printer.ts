/// <reference types="node" />
/**
 * Test Printer Connection Script
 * Tests TCP connection to configured printer
 */

import dotenv from 'dotenv';
import { Socket } from 'net';
import path from 'path';
import fs from 'fs';

// Load environment variables
const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  console.error('❌ .env file not found!');
  console.error('   Please create a .env file and configure PRINTER_IP and PRINTER_PORT');
  process.exit(1);
}

const PRINTER_IP = process.env.PRINTER_IP || '';
const PRINTER_PORT = parseInt(process.env.PRINTER_PORT || '9100', 10);
const CONNECTION_TIMEOUT = 5000; // 5 seconds

async function testPrinterConnection(): Promise<boolean> {
  return new Promise((resolve) => {
    if (!PRINTER_IP) {
      console.error('❌ PRINTER_IP is not configured in .env file');
      resolve(false);
      return;
    }

    console.log(`🔍 Testing connection to printer at ${PRINTER_IP}:${PRINTER_PORT}...\n`);

    const socket = new Socket();
    let resolved = false;

    // Set connection timeout
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        socket.destroy();
        console.error('❌ Connection timeout');
        console.error(`   Could not connect to ${PRINTER_IP}:${PRINTER_PORT} within ${CONNECTION_TIMEOUT}ms`);
        console.error('   Please check:');
        console.error('   - Printer IP address is correct');
        console.error('   - Printer is powered on and connected to network');
        console.error('   - PC and printer are on the same network');
        console.error('   - Firewall is not blocking the connection');
        resolve(false);
      }
    }, CONNECTION_TIMEOUT);

    // Handle successful connection
    socket.once('connect', () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        console.log('✅ Successfully connected to printer!');
        console.log(`   Printer: ${PRINTER_IP}:${PRINTER_PORT}`);
        console.log('');
        socket.destroy();
        resolve(true);
      }
    });

    // Handle connection errors
    socket.once('error', (error: NodeJS.ErrnoException) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        console.error('❌ Connection failed');
        console.error(`   Error: ${error.message}`);
        console.error('');
        
        if (error.code === 'ECONNREFUSED') {
          console.error('   The printer refused the connection.');
          console.error('   Possible causes:');
          console.error('   - Printer is not accepting connections on port ' + PRINTER_PORT);
          console.error('   - Printer may be in sleep mode');
          console.error('   - Port may be incorrect (try 9100 for ESC/POS printers)');
        } else if (error.code === 'EHOSTUNREACH' || error.code === 'ENETUNREACH') {
          console.error('   Cannot reach the printer on the network.');
          console.error('   Possible causes:');
          console.error('   - Printer IP address is incorrect');
          console.error('   - PC and printer are on different networks');
          console.error('   - Network routing issue');
        } else if (error.code === 'ETIMEDOUT') {
          console.error('   Connection timed out.');
          console.error('   Possible causes:');
          console.error('   - Printer is offline or not responding');
          console.error('   - Network connectivity issues');
          console.error('   - Firewall blocking the connection');
        } else {
          console.error('   Please check:');
          console.error('   - Printer IP address: ' + PRINTER_IP);
          console.error('   - Printer port: ' + PRINTER_PORT);
          console.error('   - Network connectivity');
        }
        console.error('');
        resolve(false);
      }
    });

    // Connect to printer
    try {
      socket.connect(PRINTER_PORT, PRINTER_IP);
    } catch (error) {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        console.error('❌ Failed to initiate connection');
        console.error(`   Error: ${error instanceof Error ? error.message : String(error)}`);
        resolve(false);
      }
    }
  });
}

async function main() {
  console.log('🖨️  PC Agent - Printer Connection Test\n');
  console.log('This script tests the TCP connection to your configured printer.\n');

  if (!PRINTER_IP) {
    console.error('❌ PRINTER_IP is not set in .env file');
    console.error('   Please configure PRINTER_IP in your .env file');
    process.exit(1);
  }

  const success = await testPrinterConnection();

  if (success) {
    console.log('✅ Printer connection test passed!');
    console.log('   Your printer is accessible and ready to receive print jobs.');
    console.log('');
    console.log('Next steps:');
    console.log('   1. Start the PC Agent: npm start');
    console.log('   2. Check configuration: npm run cli (option 4)');
    console.log('   3. Configure in Waiter Admin Panel');
    process.exit(0);
  } else {
    console.error('❌ Printer connection test failed!');
    console.error('   Please fix the issues above before starting the PC Agent.');
    process.exit(1);
  }
}

main();

