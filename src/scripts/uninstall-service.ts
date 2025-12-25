/// <reference types="node" />
// node-windows doesn't have official TypeScript types, so we use any for now
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Service } = require('node-windows');
import path from 'path';
import fs from 'fs';

/**
 * Uninstall PC Agent Windows service
 * This script should be run with administrator privileges
 */

// Check if running as administrator
function checkAdmin(): boolean {
  try {
    // On Windows, check if we have admin rights by trying to write to a system directory
    const testPath = path.join(process.env.WINDIR || 'C:\\Windows', 'Temp', `admin-test-${Date.now()}.tmp`);
    fs.writeFileSync(testPath, 'test');
    fs.unlinkSync(testPath);
    return true;
  } catch {
    // Alternative check: try accessing System32 config
    try {
      fs.accessSync('C:\\Windows\\System32\\config\\system', fs.constants.R_OK);
      return true;
    } catch {
      return false;
    }
  }
}

function main() {
  console.log('🔧 PC Agent - Windows Service Uninstallation\n');

  // Check admin privileges
  if (!checkAdmin()) {
    console.error('❌ Administrator privileges required!');
    console.error('   Please run this script as Administrator:');
    console.error('   1. Right-click PowerShell or Command Prompt');
    console.error('   2. Select "Run as Administrator"');
    console.error('   3. Navigate to PC Agent folder');
    console.error('   4. Run: npm run uninstall-service');
    process.exit(1);
  }

  const serviceName = process.env.SERVICE_NAME || 'WaiterPCAgent';
  const scriptPath = path.join(__dirname, '../index.js');

  console.log('📋 Service Information:');
  console.log(`   Name: ${serviceName}`);
  console.log(`   Script: ${scriptPath}`);
  console.log('');

  // Service type is from node-windows which doesn't have TypeScript definitions
  const service = new (Service as any)({
    name: serviceName,
    script: scriptPath,
  });

  // Uninstall service
  service.on('uninstall', () => {
    console.log('✅ Service uninstalled successfully');
    console.log('');
    console.log('The PC Agent Windows service has been removed.');
    console.log('You can still run the agent manually with: npm start');
    console.log('Or reinstall the service with: npm run install-service');
    process.exit(0);
  });

  service.on('error', (error: Error) => {
    console.error('❌ Service uninstallation error:');
    console.error(`   ${error.message}`);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    console.error('');
    console.error('Common issues:');
    console.error('   - Service is not installed');
    console.error('   - Service name mismatch');
    console.error('   - Insufficient permissions (run PowerShell as Administrator)');
    console.error('   - Service is currently running (stop it first in services.msc)');
    console.error('');
    console.error('You can check if the service exists in Windows Services:');
    console.error('   1. Press Win+R');
    console.error('   2. Type: services.msc');
    console.error('   3. Look for "WaiterPCAgent"');
    process.exit(1);
  });

  // Uninstall the service
  console.log('⏳ Uninstalling Windows service...');
  console.log('   This may take a few moments...\n');
  service.uninstall();
}

main();

