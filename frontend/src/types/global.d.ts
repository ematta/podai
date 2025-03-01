/**
 * Type definitions for browser-specific APIs
 */

// Chrome's Performance Memory API
interface PerformanceMemory {
  jsHeapSizeLimit: number;
  totalJSHeapSize: number;
  usedJSHeapSize: number;
}

// Extend Window interface
interface Performance {
  memory?: PerformanceMemory;
}

// Explicitly define NodeJS namespace to avoid conflicts
declare namespace NodeJS {
  // Instead of trying to define a Timeout type, we'll declare it as a number type
  // This matches the browser's return type for setInterval/setTimeout
  type Timeout = number;
}

// No need to redefine the timer functions as TypeScript will now
// correctly use the browser versions in a browser context
