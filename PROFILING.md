# Memory Profiling in PodAI

This document provides guidance on how to use the memory profiling tools available in PodAI for both the backend and frontend.

## Why Profile Memory?

Memory profiling helps identify:
- Memory leaks
- Inefficient memory usage
- Areas where optimization is needed
- Understanding memory consumption patterns under different loads

## Backend Memory Profiling

The backend has a built-in memory profiling system that can track memory usage over time and create heap snapshots for detailed analysis.

### Running with Memory Profiling

Using Make:
```bash
# Start backend with memory profiling
make profile-backend

# Take a heap snapshot of a running backend
make profile-backend-snapshot
```

Using npm directly:
```bash
# Start with profiling enabled
cd node-backend
npm run profile:dev

# Run the standalone profiler (takes heap snapshots)
cd node-backend
npm run profile:memory
```

### Configuration Options

Set these environment variables to customize the profiling:

- `ENABLE_PROFILING`: Set to "true" to enable profiling (default: false)
- `PROFILE_INTERVAL`: Time in milliseconds between memory checks (default: 60000)
- `PROFILE_DURATION`: Duration in milliseconds to run the profiler (default: 24 hours)
- `SNAPSHOT_INTERVAL`: Time in milliseconds between automatic heap snapshots (default: 6 hours)

### Output

Profiling data is saved to the `node-backend/profiles/` directory:
- Memory log JSON files: `memory-profile-{timestamp}.json`
- Heap snapshots: `heapsnapshot-{timestamp}.heapsnapshot`

### Analyzing Heap Snapshots

Heap snapshots (.heapsnapshot files) can be loaded and analyzed in:
1. Chrome DevTools (Memory tab)
2. Node.js --inspect mode
3. Visual Studio Code with the appropriate extensions

## Frontend Memory Profiling

The frontend includes a memory profiling utility that works in development mode.

### Running with Memory Profiling

Using Make:
```bash
# Start frontend with memory profiling
make profile-frontend

# Start both frontend and backend with memory profiling
make profile-all
```

Using npm directly:
```bash
# Start with profiling enabled
cd frontend
VITE_ENABLE_PROFILING=true npm run dev
```

### Using the Memory Profiler UI

When enabled, a small floating panel appears in the bottom-right corner of the browser window with these options:

- **Start**: Begin memory profiling
- **Stop**: Stop memory profiling
- **Snapshot**: Take a single memory snapshot
- **Download**: Download the collected memory data as a JSON file

### Browser Compatibility

The detailed memory metrics are primarily available in Chromium-based browsers (Chrome, Edge, etc.) that expose the `performance.memory` API. Other browsers will have limited information.

## Memory Optimization Tips

1. **Backend (Node.js)**:
   - Watch for memory growth in long-running operations
   - Consider using streams for large file processing
   - Be cautious with caching large objects
   - Check for event listener leaks

2. **Frontend (React)**:
   - Watch for component re-rendering frequency
   - Be careful with closures that capture large objects
   - Optimize large lists with virtualization
   - Remove event listeners in cleanup functions

## Troubleshooting

If you see memory growing continuously without stabilizing, you likely have a memory leak. Common causes:

- Unremoved event listeners
- Continuously growing caches or collections
- Circular references preventing garbage collection
- Timer/interval callbacks that aren't cleared
