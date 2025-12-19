/// <reference types="node" />
/**
 * Check PC Agent Status Script
 * Provides a simple way to check if the PC Agent is running and its current state
 */

import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || 'localhost';
const BASE_URL = `http://${HOST}:${PORT}`;

async function checkStatus() {
  try {
    console.log('🔍 Checking PC Agent status...\n');
    console.log(`📍 Connecting to: ${BASE_URL}\n`);

    // Check health
    try {
      const healthResponse = await axios.get(`${BASE_URL}/health`, { timeout: 3000 });
      console.log('✅ Health Check: PASSED');
      console.log(`   Service: ${healthResponse.data.service}`);
      console.log(`   Status: ${healthResponse.data.status}`);
      console.log(`   Version: ${healthResponse.data.version}`);
      if (healthResponse.data.formattedUptime) {
        console.log(`   Uptime: ${healthResponse.data.formattedUptime}`);
      }
      console.log('');
    } catch (error) {
      console.error('❌ Health Check: FAILED');
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNREFUSED') {
          console.error('   Error: Cannot connect to PC Agent. Is it running?');
        } else {
          console.error(`   Error: ${error.message}`);
        }
      }
      process.exit(1);
    }

    // Check detailed status
    try {
      const statusResponse = await axios.get(`${BASE_URL}/status`, { timeout: 3000 });
      const status = statusResponse.data;
      
      console.log('📊 Detailed Status:');
      console.log(`   Status: ${status.status}`);
      console.log(`   Uptime: ${status.formattedUptime}`);
      console.log(`   Version: ${status.version}`);
      console.log('');
      
      console.log('⚙️  Configuration:');
      console.log(`   Port: ${status.configuration.port}`);
      console.log(`   Default Printer: ${status.configuration.defaultPrinterIp}:${status.configuration.defaultPrinterPort}`);
      console.log(`   Max Connections: ${status.configuration.maxConnectionsPerPrinter}`);
      console.log('');
      
      console.log('📈 Statistics:');
      console.log(`   Total Print Jobs: ${status.statistics.totalPrintJobs}`);
      console.log(`   Successful: ${status.statistics.successfulPrintJobs}`);
      console.log(`   Failed: ${status.statistics.failedPrintJobs}`);
      if (status.successRate) {
        console.log(`   Success Rate: ${status.successRate}`);
      }
      console.log('');
      
      console.log('🏥 Health Status:');
      console.log(`   Overall: ${status.health.overall}`);
      console.log(`   Server: ${status.health.server}`);
      console.log(`   Printer Pool: ${status.health.printerPool}`);
      console.log('');
      
      if (status.statistics.poolStatistics.pools.length > 0) {
        console.log('🔌 Connection Pool:');
        status.statistics.poolStatistics.pools.forEach((pool: any) => {
          console.log(`   ${pool.printer}: ${pool.inUse}/${pool.connections} in use`);
        });
        console.log('');
      }
      
      if (status.lastError) {
        console.log('⚠️  Last Error:');
        console.log(`   Message: ${status.lastError.message}`);
        console.log(`   Time: ${new Date(status.lastError.timestamp).toLocaleString()}`);
        console.log('');
      }
      
    } catch (error) {
      console.warn('⚠️  Could not get detailed status (endpoint may not be available)');
    }

    console.log('✅ PC Agent is running and healthy!\n');
    
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNREFUSED') {
        console.error('\n❌ PC Agent is not running or not accessible');
        console.error(`   Make sure the PC Agent is running on ${BASE_URL}`);
        console.error('   Start it with: npm start');
      } else {
        console.error(`\n❌ Error: ${error.message}`);
      }
    } else {
      console.error('\n❌ Unexpected error:', error);
    }
    process.exit(1);
  }
}

// Run check
checkStatus();

