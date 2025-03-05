/**
 * Browser Memory Profiling Utility
 * 
 * This module provides tools for tracking and analyzing memory usage in the browser.
 * It includes functions for memory monitoring, logging, and visualization.
 * 
 * @module memoryProfiler
 */

// ---------------------------------
// Types
// ---------------------------------

/**
 * Memory information object with raw and formatted values
 * @typedef {Object} MemoryInfo
 * @property {number} [jsHeapSizeLimit] - Maximum heap size limit
 * @property {number} [totalJSHeapSize] - Total allocated heap size
 * @property {number} [usedJSHeapSize] - Currently used heap size
 * @property {Object} [formatted] - Human-readable formatted values
 * @property {string} [formatted.jsHeapSizeLimit] - Formatted heap size limit
 * @property {string} [formatted.totalJSHeapSize] - Formatted total heap size
 * @property {string} [formatted.usedJSHeapSize] - Formatted used heap size
 * @property {string} [formatted.usagePercentage] - Heap usage as percentage
 */
type MemoryInfo = {
  jsHeapSizeLimit?: number;
  totalJSHeapSize?: number;
  usedJSHeapSize?: number;
  formatted?: {
    jsHeapSizeLimit: string;
    totalJSHeapSize: string;
    usedJSHeapSize: string;
    usagePercentage: string;
  };
};

/**
 * Entry in the memory log with timestamp and optional tag
 * @typedef {Object} MemoryLogEntry
 * @property {number} timestamp - Unix timestamp when entry was recorded
 * @property {MemoryInfo} memory - Memory information at this time
 * @property {string} [tag] - Optional identifier for this entry
 */
type MemoryLogEntry = {
  timestamp: number;
  memory: MemoryInfo;
  tag?: string;
};

/**
 * Type for browser timer IDs, accommodating both browser and Node.js environments
 * @typedef {number | NodeJS.Timeout} BrowserTimerId
 */
type BrowserTimerId = number | NodeJS.Timeout;

// ---------------------------------
// Module State
// ---------------------------------

/**
 * In-memory storage for memory profiling data
 * @private
 */
let memoryLog: MemoryLogEntry[] = [];

/**
 * Reference to the active profiling interval timer
 * @private
 */
let profilingInterval: BrowserTimerId | null = null;

// ---------------------------------
// Utility Functions
// ---------------------------------

/**
 * Type-safe wrapper for setInterval that works in both browser and Node.js environments
 * @private
 * @param {Function} callback - Function to execute periodically
 * @param {number} ms - Interval in milliseconds
 * @returns {BrowserTimerId} Timer identifier
 */
function createInterval(callback: () => void, ms: number): BrowserTimerId {
  return setInterval(callback, ms);
}

/**
 * Type-safe wrapper for clearInterval that works in both browser and Node.js environments
 * @private
 * @param {BrowserTimerId} id - Timer identifier to clear
 */
function clearIntervalSafe(id: BrowserTimerId): void {
  clearInterval(id);
}

/**
 * Format bytes to human-readable format with appropriate units
 * @private
 * @param {number} [bytes] - Bytes to format
 * @returns {string} Human-readable string with appropriate unit suffix
 */
function formatBytes(bytes?: number): string {
  if (bytes === undefined) return 'N/A';
  
  if (bytes === 0) return '0 B';
  
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}

// ---------------------------------
// Core Memory Profiling API
// ---------------------------------

/**
 * Get current memory usage from the browser if available
 * @public
 * @returns {MemoryInfo} Current memory information or empty object if unavailable
 */
export function getMemoryInfo(): MemoryInfo {
  // Check if performance.memory is available (Chrome only feature)
  const performance = window.performance;
  
  if (performance && 'memory' in performance) {
    const memory = performance.memory as any;
    const usagePercentage = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
    
    return {
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      totalJSHeapSize: memory.totalJSHeapSize,
      usedJSHeapSize: memory.usedJSHeapSize,
      formatted: {
        jsHeapSizeLimit: formatBytes(memory.jsHeapSizeLimit),
        totalJSHeapSize: formatBytes(memory.totalJSHeapSize),
        usedJSHeapSize: formatBytes(memory.usedJSHeapSize),
        usagePercentage: `${usagePercentage.toFixed(2)}%`
      }
    };
  }
  
  return {}; // Return empty object if memory info is not available
}

