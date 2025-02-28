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

let memoryLog: MemoryLogEntry[] = [];
let profilingInterval: number | null = null;

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
  const performance = window.performance as any;
  
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
  
  // If performance.memory is not available
  return {};
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
  profilingInterval = window.setInterval(() => {
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
 * Stop memory profiling
 * @returns The collected memory log
 */
export function stopMemoryProfiling(): MemoryLogEntry[] {
  if (profilingInterval !== null) {
    clearInterval(profilingInterval);
    profilingInterval = null;
    console.log('Memory profiling stopped');
  }
  
  return memoryLog;
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
export function createMemoryProfilerInterface(): HTMLElement {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.bottom = '10px';
  container.style.right = '10px';
  container.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  container.style.color = 'white';
  container.style.padding = '10px';
  container.style.borderRadius = '5px';
  container.style.zIndex = '9999';
  container.style.fontSize = '12px';
  container.style.fontFamily = 'monospace';
  
  // Create UI elements
  const header = document.createElement('div');
  header.textContent = 'Memory Profiler';
  header.style.fontWeight = 'bold';
  header.style.marginBottom = '5px';
  
  const memoryDisplay = document.createElement('div');
  memoryDisplay.id = 'memory-display';
  memoryDisplay.textContent = 'Memory: Not available';
  
  const buttonContainer = document.createElement('div');
  buttonContainer.style.marginTop = '5px';
  buttonContainer.style.display = 'flex';
  buttonContainer.style.gap = '5px';
  
  const startButton = document.createElement('button');
  startButton.textContent = 'Start';
  startButton.onclick = () => {
    startMemoryProfiling(5000, true);
    updateInterval = setInterval(updateMemoryDisplay, 1000);
    startButton.disabled = true;
    stopButton.disabled = false;
  };
  
  const stopButton = document.createElement('button');
  stopButton.textContent = 'Stop';
  stopButton.disabled = true;
  stopButton.onclick = () => {
    stopMemoryProfiling();
    clearInterval(updateInterval);
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
  
  // Update memory display
  let updateInterval: number;
  
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
  
  // Initial display update
  updateMemoryDisplay();
  
  return container;
}

/**
 * Initialize memory profiler in development mode
 */
export function initDevMemoryProfiler(): void {
  if (process.env.NODE_ENV === 'development' || process.env.REACT_APP_ENABLE_PROFILING === 'true') {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        const profilerInterface = createMemoryProfilerInterface();
        document.body.appendChild(profilerInterface);
      });
    } else {
      const profilerInterface = createMemoryProfilerInterface();
      document.body.appendChild(profilerInterface);
    }
  }
}
