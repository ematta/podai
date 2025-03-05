FROM node:20-slim AS builder

WORKDIR /app

# Install dependencies needed for build
RUN apt-get update && \
    apt-get install -y python3 make g++ && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies with clean install
RUN npm ci && \
    npm install --no-save esbuild esbuild-sass-plugin sass && \
    npm cache clean --force

# Copy the rest of the code
COPY . .

# Build with esbuild directly - no fallback
RUN NODE_OPTIONS="--max-old-space-size=8192" \
    API_URL="http://localhost:8081" \
    node esbuild.config.js

# Use nginx for serving the app
FROM nginx:alpine

# Copy built app
COPY --from=builder /app/dist /usr/share/nginx/html/

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY nginx-entrypoint.sh /

# Make the entrypoint script executable
RUN chmod +x /nginx-entrypoint.sh

# Set environment variables
ENV API_URL=http://localhost:8081

# Start nginx
ENTRYPOINT ["/nginx-entrypoint.sh"]