/**
 * Start memory profiling at regular intervals
 * @public
 * @param {number} [intervalMs=60000] - Interval between memory checks in milliseconds
 * @param {boolean} [logToConsole=true] - Whether to log each check to the console
 */
export function startMemoryProfiling(intervalMs = 60000, logToConsole = true): void {
  // Clear any existing profiling
  stopMemoryProfiling();
  
  // Reset memory log
  memoryLog = [];
  
  // Log initial memory state
  const initialMemory = getMemoryInfo();
  recordMemorySnapshot('Initial', initialMemory);
  
  if (logToConsole) {
    console.log('Initial memory usage:', initialMemory);
  }
  
  // Start interval for regular memory checks
  profilingInterval = createInterval(() => {
    const memoryInfo = getMemoryInfo();
    
    recordMemorySnapshot(undefined, memoryInfo);
    
    if (logToConsole) {
      console.log('Memory usage:', memoryInfo);
    }
  }, intervalMs);
  
  console.log(`Memory profiling started with interval: ${intervalMs}ms`);
}

/**
 * Stop memory profiling and return the collected data
 * @public
 * @returns {MemoryLogEntry[]} Array of recorded memory log entries
 */
export function stopMemoryProfiling(): MemoryLogEntry[] {
  if (profilingInterval !== null) {
    clearIntervalSafe(profilingInterval);
    profilingInterval = null;
    console.log('Memory profiling stopped');
  }
  return [...memoryLog];
}

/**
 * Records a memory snapshot in the internal log
 * @private
 * @param {string} [tag] - Optional tag to identify this snapshot
 * @param {MemoryInfo} memoryInfo - Memory information to record
 */
function recordMemorySnapshot(tag?: string, memoryInfo: MemoryInfo = getMemoryInfo()): void {
  memoryLog.push({
    timestamp: Date.now(),
    memory: memoryInfo,
    tag
  });
}

/**
 * Take a memory snapshot with an optional tag
 * @public
 * @param {string} [tag] - Optional tag to identify this snapshot
 * @returns {MemoryInfo} Current memory information
 */
export function takeMemorySnapshot(tag?: string): MemoryInfo {
  const memoryInfo = getMemoryInfo();
  recordMemorySnapshot(tag, memoryInfo);
  
  console.log(`Memory snapshot ${tag ? `(${tag})` : ''}:`, memoryInfo);
  
  return memoryInfo;
}

/**
 * Download memory log as JSON file for further analysis
 * @public
 */
