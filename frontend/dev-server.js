import * as esbuild from 'esbuild';
import { createServer, request } from 'http';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

const API_URL = process.env.API_URL || process.env.VITE_API_URL || 'http://localhost:8081';
const PORT = 3000;

// Create HTML template
const htmlTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PDF Chat Assistant (Dev)</title>
  <link rel="icon" type="image/svg+xml" href="/vite.svg" />
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/main.js"></script>
</body>
</html>`;

// Write template to dist
async function setupDevEnv() {
  await mkdir('dist', { recursive: true });
  await writeFile(join('dist', 'index.html'), htmlTemplate);
}

async function startDevServer() {
  // Initial setup
  await setupDevEnv();
  
  // Create esbuild context
  const context = await esbuild.context({
    entryPoints: ['src/main.tsx'],
    bundle: true,
    sourcemap: true,
    outdir: 'dist',
    loader: {
      '.js': 'jsx',
      '.ts': 'tsx',
      '.tsx': 'tsx',
      '.css': 'css',
      '.scss': 'css',
      '.svg': 'dataurl',
      '.png': 'dataurl',
      '.jpg': 'dataurl',
      '.gif': 'dataurl',
    },
    define: {
      'process.env.NODE_ENV': '"development"',
      'process.env.API_URL': `"${API_URL}"`,
    },
    jsx: 'automatic',
    jsxImportSource: 'react',
    inject: ['./esbuild-shim.js'],
    plugins: [
      {
        name: 'sass-plugin',
        setup(build) {
          const sass = require('sass');
          
          // Handle .scss imports
          build.onLoad({ filter: /\.scss$/ }, async (args) => {
            try {
              const result = sass.compile(args.path, {
                style: 'expanded',
              });
              
              return {
                contents: result.css.toString(),
                loader: 'css',
              };
            } catch (error) {
              return {
                errors: [{ text: error.message }],
              };
            }
          });
        },
      },
    ],
  });
  
  // Start esbuild in watch mode
  await context.watch();
  console.log('ESBuild watching for changes...');
  
  // Start HTTP server
  const server = createServer((req, res) => {
    const { url } = req;
    
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
    
    // Handle static files
    if (url === '/' || url === '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(htmlTemplate);
      return;
    }
    
    // Redirect all other requests to the index.html
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(htmlTemplate);
  });
  
  server.listen(PORT, () => {
    console.log(`Development server running at http://localhost:${PORT}`);
  });
  
  // Cleanup on exit
  const cleanup = async () => {
    console.log('Stopping dev server...');
    await context.dispose();
    server.close();
    process.exit(0);
  };
  
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

startDevServer().catch((err) => {
  console.error('Failed to start dev server:', err);
  process.exit(1);
}); 