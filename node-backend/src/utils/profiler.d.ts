/**
 * Memory usage information with formatted values
 */
export interface FormattedMemoryUsage {
  rss: string;
  heapTotal: string;
  heapUsed: string;
  external: string;
  arrayBuffers: string;
  raw: NodeJS.MemoryUsage;
}

/**
 * Memory log entry structure
 */
export interface MemoryLogEntry {
  timestamp: number;
  memory: NodeJS.MemoryUsage;
  formattedMemory: {
    rss: string;
    heapTotal: string;
    heapUsed: string;
    external: string;
    arrayBuffers: string;
  };
}

/**
 * Get memory usage information with formatted values
 */
export function getMemoryUsage(): FormattedMemoryUsage;

/**
 * Start memory profiling
 * @param interval - Interval in ms to check memory usage (default: 60000ms)
 * @param logToConsole - Whether to log memory usage to console (default: true)
 * @param writeToFile - Whether to write memory usage to a file (default: true)
 * @returns Function to stop profiling
 */
export function startMemoryProfiling(
  interval?: number,
  logToConsole?: boolean,
  writeToFile?: boolean
): () => MemoryLogEntry[];

/**
 * Create a heap snapshot
 * @returns Path to the heap snapshot file
 */
export function takeHeapSnapshot(): Promise<string>;
