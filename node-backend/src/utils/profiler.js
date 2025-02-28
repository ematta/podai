// Memory profiling utility for Node.js backend
import v8 from 'v8';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createLogger } from '../config/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logger = createLogger('profiler');

// Configure profile directory
const PROFILE_DIR = path.join(__dirname, '../../profiles');
if (!fs.existsSync(PROFILE_DIR)) {
  fs.mkdirSync(PROFILE_DIR, { recursive: true });
}

/**
 * Memory usage information with formatted values
 */
export function getMemoryUsage() {
  const memoryData = process.memoryUsage();
  
  // Convert to MB for better readability
  const formatted = {
    rss: `${Math.round(memoryData.rss / 1024 / 1024 * 100) / 100} MB`,         // Resident Set Size - total memory allocated
    heapTotal: `${Math.round(memoryData.heapTotal / 1024 / 1024 * 100) / 100} MB`, // Total size of the allocated heap
    heapUsed: `${Math.round(memoryData.heapUsed / 1024 / 1024 * 100) / 100} MB`,   // Actual memory used during execution
    external: `${Math.round(memoryData.external / 1024 / 1024 * 100) / 100} MB`,   // Memory used by C++ objects bound to JavaScript
    arrayBuffers: `${Math.round((memoryData.arrayBuffers || 0) / 1024 / 1024 * 100) / 100} MB`, // Memory allocated for ArrayBuffers and SharedArrayBuffers
    raw: memoryData // Original values in bytes
  };
  
  return formatted;
}

/**
 * Start memory profiling
 * @param {number} interval - Interval in ms to check memory usage (default: 60000ms)
 * @param {boolean} logToConsole - Whether to log memory usage to console (default: true)
 * @param {boolean} writeToFile - Whether to write memory usage to a file (default: true)
 * @returns {Function} stop - Function to stop profiling
 */
export function startMemoryProfiling(interval = 60000, logToConsole = true, writeToFile = true) {
  // Create log file
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const logFile = path.join(PROFILE_DIR, `memory-profile-${timestamp}.json`);
  
  // Initialize memory log
  const memoryLog = [];
  
  logger.info(`Starting memory profiling with interval: ${interval}ms`);
  if (writeToFile) {
    logger.info(`Memory profile will be written to: ${logFile}`);
  }
  
  // Log initial memory state
  const initialMemory = getMemoryUsage();
  memoryLog.push({
    timestamp: Date.now(),
    memory: initialMemory.raw,
    formattedMemory: {
      rss: initialMemory.rss,
      heapTotal: initialMemory.heapTotal, 
      heapUsed: initialMemory.heapUsed,
      external: initialMemory.external,
      arrayBuffers: initialMemory.arrayBuffers
    }
  });
  
  if (logToConsole) {
    logger.info('Initial memory usage:', initialMemory);
  }
  
  // Set up interval for memory checks
  const timer = setInterval(() => {
    const memUsage = getMemoryUsage();
    
    // Log to memory object
    memoryLog.push({
      timestamp: Date.now(),
      memory: memUsage.raw,
      formattedMemory: {
        rss: memUsage.rss,
        heapTotal: memUsage.heapTotal, 
        heapUsed: memUsage.heapUsed,
        external: memUsage.external,
        arrayBuffers: memUsage.arrayBuffers
      }
    });
    
    // Log to console if enabled
    if (logToConsole) {
      logger.info('Memory usage:', memUsage);
    }
    
    // Write to file if enabled
    if (writeToFile) {
      fs.writeFileSync(logFile, JSON.stringify(memoryLog, null, 2));
    }
  }, interval);
  
  // Return function to stop profiling
  return function stopProfiling() {
    clearInterval(timer);
    logger.info('Memory profiling stopped');
    
    // Write final result to file
    if (writeToFile) {
      fs.writeFileSync(logFile, JSON.stringify(memoryLog, null, 2));
      logger.info(`Memory profile written to: ${logFile}`);
    }
    
    return memoryLog;
  };
}

/**
 * Create a heap snapshot
 * @returns {string} Path to the heap snapshot file
 */
export function takeHeapSnapshot() {
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const snapshotFile = path.join(PROFILE_DIR, `heapsnapshot-${timestamp}.heapsnapshot`);
  
  logger.info(`Taking heap snapshot: ${snapshotFile}`);
  
  const snapshot = v8.getHeapSnapshot();
  const fileStream = fs.createWriteStream(snapshotFile);
  
  // Pipe the snapshot to a file
  snapshot.pipe(fileStream);
  
  return new Promise((resolve, reject) => {
    fileStream.on('finish', () => {
      logger.info(`Heap snapshot written to: ${snapshotFile}`);
      resolve(snapshotFile);
    });
    
    fileStream.on('error', (err) => {
      logger.error(`Error writing heap snapshot: ${err}`);
      reject(err);
    });
  });
}