export function downloadMemoryLog(): void {
  const data = JSON.stringify(memoryLog, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `memory-profile-${new Date().toISOString()}.json`;
  document.body.appendChild(a);
  a.click();
  
  // Cleanup
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

// ---------------------------------
// UI Components for Memory Profiling
// ---------------------------------

/**
 * Create styling for a button element
 * @private
 * @param {HTMLButtonElement} button - Button to style
 */
function styleButton(button: HTMLButtonElement): void {
  Object.assign(button.style, {
    padding: '4px 8px',
    margin: '0 4px',
    fontSize: '12px',
    cursor: 'pointer',
    border: '1px solid #ccc',
    borderRadius: '3px',
    backgroundColor: '#f5f5f5',
  });
}

/**
 * Create a memory profiler UI component to monitor and control profiling
 * @public
 * @param {HTMLElement} container - Container element to add the profiler to
 */
export function createMemoryProfilerInterface(container: HTMLElement): void {
  // Create wrapper with styling
  const wrapper = document.createElement('div');
  Object.assign(wrapper.style, {
    fontFamily: 'sans-serif',
    fontSize: '12px',
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    backgroundColor: '#f9f9f9',
    margin: '10px 0',
    maxWidth: '300px',
  });
  
  // Create UI elements
  const header = document.createElement('h3');
  header.textContent = 'Memory Profiler';
  Object.assign(header.style, {
    fontWeight: 'bold',
    marginBottom: '5px',
    fontSize: '14px',
    margin: '0 0 8px 0',
  });
  
  const memoryDisplay = document.createElement('div');
  memoryDisplay.id = 'memory-display';
  memoryDisplay.textContent = 'Memory: Not available';
  
  const buttonContainer = document.createElement('div');
  Object.assign(buttonContainer.style, {
    marginTop: '5px',
    display: 'flex',
    gap: '5px',
  });
  
  // Keep track of interval ID
  let updateInterval: BrowserTimerId | null = null;
  
  /**
   * Updates the memory display with current memory info
   * @private
   */
  function updateMemoryDisplay() {
    const memoryInfo = getMemoryInfo();
    
    if (memoryInfo.formatted) {
      memoryDisplay.innerHTML = `
        Heap Size: ${memoryInfo.formatted.usedJSHeapSize} / ${memoryInfo.formatted.jsHeapSizeLimit}<br>
        Usage: ${memoryInfo.formatted.usagePercentage}
      `;
    } else {
      memoryDisplay.textContent = 'Memory API not available in this browser';
    }
  }
  
  // Create control buttons
  const startButton = document.createElement('button');
  startButton.textContent = 'Start';
  styleButton(startButton);
  startButton.onclick = () => {
    startMemoryProfiling(5000, true);
    updateInterval = createInterval(updateMemoryDisplay, 1000);
    startButton.disabled = true;
    stopButton.disabled = false;
  };
  
  const stopButton = document.createElement('button');
  stopButton.textContent = 'Stop';
  stopButton.disabled = true;
  styleButton(stopButton);
  stopButton.onclick = () => {
    stopMemoryProfiling();
    if (updateInterval !== null) {
      clearIntervalSafe(updateInterval);
      updateInterval = null;
    }
    startButton.disabled = false;
    stopButton.disabled = true;
  };
  
  const snapshotButton = document.createElement('button');
  snapshotButton.textContent = 'Snapshot';
  styleButton(snapshotButton);
  snapshotButton.onclick = () => {
    takeMemorySnapshot('Manual snapshot');
  };
  
  const downloadButton = document.createElement('button');
  downloadButton.textContent = 'Download';
  styleButton(downloadButton);
  downloadButton.onclick = downloadMemoryLog;
  
  // Append elements
  buttonContainer.appendChild(startButton);
  buttonContainer.appendChild(stopButton);
  buttonContainer.appendChild(snapshotButton);
  buttonContainer.appendChild(downloadButton);
  
  wrapper.appendChild(header);
  wrapper.appendChild(memoryDisplay);
  wrapper.appendChild(buttonContainer);
  
  container.appendChild(wrapper);
  
  // Initial update
  updateMemoryDisplay();
}

// ---------------------------------
// Development Utilities
// ---------------------------------

/**
 * Initialize memory profiler for development
 * Creates a profiler interface in a floating div
 * @public
 */
export function initDevMemoryProfiler() {
  if (process.env.NODE_ENV !== 'production') {
    const div = document.createElement('div');
    Object.assign(div.style, {
      position: 'fixed',
      bottom: '10px',
      right: '10px',
      zIndex: '9999',
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      boxShadow: '0 0 10px rgba(0, 0, 0, 0.2)',
      borderRadius: '4px',
    });
    document.body.appendChild(div);
    createMemoryProfilerInterface(div);
  }
}

/**
 * Attaches a memory profiler to the page
 * Use this function in development to monitor memory usage
 * @public
 */
export function attachMemoryProfilerToPage(): void {
  // Only attach in non-production environments
  if (process.env.NODE_ENV !== 'production') {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initDevMemoryProfiler);
    } else {
      initDevMemoryProfiler();
    }
  }
}
