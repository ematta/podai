// Memory profiling script for Node.js backend
import { startMemoryProfiling, takeHeapSnapshot } from '../utils/profiler.js';
import process from 'process';
import { createLogger } from '../config/logger.js';

const logger = createLogger('memory-profiler');

// Duration for profiling in ms (default: 24 hours)
const PROFILE_DURATION = process.env.PROFILE_DURATION ? 
  parseInt(process.env.PROFILE_DURATION, 10) : 
  24 * 60 * 60 * 1000;

// Interval for memory checks in ms (default: 1 minute)
const PROFILE_INTERVAL = process.env.PROFILE_INTERVAL ? 
  parseInt(process.env.PROFILE_INTERVAL, 10) : 
  60 * 1000;

// Take heap snapshots periodically (default: every 6 hours)
const SNAPSHOT_INTERVAL = process.env.SNAPSHOT_INTERVAL ? 
  parseInt(process.env.SNAPSHOT_INTERVAL, 10) : 
  6 * 60 * 60 * 1000;

logger.info(`Starting memory profiling for ${PROFILE_DURATION/1000/60/60} hours`);
logger.info(`Memory will be checked every ${PROFILE_INTERVAL/1000} seconds`);
logger.info(`Heap snapshots will be taken every ${SNAPSHOT_INTERVAL/1000/60/60} hours`);

// Start memory profiling
const stopProfiling = startMemoryProfiling(PROFILE_INTERVAL, true, true);

// Take initial heap snapshot
takeHeapSnapshot().catch(err => {
  logger.error('Failed to take initial heap snapshot:', err);
});

// Schedule heap snapshots
const snapshotTimer = setInterval(() => {
  takeHeapSnapshot().catch(err => {
    logger.error('Failed to take heap snapshot:', err);
  });
}, SNAPSHOT_INTERVAL);

// Stop profiling after the specified duration
if (PROFILE_DURATION > 0) {
  setTimeout(() => {
    stopProfiling();
    clearInterval(snapshotTimer);
    logger.info('Memory profiling completed');
    
    // Take final heap snapshot
    takeHeapSnapshot()
      .then(() => {
        logger.info('Final heap snapshot taken. Exiting.');
        // Wait a short time for logging to complete
        setTimeout(() => process.exit(0), 1000);
      })
      .catch(err => {
        logger.error('Failed to take final heap snapshot:', err);
        // Wait a short time for error logging to complete
        setTimeout(() => process.exit(1), 1000);
      });
  }, PROFILE_DURATION);
}

// Handle process termination
process.on('SIGINT', () => {
  logger.info('Received SIGINT. Stopping profiling...');
  stopProfiling();
  clearInterval(snapshotTimer);
  
  // Take final heap snapshot
  takeHeapSnapshot()
    .then(() => {
      logger.info('Final heap snapshot taken. Exiting.');
      // Exit after a short delay to ensure logging completes
      setTimeout(() => process.exit(0), 1000);
    })
    .catch(err => {
      logger.error('Failed to take final heap snapshot:', err);
      setTimeout(() => process.exit(1), 1000);
    });
});
