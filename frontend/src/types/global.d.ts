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
  // This empty interface prevents TypeScript from using NodeJS.Timeout
  // when we're in a browser environment
  interface Timeout {}
}

// No need to redefine the timer functions as TypeScript will now
// correctly use the browser versions in a browser context
