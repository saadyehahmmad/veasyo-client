/// <reference types="node" />
// node-windows doesn't have official TypeScript types, so we use any for now
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Service } = require('node-windows');
import path from 'path';
import fs from 'fs';

/**
 * Install PC Agent as Windows service
 * This script should be run with administrator privileges
 */

// Check if running as administrator
function checkAdmin(): boolean {
  try {
    // Try to access a system directory that requires admin rights
    fs.accessSync('C:\\Windows\\System32\\config\\system', fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

// Validate installation
function validateInstallation(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const scriptPath = path.join(__dirname, '../index.js');

  // Check if built files exist
  if (!fs.existsSync(scriptPath)) {
    errors.push(`Built file not found: ${scriptPath}`);
    errors.push('Please run "npm run build" first');
  }

  // Check if .env exists
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    errors.push('.env file not found');
    errors.push('Please create a .env file with your configuration');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Main installation
function main() {
  console.log('🔧 PC Agent - Windows Service Installation\n');

  // Check admin privileges
  if (!checkAdmin()) {
    console.error('❌ Administrator privileges required!');
    console.error('   Please run this script as Administrator:');
    console.error('   1. Right-click PowerShell or Command Prompt');
    console.error('   2. Select "Run as Administrator"');
    console.error('   3. Navigate to PC Agent folder');
    console.error('   4. Run: npm run install-service');
    process.exit(1);
  }

  // Validate installation
  const validation = validateInstallation();
  if (!validation.valid) {
    console.error('❌ Installation validation failed:\n');
    validation.errors.forEach(error => {
      console.error(`   - ${error}`);
    });
    console.error('');
    process.exit(1);
  }

  const serviceName = process.env.SERVICE_NAME || 'WaiterPCAgent';
  const serviceDescription = process.env.SERVICE_DESCRIPTION || 'Bridge service connecting Waiter cloud app to local printers';
  const scriptPath = path.join(__dirname, '../index.js');

  console.log('📋 Service Configuration:');
  console.log(`   Name: ${serviceName}`);
  console.log(`   Description: ${serviceDescription}`);
  console.log(`   Script: ${scriptPath}`);
  console.log('');

  // Service type is from node-windows which doesn't have TypeScript definitions
  const service = new (Service as any)({
    name: serviceName,
    description: serviceDescription,
    script: scriptPath,
    nodeOptions: [],
  });

  // Install service
  service.on('install', () => {
    console.log('✅ Service installed successfully');
    console.log('🚀 Starting service...');
    service.start();
  });

  service.on('start', () => {
    console.log('✅ Service started successfully');
    console.log('');
    console.log('🎉 PC Agent is now running as a Windows service!');
    console.log('');
    console.log('Next steps:');
    console.log('   1. Check service status: npm run check-status');
    console.log('   2. View service in Windows Services (services.msc)');
    console.log('   3. Configure in Waiter Admin Panel');
    console.log('');
    console.log('Service Management:');
    console.log('   - Stop: Open Services, find "WaiterPCAgent", right-click > Stop');
    console.log('   - Start: Open Services, find "WaiterPCAgent", right-click > Start');
    console.log('   - Uninstall: npm run uninstall-service');
    process.exit(0);
  });

  service.on('error', (error: Error) => {
    console.error('❌ Service installation error:');
    console.error(`   ${error.message}`);
    console.error('');
    console.error('Common issues:');
    console.error('   - Service name already exists (try uninstalling first)');
    console.error('   - Insufficient permissions (run as Administrator)');
    console.error('   - Node.js not in PATH');
    console.error('');
    process.exit(1);
  });

  // Install the service
  console.log('⏳ Installing Windows service...');
  console.log('   This may take a few moments...\n');
  service.install();
}

main();

