/**
 * Browser memory profiling utility
 * 
 * This utility helps track memory usage in the browser.
 * It uses the Performance API when available.
 */

// Type definitions
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

type MemoryLogEntry = {
  timestamp: number;
  memory: MemoryInfo;
  tag?: string;
};

// Declare types for browser timers to prevent confusion with Node.js types
type BrowserTimerId = number | NodeJS.Timeout;

/**
 * Type-safe wrapper for setInterval to handle both browser and Node.js environments
 */
function createInterval(callback: () => void, ms: number): BrowserTimerId {
  return setInterval(callback, ms);
}

/**
 * Type-safe wrapper for clearInterval to handle both browser and Node.js environments
 */
function clearIntervalSafe(id: BrowserTimerId): void {
  clearInterval(id);
}

let memoryLog: MemoryLogEntry[] = [];
let profilingInterval: BrowserTimerId | null = null;

/**
 * Format bytes to human-readable format
 */
function formatBytes(bytes?: number): string {
  if (bytes === undefined) return 'N/A';
  
  if (bytes === 0) return '0 B';
  
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * Get current memory usage if available
 */
export function getMemoryInfo(): MemoryInfo {
  // Check if performance.memory is available (Chrome only feature)
  const performance = window.performance;
  
  if (performance && performance.memory) {
    const memory = performance.memory;
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
 * Start memory profiling
 * @param intervalMs - Interval in milliseconds between memory checks
 * @param logToConsole - Whether to log memory info to console
 */
export function startMemoryProfiling(intervalMs = 60000, logToConsole = true): void {
  // Clear any existing profiling
  stopMemoryProfiling();
  
  // Reset memory log
  memoryLog = [];
  
  // Log initial memory state
  const initialMemory = getMemoryInfo();
  memoryLog.push({
    timestamp: Date.now(),
    memory: initialMemory,
    tag: 'Initial'
  });
  
  if (logToConsole) {
    console.log('Initial memory usage:', initialMemory);
  }
  
  // Start interval for regular memory checks
  profilingInterval = createInterval(() => {
    const memoryInfo = getMemoryInfo();
    
    memoryLog.push({
      timestamp: Date.now(),
      memory: memoryInfo
    });
    
    if (logToConsole) {
      console.log('Memory usage:', memoryInfo);
    }
  }, intervalMs);
  
  console.log(`Memory profiling started with interval: ${intervalMs}ms`);
}

/**
 * Stop memory profiling and return memory log
 */
export function stopMemoryProfiling(): MemoryLogEntry[] {
  if (profilingInterval !== null) {
    clearIntervalSafe(profilingInterval);
    profilingInterval = null;
  }
  return [...memoryLog];
}

/**
 * Take a memory snapshot with an optional tag
 * @param tag - Optional tag to identify this snapshot
 */
export function takeMemorySnapshot(tag?: string): MemoryInfo {
  const memoryInfo = getMemoryInfo();
  
  memoryLog.push({
    timestamp: Date.now(),
    memory: memoryInfo,
    tag
  });
  
  console.log(`Memory snapshot ${tag ? `(${tag})` : ''}:`, memoryInfo);
  
  return memoryInfo;
}

/**
 * Download memory log as JSON file
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

/**
 * Create a memory profiling component that can be added to development builds
 */
export function createMemoryProfilerInterface(container: HTMLElement): void {
  // Create UI elements
  const header = document.createElement('h3');
  header.textContent = 'Memory Profiler';
  header.style.fontWeight = 'bold';
  header.style.marginBottom = '5px';
  header.style.fontSize = '14px';
  header.style.margin = '0 0 8px 0';
  
  const memoryDisplay = document.createElement('div');
  memoryDisplay.id = 'memory-display';
  memoryDisplay.textContent = 'Memory: Not available';
  
  const buttonContainer = document.createElement('div');
  buttonContainer.style.marginTop = '5px';
  buttonContainer.style.display = 'flex';
  buttonContainer.style.gap = '5px';
  
  // Keep track of interval ID
  let updateInterval: BrowserTimerId | null = null;
  
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
  
  const startButton = document.createElement('button');
  startButton.textContent = 'Start';
  startButton.onclick = () => {
    startMemoryProfiling(5000, true);
    updateInterval = createInterval(updateMemoryDisplay, 1000);
    startButton.disabled = true;
    stopButton.disabled = false;
  };
  
  const stopButton = document.createElement('button');
  stopButton.textContent = 'Stop';
  stopButton.disabled = true;
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
  snapshotButton.onclick = () => {
    takeMemorySnapshot('Manual snapshot');
  };
  
  const downloadButton = document.createElement('button');
  downloadButton.textContent = 'Download';
  downloadButton.onclick = downloadMemoryLog;
  
  // Append elements
  buttonContainer.appendChild(startButton);
  buttonContainer.appendChild(stopButton);
  buttonContainer.appendChild(snapshotButton);
  buttonContainer.appendChild(downloadButton);
  
  container.appendChild(header);
  container.appendChild(memoryDisplay);
  container.appendChild(buttonContainer);
  
  // Initial display update
  updateMemoryDisplay();
}

/**
 * Initialize memory profiler in development mode
 */
export function initDevMemoryProfiler(): void {
  if (process.env.NODE_ENV === 'development' || process.env.REACT_APP_ENABLE_PROFILING === 'true') {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        const profilerInterface = document.createElement('div');
        document.body.appendChild(profilerInterface);
        createMemoryProfilerInterface(profilerInterface);
      });
    } else {
      const profilerInterface = document.createElement('div');
      document.body.appendChild(profilerInterface);
      createMemoryProfilerInterface(profilerInterface);
    }
  }
}

/**
 * Attach memory profiler to page
 */
export function attachMemoryProfilerToPage(): void {
  if (typeof document !== 'undefined') {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        const profilerInterface = document.createElement('div');
        // Apply styling
        profilerInterface.style.position = 'fixed';
        profilerInterface.style.bottom = '10px';
        profilerInterface.style.right = '10px';
        profilerInterface.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        profilerInterface.style.color = 'white';
        profilerInterface.style.padding = '10px';
        profilerInterface.style.borderRadius = '5px';
        profilerInterface.style.zIndex = '9999';
        profilerInterface.style.fontSize = '12px';
        profilerInterface.style.fontFamily = 'monospace';
        
        document.body.appendChild(profilerInterface);
        createMemoryProfilerInterface(profilerInterface);
      });
    } else {
      const profilerInterface = document.createElement('div');
      // Apply styling
      profilerInterface.style.position = 'fixed';
      profilerInterface.style.bottom = '10px';
      profilerInterface.style.right = '10px';
      profilerInterface.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
      profilerInterface.style.color = 'white';
      profilerInterface.style.padding = '10px';
      profilerInterface.style.borderRadius = '5px';
      profilerInterface.style.zIndex = '9999';
      profilerInterface.style.fontSize = '12px';
      profilerInterface.style.fontFamily = 'monospace';
      
      document.body.appendChild(profilerInterface);
      createMemoryProfilerInterface(profilerInterface);
    }
  }
}
