import { createServer, request } from 'http';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { createReadStream } from 'fs';
import { extname } from 'path';

const API_URL = process.env.API_URL || process.env.VITE_API_URL || 'http://localhost:8081';
const PORT = 3000;
const DIST_DIR = 'dist';

// MIME types for different file extensions
const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

// Start HTTP server
const server = createServer(async (req, res) => {
  const { url } = req;
  
  console.log(`Request: ${url}`);
  
  // Handle API requests
  if (url.startsWith('/api/')) {
    // Proxy API requests to the backend
    const options = {
      hostname: new URL(API_URL).hostname,
      port: new URL(API_URL).port,
      path: url,
      method: req.method,
      headers: req.headers,
    };
    
    const proxyReq = request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res, { end: true });
    });
    
    req.pipe(proxyReq, { end: true });
    return;
  }
  
  // Handle file requests
  let filePath = url === '/' ? join(DIST_DIR, 'index.html') : join(DIST_DIR, url);
  
  // Remove query parameters from the path
  filePath = filePath.split('?')[0];
  
  if (existsSync(filePath)) {
    const ext = extname(filePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    
    res.writeHead(200, { 'Content-Type': contentType });
    createReadStream(filePath).pipe(res);
  } else {
    // Try serving index.html for client-side routing
    try {
      const data = await readFile(join(DIST_DIR, 'index.html'));
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(data);
    } catch (error) {
      res.writeHead(404);
      res.end('Not found');
    }
  }
});

server.listen(PORT, () => {
  console.log(`Preview server running at http://localhost:${PORT}`);
  console.log(`Serving files from ${DIST_DIR}`);
});

// Cleanup on exit
const cleanup = () => {
  console.log('Stopping preview server...');
  server.close();
  process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup); 