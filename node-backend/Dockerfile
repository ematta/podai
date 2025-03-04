FROM node:20-slim as builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code and test data
COPY . .
COPY test/data /app/test/data

# Build the application
RUN npm run build

# Production stage
FROM node:20-slim

WORKDIR /app

# Set NODE_ENV
ENV NODE_ENV=production

# Install required system libraries for ARM64
RUN apt-get update && apt-get install -y --no-install-recommends \
    libc6 \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy built app and test data from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/test/data ./test/data

# Create directories for uploads and data
RUN mkdir -p /app/uploads /app/data

# Expose port
EXPOSE 3000

# Run the application
CMD ["node", "dist/server.js"]
