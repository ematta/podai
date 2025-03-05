import * as esbuild from 'esbuild';
import { copyFile, mkdir, readdir, writeFile } from 'fs/promises';
import { join, resolve, dirname } from 'path';
import { existsSync } from 'fs';
import * as sass from 'sass';

const API_URL = process.env.API_URL || 'http://localhost:8081';

// Configuration
const config = {
  entryPoints: ['src/main.tsx'],
  bundle: true,
  minify: true,
  sourcemap: true,
  target: ['es2020'],
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
    'process.env.NODE_ENV': '"production"',
    'process.env.API_URL': `"${API_URL}"`,
    // Define import.meta.env as an empty object to prevent errors
    'import.meta.env': '{}'
  },
  jsx: 'automatic',
  jsxImportSource: 'react',
  inject: ['./esbuild-shim.js'],
  plugins: [
    {
      name: 'sass-plugin',
      setup(build) {
        // Handle .scss imports
        build.onLoad({ filter: /\.scss$/ }, async (args) => {
          try {
            const result = sass.compile(args.path, {
              style: 'compressed',
            });
            
            return {
              contents: result.css.toString(),
              loader: 'css',
            };
          } catch (error) {
            console.error('SASS compilation error:', error);
            return {
              errors: [{ text: error.message }],
            };
          }
        });
      },
    },
    {
      name: 'copy-assets',
      setup(build) {
        build.onEnd(async (result) => {
          // Log any errors
          if (result.errors.length > 0) {
            console.error('Build errors:', result.errors);
          }
          
          try {
            // Copy public folder contents to dist
            if (existsSync('public')) {
              const files = await readdir('public');
              await mkdir('dist', { recursive: true });
              
              for (const file of files) {
                await copyFile(join('public', file), join('dist', file));
              }
              console.log('Public assets copied to dist');
            }
          } catch (error) {
            console.error('Error copying public assets:', error);
          }
        });
      },
    },
    {
      name: 'ensure-output-dir',
      setup(build) {
        build.onStart(async () => {
          try {
            await mkdir('dist', { recursive: true });
            console.log('Ensured dist directory exists');
          } catch (error) {
            console.error('Error creating dist directory:', error);
          }
        });
      }
    }
  ],
};

async function build() {
  console.log('Building with ESBuild...');
  console.log(`API URL: ${API_URL}`);
  
  try {
    // Ensure the dist directory exists
    await mkdir('dist', { recursive: true });
    
    // Create a custom esbuild-shim.js if it doesn't exist
    if (!existsSync('./esbuild-shim.js')) {
      const shimContent = `// React shim for esbuild
import * as React from 'react';
window.React = React;`;
      await writeFile('./esbuild-shim.js', shimContent);
      console.log('Created esbuild-shim.js');
    }
    
    // Create app icon if it doesn't exist
    if (!existsSync('./public/app-icon.svg')) {
      await mkdir('./public', { recursive: true });
      const iconContent = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="4" fill="#1976d2"/>
  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="white">P</text>
</svg>`;
      await writeFile('./public/app-icon.svg', iconContent);
      console.log('Created app-icon.svg');
    }
    
    // Process HTML template
    const htmlTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PDF Chat Assistant</title>
  <link rel="icon" type="image/svg+xml" href="/app-icon.svg" />
  <meta name="description" content="Chat with your PDF documents using AI">
</head>
<body>
  <div id="root"></div>
  <script src="/main.js"></script>
</body>
</html>`;
    
    // Write the template to dist
    await writeFile(join('dist', 'index.html'), htmlTemplate);
    
    // Build the application
    const result = await esbuild.build(config);
    
    if (result.errors.length > 0) {
      console.error('Build errors:', result.errors);
      throw new Error('Build failed with errors');
    }
    
    if (result.warnings.length > 0) {
      console.warn('Build warnings:', result.warnings);
    }
    
    console.log('Build completed successfully with ESBuild!');
  } catch (error) {
    console.error('ESBuild error:', error);
    // Throw to ensure the Docker build fails if there's a real error
    throw error;
  }
}

// Run the build
build().catch(err => {
  console.error('Fatal build error:', err);
  process.exit(1);
}); 